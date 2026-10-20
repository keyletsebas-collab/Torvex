using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
#if ANDROID
using Microsoft.Maui.Authentication;
#endif

namespace Torvex.App;

/// <summary>
/// Opens Google sign-in in the system browser and returns the Supabase PKCE callback to the web UI.
/// </summary>
public sealed class GoogleAuthBridge
{
#if WINDOWS
    private TcpListener? _listener;
    private string? _callbackPath;
#endif

    public Task<string> PrepareGoogleRedirectUri()
    {
#if ANDROID
        return Task.FromResult("com.torvex.app://login-callback");
#elif WINDOWS
        _listener?.Stop();
        _listener = new TcpListener(IPAddress.Loopback, 0);
        _listener.Start();
        var port = ((IPEndPoint)_listener.LocalEndpoint).Port;
        var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(20)).ToLowerInvariant();
        _callbackPath = $"/auth-callback/{nonce}";
        return Task.FromResult($"http://127.0.0.1:{port}{_callbackPath}");
#else
        throw new PlatformNotSupportedException("El acceso nativo con Google no está disponible en esta plataforma.");
#endif
    }

    public async Task<string> AuthenticateGoogleAsync(string startUrl)
    {
        var authorizationUri = ValidateAuthorizationUrl(startUrl);
#if ANDROID
        try
        {
            var result = await WebAuthenticator.Default.AuthenticateAsync(
                authorizationUri, new Uri("com.torvex.app://login-callback"));
            result.Properties.TryGetValue("code", out var code);
            result.Properties.TryGetValue("error", out var error);
            result.Properties.TryGetValue("error_description", out var description);
            return JsonSerializer.Serialize(new { code, error, error_description = description });
        }
        catch (TaskCanceledException)
        {
            return JsonSerializer.Serialize(new { cancelled = true });
        }
#elif WINDOWS
        var listener = _listener ?? throw new InvalidOperationException("Prepara primero el regreso de Google.");
        var callbackPath = _callbackPath ?? throw new InvalidOperationException("Prepara primero el regreso de Google.");
        _listener = null;
        _callbackPath = null;

        try
        {
            await Launcher.Default.OpenAsync(authorizationUri);
            using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(4));
            while (true)
            {
                using var client = await listener.AcceptTcpClientAsync(timeout.Token);
                var stream = client.GetStream();
                using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
                var requestLine = await reader.ReadLineAsync(timeout.Token);
                if (string.IsNullOrWhiteSpace(requestLine))
                    continue;

                string? line;
                do { line = await reader.ReadLineAsync(timeout.Token); }
                while (!string.IsNullOrEmpty(line));

                var parts = requestLine.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 2 || parts[0] != "GET")
                {
                    await ReplyAsync(stream, 405, "Método no permitido", timeout.Token);
                    continue;
                }

                var callback = new Uri(new Uri("http://127.0.0.1/"), parts[1]);
                if (!string.Equals(callback.AbsolutePath, callbackPath, StringComparison.Ordinal))
                {
                    await ReplyAsync(stream, 404, "Dirección no encontrada", timeout.Token);
                    continue;
                }

                await ReplyAsync(stream, 200, "Ya puedes volver a Torvex. Esta ventana se puede cerrar.", timeout.Token);
                var values = ParseQuery(callback.Query);
                values.TryGetValue("code", out var code);
                values.TryGetValue("error", out var error);
                values.TryGetValue("error_description", out var description);
                return JsonSerializer.Serialize(new { code, error, error_description = description });
            }
        }
        catch (OperationCanceledException)
        {
            return JsonSerializer.Serialize(new { timeout = true });
        }
        finally
        {
            listener.Stop();
        }
#else
        throw new PlatformNotSupportedException("El acceso nativo con Google no está disponible en esta plataforma.");
#endif
    }

    private static Uri ValidateAuthorizationUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !uri.Host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase)
            || !uri.AbsolutePath.StartsWith("/auth/v1/authorize", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("El enlace de autorización de Google no es válido.");
        }

        return uri;
    }

#if WINDOWS
    private static Dictionary<string, string> ParseQuery(string query)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var item in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = item.Split('=', 2);
            var key = Uri.UnescapeDataString(pair[0].Replace('+', ' '));
            var value = pair.Length > 1 ? Uri.UnescapeDataString(pair[1].Replace('+', ' ')) : "";
            result[key] = value;
        }
        return result;
    }

    private static async Task ReplyAsync(NetworkStream stream, int status, string message, CancellationToken cancellationToken)
    {
        var body = "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Torvex</title><body style=\"font:16px system-ui;background:#101827;color:#fff;display:grid;place-items:center;min-height:90vh;text-align:center\"><main><h1>Torvex</h1><p>" + WebUtility.HtmlEncode(message) + "</p></main></body></html>";
        var bytes = Encoding.UTF8.GetBytes(body);
        var reason = status == 200 ? "OK" : status == 405 ? "Method Not Allowed" : "Not Found";
        var header = Encoding.ASCII.GetBytes($"HTTP/1.1 {status} {reason}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {bytes.Length}\r\nConnection: close\r\n\r\n");
        await stream.WriteAsync(header, cancellationToken);
        await stream.WriteAsync(bytes, cancellationToken);
        await stream.FlushAsync(cancellationToken);
    }
#endif
}
