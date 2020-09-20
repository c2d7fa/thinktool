#!/bin/bash

set -e

# After updating and publishing the latest version of the '@thinktool/client'
# package, run this script to update its dependants.

version="$(date +"%Y%m%d%H%M.0.0")"

cd src/web
npm update @thinktool/client
npm version "$version"

cd ../desktop
npm update @thinktool/client
npm version "$version"

# Replace links and dates on download page
cd ../markup
sed -i -e 's/[0-9]\+\.[0-9]\+\.[0-9]\+/'"$version"'/g' download.handlebars
sed -i -e 's/"[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}"/'"$(date +"%Y-%m-%dT%H:%M:%S")"'/g' download.handlebars
sed -i -e 's/>[A-Za-z]\+ [1-9][0-9]\?, [0-9]\{4\}/>'"$(date +"%B %-d, %Y")"'/g' download.handlebars

cd ../..

bash tools/dev/link-packages.sh
