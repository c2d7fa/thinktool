#!/bin/bash

alacritty -e ./scripts/watch-eslint.sh &
alacritty -e ./scripts/watch-tsc.sh &
alacritty -e ./scripts/watch-webpack.sh &
alacritty -e ./scripts/start-server.sh &

