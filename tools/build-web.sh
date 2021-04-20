#!/bin/bash

# The environment variable 'DIAFORM_API_HOST' should be set to the URL of the
# API server, e.g. 'https://api.thinktool.io'.

set -eux -o pipefail

mkdir -p dist/static

echo "Installing dependencies..."
cd src
yarn install --frozen-lockfile

echo "Building local packages..."
yarn workspaces run build

echo "Building web client into dist/static..."
cd web
cp -r out/* ../../dist/static
cd ../..
