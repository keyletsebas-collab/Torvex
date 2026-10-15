using System.Text.Json;
using System.Text.Json.Serialization;
using Torvex.Core;

namespace Torvex.App.Servicios;

public enum EstadoAcceso { Carga, Fuera, Completar, Pendiente, Ok }

public sealed class PerfilUsuario
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("nombre")] public string Nombre { get; set; } = "";
    [JsonPropertyName("colegio_id")] public string? ColegioId { get; set; }
    [JsonPropertyName("estado")] public string Estado { get; set; } = "sin_colegio";
    [JsonPropertyName("rol")] public string Rol { get; set; } = "espectador";
    [JsonPropertyName("equipo")] public string Equipo { get; set; } = "";
}

public sealed class Colegio
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("nombre")] public string Nombre { get; set; } = "";
}

public sealed class Miembro
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("nombre")] public string Nombre { get; set; } = "";
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("estado")] public string Estado { get; set; } = "";
    [JsonPropertyName("rol")] public string Rol { get; set; } = "espectador";
    [JsonPropertyName("equipo")] public string? Equipo { get; set; }
    public bool Pendiente => Estado == "pendiente";
}

/// <summary>Datos del formulario de crear cuenta / completar registro.</summary>
public sealed class FormularioAcceso
{
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public string Clave { get; set; } = "";
    public string Clave2 { get; set; } = "";
    public bool Organizador { get; set; }
    public string Codigo { get; set; } = "";
    public string? ColegioId { get; set; }
    public string ColegioNombre { get; set; } = "";
    public bool ColegioNuevo { get; set; }
    public string NuevoColegio { get; set; } = "";
    public string ClaveColegio { get; set; } = "";
}

/// <summary>
/// Cuentas de la app: acceso obligatorio, colegios, aprobación de miembros y cargos.
/// Usa las funciones del SQL docs/supabase-cuentas.sql.
/// </summary>
public sealed class Cuentas : IDisposable
{
    readonly SupabaseClient _sb;
    CancellationTokenSource? _vigilar;

    public Cuentas(SupabaseClient sb) { _sb = sb; }

    public event Action? Cambio;
    void Avisar() => Cambio?.Invoke();

    public EstadoAcceso Estado { get; private set; } = EstadoAcceso.Carga;
    public PerfilUsuario? Perfil { get; private set; }
    public string Correo { get; private set; } = "";
    public List<Colegio> Colegios { get; private set; } = new();
    public string Error { get; set; } = "";
    public bool Ocupado { get; private set; }
    public SupabaseClient Cliente => _sb;

    public string Rol => Perfil?.Rol ?? "espectador";
    public bool EsOrganizador => Estado == EstadoAcceso.Ok && Permisos.EsOrganizador(Rol);
    public bool PuedeAnotar => Estado == EstadoAcceso.Ok && Permisos.PuedeAnotar(Rol);
    public string ColegioNombre => Colegios.FirstOrDefault(c => c.Id == Perfil?.ColegioId)?.Nombre ?? "tu colegio";

    // ---------- arranque ----------
    public async Task InicializarAsync()
    {
        Estado = EstadoAcceso.Carga; Avisar();
        try
        {
            await CargarColegiosAsync();
            await _sb.RestaurarAsync();
            if (_sb.Sesion != null && await _sb.RenovarAsync()) await ResolverSesionAsync();
            else { await _sb.DescartarSesionAsync(); Estado = EstadoAcceso.Fuera; }
        }
        catch (Exception e)
        {
            Error = Mensajes.Traducir(e);
            Estado = EstadoAcceso.Fuera;
        }
        Avisar();
    }

    public async Task CargarColegiosAsync()
    {
        try
        {
            var r = await _sb.SeleccionarAsync("colegios", "select=id,nombre&order=nombre", autenticado: false);
            Colegios = r.ValueKind == JsonValueKind.Array ? Json.De<List<Colegio>>(r.GetRawText()) ?? new() : new();
        }
        catch { Colegios = new(); }
    }

