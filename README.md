# Directory Structure

Source code:

| Directory      | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `/src/share/`  | Code shared between client and server.             |
| `/src/server/` | Code for dynamic Node.js server.                   |
| `/src/client/` | Client code shared between web and desktop client. |
| `/src/web/`    | Code specific to web client.                       |
| `/src/desktop` | Code specific to desktop client.                   |
| `/src/markup/` | Source for HTML markup.                            |
| `/src/style/`  | Source for CSS stylesheets.                        |
| `/src/static/` | Other static resources.                            |

The generated output goes in the `/dist/` directory. Each subdirectory is intended to be deployed differently:

| Directory       | Purpose                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| `/dist/`        | Output files generated from `/src/`. Each subdirectory represents a sepearte target. |
| `/dist/static/` | Static content, including HTML, CSS and JavaScript.                                  |
| `/dist/server/` | Code for dynamic server running Node.js.                                             |

Tools and configuration:

| Directory     | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `/tools/`     | Scripts and other tools used for building, development and deployment. |
| `/tools/dev/` | Tools used for development only.                                       |

# Deployment

The application consists of two parts:

1. Static resources, output to `/dist/static/`
2. Node.js server, output to `/dist/server/`
3. Electron-based desktop client, output to `/dist/desktop/`

The static resources should be deployed to a static site hosting service, while
the server code should be run on an appropriate server using Node.js.

The desktop client is bundled as an executable app.

## Static Resources

Set the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

Then build the web client and other static resources with:

    $ ./tools/build-client.sh
    $ ./tools/build-static.sh

Then, set `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` and run
`./tools/deploy-static.sh` to deploy static files to Microsoft Azure Storage.

## Desktop

The desktop client can currently be built for Linux and Windows. We're planning
on supporting macOS in the future. It must be built on the same platform that is
being targeted.

Start by setting the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

On **Linux**, build the desktop client with:

    $ ./tools/build-desktop-linux.sh

Even on **Windows**, you need to use `bash` as your shell. Run:

    $ ./tools/build-desktop-windows.sh

(Note that building the desktop client clears out the `dist/static/` directory.
This is a temporary hack; see the `build-desktop-linux.sh` and
`build-desktop-windows.sh` files for more information.)

Once you have built the desktop client, the output will be in `dist/`. Set
`AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` and run
`./tools/deploy-static.sh` to deploy these files to Microsoft Azure Storage.

## Server

The server uses a PostgreSQL database. Set the following environment variables
before running the server:

- `DIAFORM_POSTGRES_HOST` &mdash; The hostname containing the database, e.g. `localhost`
- `DIAFORM_POSTGRES_PORT` &mdash; Port that the database is running on, e.g. `5432`
- `DIAFORM_POSTGRES_USERNAME` &mdash; Username used to authenticate with the PostgreSQL DB, e.g. `postgres`
- `DIAFORM_POSTGRES_PASSWORD` &mdash; Password used to authenticate with the PostgreSQL DB, e.g. `postgres`

To configure email sending (used for "Forgot my password" functionality), set the following variables:

- `DIAFORM_SMTP_HOST` &mdash; Hostname of the SMTP server, e.g. `smtp.fastmail.com`
- `DIAFORM_SMTP_PORT` &mdash; Port on which to connect to SMTP server, e.g. `465`
- `DIAFORM_SMTP_USERNAME` &mdash; Username to use on SMTP server, e.g. `auto@thinktool.io`
- `DIAFORM_SMTP_PASSWORD` &mdash; Password to use on SMTP server, e.g. `abc1def2ghi3jkl4`

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
        -e DIAFORM_SMTP_PORT \
        -e DIAFORM_SMTP_HOST \
        -e DIAFORM_SMTP_USERNAME \
        -e DIAFORM_SMTP_PASSWORD \
        -e DIAFORM_STATIC_HOST \
        -p 80:80 \
        thinktool
