#!/usr/bin/env bash
set -e

npx parcel build tests.ts -d . -o all.test.js -t node --no-source-maps --no-minify
npx jest all
