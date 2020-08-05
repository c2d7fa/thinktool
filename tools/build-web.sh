#!/usr/bin/env bash

# The web client depends on the availablility of an up-to-date version of
# '@thinktool/client'. Make sure the latest version of that package is
# published, before running this script. Alternatively, manually use 'npm link'
# to use a local version.
#
# The environment variable 'DIAFORM_API_HOST' should be set to the URL of the
# API server, e.g. 'https://api.thinktool.io'.

set -e

# Build static resources

./tools/build-static.sh

# Build scripts

echo "Building configuration file..."
mkdir -p conf
echo "{\"apiHost\": \"$DIAFORM_API_HOST\"}" > conf/client.json

echo "Bundling web client..."
cd src/web
npm ci
npm run bundle
cd ../..
