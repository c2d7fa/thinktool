#!/usr/bin/env bash

set -e

echo "Preparing to build desktop client for Linux..."
./tools/build-static.sh
./tools/build-client.sh

echo "Building desktop client for Linux..."
cd src/desktop
npm i
npm run bundle-linux
cp -r dist/*.AppImage ../../dist/static
echo "Built AppImage into dist/static"
cd ../..

# Mild hack, because when we run this script, we don't want to also update all
# of the other static assets; just this file. The real solution is to make the
# desktop client not depend on assets already being available in the dist/
# folder.
echo "Removing left over files..."
cd dist/static
mkdir .temp
mv *.AppImage .temp
rm -rf *
mv .temp/* .
rmdir .temp
cd ../..
