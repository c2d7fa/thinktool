#!/usr/bin/env bash

set -e

echo "Building server..."
mkdir -p dist/server
cd src/server
npm ci
node_modules/.bin/tsc --outDir ../../dist/server
cp package.json package-lock.json ../../dist/server
cd ../..
cp -r src/server/{node_modules,package.json} dist/server
echo "Built 'dist/server' from 'src/server'."
