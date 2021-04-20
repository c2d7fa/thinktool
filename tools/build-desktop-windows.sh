#!/usr/bin/env bash
set -eux -o pipefail

mkdir -p dist/static

echo "Setting up Yarn for Windows..."
yarn config set script-shell "$(which bash)"

echo "Installing dependencies..."
cd src
yarn install --frozen-lockfile

echo "Building local packages..."
yarn workspaces run build

echo "Building desktop client for Windows..."
cd desktop
yarn run bundle-windows
cp -r dist/*.exe ../../dist/static

echo "Built executable into dist/static."

cd ../..
