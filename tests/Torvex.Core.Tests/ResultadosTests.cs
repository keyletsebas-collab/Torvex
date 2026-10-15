using Torvex.Core;
using Xunit;

namespace Torvex.Core.Tests;

public class ResultadosTests
{
    static Torneo Llave(int equipos, Action<Torneo>? ajustar = null)
    {
        var t = new Torneo { Id = 1, Sport = "bas3", Type = "elim", Teams = Enumerable.Range(1, equipos).Select(i => "T" + i).ToList() };
        ajustar?.Invoke(t);
        Formatos.Azar = new Random(5);
        Formatos.Generar(t);
        return t;
    }

    [Fact]
    public void Resultado_en_llave_avanza_al_ganador()
    {
        var t = Llave(4);
        var m = t.Rounds[0][0];
        Assert.Equal(ResultadoManual.Ok, Resultados.Aplicar(t, "0", 0, null, 10, 21));
        Assert.Equal(m.B, m.W);
        Assert.Equal(m.B, t.Rounds[1][0].A);
    }

    [Fact]
    public void Empate_se_rechaza_en_llaves_y_en_deportes_sin_empate()
    {
        var t = Llave(4);
        Assert.Equal(ResultadoManual.Empate, Resultados.Aplicar(t, "0", 0, null, 5, 5));
        Assert.Null(t.Rounds[0][0].Sa);
    }

    [Fact]
    public void Empate_se_permite_en_liga_de_otro_deporte()
    {
        var t = new Torneo { Sport = "gen", Type = "liga", Teams = { "A", "B" } };
        t.Matches.Add(new Partido { A = "A", B = "B" });
        Assert.Equal(ResultadoManual.Ok, Resultados.Aplicar(t, "L", 0, null, 1, 1));
        Assert.Equal(1, Clasificacion.Tabla(t)[0].Pt);
    }

    [Fact]
    public void Sin_equipos_definidos_no_se_puede_anotar()
    {
        var t = Llave(4);
        Assert.Equal(ResultadoManual.FaltanEquipos, Resultados.Aplicar(t, "1", 0, null, 3, 2));
    }

    [Fact]
    public void Limpiar_deshace_el_avance()
    {
        var t = Llave(4);
        Resultados.Aplicar(t, "0", 0, null, 21, 3);
        Resultados.Limpiar(t, "0", 0, null);
        Assert.Null(t.Rounds[0][0].W);
        Assert.Null(t.Rounds[1][0].A);
        Assert.Null(t.Rounds[0][0].Sa);
    }

    [Fact]
    public void Juegos_de_una_serie_calculan_el_ganador()
    {
        var t = Llave(2, x => x.Bo = 3);
        var m = t.Rounds[0][0];
        Resultados.Aplicar(t, "0", 0, 0, 21, 10);
        Assert.Null(m.W);
        Resultados.Aplicar(t, "0", 0, 1, 21, 15);
        Assert.Equal(m.A, m.W);
        Resultados.Limpiar(t, "0", 0, 1);
        Assert.Null(m.W);
    }

    [Fact]
    public void Estado_aplazado_y_cancelado()
    {
        var m = new Partido { A = "A", B = "B" };
        Resultados.PonerEstado(m, "aplazado");
        Assert.Equal("aplazado", m.Est);
        Resultados.PonerEstado(m, "programado");
        Assert.Null(m.Est);
    }
}
