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

            self'.packages.dev
          ];
        }
        // config.process-compose.dev.environmentVariables
      );
    };
}
