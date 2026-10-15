using Torvex.Core;
using Xunit;

namespace Torvex.Core.Tests;

public class FormatosTests
{
    static Torneo Nuevo(string tipo, int n, string deporte = "bas3", Action<Torneo>? ajustar = null)
    {
        var t = new Torneo { Id = 1, Sport = deporte, Type = tipo, Teams = Enumerable.Range(1, n).Select(i => "T" + i).ToList() };
        ajustar?.Invoke(t);
        Formatos.Azar = new Random(7);
        Formatos.Generar(t);
        return t;
    }

    [Theory]
    [InlineData(4, 6)]
    [InlineData(5, 10)]
    [InlineData(8, 28)]
    public void Liga_genera_todos_contra_todos(int equipos, int partidos)
        => Assert.Equal(partidos, Nuevo("liga", equipos).Matches.Count);

    [Fact]
    public void Liga_ida_y_vuelta_duplica_partidos()
        => Assert.Equal(12, Nuevo("liga", 4, ajustar: t => t.Dbl = true).Matches.Count);

    [Fact]
    public void Eliminacion_con_5_equipos_da_bye_y_avanza_al_rival()
    {
        var t = Nuevo("elim", 5);
        Assert.Equal(3, t.Rounds.Count);
        Assert.Equal(4, t.Rounds[0].Count);
        Assert.Equal(3, t.Rounds[0].Count(m => m.W != null));   // 3 byes avanzan solos
    }

    [Fact]
    public void Eliminacion_resuelve_campeon()
    {
        var t = Nuevo("elim", 4);
        for (var r = 0; r < t.Rounds.Count; r++)
            for (var i = 0; i < t.Rounds[r].Count; i++)
                Formatos.PonerResultado(t, r.ToString(), i, t.Rounds[r][i].A);
        Assert.Equal(t.Rounds[^1][0].A, Clasificacion.Campeon(t));
    }

    [Fact]
    public void Tercer_lugar_se_arma_con_los_perdedores_de_semifinales()
    {
        var t = Nuevo("elim", 4, ajustar: x => x.Third = true);
        Formatos.PonerResultado(t, "0", 0, t.Rounds[0][0].A);
        Formatos.PonerResultado(t, "0", 1, t.Rounds[0][1].B);
        Assert.NotNull(t.Tp);
        Assert.Equal(t.Rounds[0][0].B, t.Tp!.A);
        Assert.Equal(t.Rounds[0][1].A, t.Tp.B);
    }

    [Fact]
    public void Serie_al_mejor_de_3_se_gana_con_dos_juegos()
    {
        var t = Nuevo("elim", 2, ajustar: x => x.Bo = 3);
        var m = t.Rounds[0][0];
        Assert.Equal(3, m.Bo);
        m.G![0].Sa = 2; m.G[0].Sb = 1; Formatos.Serie(t, "0", 0);
        Assert.Null(m.W);
        Assert.Equal(2, m.G.Count);
        m.G[1].Sa = 5; m.G[1].Sb = 3; Formatos.Serie(t, "0", 0);
        Assert.Equal(m.A, m.W);
        Assert.Equal(2, m.Sa);
    }

    [Fact]
    public void Grupos_reparte_equipos_y_genera_llaves()
    {
        var t = Nuevo("grupos", 8);
        Assert.Equal(2, t.Gr.Count);
        Assert.All(t.Gr, g => Assert.Equal(4, g.Teams.Count));
        foreach (var g in t.Gr) foreach (var m in g.Matches) { m.Sa = 3; m.Sb = 1; }
        Formatos.GenerarLlaves(t);
        Assert.Equal(2, t.Rounds.Count);
        Assert.All(t.Rounds[0], m => { Assert.NotNull(m.A); Assert.NotNull(m.B); });
    }

    [Fact]
    public void Doble_eliminacion_con_4_equipos_tiene_cuadros_y_final()
    {
        var t = Nuevo("dele", 4);
        Assert.Equal(2, t.De!.W.Count);
        Assert.Equal(2, t.De.L.Count);
        // todos los partidos de ganadores ronda 0 los gana A; los perdedores caen a L0
        Formatos.PonerResultado(t, "W0", 0, t.De.W[0][0].A);
        Formatos.PonerResultado(t, "W0", 1, t.De.W[0][1].A);
        Assert.NotNull(t.De.L[0][0].A);
        Assert.NotNull(t.De.L[0][0].B);
        Assert.NotNull(t.De.W[1][0].A);
    }

