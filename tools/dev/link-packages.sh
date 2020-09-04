#!/bin/bash

set -e

# While working on the 'client' package, we usually use the 'web' package to see
# our changes. We obviously don't want to publish the client package every time
# we make a change, so instead we use 'npm link' to have changes reflected
# immediately.

cd src/client
npm link

cd ../web
npm link @thinktool/client

cd ../..
