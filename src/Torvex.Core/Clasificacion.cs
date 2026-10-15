namespace Torvex.Core;

/// <summary>Clasificación, desempates, campeones y estadísticas.</summary>
public static class Clasificacion
{
    public static readonly (string Clave, string Nombre)[] Criterios =
    {
        ("", "Sin criterio"), ("dif", "Mayor diferencia"), ("fav", "Más a favor"), ("con", "Menos en contra"),
        ("gan", "Más victorias"), ("h2h", "Resultado entre ellos"), ("alf", "Orden alfabético")
    };

    static List<string> ListaDesempate(Torneo t) =>
        (t.Tb is { Count: > 0 } ? t.Tb : new List<string> { "dif", "fav" }).Where(x => !string.IsNullOrEmpty(x)).ToList();

    public static (int Gana, int Pierde, int Empate) Puntos(Torneo t, Partido m, out bool empate)
    {
        var pd = t.Pd ?? 1; var pw = t.Pw ?? 3;
        var d = Math.Abs(m.Sa!.Value - m.Sb!.Value);
        empate = d == 0;
        if (d == 0) return (pd, pd, pd);
        var v = t.Sport == "vol" && d < 2;
        return (v ? 2 : pw, v ? 1 : 0, 0);
    }

    static (int A, int B) PuntosPartido(Torneo t, Partido m)
    {
        var (gana, pierde, emp) = Puntos(t, m, out var empate);
        if (empate) return (emp, emp);
        return m.Sa > m.Sb ? (gana, pierde) : (pierde, gana);
    }

    public static List<Fila> Tabla(Torneo t)
    {
        var o = new Dictionary<string, Fila>();
        foreach (var n in t.Teams) o[n] = new Fila { N = n };
        foreach (var m in t.Matches)
        {
            if (!Formatos.Terminado(t, m)) continue;
            if (m.A == null || m.B == null || !o.TryGetValue(m.A, out var A) || !o.TryGetValue(m.B, out var B)) continue;
            var (pa, pb) = PuntosPartido(t, m);
            var d = Math.Abs(m.Sa!.Value - m.Sb!.Value);
            A.Pj++; B.Pj++; A.Gf += m.Sa.Value; A.Gc += m.Sb.Value; B.Gf += m.Sb.Value; B.Gc += m.Sa.Value; A.Pt += pa; B.Pt += pb;
            if (d == 0) { A.E++; B.E++; }
            else if (m.Sa > m.Sb) { A.G++; B.P++; }
            else { B.G++; A.P++; }
        }
        var rows = o.Values.OrderByDescending(r => r.Pt).ToList();
        var salida = new List<Fila>();
        var crit = ListaDesempate(t);
        var i = 0;
        while (i < rows.Count)
        {
            var j = i;
            while (j < rows.Count && rows[j].Pt == rows[i].Pt) j++;
            salida.AddRange(Desempatar(rows.GetRange(i, j - i), crit, t));
            i = j;
        }
        return salida;
    }

    static List<Fila> Desempatar(List<Fila> rows, List<string> crit, Torneo t)
    {
        if (rows.Count < 2 || crit.Count == 0) return rows;
        var c = crit[0]; var resto = crit.Skip(1).ToList();
        if (c == "alf") return rows.OrderBy(x => x.N, StringComparer.CurrentCulture).ToList();
        Func<Fila, int> clave;
        if (c == "h2h")
        {
            var mini = rows.ToDictionary(q => q.N, _ => 0);
            foreach (var m in t.Matches)
            {
                if (m.A == null || m.B == null || !mini.ContainsKey(m.A) || !mini.ContainsKey(m.B) || !Formatos.Terminado(t, m)) continue;
                var (pa, pb) = PuntosPartido(t, m);
                mini[m.A] += pa; mini[m.B] += pb;
            }
            clave = q => mini[q.N];
        }
        else clave = c switch
        {
            "dif" => q => q.Gf - q.Gc,
            "fav" => q => q.Gf,
            "con" => q => -q.Gc,
            "gan" => q => q.G,
            _ => _ => 0
        };
        var sr = rows.OrderByDescending(clave).ToList();
        var salida = new List<Fila>();
        var i = 0;
        while (i < sr.Count)
        {
            var j = i;
            while (j < sr.Count && clave(sr[j]) == clave(sr[i])) j++;
            salida.AddRange(Desempatar(sr.GetRange(i, j - i), resto, t));
            i = j;
        }
        return salida;
    }

    public static string Campeon(Torneo t)
    {
        if (!Formatos.Generado(t)) return "";
        if (t.Type == "dele")
        {
            var f = t.De!.F[0];
            return f.W != null && f.W != Formatos.Bye ? f.W : "";
        }
        if (t.Type == "elim" || t.Type == "grupos")
        {
            var rs = t.Rounds;
            return rs.Count > 0 ? (rs[^1][0].W ?? "") : "";
        }
        return t.Matches.All(m => m.Est == "cancelado" || Formatos.Terminado(t, m)) ? (Tabla(t).FirstOrDefault()?.N ?? "") : "";
    }

