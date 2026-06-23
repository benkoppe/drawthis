{
  perSystem =
    {
      pkgs,
      config,
      self',
      ...
    }:
    {
      devShells.default = pkgs.mkShell (
        {
          packages = with pkgs; [
            git
            pnpm
            playwright-driver
            steam-run-free

            self'.packages.dev
          ];

          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
        }
        // config.process-compose.dev.environmentVariables
      );
    };
}
