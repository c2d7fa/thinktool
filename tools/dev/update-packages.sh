#!/bin/bash

set -e

# After updating and publishing the latest version of the '@thinktool/client'
# package, run this script to update its dependants.

# I will usually publish @thinktool/client immediately before running this
# script, and it seems like it doesn't always catch that unless we clean the
# cache.
npm cache clean --force

cd src/web
npm ci
npm update @thinktool/client

cd ../desktop
npm update @thinktool/client
cd ../..

bash tools/dev/link-packages.sh
