using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Torvex.App.Servicios;

/// <summary>
/// Conexión con Supabase. La clave "publishable" es pública por diseño: la seguridad real la dan las reglas RLS del SQL.
/// NUNCA pongas aquí la clave "secret" (sb_secret_...): daría acceso total a la base de datos.
/// </summary>
public static class Configuracion
{
    public const string SupabaseUrl = "https://inzshtlemnibqjfnzctp.supabase.co";
    public const string SupabaseClave = "sb_publishable_e7ks1CnmGynhgAigkUF0Pw_MoR4thKS";
}

public sealed class SupabaseException : Exception
{
    public string? Codigo { get; }
    public SupabaseException(string mensaje, string? codigo = null) : base(mensaje) { Codigo = codigo; }
}

public sealed class Sesion
{
    [JsonPropertyName("access_token")] public string AccessToken { get; set; } = "";
    [JsonPropertyName("refresh_token")] public string RefreshToken { get; set; } = "";
    [JsonPropertyName("user_id")] public string UserId { get; set; } = "";
    [JsonPropertyName("email")] public string Email { get; set; } = "";
    [JsonPropertyName("expira")] public DateTimeOffset Expira { get; set; }
}

/// <summary>Guarda la sesión en el almacén seguro del dispositivo (con respaldo en preferencias si la plataforma no lo permite).</summary>
public static class AlmacenSesion
{
    const string Clave = "torvex.sesion";

    public static async Task<Sesion?> LeerAsync()
    {
        string? s = null;
        try { s = await SecureStorage.Default.GetAsync(Clave); } catch { }
        s ??= Preferences.Default.Get<string?>(Clave, null);
        if (string.IsNullOrEmpty(s)) return null;
        try { return JsonSerializer.Deserialize<Sesion>(s); } catch { return null; }
    }

    public static async Task GuardarAsync(Sesion? sesion)
    {
        if (sesion == null)
        {
            try { SecureStorage.Default.Remove(Clave); } catch { }
            Preferences.Default.Remove(Clave);
            return;
        }
        var json = JsonSerializer.Serialize(sesion);
        try { await SecureStorage.Default.SetAsync(Clave, json); Preferences.Default.Remove(Clave); }
        catch { Preferences.Default.Set(Clave, json); }
    }
}

