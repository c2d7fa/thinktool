#!/usr/bin/env bash

set -e

echo "Building server..."
mkdir -p dist/server
cd src/server
npm ci
npx parcel build server.ts -t node -d ../../dist/server -o server.js # TODO: Just use TSC
cd ../..
cp -r src/server/{node_modules,package.json} dist/server
echo "Built 'dist/server' from 'src/server'."
