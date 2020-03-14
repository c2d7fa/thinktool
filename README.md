# Directory structure

Source code:

| Directory | Purpose |
| ---       | ---     |
| `/src/` | Source code, used to generate `/dist/`. |
| `/src/client/` | Code for client. Resulting JavaScript file is deployed on static server. Output in `/dist/static/` |
| `/src/share/` | Code shared between client and server. Output in `/dist/static` and `/dist/server`. |
| `/src/server/` | Code for server. This code is deployed on server running Node.js. Output in `/dist/server/`. |
| `/src/markup/` | Source for HTML markup. Output in `/dist/static/`. |
| `/src/style/` | Source for CSS stylesheets. Output in `/dist/static/`. |
| `src/static` | Other static resources. Output in `/dist/static/`. |

The generated output goes in the `/dist/` directory. Each subdirectory is intended to be deployed differently:

| Directory | Purpose |
| ---       | ---     |
| `/dist/` | Output files generated from `/src/`. Each subdirectory is deployed to separate server. |
| `/dist/static/` | Static content, including HTML, CSS and JavaScript. |
| `/dist/server/` | Code for dynamic server running Node.js. |

Tools and configuration:

| Directory | Purpose |
| ---       | ---     |
| `/tools/` | Scripts and other tools used for building, development and deployment. |
| `/tools/dev/` | Tools used for development only. |

# Deployment

The application consists of two parts:

1. Static resources, output to `/dist/static/`
2. Node.js server, output to `/dist/server/`

The static resources should be deployed to a static site hosting service, while
the server code should be run on an appropriate server using Node.js.

## Static resources

Set the following environment variables:

* `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

Then build the client code and other static resources with:

    $ ./tools/build-client.sh
    $ ./tools/build-static.sh

## Server

The server requires a MongoDB instance to be running on the same network. The
address of the server should be passed in through the environment variable
`DIAFORM_DATABASE`, and the host servings static resources (including protocol)
should be passed in through `DIAFORM_STATIC_HOST`.

Start by creating a network:

    # docker network create thinktool

Start MongoDB instance called `thinktooldb` running on the network:

    # docker run --network thinktool --name thinktooldb -v "$(DB_VOLUME):/data/db" -d mongo

Build the server as a Docker image and run it:

    # docker build -t thinktool -f tools/Dockerfile .
    # docker run --network thinktool -e DIAFORM_DATABASE=mongodb://thinktooldb:27017 -e DIAFORM_STATIC_HOST=https://thinktool.io -p 80:80 thinktool
