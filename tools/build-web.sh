#!/bin/bash

# The web client depends on the availablility of an up-to-date version of
# '@thinktool/client'. Make sure the latest version of that package is
# published, before running this script. Alternatively, manually use 'npm link'
# to use a local version.
#
# The environment variable 'DIAFORM_API_HOST' should be set to the URL of the
# API server, e.g. 'https://api.thinktool.io'.

set -eux -o pipefail

echo "Installing dependencies..."
npm ci

echo "Building images..."
mkdir -p dist/static
cp -r src/static/*.svg dist/static
cp -r src/static/*.png dist/static

echo "Building static HTML..."
cp -r src/static/*.html dist/static/

echo "Building sitemap..."
cp src/static/sitemap.txt dist/static

echo "Building robots.txt..."
cp src/static/robots.txt dist/staticp

echo "Building HTML templates..."
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

echo "Building blog..."
./tools/build-blog.sh

echo "Building web client into dist/static/..."
cd src/web
npm ci
npm run build
cp -r dist/* ../../dist/static
cd ../..
