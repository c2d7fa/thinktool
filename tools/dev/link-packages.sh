#!/bin/bash
set -eux -o pipefail

# While working on the 'client' package, we usually use the 'web' package to see
# our changes. We obviously don't want to publish the client package every time
# we make a change, so instead we use 'npm link' to have changes reflected
# immediately. See the README for more information.

cd src/search
npm ci
sudo npm link

cd ../client
npm ci
sudo npm link
cd node_modules/react
sudo npm link
cd ../react-dom
sudo npm link
cd ../..
npm link @thinktool/search

cd ../web
npm ci
npm link @thinktool/client react react-dom
