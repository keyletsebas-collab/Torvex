using System.Text.RegularExpressions;

namespace Torvex.Core;

/// <summary>Formatos de competición: ligas, llaves, grupos y doble eliminación.</summary>
public static class Formatos
{
    public const string Bye = "__bye__";
    public static Random Azar = new();

    /// <summary>Destino de un ganador o perdedor en la doble eliminación.</summary>
    public sealed record Destino(string Clave, int I, string Casilla);

    // ---------- consultas básicas ----------
    public static bool Generado(Torneo t) => t.Type switch
    {
        "liga" => t.Matches.Count > 0,
        "grupos" => t.Gr.Count > 0,
        "dele" => t.De != null,
        _ => t.Rounds.Count > 0
    };

    public static bool EsLlave(Torneo t, string r) =>
        t.Type == "elim" || t.Type == "dele" || (t.Type == "grupos" && !Regex.IsMatch(r, @"^G"));

    public static bool Terminado(Torneo t, Partido m) =>
        m.Sa != null && m.Sb != null && (m.Live == null || m.Live.St == "fin") && (Deportes.De(t.Sport).Empates || m.Sa != m.Sb);

    public static List<Partido> Partidos(Torneo t)
    {
        if (t.Type == "liga") return t.Matches;
        var o = new List<Partido>();
        if (t.Type == "grupos") foreach (var g in t.Gr) o.AddRange(g.Matches);
        if (t.Type == "dele" && t.De != null)
        {
            foreach (var rd in t.De.W) o.AddRange(rd);
            foreach (var rd in t.De.L) o.AddRange(rd);
            o.AddRange(t.De.F);
        }
        foreach (var rd in t.Rounds) o.AddRange(rd);
        return o;
    }

    public static Partido ObtenerPartido(Torneo t, string r, int i)
    {
        if (r == "L") return t.Matches[i];
        if (r == "T") return t.Tp!;
        if (r == "F") return t.De!.F[0];
        if (Regex.IsMatch(r, @"^G\d")) return t.Gr[int.Parse(r[1..])].Matches[i];
        if (Regex.IsMatch(r, @"^[WL]\d")) return (r[0] == 'W' ? t.De!.W : t.De!.L)[int.Parse(r[1..])][i];
        return t.Rounds[int.Parse(r)][i];
    }

    /// <summary>Devuelve el partido o, si se indica juego, ese juego de la serie.</summary>
    public static Partido ObtenerPartido(Torneo t, string r, int i, int? g)
    {
        var m = ObtenerPartido(t, r, i);
        return g != null && m.G != null ? m.G[g.Value] : m;
    }

    public static List<(string R, int I, Partido M)> Todos(Torneo t)
    {
        var o = new List<(string, int, Partido)>();
        if (t.Type == "liga") for (var i = 0; i < t.Matches.Count; i++) o.Add(("L", i, t.Matches[i]));
        if (t.Type == "grupos") for (var gi = 0; gi < t.Gr.Count; gi++) for (var i = 0; i < t.Gr[gi].Matches.Count; i++) o.Add(("G" + gi, i, t.Gr[gi].Matches[i]));
        for (var r = 0; r < t.Rounds.Count; r++) for (var i = 0; i < t.Rounds[r].Count; i++) o.Add((r.ToString(), i, t.Rounds[r][i]));
        if (t.De != null)
        {
            for (var r = 0; r < t.De.W.Count; r++) for (var i = 0; i < t.De.W[r].Count; i++) o.Add(("W" + r, i, t.De.W[r][i]));
            for (var r = 0; r < t.De.L.Count; r++) for (var i = 0; i < t.De.L[r].Count; i++) o.Add(("L" + r, i, t.De.L[r][i]));
            o.Add(("F", 0, t.De.F[0]));
        }
        if (t.Tp != null) o.Add(("T", 0, t.Tp));
        return o;
    }

    public static List<T> Mezclar<T>(IEnumerable<T> src)
    {
        var a = src.ToList();
        for (var i = a.Count - 1; i > 0; i--)
        {
            var j = Azar.Next(i + 1);
            (a[i], a[j]) = (a[j], a[i]);
        }
        return a;
    }

