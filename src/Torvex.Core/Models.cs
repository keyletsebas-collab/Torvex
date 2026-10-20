using System.Text.Json;
using System.Text.Json.Serialization;

namespace Torvex.Core;

/// <summary>Opciones JSON compartidas. Los nombres coinciden con los de la versión web para que los datos de Supabase sean compatibles.</summary>
public static class Json
{
    public static readonly JsonSerializerOptions Opciones = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public static string A(object? o) => JsonSerializer.Serialize(o, Opciones);
    public static T? De<T>(string s) => JsonSerializer.Deserialize<T>(s, Opciones);
}

/// <summary>Un par de valores, uno por equipo ("a" y "b").</summary>
public sealed class Par<T>
{
    [JsonPropertyName("a")] public T A { get; set; } = default!;
    [JsonPropertyName("b")] public T B { get; set; } = default!;

    [JsonIgnore]
    public T this[string k]
    {
        get => k == "a" ? A : B;
        set { if (k == "a") A = value; else B = value; }
    }
}

public sealed class Jugador
{
    [JsonPropertyName("n")] public string N { get; set; } = "";
    [JsonPropertyName("num")] public string? Num { get; set; }
    [JsonPropertyName("pos")] public string? Pos { get; set; }
    [JsonPropertyName("st")] public bool St { get; set; }
    [JsonPropertyName("cap")] public bool Cap { get; set; }
}

public sealed class Plantilla
{
    [JsonPropertyName("coach")] public string Coach { get; set; } = "";
    [JsonPropertyName("pl")] public List<Jugador> Pl { get; set; } = [];
}

/// <summary>Evento anotado en vivo (carrera, punto, falta, tarjeta...).</summary>
public sealed class Evento
{
    [JsonPropertyName("x")] public string X { get; set; } = "";
    [JsonPropertyName("k")] public string K { get; set; } = "a";
    [JsonPropertyName("p")] public string? P { get; set; }
    [JsonPropertyName("lab")] public string? Lab { get; set; }
    [JsonPropertyName("ts")] public long Ts { get; set; }
    [JsonPropertyName("v")] public int V { get; set; }
}

/// <summary>Una entrada del historial para poder deshacer.</summary>
public sealed class EntradaHistorial
{
    [JsonPropertyName("s")] public string S { get; set; } = "";
    [JsonPropertyName("a")] public int A { get; set; }
    [JsonPropertyName("r")] public Evento? R { get; set; }
    [JsonPropertyName("ri")] public int Ri { get; set; }
    [JsonPropertyName("m")] public Evento? M { get; set; }
    [JsonPropertyName("mi")] public int Mi { get; set; }
}

/// <summary>Estado del marcador en vivo de un partido.</summary>
public sealed class Live
{
    [JsonPropertyName("k")] public string K { get; set; } = "gen";
    [JsonPropertyName("st")] public string St { get; set; } = "on";   // on | fin
    [JsonPropertyName("ts0")] public long Ts0 { get; set; }
    // Baseball5
    [JsonPropertyName("r")] public Par<List<int>>? R { get; set; }
    [JsonPropertyName("inn")] public int Inn { get; set; }
    [JsonPropertyName("half")] public string Half { get; set; } = "a";
    [JsonPropertyName("o")] public int O { get; set; }
    // Basket 3x3 y otros
    [JsonPropertyName("p")] public Par<int>? P { get; set; }
    [JsonPropertyName("f")] public Par<int>? F { get; set; }
    [JsonPropertyName("rem")] public double Rem { get; set; }
    [JsonPropertyName("run")] public bool Run { get; set; }
    [JsonPropertyName("t0")] public long T0 { get; set; }
    // Voleibol
    [JsonPropertyName("sets")] public List<int[]>? Sets { get; set; }
    [JsonPropertyName("cur")] public int[]? Cur { get; set; }
    [JsonPropertyName("w")] public Par<int>? W { get; set; }
    [JsonPropertyName("over")] public bool Over { get; set; }
    // Historial y línea de tiempo
    [JsonPropertyName("h")] public List<EntradaHistorial>? H { get; set; }
    [JsonPropertyName("ev")] public List<Evento>? Ev { get; set; }
}

