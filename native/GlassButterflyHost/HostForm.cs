using System.Drawing;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace GlassButterfly;

/// <summary>
/// Milestone 1 test window: a normal resizable form hosting WebView2, which
/// loads the existing GlassButterfly renderer from a virtual host mapped to the
/// build folder. A stub window.glass bridge lets the renderer run without
/// Electron; the real native bridge and screensaver lifecycle come later.
/// </summary>
internal sealed class HostForm : Form
{
    private const string VirtualHost = "glassbutterfly.assets";

    private readonly WebView2 _web = new();
    private readonly string _rendererDir;

    public HostForm(string rendererDir)
    {
        _rendererDir = rendererDir;

        Text = "GlassButterfly — WebView2 host (test window)";
        Width = 1280;
        Height = 720;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.Black;

        _web.Dock = DockStyle.Fill;
        Controls.Add(_web);

        Load += async (_, _) => await InitAsync();
    }

    private async Task InitAsync()
    {
        if (!File.Exists(Path.Combine(_rendererDir, "index.html")))
        {
            MessageBox.Show(
                "Renderer build not found at:\n" + _rendererDir + "\n\n" +
                "Build it first from the repo root:\n    npm run build:web\n\n" +
                "Then either copy dist/web next to this host as a 'renderer' folder, " +
                "or launch with:  GlassButterfly.exe --renderer <path-to-dist/web>",
                "GlassButterfly", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            Close();
            return;
        }

        // Keep WebView2's per-user data out of the (possibly read-only) install dir.
        string userData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "GlassButterfly", "WebView2");
        Directory.CreateDirectory(userData);

        try
        {
            CoreWebView2Environment env =
                await CoreWebView2Environment.CreateAsync(browserExecutableFolder: null, userDataFolder: userData, options: null);
            await _web.EnsureCoreWebView2Async(env);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Failed to start WebView2. The Evergreen WebView2 Runtime may be missing.\n" +
                "Install it from https://developer.microsoft.com/microsoft-edge/webview2/ and retry.\n\n" +
                ex.Message,
                "GlassButterfly", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }

        // Black default avoids a white flash before the renderer paints.
        _web.DefaultBackgroundColor = Color.Black;

        CoreWebView2 core = _web.CoreWebView2;

        // Serve the built renderer as a same-origin https site. Built-in JPGs and
        // the .glb load as 'self'; custom (glass-asset) wallpapers are handled in
        // a later milestone by the real native bridge.
        core.SetVirtualHostNameToFolderMapping(
            VirtualHost, _rendererDir, CoreWebView2HostResourceAccessKind.Allow);

        // Milestone 1 stub bridge so the renderer runs without Electron.
        // Milestone 6 replaces this with a minimal, capability-scoped native bridge.
        await core.AddScriptToExecuteOnDocumentCreatedAsync(BridgeScript);

        core.Navigate($"https://{VirtualHost}/index.html");
    }

    /// <summary>
    /// Minimal in-memory implementation of the window.glass contract so the
    /// renderer runs. No real persistence yet — settings live for the session.
    /// (No double-quote characters here, so it embeds cleanly as a verbatim string.)
    /// </summary>
    private const string BridgeScript = @"
(function () {
  var DEFAULTS = { backgroundImage: 'builtin:rome', use24Hour: true, showSeconds: false, butterflyCount: 1 };
  var current = DEFAULTS;
  var listeners = [];
  window.glass = {
    initialSettings: current,
    getSettings: function () { return Promise.resolve(current); },
    saveSettings: function (patch) {
      current = Object.assign({}, current, patch || {});
      listeners.slice().forEach(function (fn) { try { fn(current); } catch (e) {} });
      return Promise.resolve(current);
    },
    selectBackgroundImage: function () { return Promise.resolve(null); },
    quit: function () {},
    onSettingsChanged: function (cb) {
      listeners.push(cb);
      return function () { var i = listeners.indexOf(cb); if (i >= 0) { listeners.splice(i, 1); } };
    }
  };
})();
";
}