    [Fact]
    public void Doble_eliminacion_con_3_equipos_resuelve_los_bye()
    {
        var t = Nuevo("dele", 3);
        Assert.NotEmpty(Formatos.Partidos(t));
        Assert.Contains(t.De!.W[0], m => m.W != null);
    }

    [Fact]
    public void Json_es_compatible_en_ida_y_vuelta()
    {
        var t = Nuevo("grupos", 6);
        var json = Json.A(t);
        var otro = Json.De<Torneo>(json)!;
        Assert.Equal(t.Teams, otro.Teams);
        Assert.Equal(t.Gr.Count, otro.Gr.Count);
        Assert.Contains("\"sport\":\"bas3\"", json);
    }

    [Fact]
    public void Json_de_la_version_web_se_lee()
    {
        const string web = "{\"id\":1700,\"name\":\"Edición 1\",\"sport\":\"vol\",\"rama\":\"f\",\"type\":\"liga\",\"teams\":[\"A\",\"B\"],\"rounds\":[],\"matches\":[{\"a\":\"A\",\"b\":\"B\",\"sa\":2,\"sb\":0}],\"ro\":{\"A\":{\"coach\":\"X\",\"pl\":[{\"n\":\"Ana\",\"num\":\"3\",\"pos\":\"Líbero\",\"st\":true,\"cap\":false}]}}}";
        var t = Json.De<Torneo>(web)!;
        Assert.Equal("Edición 1", t.Name);
        Assert.Equal(2, t.Matches[0].Sa);
        Assert.Equal("Ana", t.Ro["A"].Pl[0].N);
    }
}

public class ClasificacionTests
{
    static Torneo Liga(string deporte = "bas3")
    {
        var t = new Torneo { Sport = deporte, Type = "liga", Teams = { "A", "B", "C" } };
        t.Matches.Add(new Partido { A = "A", B = "B", Sa = 21, Sb = 10 });
        t.Matches.Add(new Partido { A = "A", B = "C", Sa = 15, Sb = 21 });
        t.Matches.Add(new Partido { A = "B", B = "C", Sa = 21, Sb = 20 });
        return t;
    }

    [Fact]
    public void Tabla_ordena_por_puntos_y_desempata_por_diferencia()
    {
        var tb = Clasificacion.Tabla(Liga());
        // A, B y C tienen 3 puntos. Diferencia: A +5, C +5, B -10. A y C empatan: gana el desempate "más a favor" (C 41, A 36).
        Assert.Equal(new[] { "C", "A", "B" }, tb.Select(f => f.N).ToArray());
        Assert.All(tb, f => Assert.Equal(3, f.Pt));
    }

    [Fact]
    public void Voleibol_otorga_3_2_1_segun_diferencia_de_sets()
    {
        var t = new Torneo { Sport = "vol", Type = "liga", Teams = { "A", "B" } };
        t.Matches.Add(new Partido { A = "A", B = "B", Sa = 2, Sb = 1 });
        var tb = Clasificacion.Tabla(t);
        Assert.Equal(2, tb.First(f => f.N == "A").Pt);
        Assert.Equal(1, tb.First(f => f.N == "B").Pt);
        t.Matches[0].Sb = 0;
        tb = Clasificacion.Tabla(t);
        Assert.Equal(3, tb.First(f => f.N == "A").Pt);
    }

    [Fact]
    public void Liga_completa_tiene_campeon()
    {
        var t = Liga();
        Assert.Equal("C", Clasificacion.Campeon(t));
    }

    [Fact]
    public void Estado_del_partido()
    {
        var t = Liga();
        var m = new Partido { A = "A", B = "B" };
        Assert.Equal("programado", Clasificacion.Estado(t, m));
        m.Live = Vivo.Nuevo(t); Vivo.Sincronizar(m);
        Assert.Equal("en curso", Clasificacion.Estado(t, m));
        m.Est = "cancelado";
        Assert.Equal("cancelado", Clasificacion.Estado(t, m));
    }
}

