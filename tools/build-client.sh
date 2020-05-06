#!/usr/bin/env bash

set -e

echo "Building configuration file..."
mkdir -p conf
echo "{\"apiHost\": \"$DIAFORM_API_HOST\"}" > conf/client.json

echo "Building client..."
cd src/client
npm ci
npm run bundle
cd ../..
