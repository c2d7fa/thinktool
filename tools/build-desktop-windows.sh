#!/usr/bin/env bash

set -e

mkdir -p dist/static

echo "Building desktop client for Windows..."
cd src/desktop
npm i
npm config set script-shell "$(which bash)"
npm run bundle-windows
echo "Built EXE into dist/static"
cd ../..