public class VivoTests
{
    static (Torneo t, Partido m) Partido(string deporte, string tipo = "liga")
    {
        var t = new Torneo { Sport = deporte, Type = tipo, Teams = { "A", "B" } };
        var m = new Partido { A = "A", B = "B" };
        t.Matches.Add(m);
        Vivo.Iniciar(t, m);
        return (t, m);
    }

    [Fact]
    public void Basket_suma_puntos_y_deshace()
    {
        var (_, m) = Partido("bas3");
        Vivo.Accion(m, "pt", "a", 2);
        Vivo.Accion(m, "pt", "b", 1);
        Assert.Equal(2, m.Sa); Assert.Equal(1, m.Sb);
        Vivo.Accion(m, "undo");
        Assert.Equal(0, m.Sb);
        Assert.Single(m.Live!.Ev!);
    }

    [Fact]
    public void Baseball_tres_outs_cambian_de_mitad_y_entrada()
    {
        var (_, m) = Partido("beis");
        Vivo.Accion(m, "run", "a");
        for (var i = 0; i < 3; i++) Vivo.Accion(m, "out", "a");
        Assert.Equal("b", m.Live!.Half);
        for (var i = 0; i < 3; i++) Vivo.Accion(m, "out", "b");
        Assert.Equal("a", m.Live.Half);
        Assert.Equal(1, m.Live.Inn);
        Assert.Equal(2, m.Live.R!.A.Count);
        Assert.Equal(1, m.Sa);
    }

    [Fact]
    public void Voleibol_gana_set_a_25_con_diferencia_de_2()
    {
        var (_, m) = Partido("vol");
        for (var i = 0; i < 24; i++) { Vivo.Accion(m, "pt", "a"); Vivo.Accion(m, "pt", "b"); }
        Vivo.Accion(m, "pt", "a");
        Assert.Empty(m.Live!.Sets!);          // 25-24 no alcanza
        Vivo.Accion(m, "pt", "a");
        Assert.Single(m.Live.Sets!);
        Assert.Equal(1, m.Sa);
    }

    [Fact]
    public void Voleibol_el_set_decisivo_es_a_15()
    {
        var (_, m) = Partido("vol");
        m.Live!.W!.A = 1; m.Live.W.B = 1;
        for (var i = 0; i < 15; i++) Vivo.Accion(m, "pt", "b");
        Assert.True(m.Live.Over);
        Assert.Equal(2, m.Sb);
    }

    [Fact]
    public void Finalizar_no_permite_empates_en_deportes_sin_empate()
    {
        var (t, m) = Partido("bas3");
        Assert.Equal(Vivo.ResultadoFin.Empatado, Vivo.Finalizar(t, m, "L", 0, null));
        Vivo.Accion(m, "pt", "a");
        Assert.Equal(Vivo.ResultadoFin.Ok, Vivo.Finalizar(t, m, "L", 0, null));
        Assert.Equal("finalizado", Clasificacion.Estado(t, m));
    }

    [Fact]
    public void Finalizar_en_llaves_avanza_al_ganador()
    {
        Formatos.Azar = new Random(3);
        var t = new Torneo { Sport = "bas3", Type = "elim", Teams = { "A", "B", "C", "D" } };
        Formatos.Generar(t);
        var m = t.Rounds[0][0];
        Vivo.Iniciar(t, m);
        Vivo.Accion(m, "pt", "b", 2);
        Assert.Equal(Vivo.ResultadoFin.Ok, Vivo.Finalizar(t, m, "0", 0, null));
        Assert.Equal(m.B, m.W);
        Assert.Equal(m.B, t.Rounds[1][0].A);
    }

    [Fact]
    public void Estadisticas_y_suspensiones_por_tarjetas()
    {
        var (t, m) = Partido("bas3");
        Vivo.Accion(m, "pt", "a", 2, "Ana");
        Vivo.Accion(m, "yc", "a", 1, "Ana");
        Vivo.Accion(m, "yc", "a", 1, "Ana");
        var est = Clasificacion.Estadisticas(t);
        Assert.Equal(2, est.Single().Puntos);
        Assert.Equal(2, est.Single().Amarillas);
        Assert.Equal(1, Clasificacion.Suspensiones(t)["A|Ana"]);
    }

    [Fact]
    public void Reloj_formatea_mm_ss()
    {
        Assert.Equal("10:00", Vivo.Reloj(600000));
        Assert.Equal("0:05", Vivo.Reloj(4200));
    }
}
