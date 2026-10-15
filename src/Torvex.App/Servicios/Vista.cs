using Torvex.Core;

namespace Torvex.App.Servicios;

/// <summary>Ayudas para mostrar torneos y partidos en pantalla.</summary>
public static class Vista
{
    public static string Ronda(int r, int total)
    {
        var l = total - r;
        return l == 1 ? "Final" : l == 2 ? "Semifinales" : l == 3 ? "Cuartos de final" : "Ronda " + (r + 1);
    }

    public static string Ruta(Torneo t, string r, int i, int? g = null) =>
        $"partido/{t.Id}/{r}/{i}" + (g != null ? $"?g={g}" : "");

    /// <summary>Partidos con dos rivales definidos (sin descansos por bye).</summary>
    public static IEnumerable<(string R, int I, Partido M)> Jugables(Torneo t) =>
        Formatos.Todos(t).Where(x => x.M.A != null && x.M.B != null && x.M.A != Formatos.Bye && x.M.B != Formatos.Bye);

    public static string Nombre(string? equipo) => equipo == null ? "Por definir" : equipo == Formatos.Bye ? "Libre" : equipo;

    public static bool EsDescanso(Partido m) => ((m.A == null) ^ (m.B == null)) && m.W != null;

    public static string Etiqueta(Torneo t) => $"{Deportes.De(t.Sport).Icono} {Nombres.Rama(t.Rama)} · {Nombres.Formato(t.Type)}";

    public static Torneo ComoLiga(Torneo t, Grupo g) => new()
    {
        Teams = g.Teams, Matches = g.Matches, Sport = t.Sport, Type = "liga", Pw = t.Pw, Pd = t.Pd, Tb = t.Tb, Id = t.Id
    };

    public static (string Fecha, string Hora) Programa(Partido m) => (m.Date ?? "", m.Time ?? "");

    public static string FechaCorta(string? iso)
    {
        if (string.IsNullOrEmpty(iso) || !DateTime.TryParse(iso, out var d)) return "";
        var hoy = DateTime.Today;
        if (d.Date == hoy) return "Hoy";
        if (d.Date == hoy.AddDays(1)) return "Mañana";
        return d.ToString("ddd d MMM", new System.Globalization.CultureInfo("es"));
    }

    /// <summary>Resumen del estado de una edición: campeón o avance.</summary>
    public static string Avance(Torneo t)
    {
        if (!Formatos.Generado(t)) return $"{t.Teams.Count} equipos · sin partidos";
        var c = Clasificacion.Campeon(t);
        return c != "" ? "Campeón: " + c : Clasificacion.Progreso(t);
    }
}
