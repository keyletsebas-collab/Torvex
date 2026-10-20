using System.Text.Json;
using Torvex.Core;

namespace Torvex.App.Servicios;

/// <summary>
/// Torneos del colegio, guardados en la tabla "docs" de Supabase (col = "torneos"), igual que la versión web.
/// Guarda en segundo plano (gana el último cambio) y se actualiza solo cada pocos segundos.
/// </summary>
public sealed partial class AlmacenTorneos : IDisposable
{
    readonly Cuentas _cuentas;
    readonly Dictionary<long, (Torneo Torneo, string? Colegio)> _sucios = [];
    readonly HashSet<long> _eliminando = [];
    readonly Lock _lock = new();
    readonly SemaphoreSlim _persistencia = new(1, 1);
    bool _guardando;
    long _versionLocal;
    CancellationTokenSource? _ciclo;

    public AlmacenTorneos(Cuentas cuentas)
    {
        _cuentas = cuentas;
        _cuentas.Cambio += AlCambiarCuenta;
    }

    public event Action? Cambio;
    public event Action<string>? Falla;

    public List<Torneo> Lista { get; private set; } = [];
    public bool Cargado { get; private set; }

    public Torneo? Por(long id) => Lista.FirstOrDefault(t => t.Id == id);

    string? Colegio => _cuentas.Perfil?.ColegioId;
    SupabaseClient Sb => _cuentas.Cliente;

    void AlCambiarCuenta()
    {
        if (_cuentas.Estado == EstadoAcceso.Ok && _ciclo == null) Iniciar();
        else if (_cuentas.Estado != EstadoAcceso.Ok && _ciclo != null) Detener();
    }

    void Iniciar()
    {
        _ciclo = new CancellationTokenSource();
        var token = _ciclo.Token;
        _ = Task.Run(async () =>
        {
            while (!token.IsCancellationRequested)
            {
                try { await RefrescarAsync(); } catch (Exception e) { Falla?.Invoke(Mensajes.Traducir(e)); }
                try { await Task.Delay(6000, token); } catch { return; }
            }
        }, token);
    }

    void Detener()
    {
        _ciclo?.Cancel(); _ciclo = null;
        Lista = []; Cargado = false;
        lock (_lock) { _sucios.Clear(); _versionLocal++; }
    }

    public async Task RefrescarAsync()
    {
        if (Colegio == null) return;
        // no pisar cambios locales que todavía se están guardando
        long version;
        lock (_lock)
        {
            if (_guardando || _sucios.Count > 0) return;
            version = _versionLocal;
        }
        var colegio = Colegio;
        if (colegio == null) return;
        var r = await Sb.SeleccionarAsync("docs", $"select=id,data&colegio_id=eq.{colegio}&col=eq.torneos");
        if (r.ValueKind != JsonValueKind.Array) return;
        var nueva = new List<Torneo>();
        foreach (var fila in r.EnumerateArray())
        {
            try { var t = Json.De<Torneo>(fila.GetProperty("data").GetRawText()); if (t != null) nueva.Add(t); } catch { }
        }
        lock (_lock)
        {
            if (_guardando || _sucios.Count > 0 || version != _versionLocal) return;
            Lista = [.. nueva.Where(t => !_eliminando.Contains(t.Id)).OrderByDescending(t => t.Id)];
        }
        Cargado = true;
        Cambio?.Invoke();
    }

    /// <summary>Guarda una edición. Varias llamadas seguidas se agrupan y se sube solo la última versión.</summary>
    public void Guardar(Torneo t)
    {
        var colegio = Colegio;
        bool iniciar;
        lock (_lock)
        {
            if (_eliminando.Contains(t.Id)) return;
            if (!Lista.Contains(t)) { Lista.Add(t); Lista = [.. Lista.OrderByDescending(x => x.Id)]; }
            _sucios[t.Id] = (t, colegio);
            iniciar = !_guardando;
            if (iniciar) _guardando = true;
        }
        Cambio?.Invoke();
        if (iniciar) _ = Task.Run(VaciarAsync);
    }

    async Task VaciarAsync()
    {
        while (true)
        {
            (Torneo Torneo, string? Colegio) pendiente;
            lock (_lock)
            {
                if (_sucios.Count == 0) { _guardando = false; return; }
                var id = _sucios.Keys.First();
                pendiente = _sucios[id];
                _sucios.Remove(id);
            }
            await _persistencia.WaitAsync();
            try
            {
                lock (_lock) if (_eliminando.Contains(pendiente.Torneo.Id)) continue;
                if (pendiente.Colegio == null) continue;
                var data = JsonSerializer.SerializeToElement(pendiente.Torneo, Json.Opciones);
                await Sb.SubirAsync("docs", new[] { new { colegio_id = pendiente.Colegio, col = "torneos", id = pendiente.Torneo.Id.ToString(), data } }, "colegio_id,col,id");
            }
            catch (Exception e) { Falla?.Invoke("No se pudo guardar: " + Mensajes.Traducir(e)); }
            finally { _persistencia.Release(); }
        }
    }

    public async Task EliminarAsync(Torneo t)
    {
        var colegio = Colegio;
        lock (_lock)
        {
            _eliminando.Add(t.Id);
            _versionLocal++;
            _sucios.Remove(t.Id);
            Lista.Remove(t);
        }
        Cambio?.Invoke();
        if (colegio == null) return;
        await _persistencia.WaitAsync();
        try { await Sb.EliminarAsync("docs", $"colegio_id=eq.{colegio}&col=eq.torneos&id=eq.{t.Id}"); }
        catch (Exception e)
        {
            lock (_lock) _eliminando.Remove(t.Id);
            Falla?.Invoke("No se pudo eliminar: " + Mensajes.Traducir(e));
        }
        finally { _persistencia.Release(); }
    }

    public Torneo Crear(string nombre, string deporte, string? rama, string tipo)
    {
        var t = new Torneo
        {
            Id = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Name = nombre, Sport = deporte, Rama = rama, Type = tipo
        };
        while (Lista.Any(x => x.Id == t.Id)) t.Id++;
        Guardar(t);
        return t;
    }

    public void Dispose() { _cuentas.Cambio -= AlCambiarCuenta; Detener(); }
}
