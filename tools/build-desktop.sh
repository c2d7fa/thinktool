#!/usr/bin/env bash

set -e

echo "Building desktop client..."
cd src/desktop
npm i
npm run bundle
cp -r dist/*.AppImage ../../dist/static
echo "Built AppImage into dist/static"
cp -r dist/*.exe ../../dist/static
echo "Built Windows executable into dist/static"
cp -r dist/*-mac.tar.gz ../../dist/static
echo "Built '.tar.gz' archive for macOS into dist/static"
