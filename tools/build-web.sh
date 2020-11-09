#!/bin/bash

# The environment variable 'DIAFORM_API_HOST' should be set to the URL of the
# API server, e.g. 'https://api.thinktool.io'.

set -eux -o pipefail

echo "Building icons..."
mkdir -p dist/static
cp -r src/static/icon.{svg,png} dist/static

echo "Building web client into dist/static/..."
cd src/web
npm ci
npm run build
cp -r dist/* ../../dist/static
cd ../..
