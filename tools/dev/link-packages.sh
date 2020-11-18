#!/bin/bash
set -eux -o pipefail

# While working on the 'client' package, we usually use the 'web' package to see
# our changes. We obviously don't want to publish the client package every time
# we make a change, so instead we use 'npm link' to have changes reflected
# immediately. See the README for more information.

cd src/client
npm ci

cd ../web
npm link ../client
npm link node_modules/@thinktool/client/node_modules/react
npm link node_modules/@thinktool/client/node_modules/react-dom
