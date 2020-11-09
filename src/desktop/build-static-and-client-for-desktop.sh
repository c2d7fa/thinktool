#!/usr/bin/env bash
set -eux -o pipefail

mkdir -p build

cd ../..

echo "Buliding images..."
cp src/static/*.svg src/desktop/build
cp src/static/*.png src/desktop/build

cd src/desktop

echo "Building static resources specific to desktop client..."
cp -r static/* build

echo "Building stylesheets..."
cp node_modules/@thinktool/client/dist/app.css build

echo "Building JavaScript..."
