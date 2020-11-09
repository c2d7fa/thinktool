#!/usr/bin/env bash
set -eux -o pipefail

mkdir -p dist/static

echo "Building desktop client for Linux..."
cd src/desktop
npm i
npm run bundle-linux
cp -r dist/*.AppImage ../../dist/static
echo "Built AppImage into dist/static"
cd ../..
