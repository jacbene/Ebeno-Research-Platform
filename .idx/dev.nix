# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "unstable"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_18
    pkgs.nodePackages.nodemon
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "prisma.prisma"
      "dbaeumer.vscode-eslint"
    ];
    workspace = {
      # Runs when the workspace is first created
      onCreate = {
        install-dependencies = "npm install";
      };
      # Runs when the workspace is started
      onStart = {
        # start-database = "npm run docker:up";
        # run-migrations = "npm run migrate:dev";
      };
    };
  };
}
