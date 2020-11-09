#!/bin/bash

# The web client depends on the availablility of an up-to-date version of
# '@thinktool/client'. Make sure the latest version of that package is
# published, before running this script. Alternatively, manually use 'npm link'
# to use a local version.
#
# The environment variable 'DIAFORM_API_HOST' should be set to the URL of the
# API server, e.g. 'https://api.thinktool.io'.

set -eux -o pipefail

echo "Installing dependencies..."
npm ci

echo "Building images..."
mkdir -p dist/static
cp -r src/static/*.svg dist/static
cp -r src/static/*.png dist/static

echo "Building static HTML..."
cp -r src/static/*.html dist/static/

echo "Building sitemap..."
cp src/static/sitemap.txt dist/static

echo "Building robots.txt..."
cp src/static/robots.txt dist/staticp

echo "Building blog..."
./tools/build-blog.sh

echo "Building web client into dist/static/..."
cd src/web
npm ci
npm run build
cp -r dist/* ../../dist/static
cd ../..
