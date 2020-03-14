#!/usr/bin/env bash

./tools/build-server.sh

cd src/server
npx parcel watch server.ts -t node -d ../../dist/server -o server.js