    async Task ResolverSesionAsync()
    {
        DetenerVigilancia();
        var s = _sb.Sesion!;
        Correo = s.Email;
        var r = await _sb.SeleccionarAsync("perfiles", $"select=id,nombre,colegio_id,estado,rol,equipo&id=eq.{s.UserId}");
        var lista = r.ValueKind == JsonValueKind.Array ? Json.De<List<PerfilUsuario>>(r.GetRawText()) : null;
        var perfil = lista?.FirstOrDefault();
        if (perfil == null)
        {
            // el organizador rechazó la cuenta y se borró
            await _sb.DescartarSesionAsync();
            Perfil = null; Estado = EstadoAcceso.Fuera;
            Error = "El organizador rechazó tu entrada y tu cuenta fue eliminada. Puedes crear una nueva con el código correcto.";
            Avisar();
            return;
        }
        Perfil = perfil;
        await CargarColegiosAsync();
        if (perfil.Estado == "aprobado") { Estado = EstadoAcceso.Ok; Error = ""; }
        else if (perfil.Estado == "pendiente") { Estado = EstadoAcceso.Pendiente; Error = ""; Vigilar(); }
        else Estado = EstadoAcceso.Completar;
        Avisar();
    }

    /// <summary>Mientras espera aprobación, revisa cada pocos segundos si ya lo aceptaron (o lo rechazaron).</summary>
    void Vigilar()
    {
        DetenerVigilancia();
        _vigilar = new CancellationTokenSource();
        var token = _vigilar.Token;
        _ = Task.Run(async () =>
        {
            while (!token.IsCancellationRequested)
            {
                try { await Task.Delay(4000, token); } catch { return; }
                try { if (_sb.Sesion != null && !token.IsCancellationRequested) await ResolverSesionAsync(); } catch { }
            }
        }, token);
    }

    void DetenerVigilancia() { _vigilar?.Cancel(); _vigilar = null; }

    // ---------- formularios ----------
    public static bool CorreoValido(string v) => System.Text.RegularExpressions.Regex.IsMatch(v, @"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$");

    public string? ValidarColegio(FormularioAcceso f)
    {
        if (!f.Organizador) return string.IsNullOrWhiteSpace(f.Codigo) ? "Escribe el código de tu colegio." : null;
        if (f.ColegioNuevo)
        {
            if (f.NuevoColegio.Trim().Length < 2) return "Escribe el nombre del colegio.";
            if (Colegios.Any(c => string.Equals(c.Nombre.Trim(), f.NuevoColegio.Trim(), StringComparison.OrdinalIgnoreCase)))
                return "Ese colegio ya está registrado: elígelo en la lista.";
            return f.ClaveColegio.Length < 6 ? "La contraseña del colegio debe tener al menos 6 caracteres." : null;
        }
        if (string.IsNullOrEmpty(f.ColegioId)) return "Elige tu colegio en la lista o crea uno nuevo.";
        return string.IsNullOrEmpty(f.ClaveColegio) ? "Escribe la contraseña del colegio." : null;
    }

    async Task UnirmeAsync(FormularioAcceso f)
    {
        if (!f.Organizador) await _sb.RpcAsync("unirme_con_codigo", new { p_codigo = f.Codigo.Trim() });
        else if (f.ColegioNuevo) await _sb.RpcAsync("crear_colegio_y_unirme", new { p_nombre = f.NuevoColegio.Trim(), p_clave = f.ClaveColegio });
        else await _sb.RpcAsync("unirme_como_organizador", new { p_colegio = f.ColegioId, p_clave = f.ClaveColegio });
    }

    async Task<bool> CodigoValidoAsync(string codigo)
    {
        var r = await _sb.RpcAsync("validar_codigo", new { p_codigo = codigo.Trim() }, autenticado: false);
        // la función devuelve el nombre del colegio, o null si el código no existe
        return r.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(r.GetString());
    }

