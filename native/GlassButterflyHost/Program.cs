using System.Windows.Forms;

namespace GlassButterfly;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        // Milestone 1: always open a normal, resizable test window that hosts
        // the existing renderer in WebView2. The Windows screensaver argument
        // handling (/s, /c, /p <HWND>) is implemented in a later milestone.
        string rendererDir = RendererLocator.Resolve(args);
        Application.Run(new HostForm(rendererDir));
    }
}
