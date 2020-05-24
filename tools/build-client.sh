#!/usr/bin/env bash

set -e

./tools/build-shared-client.sh

echo "Bundling web client..."
cd src/web
npm i
npm run bundle
cd ../..