    // ---------- generación ----------
    public static void Generar(Torneo t)
    {
        var tm = Mezclar(t.Teams);
        if (t.Type == "grupos") { GenGrupos(t, tm); return; }
        if (t.Type == "dele") { GenDE(t, tm); return; }
        if (t.Type == "liga")
        {
            t.Matches = new List<Partido>();
            for (var i = 0; i < tm.Count; i++)
                for (var j = i + 1; j < tm.Count; j++)
                    t.Matches.Add(new Partido { A = tm[i], B = tm[j] });
            if (t.Dbl)
            {
                var n0 = t.Matches.Count;
                for (var q = 0; q < n0; q++) t.Matches.Add(new Partido { A = t.Matches[q].B, B = t.Matches[q].A });
            }
            return;
        }
        var size = 1;
        while (size < tm.Count) size *= 2;
        var slots = tm.Cast<string?>().ToList();
        while (slots.Count < size) slots.Add(null);
        var first = new List<Partido>();
        var rs = new List<List<Partido>> { first };
        var n = size / 2;
        for (var i = 0; i < n; i++) first.Add(new Partido { A = slots[i], B = slots[size - 1 - i] });
        while (n > 1)
        {
            n /= 2;
            var r = new List<Partido>();
            for (var i = 0; i < n; i++) r.Add(new Partido());
            rs.Add(r);
        }
        t.Rounds = rs;
        AjustarSeries(t, rs);
        for (var i = 0; i < first.Count; i++)
            if (first[i].A == null || first[i].B == null) PonerGanador(t, 0, i, first[i].A ?? first[i].B);
        t.Tp = null;
        SincronizarTercero(t);
    }

    public static void AjustarSeries(Torneo t, List<List<Partido>> rs)
    {
        for (var ri = 0; ri < rs.Count; ri++)
        {
            var b = ri == rs.Count - 1 ? (t.BoF != 0 ? t.BoF : (t.Bo != 0 ? t.Bo : 1)) : (t.Bo != 0 ? t.Bo : 1);
            foreach (var m in rs[ri])
            {
                if (b > 1 && (ri > 0 || (m.A != null && m.B != null))) { m.Bo = b; m.G = new List<Partido> { new() }; }
                else m.Bo = 1;
            }
        }
    }

    public static void PonerGanador(Torneo t, int r, int i, string? nombre)
    {
        var m = t.Rounds[r][i];
        m.W = nombre;
        if (r + 1 < t.Rounds.Count)
        {
            var nx = t.Rounds[r + 1][i >> 1];
            var esB = i % 2 == 1;
            var cambio = (esB ? nx.B : nx.A) != nombre;
            if (esB) nx.B = nombre; else nx.A = nombre;
            if (cambio && nx.Bo > 1)
            {
                nx.G = new List<Partido> { new() };
                nx.Sa = null; nx.Sb = null;
                if (nx.W != null) PonerGanador(t, r + 1, i >> 1, null);
            }
            if (nx.W != null && nx.W != nx.A && nx.W != nx.B) PonerGanador(t, r + 1, i >> 1, null);
        }
        SincronizarTercero(t);
    }

    public static bool JuegoTerminado(Partido x) =>
        x.Sa != null && x.Sb != null && x.Sa != x.Sb && (x.Live == null || x.Live.St == "fin");

    /// <summary>Recalcula una serie al mejor de N a partir de los juegos terminados.</summary>
    public static void Serie(Torneo t, string r, int i)
    {
        var m = ObtenerPartido(t, r, i);
        var need = (int)Math.Ceiling(m.Bo / 2.0);
        int wa = 0, wb = 0;
        var g = m.G!;
        foreach (var x in g)
            if (JuegoTerminado(x)) { if (x.Sa > x.Sb) wa++; else wb++; }
        m.Sa = wa; m.Sb = wb;
        var w = wa >= need ? m.A : wb >= need ? m.B : null;
        if (w != null)
        {
            while (g.Count > 1 && g[^1].Live == null && g[^1].Sa == null && g[^1].Sb == null) g.RemoveAt(g.Count - 1);
        }
        else if (g.All(JuegoTerminado) && g.Count < m.Bo) g.Add(new Partido());
        PonerGanador(t, int.Parse(r), i, w);
    }

