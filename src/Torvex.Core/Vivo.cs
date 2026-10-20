namespace Torvex.Core;

/// <summary>Marcador en vivo para Baseball5, Basket 3x3, Voleibol y otros deportes.</summary>
public static class Vivo
{
    public const int SetsParaGanar = 2;
    public static Func<long> Ahora = () => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public static Func<DateTime> HoraLocal = () => DateTime.Now;

    public static Live Nuevo(Torneo t)
    {
        var k = string.IsNullOrEmpty(t.Sport) ? "gen" : t.Sport;
        var L = new Live { K = k, St = "on", H = new(), Ev = new(), Ts0 = Ahora() };
        switch (k)
        {
            case "beis": L.R = new Par<List<int>> { A = new() { 0 }, B = new() { 0 } }; L.Inn = 0; L.Half = "a"; L.O = 0; break;
            case "bas3": L.P = new Par<int>(); L.F = new Par<int>(); L.Rem = 600000; L.Run = false; L.T0 = 0; break;
            case "vol": L.Sets = new(); L.Cur = new[] { 0, 0 }; L.W = new Par<int>(); break;
            default: L.P = new Par<int>(); break;
        }
        return L;
    }

    public static void Iniciar(Torneo t, Partido m)
    {
        m.Live = Nuevo(t);
        Sincronizar(m);
    }

    /// <summary>Copia el marcador en vivo al resultado del partido.</summary>
    public static void Sincronizar(Partido m)
    {
        var L = m.Live!;
        if (L.K == "beis") { m.Sa = L.R!.A.Sum(); m.Sb = L.R.B.Sum(); }
        else if (L.K == "vol") { m.Sa = L.W!.A; m.Sb = L.W.B; }
        else { m.Sa = L.P!.A; m.Sb = L.P.B; }
    }

    public static double Restante(Live L) => L.Run ? Math.Max(0, L.Rem - (Ahora() - L.T0)) : L.Rem;

    public static string Reloj(double ms)
    {
        var q = (int)Math.Ceiling(ms / 1000);
        return $"{q / 60}:{q % 60:00}";
    }

    static void Mitad(Live L)
    {
        L.O = 0;
        if (L.Half == "a") L.Half = "b";
        else { L.Half = "a"; L.Inn++; L.R!.A.Add(0); L.R.B.Add(0); }
    }

    static string Etiqueta(Live L) => L.K switch
    {
        "beis" => "Entrada " + (L.Inn + 1),
        "bas3" => Reloj(Restante(L)),
        "vol" => "Set " + (L.Sets!.Count + 1),
        _ => HoraLocal().ToString("HH:mm")
    };

