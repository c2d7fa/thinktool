# Directory structure (WIP)

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

Build the static resources into `/dist/static/` from the top-level directory:

    $ ./tools/build-static.sh

Start MongoDB instance on `localhost:27017`:

    # docker run -p 127.0.0.1:27017:27017 -v "$(DB_VOLUME):/data/db" -d mongo

Build the server as a Docker image and run it:

    # docker build -t thinktool .
    # docker run -p 80:80 thinktool
