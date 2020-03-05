#!/usr/bin/env bash

cd src/client
npx parcel watch main.tsx -d ../../dist/static -o bundle.js