/// <summary>Cliente mínimo de Supabase por HTTP: autenticación, consultas REST y funciones RPC.</summary>
public sealed class SupabaseClient
{
    readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(25) };
    readonly SemaphoreSlim _renovando = new(1, 1);

    public Sesion? Sesion { get; private set; }

    // ---------- autenticación ----------
    public async Task RestaurarAsync() => Sesion = await AlmacenSesion.LeerAsync();

    async Task PonerSesionAsync(JsonElement r)
    {
        var s = new Sesion
        {
            AccessToken = r.GetProperty("access_token").GetString() ?? "",
            RefreshToken = r.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "",
            Expira = DateTimeOffset.UtcNow.AddSeconds(r.TryGetProperty("expires_in", out var ei) && ei.TryGetInt32(out var n) ? n : 3600)
        };
        if (r.TryGetProperty("user", out var u))
        {
            s.UserId = u.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "";
            s.Email = u.TryGetProperty("email", out var em) ? em.GetString() ?? "" : "";
        }
        Sesion = s;
        await AlmacenSesion.GuardarAsync(s);
    }

    /// <summary>Crea la cuenta. Devuelve false si Supabase pidió confirmar el correo (no hay sesión).</summary>
    public async Task<bool> RegistrarAsync(string email, string clave, string nombre)
    {
        var r = await EnviarAsync(HttpMethod.Post, "/auth/v1/signup",
            new { email, password = clave, data = new { nombre } }, autenticado: false);
        if (r.ValueKind != JsonValueKind.Object || !r.TryGetProperty("access_token", out _)) return false;
        await PonerSesionAsync(r);
        return true;
    }

    public async Task IniciarSesionAsync(string email, string clave)
    {
        var r = await EnviarAsync(HttpMethod.Post, "/auth/v1/token?grant_type=password", new { email, password = clave }, autenticado: false);
        await PonerSesionAsync(r);
    }

    /// <summary>Renueva el token si falta poco para que venza. Devuelve false si no se pudo y hay que volver a iniciar sesión.</summary>
    public async Task<bool> RenovarAsync(bool forzar = false)
    {
        if (Sesion == null || string.IsNullOrEmpty(Sesion.RefreshToken)) return false;
        if (!forzar && Sesion.Expira - DateTimeOffset.UtcNow > TimeSpan.FromSeconds(60)) return true;
        await _renovando.WaitAsync();
        try
        {
            if (!forzar && Sesion != null && Sesion.Expira - DateTimeOffset.UtcNow > TimeSpan.FromSeconds(60)) return true;
            var r = await EnviarAsync(HttpMethod.Post, "/auth/v1/token?grant_type=refresh_token",
                new { refresh_token = Sesion!.RefreshToken }, autenticado: false);
            await PonerSesionAsync(r);
            return true;
        }
        catch (SupabaseException)
        {
            await DescartarSesionAsync();
            return false;
        }
        finally { _renovando.Release(); }
    }

    public async Task CerrarSesionAsync()
    {
        try { if (Sesion != null) await EnviarAsync(HttpMethod.Post, "/auth/v1/logout?scope=local", null, reintento: false); }
        catch { }
        await DescartarSesionAsync();
    }

    public async Task DescartarSesionAsync()
    {
        Sesion = null;
        await AlmacenSesion.GuardarAsync(null);
    }

    // ---------- datos ----------
    public Task<JsonElement> RpcAsync(string funcion, object? args = null, bool autenticado = true) =>
        EnviarAsync(HttpMethod.Post, "/rest/v1/rpc/" + funcion, args ?? new { }, autenticado: autenticado && Sesion != null);

    public Task<JsonElement> SeleccionarAsync(string tabla, string consulta, bool autenticado = true) =>
        EnviarAsync(HttpMethod.Get, "/rest/v1/" + tabla + "?" + consulta, null, autenticado: autenticado && Sesion != null);

    public Task SubirAsync(string tabla, object filas, string conflicto) =>
        EnviarAsync(HttpMethod.Post, "/rest/v1/" + tabla + "?on_conflict=" + conflicto, filas,
            cabeceras: new() { ["Prefer"] = "resolution=merge-duplicates,return=minimal" });

    public Task EliminarAsync(string tabla, string consulta) =>
        EnviarAsync(HttpMethod.Delete, "/rest/v1/" + tabla + "?" + consulta, null, cabeceras: new() { ["Prefer"] = "return=minimal" });

    // ---------- HTTP ----------
    async Task<JsonElement> EnviarAsync(HttpMethod metodo, string ruta, object? cuerpo, Dictionary<string, string>? cabeceras = null,
        bool autenticado = true, bool reintento = true)
    {
        if (autenticado && Sesion != null) await RenovarAsync();

        using var req = new HttpRequestMessage(metodo, Configuracion.SupabaseUrl + ruta);
        req.Headers.Add("apikey", Configuracion.SupabaseClave);
        if (autenticado && Sesion != null) req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Sesion.AccessToken);
        if (cabeceras != null) foreach (var (k, v) in cabeceras) req.Headers.TryAddWithoutValidation(k, v);
        if (cuerpo != null) req.Content = new StringContent(JsonSerializer.Serialize(cuerpo), Encoding.UTF8, "application/json");

        HttpResponseMessage resp;
        try { resp = await _http.SendAsync(req); }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            throw new SupabaseException("No hay conexión con el servidor. Revisa tu internet.", "red");
        }
        using (resp)
        {
            var texto = await resp.Content.ReadAsStringAsync();
            if (resp.IsSuccessStatusCode)
            {
                if (string.IsNullOrWhiteSpace(texto)) return default;
                using var doc = JsonDocument.Parse(texto);
                return doc.RootElement.Clone();
            }
            if (resp.StatusCode == HttpStatusCode.Unauthorized && autenticado && reintento && Sesion != null && await RenovarAsync(forzar: true))
                return await EnviarAsync(metodo, ruta, cuerpo, cabeceras, autenticado, reintento: false);
            throw LeerError(texto, (int)resp.StatusCode);
        }
    }

    static SupabaseException LeerError(string texto, int estado)
    {
        string? mensaje = null, codigo = null;
        try
        {
            using var doc = JsonDocument.Parse(texto);
            var r = doc.RootElement;
            if (r.ValueKind == JsonValueKind.Object)
            {
                foreach (var n in new[] { "msg", "message", "error_description", "error" })
                    if (mensaje == null && r.TryGetProperty(n, out var m) && m.ValueKind == JsonValueKind.String) mensaje = m.GetString();
                foreach (var n in new[] { "error_code", "code" })
                    if (codigo == null && r.TryGetProperty(n, out var c)) codigo = c.ValueKind == JsonValueKind.String ? c.GetString() : c.ToString();
            }
        }
        catch { }
        return new SupabaseException(mensaje ?? $"Error {estado} del servidor.", codigo);
    }
}

/// <summary>Traduce los errores técnicos a mensajes claros en español.</summary>
public static class Mensajes
{
    public static string Traducir(Exception e)
    {
        var m = e.Message ?? "";
        var c = (e as SupabaseException)?.Codigo ?? "";
        bool Tiene(string patron) => System.Text.RegularExpressions.Regex.IsMatch(m, patron, System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (c == "user_already_exists" || Tiene("already (been )?registered|already exists")) return "Ese correo ya tiene una cuenta. Inicia sesión.";
        if (c == "invalid_credentials" || Tiene("invalid login")) return "Correo o contraseña incorrectos.";
        if (c == "email_not_confirmed" || Tiene("not confirmed")) return "Falta desactivar «Confirm email» en Supabase (Authentication, Providers, Email).";
        if (c == "weak_password" || Tiene("at least 6|weak password")) return "La contraseña debe tener al menos 6 caracteres.";
        if (c is "over_request_rate_limit" or "over_email_send_rate_limit" || Tiene("rate limit|too many")) return "Demasiados intentos. Espera un momento.";
        if (c == "email_address_invalid" || Tiene("email.*invalid|invalid.*email")) return "Escribe un correo válido.";
        if (c == "red" || Tiene("failed to fetch|network|load failed")) return "No hay conexión con el servidor. Revisa tu internet.";
        return string.IsNullOrWhiteSpace(m) ? "Ocurrió un error. Inténtalo de nuevo." : m;
    }
}
