To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "unstable"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
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

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # Backend server
        backend = {
          command = ["npm" "run" "dev" "--prefix" "backend"];
          manager = "web";
          env = {
            PORT = "$PORT";
            FRONTEND_URL = "$IDE_PREVIEW_URL_FRONTEND";
          };
        };
        # Frontend server
        frontend = {
            command = ["npm" "run" "dev" "--prefix" "frontend"];
            manager = "web";
            env = {
                PORT = "$PORT";
            };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        npm-install-backend = "npm install --prefix backend";
        npm-install-frontend = "npm install --prefix frontend";
      };
      # Runs when the workspace is (re)started
      onStart = {
        prisma-generate = "npx prisma generate --schema=./backend/prisma/schema.prisma";
      };
    };
  };
}
