#!/bin/bash

set -e

# After updating and publishing the latest version of the '@thinktool/client'
# package, run this script to update its dependants.

version="$(date +"%Y%m%d%H%M.0.0")"

cd src/web
npm update @thinktool/client@latest
npm version "$version"

cd ../desktop
npm update @thinktool/client@latest
npm version "$version"

cd ../markup
sed -i -e 's/[0-9]\+\.[0-9]\+\.[0-9]\+/'"$version"'/g' download.handlebars

cd ../..

bash tools/dev/link-packages.sh
