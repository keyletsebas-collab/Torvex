namespace Torvex.Core;

public enum ResultadoManual { Ok, Empate, FaltanEquipos }

/// <summary>Registro manual de resultados (sin marcador en vivo), con avance automático de llaves y series.</summary>
public static class Resultados
{
    static (Partido Partido, Partido Unidad) Buscar(Torneo t, string r, int i, int? juego)
    {
        var m = Formatos.ObtenerPartido(t, r, i);
        return (m, juego != null && m.G != null ? m.G[juego.Value] : m);
    }

    static bool EsCruce(Torneo t, string r) => r == "T" || Formatos.EsLlave(t, r);

    public static ResultadoManual Aplicar(Torneo t, string r, int i, int? juego, int sa, int sb)
    {
        var (m, u) = Buscar(t, r, i, juego);
        if (m.A == null || m.B == null) return ResultadoManual.FaltanEquipos;
        var cruce = EsCruce(t, r);
        var empateOk = Deportes.De(t.Sport).Empates && !cruce && juego == null;
        if (sa == sb && !empateOk) return ResultadoManual.Empate;

        u.Sa = sa; u.Sb = sb; u.Live = null;
        if (juego != null) Formatos.Serie(t, r, i);
        else if (cruce) Formatos.PonerResultado(t, r, i, sa > sb ? m.A : m.B);
        return ResultadoManual.Ok;
    }

    /// <summary>Borra el resultado y deshace el avance del ganador.</summary>
    public static void Limpiar(Torneo t, string r, int i, int? juego)
    {
        var (_, u) = Buscar(t, r, i, juego);
        u.Sa = null; u.Sb = null; u.Live = null;
        if (juego != null) Formatos.Serie(t, r, i);
        else if (EsCruce(t, r)) Formatos.PonerResultado(t, r, i, null);
    }

    /// <summary>Estado del cruce: "aplazado", "cancelado" o null (programado).</summary>
    public static void PonerEstado(Partido m, string? estado) => m.Est = string.IsNullOrEmpty(estado) || estado == "programado" ? null : estado;
}
