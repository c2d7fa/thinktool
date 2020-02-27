#!/usr/bin/env bash

cd app
npx parcel build src/server.ts -d build -o server.js -t node