    public static void PonerResultado(Torneo t, string r, int i, string? nombre)
    {
        if (r == "T") { t.Tp!.W = nombre; return; }
        if (t.Type == "dele") { GanadorDE(t, r, i, nombre); AutoDE(t); return; }
        PonerGanador(t, int.Parse(r), i, nombre);
    }

    public static void SincronizarTercero(Torneo t)
    {
        if (!t.Third || t.Rounds.Count < 2 || (t.Type != "elim" && t.Type != "grupos")) return;
        var sf = t.Rounds[^2];
        var ls = sf.Select(m => m.W != null ? (m.W == m.A ? m.B : m.A) : null).ToList();
        var tp = t.Tp ??= new Partido { Bo = 1 };
        var l0 = ls.Count > 0 ? ls[0] : null;
        var l1 = ls.Count > 1 ? ls[1] : null;
        if (tp.A != l0 || tp.B != l1) { tp.A = l0; tp.B = l1; tp.Sa = null; tp.Sb = null; tp.W = null; tp.Live = null; }
    }

    // ---------- grupos y llaves ----------
    public static void GenGrupos(Torneo t, List<string> tm)
    {
        var ng = t.Ng != 0 ? t.Ng : (tm.Count >= 12 ? 4 : 2);
        ng = Math.Max(1, Math.Min(ng, tm.Count / 2));
        if (ng == 3) ng = 2;
        var gr = new List<Grupo>();
        for (var q = 0; q < ng; q++) gr.Add(new Grupo { N = "Grupo " + (char)(65 + q) });
        for (var k = 0; k < tm.Count; k++)
        {
            var fila = k / ng; var c = k % ng;
            gr[fila % 2 == 1 ? ng - 1 - c : c].Teams.Add(tm[k]);
        }
        foreach (var g in gr)
        {
            for (var i = 0; i < g.Teams.Count; i++)
                for (var j = i + 1; j < g.Teams.Count; j++)
                    g.Matches.Add(new Partido { A = g.Teams[i], B = g.Teams[j] });
            if (t.Dbl)
            {
                var n0 = g.Matches.Count;
                for (var z = 0; z < n0; z++) g.Matches.Add(new Partido { A = g.Matches[z].B, B = g.Matches[z].A });
            }
        }
        t.Gr = gr; t.Rounds = new(); t.Tp = null;
    }

    public static void GenerarLlaves(Torneo t)
    {
        var st = t.Gr.Select(g => Clasificacion.Tabla(new Torneo
        {
            Teams = g.Teams, Matches = g.Matches, Sport = t.Sport, Type = "liga", Pw = t.Pw, Pd = t.Pd, Tb = t.Tb, Id = t.Id
        })).ToList();
        var ng = st.Count;
        string? Nm(int q, int k) => k < st[q].Count ? st[q][k].N : null;
        var first = new List<(string?, string?)>();
        if (ng == 1) first.Add((Nm(0, 0), Nm(0, 1)));
        else
        {
            for (var q = 0; q < ng; q += 2) first.Add((Nm(q, 0), Nm(q + 1, 1)));
            for (var q = 0; q < ng; q += 2) first.Add((Nm(q + 1, 0), Nm(q, 1)));
        }
        var n = first.Count;
        var rs = new List<List<Partido>> { first.Select(f => new Partido { A = f.Item1, B = f.Item2 }).ToList() };
        while (n > 1)
        {
            n /= 2;
            var rd = new List<Partido>();
            for (var i = 0; i < n; i++) rd.Add(new Partido());
            rs.Add(rd);
        }
        t.Rounds = rs; AjustarSeries(t, rs); t.Tp = null;
        for (var i = 0; i < rs[0].Count; i++)
            if (rs[0][i].A == null || rs[0][i].B == null) PonerGanador(t, 0, i, rs[0][i].A ?? rs[0][i].B);
        SincronizarTercero(t);
    }

