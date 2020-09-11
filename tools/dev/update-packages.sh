#!/bin/bash

set -e

# After updating and publishing the latest version of the '@thinktool/client'
# package, run this script to update its dependants. You should manually
# increment the version of those packages and publish them.

cd src/web
npm install @thinktool/client@latest

cd ../desktop
npm install @thinktool/client@latest

cd ../..

bash tools/dev/link-packages.sh
