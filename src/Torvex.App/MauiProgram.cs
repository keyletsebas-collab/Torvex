using Microsoft.Extensions.Logging;
using Torvex.App.Servicios;

namespace Torvex.App;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
			});

		// Servicios de la app (un solo ejemplar para toda la sesión)
		builder.Services.AddSingleton<SupabaseClient>();
		builder.Services.AddSingleton<Cuentas>();
		builder.Services.AddSingleton<AlmacenTorneos>();
		builder.Services.AddSingleton<Temas>();
		builder.Services.AddSingleton<Avisos>();

#if DEBUG
		builder.Services.AddHybridWebViewDeveloperTools();
		builder.Logging.AddDebug();
#endif

		return builder.Build();
	}
}
