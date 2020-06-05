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

echo "Building sitemap..."
cp src/static/sitemap.txt dist/static

echo "Building HTML templates..."
npm ci

node <<"EOF"
const h = require("handlebars")
const fs = require("fs")

const options = {apiUrl: process.env.DIAFORM_API_HOST}

for (const file of fs.readdirSync("src/markup")) {
  const template = fs.readFileSync(`src/markup/${file}`, "utf8")
  const html = h.compile(template)(options)

  const name = file.replace(/\..*$/, "")
  const outPath = name === "landing" ? `dist/static/index.html` : `dist/static/${name}.html`

  console.log(`  Writing ${outPath}`)
  fs.writeFileSync(outPath, html)
}
EOF