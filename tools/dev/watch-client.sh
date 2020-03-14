#!/usr/bin/env bash

tools/build-client.sh

cd src/client
npx parcel watch main.tsx -d ../../dist/static -o bundle.js
