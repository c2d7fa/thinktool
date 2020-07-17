#!/usr/bin/env bash

# Before running this script, make sure that the image represented by the
# Dockerfile in this directory is installed as 'thinktool-dev'. Run from the
# top-level directory in this project.

# Also make sure that there's a running PostgreSQL instance on 127.0.0.1:5432.

docker run \
  -ti --rm --name thinktool-dev \
  -p 127.0.0.1:8080:8080 \
  -p 127.0.0.1:8085:8085 \
  -v $(pwd):/work \
  -v /var/run/docker.sock:/var/run/docker.sock \
  thinktool-dev

# Then, optionally run 'tmuxp load tools/dev/session.tmuxp.yaml' inside the
# container. If you have an '.envrc' file availabe, you may want to source it
# first to make sure environment variables are set up correctly.
