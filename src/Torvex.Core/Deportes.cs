namespace Torvex.Core;

/// <summary>Información de cada deporte soportado.</summary>
public sealed record InfoDeporte(string Clave, string Nombre, string Icono, string Unidad, bool Empates, int MaxTitulares, string[] Posiciones, string[] Reglas);

public static class Deportes
{
    public static readonly InfoDeporte Beis = new("beis", "Baseball5", "⚾", "Carreras", false, 5,
        new[] { "Primera base", "Segunda base", "Tercera base", "Campocorto", "Jardinero", "Suplente" },
        new[]
        {
            "Se juega con 5 jugadores por equipo y una pelota, sin bate ni guante.",
            "El partido dura 5 entradas y cada mitad termina con 3 outs.",
            "Si hay empate al terminar, se juegan entradas extra.",
            "En la app el marcador son las carreras y no se aceptan empates."
        });

    public static readonly InfoDeporte Bas3 = new("bas3", "Basket 3x3", "🏀", "Puntos", false, 3,
        new[] { "Base", "Alero", "Pívot", "Suplente" },
        new[]
        {
            "Cada equipo juega con 3 jugadores en cancha y puede tener 1 suplente.",
            "El partido dura 10 minutos o termina cuando un equipo llega a 21 puntos.",
            "Los tiros valen 1 punto, o 2 si son detrás del arco.",
            "Si hay empate, se juega tiempo extra. En la app no se aceptan empates."
        });

    public static readonly InfoDeporte Vol = new("vol", "Voleibol", "🏐", "Sets", false, 6,
        new[] { "Colocador", "Opuesto", "Central", "Receptor-atacante", "Líbero", "Suplente" },
        new[]
        {
            "Los sets se juegan a 25 puntos, con diferencia de 2.",
            "El set decisivo se juega a 15 puntos, también con diferencia de 2.",
            "El partido se gana con 2 sets.",
            "En liga, ganar por 2 o más sets da 3 puntos; ganar por 1 set da 2 puntos y perder por 1 set da 1."
        });

    public static readonly InfoDeporte Gen = new("gen", "Otro deporte", "🏆", "Marcador", true, 0,
        new[] { "Portero", "Defensa", "Medio", "Delantero", "Suplente" },
        new[] { "Se permiten empates. En liga: victoria 3 puntos, empate 1." });

    public static readonly InfoDeporte[] Principales = { Beis, Bas3, Vol };

    public static InfoDeporte De(string? clave) => clave switch
    {
        "beis" => Beis,
        "bas3" => Bas3,
        "vol" => Vol,
        _ => Gen
    };
}

public static class Nombres
{
    public static string Formato(string tipo) => tipo switch
    {
        "liga" => "Liga",
        "elim" => "Eliminación directa",
        "grupos" => "Grupos y llaves",
        "dele" => "Doble eliminación",
        _ => "Torneo"
    };

    public static string Rama(string? r) => r switch { "f" => "Femenino", "m" => "Masculino", _ => "Sin rama" };

    public static string Rol(string? rol) => rol switch
    {
        "organizador" => "Coordinador deportivo",
        "anotador" => "Anotador",
        "arbitro" => "Árbitro",
        "entrenador" => "Manager de equipo",
        "capitan" => "Capitán",
        "jugador" => "Jugador",
        _ => "Visitante"
    };

    public static readonly string[] Roles = { "organizador", "anotador", "arbitro", "entrenador", "capitan", "jugador", "espectador" };

    public static bool RolPideEquipo(string? rol) => rol is "jugador" or "entrenador" or "capitan";
}

/// <summary>Reglas de permisos por cargo, iguales a las de la versión web.</summary>
public static class Permisos
{
    public static bool EsOrganizador(string? rol) => rol == "organizador";
    public static bool PuedeAnotar(string? rol) => rol is "organizador" or "arbitro" or "anotador";
    public static bool PuedeAdministrar(string? rol) => PuedeAnotar(rol);
}
