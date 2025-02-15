{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        inherit (pkgs.nodePackages) pnpm;
        inherit (pkgs) cloudflared;
      in
      {
        devShells. default = pkgs.mkShell {
          packages = [ pnpm cloudflared ];
          shellHook = ''
            if ! [[ -e node_modules ]]
            then
              ${pnpm}/bin/pnpm install
            fi

            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
        };
      });
}
