#!/usr/bin/env bash

set -e

echo "Building configuration file..."
mkdir -p conf
echo "{\"apiHost\": \"$DIAFORM_API_HOST\"}" > conf/client.json

echo "Building shared code..."
cd src/shared
npm i
npm run build
cd ../..

echo "Building shared client code..."
cd src/client
npm i
npm run build
cd ../..
