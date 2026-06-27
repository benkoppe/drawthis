{ inputs, ... }: {
  imports = [ inputs.process-compose-flake.flakeModule ];

  perSystem = { lib, pkgs, ... }: {
    process-compose.dev =
      let
        opencodePort = toString 47565;
      in
      {
        options.environmentVariables = lib.mkOption {
          type = lib.types.attrsOf lib.types.str;
          default = { };
        };

        config = {
          environmentVariables = {
            OPENCODE_PORT = opencodePort;
          };

          settings.processes = {
            opencode.command = "OPENCODE_ENABLE_EXA=1 nix run github:numtide/llm-agents.nix#opencode -- serve --port ${opencodePort}";

            server.command = "${lib.getExe pkgs.steam-run-free} ${lib.getExe pkgs.pnpm} dev --host";
          };

          cli.options.unix-socket = "process-compose-socket";
        };
      };
  };
}
