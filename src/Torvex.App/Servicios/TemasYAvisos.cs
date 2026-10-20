namespace Torvex.App.Servicios;

/// <summary>Una paleta monocromática: todo el color de la app sale de un solo tono.</summary>
public sealed record Paleta(string Clave, string Nombre, int Tono, int Saturacion);

/// <summary>Apariencia de la app: color base y modo claro u oscuro. Se elige en Ajustes y se recuerda.</summary>
public sealed class Temas
{
    public static readonly Paleta[] Paletas =
    {
        new("grafito", "Grafito", 220, 12),
        new("pizarra", "Pizarra", 218, 26),
        new("indigo", "Índigo", 235, 28),
        new("violeta", "Violeta", 262, 24),
        new("salvia", "Salvia", 160, 22),
        new("arena", "Arena", 34, 24)
    };

    public static readonly (string Clave, string Nombre)[] Modos = { ("oscuro", "Oscuro"), ("claro", "Claro suave"), ("sistema", "Automático") };

    public string PaletaActual { get; private set; } = Preferences.Default.Get("tema", "pizarra");
    public string ModoActual { get; private set; } = Preferences.Default.Get("modo", "oscuro");

    public event Action? Cambio;

    public Paleta Paleta => Paletas.FirstOrDefault(p => p.Clave == PaletaActual) ?? Paletas[1];

    public async Task AplicarAsync(HybridWebView? hw)
    {
        if (hw == null) return;
        try { await hw.InvokeJavaScriptAsync("torvex.aplicarTema", new object?[] { Paleta.Tono, Paleta.Saturacion, ModoActual }); } catch { }
    }

    public async Task ElegirPaletaAsync(string clave, HybridWebView? hw = null)
    {
        PaletaActual = clave; Preferences.Default.Set("tema", clave);
        if (hw != null) await AplicarAsync(hw);
        Cambio?.Invoke();
    }

    public async Task ElegirModoAsync(string modo, HybridWebView? hw = null)
    {
        ModoActual = modo; Preferences.Default.Set("modo", modo);
        if (hw != null) await AplicarAsync(hw);
        Cambio?.Invoke();
    }
}

/// <summary>Mensajes breves y confirmaciones dentro de la app (sin ventanas del sistema, igual en todas las plataformas).</summary>
public sealed class Avisos
{
    public sealed record Confirmacion(string Titulo, string Mensaje, string TextoOk, bool Peligro, TaskCompletionSource<bool> Resultado);

    public string? Mensaje { get; private set; }
    public Confirmacion? Pendiente { get; private set; }
    public event Action? Cambio;
    CancellationTokenSource? _t;

    public void Toast(string mensaje)
    {
        Mensaje = mensaje; Cambio?.Invoke();
        _t?.Cancel(); _t = new CancellationTokenSource();
        var token = _t.Token;
        _ = Task.Run(async () =>
        {
            try { await Task.Delay(3800, token); } catch { return; }
            Mensaje = null; Cambio?.Invoke();
        });
    }

    public Task<bool> ConfirmarAsync(string titulo, string mensaje, string textoOk = "Continuar", bool peligro = false)
    {
        var c = new Confirmacion(titulo, mensaje, textoOk, peligro, new TaskCompletionSource<bool>());
        Pendiente = c; Cambio?.Invoke();
        return c.Resultado.Task;
    }

    public void Responder(bool si)
    {
        var c = Pendiente; Pendiente = null; Cambio?.Invoke();
        c?.Resultado.TrySetResult(si);
    }
}
