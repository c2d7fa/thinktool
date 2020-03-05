#!/usr/bin/env bash

set -e

mkdir -p dist/static
cp -r src/static/* dist/static
echo "Built static files from 'src/static/' to 'dist/static/'."
