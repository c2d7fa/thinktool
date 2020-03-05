#!/usr/bin/env bash

cd src/server
npx parcel watch server.ts -t node -d ../../dist/server -o server.js
