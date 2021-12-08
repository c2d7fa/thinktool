set -eou pipefail

version="${1:-}"

if [ -z "$version" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

cd src/client
sed -i "s/\"version\": \".*\"/\"version\": \"$version\"/" package.json
yarn build
yarn publish --non-interactive --new-version $version

cd ../web
yarn upgrade @thinktool/client@^$version

cd ../desktop
yarn upgrade @thinktool/client@^$version

