# Thinktool

This repository contains the source code of [**Thinktool**](https://thinktool.io/), an associative note-taking application inspired by TheBrain and Roam Research.

[**Check out the demo in your browser here!**](https://thinktool.io/demo.html)

<blockquote>
<p align="center">
<img width="560" src="https://raw.githubusercontent.com/c2d7fa/thinktool/master/screenshot.png"/>
</p>
<p align="center">(Screenshot showing links, backreferences and multiple parents.)</p>
</blockquote>

## Thinktool isn't open source! (Yet...)

Although it's source code is provided publicly here, this software isn't currently open source.

As such, the instructions in this README are mostly written for myself, and may not be sufficient to compile this project on your own. That being said, you can find some hints on how to run it in `.github/workflows`.

This project is also not currently accepting issues or pull requests. Please see Thinktool's web page for information about how to contact me with your feedback about Thinktool. I may occationally force push to this repository, since I'm not expecting anyone else to be actively working on it.

**However,** if I abandon this project in the future (or when I otherwise consider it "finished"), I intend to make it open source, probably under the AGPL. If you can see that I haven't touched this repository in a couple of months, feel free to send me an email reminding me of this fact!

## Directory Structure

Source code:

| Directory      | Purpose                                            | Package                                                                                                                                         |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/src/shared/` | Code shared between client and server.             | [![@thinktool/shared](https://img.shields.io/npm/v/@thinktool/shared?label=@thinktool/shared)](https://www.npmjs.com/package/@thinktool/shared) |
| `/src/client/` | Client code shared between web and desktop client. | [![@thinktool/client](https://img.shields.io/npm/v/@thinktool/client?label=@thinktool/client)](https://www.npmjs.com/package/@thinktool/client) |
| `/src/server/` | Code for dynamic Node.js server.                   |
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

## Deployment

The application consists of two parts:

1. Static resources, output to `/dist/static/`
2. Node.js server, output to `/dist/server/`
3. Electron-based desktop client, output to `/dist/desktop/`

The static resources should be deployed to a static site hosting service, while
the server code should be run on an appropriate server using Node.js. The
desktop client is bundled as an executable app.

You will need to have the following dependencies installed:

- Node.js and NPM
- Docker
- Bash and the GNU core utilities
- Curl
- Azure CLI
- PostgreSQL

### Development

If you don't want to install these dependencies on your development machine,
there is a `Dockerfile` descirbing a Debian system with most of those
dependencies installed available in the `tools/dev/` directory. Use a separate
Docker container for PostgreSQL. For example:

    $ docker build tools/dev -t thinktool-dev
    $ docker run -e POSTGRES_PASSWORD=password -v postgres-data:/var/lib/postgresql/data -d postgres
    $ docker run -ti -v $(pwd):/work thinktool-dev

There is also a script that does this for you:

    $ tools/dev/start-docker.sh

### Static Resources

Set the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

Then build the web client and other static resources with:

    $ ./tools/build-client.sh
    $ ./tools/build-static.sh

Then, set `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` and run
`./tools/deploy-static.sh` to deploy static files to Microsoft Azure Storage.

### Desktop

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

### Server

The server uses a PostgreSQL database. Set the following environment variables
before running the server:

- `DIAFORM_POSTGRES_HOST` &mdash; The hostname containing the database, e.g. `localhost`
- `DIAFORM_POSTGRES_PORT` &mdash; Port that the database is running on, e.g. `5432`
- `DIAFORM_POSTGRES_USERNAME` &mdash; Username used to authenticate with the PostgreSQL DB, e.g. `postgres`
- `DIAFORM_POSTGRES_PASSWORD` &mdash; Password used to authenticate with the PostgreSQL DB, e.g. `postgres`

You will need to manually set up the database schema. See `tools/db/_initialize.sql`, though this may be outdated.

For sending emails (used for "Forgot my password" functionality), we use [SendGrid](https://sendgrid.com/). Configure the following environment variables:

- `SENDGRID_API_KEY` &mdash; SendGrid API key; find or create under _Settings_ &rightarrow; _API Keys_

Additionally, the server expects the following environment variables to be set:

- `DIAFORM_STATIC_HOST` &mdash; Base URL of the server hosting static resources, e.g. `https://thinktool.io`

Build the server as a Docker image:

    # docker build -t thinktool -f tools/Dockerfile .

Once you have the `thinktool` image, run it with the environment variables given above:

    # docker run \
        -e DIAFORM_POSTGRES_HOST \
        -e DIAFORM_POSTGRES_PORT \
        -e DIAFORM_POSTGRES_USERNAME \
        -e DIAFORM_POSTGRES_PASSWORD \
        -e SENDGRID_API_KEY \
        -e DIAFORM_STATIC_HOST \
        -p 80:80 \
        thinktool
