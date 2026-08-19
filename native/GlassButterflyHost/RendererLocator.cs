namespace GlassButterfly;

/// <summary>
/// Finds the built renderer folder (the one containing index.html). Order:
///   1. An explicit "--renderer &lt;path&gt;" argument.
///   2. A "renderer" folder next to the executable (the production layout).
///   3. A dev fallback of ../../dist/web relative to the build output, so the
///      host can be run straight from Visual Studio during development.
/// </summary>
internal static class RendererLocator
{
    public static string Resolve(string[] args)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], "--renderer", StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        }

        string beside = Path.Combine(AppContext.BaseDirectory, "renderer");
        if (File.Exists(Path.Combine(beside, "index.html")))
            return beside;

        // From native/GlassButterflyHost/bin/<cfg>/net8.0-windows/ up to repo root.
        string devGuess = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "dist", "web"));
        if (File.Exists(Path.Combine(devGuess, "index.html")))
            return devGuess;

        return beside;
    }
}
