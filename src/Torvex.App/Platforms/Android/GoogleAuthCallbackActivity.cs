using Android.App;
using Android.Content;
using Microsoft.Maui.Authentication;

namespace Torvex.App;

[Activity(NoHistory = true, LaunchMode = Android.Content.PM.LaunchMode.SingleTop, Exported = true)]
[IntentFilter(
    new[] { Intent.ActionView },
    Categories = new[] { Intent.CategoryDefault, Intent.CategoryBrowsable },
    DataScheme = "com.torvex.app",
    DataHost = "login-callback")]
public class GoogleAuthCallbackActivity : WebAuthenticatorCallbackActivity
{
}
