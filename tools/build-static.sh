#!/usr/bin/env bash

set -e

echo "Building images..."
mkdir -p dist/static
cp -r src/static/*.svg dist/static
cp -r src/static/*.png dist/static

echo "Building stylesheets..."
cp -r src/static/*.css dist/static

echo "Building static HTML..."
cp -r src/static/*.html dist/static/

echo "Building HTML templates..."
npm ci
node <<EOF
const h = require("handlebars")
const fs = require("fs")

const template = fs.readFileSync("src/markup/login.handlebars", "utf8")
const html = h.compile(template)({apiUrl: process.env.DIAFORM_API_HOST})

fs.writeFileSync("dist/static/login.html", html)
EOF
node <<EOF
const h = require("handlebars")
const fs = require("fs")

const template = fs.readFileSync("src/markup/landing.handlebars", "utf8")
const html = h.compile(template)({apiUrl: process.env.DIAFORM_API_HOST})

fs.writeFileSync("dist/static/index.html", html)
EOF
