#!/usr/bin/env bash
set -eux -o pipefail

mkdir -p dist/static

echo "Installing dependencies..."
cd src
yarn install --frozen-lockfile

echo "Building local packages..."
yarn workspaces run build

echo "Building desktop client for Linux..."
cd desktop
yarn run bundle-linux
cp -r dist/*.AppImage ../../dist/static

echo "Built AppImage into dist/static."

cd ../..
