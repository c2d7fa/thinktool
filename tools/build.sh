#!/usr/bin/env bash

set -e

echo "Building server..."
mkdir -p dist/server
cd app
if [ ! -e "node_modules" ]; then
  npm ci
fi
npx parcel build src/server.ts -t node -d ../dist/server -o server.js # TODO: Just use TSC
cd ..
cp -r app/node_modules dist/server
cp -r app/package.json dist/server
echo "Built 'dist/server' from 'app/src'."

echo "Building client..."
cd src/client
npx parcel build main.tsx -d ../../dist/static -o bundle.js
echo "Built 'dist/static/bundle.js' from 'src/client'."
cd ../..

echo "Building other static resources..."
mkdir -p dist/static
cp -r src/static/* dist/static
echo "Built 'dist/static/' from 'src/static/'."
