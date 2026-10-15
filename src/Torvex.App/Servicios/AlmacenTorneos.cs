using System.Text.Json;
using Torvex.Core;

namespace Torvex.App.Servicios;

/// <summary>
/// Torneos del colegio, guardados en la tabla "docs" de Supabase (col = "torneos"), igual que la versión web.
/// Guarda en segundo plano (gana el último cambio) y se actualiza solo cada pocos segundos.
/// </summary>
public sealed class AlmacenTorneos : IDisposable
{
    readonly Cuentas _cuentas;
    readonly Dictionary<long, Torneo> _sucios = new();
    readonly object _lock = new();
    bool _guardando;
    CancellationTokenSource? _ciclo;

    public AlmacenTorneos(Cuentas cuentas)
    {
        _cuentas = cuentas;
        _cuentas.Cambio += AlCambiarCuenta;
    }

    public event Action? Cambio;
    public event Action<string>? Falla;

    public List<Torneo> Lista { get; private set; } = new();
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
        Lista = new(); Cargado = false;
        lock (_lock) _sucios.Clear();
    }

    public async Task RefrescarAsync()
    {
        if (Colegio == null) return;
        // no pisar cambios locales que todavía se están guardando
        lock (_lock) if (_guardando || _sucios.Count > 0) return;
        var r = await Sb.SeleccionarAsync("docs", $"select=id,data&colegio_id=eq.{Colegio}&col=eq.torneos");
        if (r.ValueKind != JsonValueKind.Array) return;
        var nueva = new List<Torneo>();
        foreach (var fila in r.EnumerateArray())
        {
            try { var t = Json.De<Torneo>(fila.GetProperty("data").GetRawText()); if (t != null) nueva.Add(t); } catch { }
        }
        lock (_lock) if (_guardando || _sucios.Count > 0) return;
        Lista = nueva.OrderByDescending(t => t.Id).ToList();
        Cargado = true;
        Cambio?.Invoke();
    }

    /// <summary>Guarda una edición. Varias llamadas seguidas se agrupan y se sube solo la última versión.</summary>
    public void Guardar(Torneo t)
    {
        if (!Lista.Contains(t)) { Lista.Add(t); Lista = Lista.OrderByDescending(x => x.Id).ToList(); }
        bool iniciar;
        lock (_lock) { _sucios[t.Id] = t; iniciar = !_guardando; if (iniciar) _guardando = true; }
        Cambio?.Invoke();
        if (iniciar) _ = Task.Run(VaciarAsync);
    }

    async Task VaciarAsync()
    {
        while (true)
        {
            Torneo? t;
            lock (_lock)
            {
                t = _sucios.Values.FirstOrDefault();
                if (t == null) { _guardando = false; return; }
                _sucios.Remove(t.Id);
            }
            try
            {
                var data = JsonSerializer.SerializeToElement(t, Json.Opciones);
                await Sb.SubirAsync("docs", new[] { new { colegio_id = Colegio, col = "torneos", id = t.Id.ToString(), data } }, "colegio_id,col,id");
            }
            catch (Exception e) { Falla?.Invoke("No se pudo guardar: " + Mensajes.Traducir(e)); }
        }
    }

    public async Task EliminarAsync(Torneo t)
    {
        Lista.Remove(t);
        lock (_lock) _sucios.Remove(t.Id);
        Cambio?.Invoke();
        try { await Sb.EliminarAsync("docs", $"colegio_id=eq.{Colegio}&col=eq.torneos&id=eq.{t.Id}"); }
        catch (Exception e) { Falla?.Invoke("No se pudo eliminar: " + Mensajes.Traducir(e)); }
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
