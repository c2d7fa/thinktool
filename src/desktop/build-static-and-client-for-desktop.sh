#!/usr/bin/env bash

set -e

mkdir -p build

cd ../..

echo "Installing dependencies..."
npm ci

echo "Buliding images..."
cp src/static/*.svg src/desktop/build
cp src/static/*.png src/desktop/build

echo "Building stylesheets..."
node_modules/.bin/sass src/style:src/desktop/build

cd src/desktop

echo "Building static resources specific to desktop client..."
cp -r static/* build

echo "Building JavaScript..."
