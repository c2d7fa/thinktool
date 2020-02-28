#!/bin/bash

alacritty -e ./scripts/watch-eslint.sh &
alacritty -e ./scripts/watch-build-server.sh &
alacritty -e ./scripts/watch-build-client.sh &
