#!/usr/bin/env bash
set -eux -o pipefail

mkdir -p build

echo "Buliding images..."
cp ../static/*.svg build
cp ../static/*.png build

echo "Building static resources specific to desktop client..."
cp -r static/* build

echo "Building stylesheets..."
cp ../client/dist/app.css build
