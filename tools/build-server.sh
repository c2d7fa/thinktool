#!/usr/bin/env bash
set -eux -o pipefail

mkdir -p dist/server

echo "Installing dependencies..."
cd src
yarn install --frozen-lockfile

echo "Building local packages..."
cd shared && yarn run build && cd ..
cd server && yarn run build && cd ..

echo "Building server into dist/server..."
cd server
cp -r dist/* ../../dist/server
cp -r package.json ../../dist/server
cd ..
cp -r node_modules ../dist/server
cd ..
