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
        config.process-compose.dev.environmentVariables
        // {
          packages = with pkgs; [
            git
            pnpm
            playwright-driver
            steam-run-free

            self'.packages.dev
          ];

          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          shellHook = ''
            export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
          '';
        }
      );
    };
}