    public async Task CrearCuentaAsync(FormularioAcceso f)
    {
        if (Ocupado) return;
        var nombre = f.Nombre.Trim(); var correo = f.Correo.Trim().ToLowerInvariant();
        var e = string.IsNullOrEmpty(nombre) ? "Escribe tu nombre."
            : !CorreoValido(correo) ? "Escribe un correo válido."
            : f.Clave.Length < 6 ? "La contraseña debe tener al menos 6 caracteres."
            : f.Clave != f.Clave2 ? "Las contraseñas no coinciden."
            : ValidarColegio(f);
        if (e != null) { Error = e; Avisar(); return; }
        Ocupado = true; Error = ""; Avisar();
        try
        {
            if (!f.Organizador && !await CodigoValidoAsync(f.Codigo))
                throw new Exception("Código de colegio no válido. Pídeselo al organizador de tu colegio.");
            if (!await _sb.RegistrarAsync(correo, f.Clave, nombre))
                throw new Exception("Supabase pidió confirmar el correo. Hay que desactivar «Confirm email» en Authentication, Providers, Email.");
            try { await UnirmeAsync(f); } catch (Exception e2) { Error = Mensajes.Traducir(e2); }
            f.Clave = f.Clave2 = f.ClaveColegio = "";
            await ResolverSesionAsync();
        }
        catch (Exception e3) { Error = Mensajes.Traducir(e3); }
        Ocupado = false; Avisar();
    }

    public async Task CompletarRegistroAsync(FormularioAcceso f)
    {
        if (Ocupado) return;
        var e = ValidarColegio(f);
        if (e != null) { Error = e; Avisar(); return; }
        Ocupado = true; Error = ""; Avisar();
        try
        {
            if (!f.Organizador && !await CodigoValidoAsync(f.Codigo))
                throw new Exception("Código de colegio no válido. Pídeselo al organizador de tu colegio.");
            await UnirmeAsync(f);
            f.ClaveColegio = "";
            await ResolverSesionAsync();
        }
        catch (Exception e3) { Error = Mensajes.Traducir(e3); }
        Ocupado = false; Avisar();
    }

    public async Task IniciarSesionAsync(string correo, string clave)
    {
        if (Ocupado) return;
        correo = correo.Trim().ToLowerInvariant();
        if (!CorreoValido(correo) || string.IsNullOrEmpty(clave)) { Error = "Escribe tu correo y tu contraseña."; Avisar(); return; }
        Ocupado = true; Error = ""; Avisar();
        try { await _sb.IniciarSesionAsync(correo, clave); await ResolverSesionAsync(); }
        catch (Exception e) { Error = Mensajes.Traducir(e); }
        Ocupado = false; Avisar();
    }

    public async Task SalirAsync()
    {
        DetenerVigilancia();
        await _sb.CerrarSesionAsync();
        Perfil = null; Error = "";
        Estado = EstadoAcceso.Fuera;
        Avisar();
    }

    // ---------- miembros (solo organizadores) ----------
    public List<Miembro> Miembros { get; private set; } = new();
    public string CodigoColegio { get; private set; } = "";

    public async Task CargarMiembrosAsync()
    {
        if (!EsOrganizador) return;
        var r = await _sb.RpcAsync("listar_miembros");
        Miembros = r.ValueKind == JsonValueKind.Array ? Json.De<List<Miembro>>(r.GetRawText()) ?? new() : new();
        Avisar();
    }

    public async Task CargarCodigoAsync()
    {
        if (!EsOrganizador) return;
        var r = await _sb.RpcAsync("codigo_mi_colegio");
        CodigoColegio = r.ValueKind == JsonValueKind.String ? r.GetString() ?? "" : "";
        Avisar();
    }

    public async Task RegenerarCodigoAsync()
    {
        var r = await _sb.RpcAsync("regenerar_codigo_colegio");
        CodigoColegio = r.ValueKind == JsonValueKind.String ? r.GetString() ?? "" : CodigoColegio;
        Avisar();
    }

    public async Task AprobarAsync(string uid, string cargo, string equipo)
    {
        await _sb.RpcAsync("aprobar_miembro", new { p_uid = uid, p_cargo = cargo, p_equipo = equipo });
        await CargarMiembrosAsync();
    }

    public async Task RechazarAsync(string uid)
    {
        await _sb.RpcAsync("rechazar_miembro", new { p_uid = uid });
        await CargarMiembrosAsync();
    }

    public void Dispose() => DetenerVigilancia();
}
