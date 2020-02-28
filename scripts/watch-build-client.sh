#!/usr/bin/env bash

cd app
npx parcel watch src/main.tsx -d build -o bundle.js
