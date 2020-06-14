#!/usr/bin/env bash

SRC=..

set -e

mkdir -p build

echo "Buliding images..."
cp $SRC/static/*.svg build

echo "Building CSS..."
cp $SRC/static/style.css build

echo "Building client-specific resources..."
cp -r static/* build

echo "Building client code..."
cd ../..
./tools/build-client.sh
cd src/desktop
cp ../../dist/static/bundle.{js,js.map} build
