{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.nil
    pkgs.sqlite-interactive
  ];

  # https://devenv.sh/languages/
  languages.javascript = {
    enable = true;
    # Not corepack: let nixpkgs provide the pnpm binary. pkgs.pnpm is still 11.x,
    # hence pnpm_12. Keep it in sync with the packageManager field in package.json
    # — a different version rewrites the version recorded in pnpm-lock.yaml.
    npm.enable = true;
    pnpm.enable = true;
    pnpm.package = pkgs.pnpm_12;
  };

  services = {
    redis = {
      enable = true;
      extraConfig = "save \"\"";
      port = 6379;
    };
  };

  process.manager.implementation = "process-compose";

  processes = {
    demo = {
      exec = "pnpm --filter @pitter-patter/demo run start";
      process-compose.depends_on = {
        redis.condition = "process_healthy";
      };
    };
  };
}
