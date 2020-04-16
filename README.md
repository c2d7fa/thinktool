# Directory Structure

Source code:

| Directory      | Purpose                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `/src/`        | Source code, used to generate `/dist/`.                                                            |
| `/src/client/` | Code for client. Resulting JavaScript file is deployed on static server. Output in `/dist/static/` |
| `/src/share/`  | Code shared between client and server. Output in `/dist/static` and `/dist/server`.                |
| `/src/server/` | Code for server. This code is deployed on server running Node.js. Output in `/dist/server/`.       |
| `/src/markup/` | Source for HTML markup. Output in `/dist/static/`.                                                 |
| `/src/style/`  | Source for CSS stylesheets. Output in `/dist/static/`.                                             |
| `src/static`   | Other static resources. Output in `/dist/static/`.                                                 |

The generated output goes in the `/dist/` directory. Each subdirectory is intended to be deployed differently:

| Directory       | Purpose                                                                                |
| --------------- | -------------------------------------------------------------------------------------- |
| `/dist/`        | Output files generated from `/src/`. Each subdirectory is deployed to separate server. |
| `/dist/static/` | Static content, including HTML, CSS and JavaScript.                                    |
| `/dist/server/` | Code for dynamic server running Node.js.                                               |

Tools and configuration:

| Directory     | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `/tools/`     | Scripts and other tools used for building, development and deployment. |
| `/tools/dev/` | Tools used for development only.                                       |

# Deployment

The application consists of two parts:

1. Static resources, output to `/dist/static/`
2. Node.js server, output to `/dist/server/`

The static resources should be deployed to a static site hosting service, while
the server code should be run on an appropriate server using Node.js.

## Static Resources

Set the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

Then build the client code and other static resources with:

    $ ./tools/build-client.sh
    $ ./tools/build-static.sh

Then, set `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` and run
`./tools/deploy-static.sh` to deploy static files to Microsoft Azure Storage.

## Server

The server uses a PostgreSQL database. Set the following environment variables
before running the server:

- `DIAFORM_POSTGRES_HOST` &mdash; The hostname containing the database, e.g. `localhost`
- `DIAFORM_POSTGRES_PORT` &mdash; Port that the database is running on, e.g. `5432`
- `DIAFORM_POSTGRES_USERNAME` &mdash; Username used to authenticate with the PostgreSQL DB, e.g. `postgres`
- `DIAFORM_POSTGRES_PASSWORD` &mdash; Password used to authenticate with the PostgreSQL DB, e.g. `postgress`

Additionally, the server expects the following environment variables to be set:

- `DIAFORM_STATIC_HOST` &mdash; Base URL of the server hosting static resources, e.g. `https://thinktool.io`

Build the server as a Docker:

    # docker build -t thinktool -f tools/Dockerfile .

Once you have the `thinktool` image, run it with the environment variables given above:

    # docker run \
        -e DIAFORM_POSTGRES_HOST \
        -e DIAFORM_POSTGRES_PORT \
        -e DIAFORM_POSTGRES_USERNAME \
        -e DIAFORM_POSTGRES_PASSWORD \
        -e DIAFORM_STATIC_HOST \
        -p 80:80 \
        thinktool
