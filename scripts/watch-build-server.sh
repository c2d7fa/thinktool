#!/usr/bin/env bash

cd app
npx parcel watch src/server.ts -d build -o server.js -t node