    public static string Subcampeon(Torneo t)
    {
        if (Campeon(t) == "") return "";
        if (t.Type == "liga") { var tb = Tabla(t); return tb.Count > 1 ? tb[1].N : ""; }
        var f = t.Type == "dele" ? t.De!.F[0] : t.Rounds[^1][0];
        var q = f.W == f.A ? f.B : f.A;
        return q == Formatos.Bye || q == null ? "" : q;
    }

    public static string Lugar(Torneo t, string equipo)
    {
        var c = Campeon(t);
        if (c != "" && equipo == c) return "Campeón";
        if (c != "" && equipo == Subcampeon(t)) return "Subcampeón";
        if (t.Tp?.W != null && equipo == t.Tp.W) return "Tercer lugar";
        return "Participación";
    }

    public static string Progreso(Torneo t)
    {
        var todos = Formatos.Partidos(t).Where(m => m.A != null && m.B != null && m.A != Formatos.Bye && m.B != Formatos.Bye).ToList();
        var jugados = todos.Count(m => m.W != null || (t.Type != "elim" && t.Type != "dele" && Formatos.Terminado(t, m)));
        if (t.Type == "liga" || t.Type == "elim")
        {
            var total = t.Type == "elim" ? t.Teams.Count - 1 : t.Matches.Count(m => m.Est != "cancelado");
            return $"{jugados} de {total} partidos jugados";
        }
        return $"{jugados} partidos jugados";
    }

    /// <summary>Estado del partido: programado, en curso, finalizado, aplazado o cancelado.</summary>
    public static string Estado(Torneo t, Partido m)
    {
        if (m.Est == "cancelado") return "cancelado";
        if (m.Bo > 1 ? m.W != null : (m.W != null || Formatos.Terminado(t, m))) return "finalizado";
        if (m.Live is { St: "on" } || (m.G?.Any(g => g.Live is { St: "on" }) ?? false)) return "en curso";
        return m.Est == "aplazado" ? "aplazado" : "programado";
    }

    // ---------- estadísticas por jugador ----------
    public sealed class Estadistica
    {
        public string Equipo { get; set; } = "";
        public string Jugador { get; set; } = "";
        public int Puntos { get; set; }
        public int Aces { get; set; }
        public int Bloqueos { get; set; }
        public int Faltas { get; set; }
        public int Amarillas { get; set; }
        public int Rojas { get; set; }
    }

    static IEnumerable<(Partido Objeto, string A, string B)> ObjetosEnVivo(Torneo t)
    {
        var o = new List<(Partido, string, string)>();
        foreach (var (_, _, m) in Formatos.Todos(t))
        {
            if (m.Live != null) o.Add((m, m.A ?? "", m.B ?? ""));
            if (m.G != null) foreach (var g in m.G) if (g.Live != null) o.Add((g, m.A ?? "", m.B ?? ""));
        }
        return o.OrderBy(p => p.Item1.Live!.Ts0);
    }

    public static List<Estadistica> Estadisticas(Torneo t)
    {
        var z = new Dictionary<string, Estadistica>();
        foreach (var (obj, a, b) in ObjetosEnVivo(t))
            foreach (var e in obj.Live!.Ev ?? new List<Evento>())
            {
                if (string.IsNullOrEmpty(e.P)) continue;
                var team = e.K == "a" ? a : b; var kk = team + "|" + e.P;
                if (!z.TryGetValue(kk, out var d)) z[kk] = d = new Estadistica { Equipo = team, Jugador = e.P };
                if (e.X is "run" or "pt" or "ace" or "blk") d.Puntos += e.V == 0 ? 1 : e.V;
                if (e.X == "ace") d.Aces++;
                if (e.X == "blk") d.Bloqueos++;
                if (e.X == "foul") d.Faltas++;
                if (e.X == "yc") d.Amarillas++;
                if (e.X == "rc") d.Rojas++;
            }
        return z.Values.ToList();
    }

    /// <summary>Suspensiones pendientes: dos amarillas o una roja suspenden al jugador en su siguiente partido.</summary>
    public static Dictionary<string, int> Suspensiones(Torneo t, long? antes = null)
    {
        var d = new Dictionary<string, (int yc, int pend)>();
        foreach (var (obj, a, b) in ObjetosEnVivo(t))
        {
            if (antes != null && obj.Live!.Ts0 >= antes) continue;
            foreach (var team in new[] { a, b })
                foreach (var k in d.Keys.ToList())
                    if (k.StartsWith(team + "|") && d[k].pend > 0) d[k] = (d[k].yc, d[k].pend - 1);
            foreach (var e in obj.Live!.Ev ?? new List<Evento>())
            {
                if (string.IsNullOrEmpty(e.P)) continue;
                var team = e.K == "a" ? a : b; var kk = team + "|" + e.P;
                d.TryGetValue(kk, out var cur);
                if (e.X == "yc") { cur.yc++; if (cur.yc % 2 == 0) cur.pend++; }
                else if (e.X == "rc") cur.pend++;
                d[kk] = cur;
            }
        }
        return d.ToDictionary(p => p.Key, p => p.Value.pend);
    }
}
