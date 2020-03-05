# Directory structure

Source code:

| Directory | Purpose |
| ---       | ---     |
| `/src/` | Source code, used to generate `/dist/`. |
| `/src/client/` | Code for client. Resulting JavaScript file is deployed on static server. Output in `/dist/static/` |
| `/src/share/` | Code shared between client and server. |
| `/src/server/` | Code for server. This code is deployed on server running Node.js. Output in `/dist/static/`. |
| `/src/markup/` | Source for HTML markup. Output in `/dist/static/`. |
| `/src/style/` | Source for CSS stylesheets. Output in `/dist/static/`. |

Output:

| Directory | Purpose |
| ---       | ---     |
| `/dist/` | Output files generated from `/src/`. Each subdirectory is deployed to separate server. |
| `/dist/static/` | Static content, including HTML, CSS and JavaScript. |
| `/dist/server/` | Code for dynamic server running Node.js. |

Tools and configuration:
| Directory | Purpose |
| ---       | ---     |
| `/tools/` | Scripts and other tools used for building, development and deployment. |

# Deployment

The server requires a MongoDB instance to be running on the same network. The
address of the server should be passed in through the environment variable
`DIAFORM_DATABASE`.

Start by creating a network:

    # docker network create thinktool

Start MongoDB instance called `thinktooldb` running on the network:

    # docker run --network thinktool --name thinktooldb -v "$(DB_VOLUME):/data/db" -d mongo

Build the server as a Docker image and run it:

    # docker build -t thinktool -f tools/Dockerfile .
    # docker run --network thinktool -e DIAFORM_DATABASE=mongodb://thinktooldb:27017 -p 80:80 thinktool

# Development

Build the static resources and server into `dist` from the top-level directory:

    $ ./tools/build.sh

Run MongoDB on `localhost:27017`:

    # docker run -v "$(DB_VOLUME):/data/db" -d -p 27017:27017 mongo

Run the server:

    $ cd dist/server
    $ export DIAFORM_PORT=8080
    $ node server.js
