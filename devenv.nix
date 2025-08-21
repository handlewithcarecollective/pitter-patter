{ pkgs, ... }:

{
  # https://devenv.sh/packages/
  packages = [ pkgs.git pkgs.git-lfs ];

  # https://devenv.sh/languages/
  languages.javascript = {
    enable = true;
    corepack.enable = true;
  };

  enterShell = ''
    git lfs install
  '';
}
