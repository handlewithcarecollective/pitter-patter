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
      # databases: Set the max selectable database number to 2^53 for testing
      # \n databases 9007199254740992
      extraConfig = "save \"\"";
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
