{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.git-lfs
    pkgs.nil
    pkgs.sqlite-interactive
  ];

  # https://devenv.sh/languages/
  languages.javascript = {
    enable = true;
    corepack.enable = true;
  };

  services = {
    redis = {
      enable = true;
      # databases: 2147483647 is the maximum allowed index for databases
      extraConfig = "save \"\" \n databases 214";
      port = 6379;
    };
  };

  process.manager.implementation = "process-compose";

  processes = {
    demo = {
      exec = "yarn workspace @pitter-patter/demo start";
      process-compose.depends_on = {
        redis.condition = "process_healthy";
      };
    };
  };

  enterShell = ''
    git lfs install
  '';
}
