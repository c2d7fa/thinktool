#!/usr/bin/env bash

set -e

echo "Building configuration file..."
mkdir -p conf
echo "{\"apiHost\": \"$DIAFORM_API_HOST\"}" > conf/client.json

echo "Building shared code..."
cd src/shared
npm ci
npm run build
cd ../..

echo "Building shared client code..."
cd src/client
npm ci
npm run build
cd ../..

echo "Bundling web client..."
cd src/web
npm ci
npm run bundle
cd ../..
