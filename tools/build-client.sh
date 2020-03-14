#!/usr/bin/env bash

set -e

echo "Building configuration file..."
mkdir -p conf
echo "{\"apiHost\": \"$DIAFORM_API_HOST\"}" > conf/client.json

echo "Building client..."
cd src/client
npm ci
npx parcel build main.tsx -d ../../dist/static -o bundle.js
echo "Built 'dist/static/bundle.js' from 'src/client'."
cd ../..
