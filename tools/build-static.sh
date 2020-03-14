#!/usr/bin/env bash

set -e

echo "Building static resources..."
mkdir -p dist/static
cp -r src/static/* dist/static
echo "Built 'dist/static/' from 'src/static/'."

echo "Building HTML..."
npm ci
node <<EOF
const h = require("handlebars")
const fs = require("fs")

const template = fs.readFileSync("src/markup/login.handlebars", "utf8")
const html = h.compile(template)({apiUrl: process.env.DIAFORM_API_URL})

fs.writeFileSync("dist/static/login.html", html)
EOF
