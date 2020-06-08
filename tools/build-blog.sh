#!/usr/bin/env bash

# May only be called after build-static.sh.

set -e

mkdir -p dist/static/blog

echo "Building images for blog..."
cp -r blog/*.png dist/static/blog

echo "Building RSS feed..."
cp -r src/static/blog.rss dist/static

echo "Building blog posts..."
node <<"EOF"
const h = require("handlebars")
const fs = require("fs")

const options = {apiUrl: process.env.DIAFORM_API_HOST}

for (const file of fs.readdirSync("blog/posts")) {
  const template = fs.readFileSync(`blog/posts/${file}`, "utf8")
  const html = h.compile(template)(options)

  const name = file.replace(/\..*$/, "")
  const outPath = `dist/static/blog/${name}.html`

  console.log(`  Writing ${outPath}`)
  fs.writeFileSync(outPath, html)
}
EOF