    /// <summary>
    /// Aplica una acción al marcador. Acciones: run, unrun, out, half (Baseball5); pt, pm, foul, clk (Basket y otros);
    /// pt, ace, blk, pm (Voleibol); yc, rc (tarjetas en todos); undo (deshacer).
    /// </summary>
    public static void Accion(Partido m, string x, string k = "a", int v = 1, string? jugador = null)
    {
        var L = m.Live!;
        var h = L.H ?? new List<EntradaHistorial>();
        var ev = L.Ev ?? new List<Evento>();
        L.H = null; L.Ev = null;
        var snap = Json.A(L);
        var cambia = x != "clk";
        var lab = Etiqueta(L);
        var pl = jugador ?? "";
        var aniadido = 0; Evento? quitado = null; var quitadoIdx = 0;
        Evento? modificado = null; var modificadoIdx = 0;

        if (x == "undo")
        {
            if (h.Count == 0) { L.H = h; L.Ev = ev; return; }
            var e = h[^1]; h.RemoveAt(h.Count - 1);
            var nl = Json.De<Live>(e.S)!;
            nl.H = h;
            if (e.A != 0 && ev.Count > 0) ev.RemoveAt(ev.Count - 1);
            if (e.R != null) ev.Insert(Math.Min(e.Ri, ev.Count), e.R);
            if (e.M != null && e.Mi >= 0 && e.Mi < ev.Count) ev[e.Mi] = e.M;
            nl.Ev = ev; m.Live = nl; Sincronizar(m);
            return;
        }

        void Agregar(string tipo, int valor = 0)
        {
            ev.Add(new Evento { X = tipo, K = k, P = pl, Lab = lab, Ts = Ahora(), V = valor });
            aniadido = 1;
        }
        void Quitar(params string[] tipos)
        {
            for (var j = ev.Count - 1; j >= 0; j--)
                if (ev[j].K == k && tipos.Contains(ev[j].X)) { quitado = ev[j]; ev.RemoveAt(j); quitadoIdx = j; return; }
        }
        void RestarPunto()
        {
            if (L.P![k] <= 0) return;
            L.P[k]--;
            for (var j = ev.Count - 1; j >= 0; j--)
            {
                if (ev[j].K != k || ev[j].X != "pt") continue;
                if (ev[j].V > 1)
                {
                    modificado = Json.De<Evento>(Json.A(ev[j]))!;
                    modificadoIdx = j;
                    ev[j].V--;
                }
                else Quitar("pt");
                return;
            }
        }

        if (x is "yc" or "rc") Agregar(x);
        else if (L.K == "beis")
        {
            if (x is "run" or "unrun")
            {
                var ar = L.R![k];
                while (ar.Count <= L.Inn) ar.Add(0);
                ar[L.Inn] = Math.Max(0, ar[L.Inn] + (x == "run" ? 1 : -1));
                if (x == "run") Agregar("run", 1); else Quitar("run");
            }
            else if (x == "out") { L.O++; if (L.O >= 3) Mitad(L); }
            else if (x == "half") Mitad(L);
        }
        else if (L.K == "bas3")
        {
            if (x == "pt") { L.P![k] += v; Agregar("pt", v); }
            else if (x == "pm") RestarPunto();
            else if (x == "foul") { L.F![k] += 1; Agregar("foul"); }
            else if (x == "clk")
            {
                if (L.Run) { L.Rem = Restante(L); L.Run = false; }
                else { L.T0 = Ahora(); L.Run = true; }
            }
        }
        else if (L.K == "vol")
        {
            var i = k == "a" ? 0 : 1; var o = 1 - i;
            if (x is "pt" or "ace" or "blk")
            {
                Agregar(x, 1);
                L.Cur![i]++;
                var objetivo = (L.W!.A == SetsParaGanar - 1 && L.W.B == SetsParaGanar - 1) ? 15 : 25;
                if (L.Cur[i] >= objetivo && L.Cur[i] - L.Cur[o] >= 2)
                {
                    L.Sets!.Add((int[])L.Cur.Clone());
                    L.W[k]++;
                    L.Cur = new[] { 0, 0 };
                    if (L.W[k] >= SetsParaGanar) L.Over = true;
                }
            }
            else if (x == "pm") { L.Cur![i] = Math.Max(0, L.Cur[i] - 1); Quitar("pt", "ace", "blk"); }
        }
        else
        {
            if (x == "pt") { L.P![k] += 1; Agregar("pt", 1); }
            else if (x == "pm") { L.P![k] = Math.Max(0, L.P[k] - 1); Quitar("pt"); }
        }

        if (cambia)
        {
            h.Add(new EntradaHistorial { S = snap, A = aniadido, R = quitado, Ri = quitadoIdx, M = modificado, Mi = modificadoIdx });
            if (h.Count > 25) h.RemoveAt(0);
        }
        L.H = h; L.Ev = ev; Sincronizar(m);
    }

    public enum ResultadoFin { Ok, Empatado, PartidoSinTerminar }

    /// <summary>
    /// Finaliza el marcador en vivo y actualiza llaves o series. <paramref name="partido"/> es el partido (o juego) en vivo
    /// y <paramref name="clave"/>/<paramref name="i"/>/<paramref name="juego"/> indican dónde está dentro del torneo.
    /// En voleibol, si el partido aún no termina, hay que pasar <paramref name="forzar"/> = true.
    /// </summary>
    public static ResultadoFin Finalizar(Torneo t, Partido partido, string clave, int i, int? juego, bool forzar = false)
    {
        var L = partido.Live!;
        Sincronizar(partido);
        if (partido.Sa == partido.Sb && (!Deportes.De(t.Sport).Empates || Formatos.EsLlave(t, clave) || juego != null))
            return ResultadoFin.Empatado;
        if (L.K == "vol" && !L.Over && !forzar) return ResultadoFin.PartidoSinTerminar;
        if (L.Run) { L.Rem = Restante(L); L.Run = false; }
        L.St = "fin";
        if (juego != null) Formatos.Serie(t, clave, i);
        else if (clave == "T" || Formatos.EsLlave(t, clave))
            Formatos.PonerResultado(t, clave, i, partido.Sa > partido.Sb ? partido.A : partido.B);
        return ResultadoFin.Ok;
    }

    public static void Reabrir(Torneo t, Partido partido, string clave, int i, int? juego)
    {
        partido.Live!.St = "on";
        if (juego != null) Formatos.Serie(t, clave, i);
        else if (clave == "T" || Formatos.EsLlave(t, clave)) Formatos.PonerResultado(t, clave, i, null);
    }

    /// <summary>Partidos que están jugándose ahora mismo.</summary>
    public sealed record EnJuego(Torneo Torneo, string Clave, int I, int? Juego, Partido Partido, Partido Marcador);

    public static List<EnJuego> EnCurso(IEnumerable<Torneo> torneos)
    {
        var o = new List<EnJuego>();
        foreach (var t in torneos)
            foreach (var (r, i, m) in Formatos.Todos(t))
            {
                if (m.Bo > 1 && m.G != null)
                {
                    for (var gi = 0; gi < m.G.Count; gi++)
                        if (m.G[gi].Live is { St: "on" }) o.Add(new EnJuego(t, r, i, gi, m, m.G[gi]));
                }
                else if (m.Live is { St: "on" }) o.Add(new EnJuego(t, r, i, null, m, m));
            }
        return o;
    }
}