    // ---------- doble eliminación ----------
    static Partido PartidoDE(Torneo t, string clave, int i) =>
        clave == "F" ? t.De!.F[0] : (clave[0] == 'W' ? t.De!.W : t.De!.L)[int.Parse(clave[1..])][i];

    static (Destino? Gana, Destino? Pierde) DestinosDE(Torneo t, string clave, int i)
    {
        var k = t.De!.W.Count;
        if (clave == "F") return (null, null);
        var ty = clave[0]; var r = int.Parse(clave[1..]);
        var casilla = i % 2 == 1 ? "b" : "a";
        if (ty == 'W')
        {
            var w = r == k - 1 ? new Destino("F", 0, "a") : new Destino("W" + (r + 1), i >> 1, casilla);
            var l = r == 0 ? new Destino("L0", i >> 1, casilla) : new Destino("L" + (2 * r - 1), t.De.W[r].Count - 1 - i, "b");
            return (w, l);
        }
        var q = r + 1; var tot = 2 * (k - 1);
        Destino w2;
        if (q == tot) w2 = new Destino("F", 0, "b");
        else if (q % 2 == 1) w2 = new Destino("L" + q, i, "a");
        else w2 = new Destino("L" + q, i >> 1, casilla);
        return (w2, null);
    }

    static void PonerDE(Torneo t, Destino? d, string? v)
    {
        if (d == null) return;
        var m = PartidoDE(t, d.Clave, d.I);
        var actual = d.Casilla == "a" ? m.A : m.B;
        if (actual == v) return;
        if (d.Casilla == "a") m.A = v; else m.B = v;
        if (m.W != null) { m.Sa = null; m.Sb = null; m.Live = null; GanadorDE(t, d.Clave, d.I, null); }
    }

    public static void GanadorDE(Torneo t, string clave, int i, string? nombre)
    {
        var m = PartidoDE(t, clave, i);
        var d = DestinosDE(t, clave, i);
        m.W = nombre;
        var perdedor = nombre == null ? null : (nombre == m.A ? m.B : m.A);
        PonerDE(t, d.Gana, nombre);
        PonerDE(t, d.Pierde, perdedor);
    }

    public static void AutoDE(Torneo t)
    {
        var cambio = true; var g = 0;
        void Auto(string clave, int i, Partido m)
        {
            if (m.W != null || m.A == null || m.B == null) return;
            if (m.A == Bye || m.B == Bye) { cambio = true; GanadorDE(t, clave, i, m.A == Bye ? m.B : m.A); }
        }
        while (cambio && g++ < 60)
        {
            cambio = false;
            foreach (var ty in new[] { "W", "L" })
            {
                var lista = ty == "W" ? t.De!.W : t.De!.L;
                for (var r = 0; r < lista.Count; r++)
                    for (var i = 0; i < lista[r].Count; i++) Auto(ty + r, i, lista[r][i]);
            }
            Auto("F", 0, t.De!.F[0]);
        }
    }

    public static void GenDE(Torneo t, List<string> tm)
    {
        var N = 2;
        while (N < tm.Count) N *= 2;
        var k = (int)Math.Round(Math.Log(N) / Math.Log(2));
        var W = new List<List<Partido>>(); var L = new List<List<Partido>>();
        var tt = tm.ToList();
        while (tt.Count < N) tt.Add(Bye);
        for (var r = 0; r < k; r++)
        {
            var n = N / (int)Math.Pow(2, r + 1);
            var rd = new List<Partido>();
            for (var i = 0; i < n; i++) rd.Add(new Partido());
            W.Add(rd);
        }
        for (var i = 0; i < N / 2; i++) { W[0][i].A = tt[i]; W[0][i].B = tt[N - 1 - i]; }
        for (var q = 1; q <= 2 * (k - 1); q++)
        {
            var n = N / (int)Math.Pow(2, (int)Math.Ceiling(q / 2.0) + 1);
            var rd = new List<Partido>();
            for (var i = 0; i < n; i++) rd.Add(new Partido());
            L.Add(rd);
        }
        t.De = new DobleElim { W = W, L = L, F = new List<Partido> { new() } };
        t.Rounds = new(); t.Tp = null;
        AutoDE(t);
    }
}