/// <summary>Partido, cruce de llaves o juego de una serie.</summary>
public sealed class Partido
{
    [JsonPropertyName("a")] public string? A { get; set; }
    [JsonPropertyName("b")] public string? B { get; set; }
    [JsonPropertyName("w")] public string? W { get; set; }
    [JsonPropertyName("sa")] public int? Sa { get; set; }
    [JsonPropertyName("sb")] public int? Sb { get; set; }
    [JsonPropertyName("bo")][JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] public int Bo { get; set; }
    [JsonPropertyName("g")] public List<Partido>? G { get; set; }
    [JsonPropertyName("date")] public string? Date { get; set; }
    [JsonPropertyName("time")] public string? Time { get; set; }
    [JsonPropertyName("court")] public string? Court { get; set; }
    [JsonPropertyName("est")] public string? Est { get; set; }
    [JsonPropertyName("live")] public Live? Live { get; set; }
}

public sealed class Grupo
{
    [JsonPropertyName("n")] public string N { get; set; } = "";
    [JsonPropertyName("teams")] public List<string> Teams { get; set; } = [];
    [JsonPropertyName("matches")] public List<Partido> Matches { get; set; } = [];
}

/// <summary>Cuadros de la doble eliminación: ganadores (W), perdedores (L) y gran final (F).</summary>
public sealed class DobleElim
{
    [JsonPropertyName("W")] public List<List<Partido>> W { get; set; } = [];
    [JsonPropertyName("L")] public List<List<Partido>> L { get; set; } = [];
    [JsonPropertyName("F")] public List<Partido> F { get; set; } = [new Partido()];
}

/// <summary>Una edición de torneo.</summary>
public sealed class Torneo
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("sport")] public string Sport { get; set; } = "beis";
    [JsonPropertyName("rama")] public string? Rama { get; set; }
    [JsonPropertyName("type")] public string Type { get; set; } = "elim";   // liga | elim | grupos | dele
    [JsonPropertyName("teams")] public List<string> Teams { get; set; } = [];
    [JsonPropertyName("rounds")] public List<List<Partido>> Rounds { get; set; } = [];
    [JsonPropertyName("matches")] public List<Partido> Matches { get; set; } = [];
    [JsonPropertyName("gr")] public List<Grupo> Gr { get; set; } = [];
    [JsonPropertyName("ro")] public Dictionary<string, Plantilla> Ro { get; set; } = [];
    [JsonPropertyName("tp")] public Partido? Tp { get; set; }
    [JsonPropertyName("de")] public DobleElim? De { get; set; }
    [JsonPropertyName("dbl")] public bool Dbl { get; set; }
    [JsonPropertyName("ng")] public int Ng { get; set; }
    [JsonPropertyName("third")] public bool Third { get; set; }
    [JsonPropertyName("bo")] public int Bo { get; set; }
    [JsonPropertyName("boF")] public int BoF { get; set; }
    [JsonPropertyName("pw")] public int? Pw { get; set; }
    [JsonPropertyName("pd")] public int? Pd { get; set; }
    [JsonPropertyName("tb")] public List<string>? Tb { get; set; }
    [JsonPropertyName("maxp")] public int Maxp { get; set; }
    [JsonPropertyName("cupo")] public int Cupo { get; set; }
    [JsonPropertyName("open")] public bool Open { get; set; }
    [JsonPropertyName("arch")] public bool Arch { get; set; }
    [JsonPropertyName("rules")] public string? Rules { get; set; }

    public Plantilla Roster(string equipo)
    {
        if (!Ro.TryGetValue(equipo, out var p)) Ro[equipo] = p = new Plantilla();
        return p;
    }
}

/// <summary>Una fila de la tabla de posiciones.</summary>
public sealed class Fila
{
    public string N { get; set; } = "";
    public int Pj { get; set; }
    public int G { get; set; }
    public int E { get; set; }
    public int P { get; set; }
    public int Gf { get; set; }
    public int Gc { get; set; }
    public int Pt { get; set; }
    public int Dif => Gf - Gc;
}
