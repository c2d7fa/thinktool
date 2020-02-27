#!/usr/bin/env bash

cd app
npx parcel build src/main.tsx -d build -o bundle.js
