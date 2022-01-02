# Thinktool

This repository contains the source code of [**Thinktool**](https://thinktool.io/), an associative note-taking application inspired by TheBrain and Roam Research.

[**Check out the demo in your browser here!**](https://thinktool.io/demo.html)

<blockquote>
<p align="center">
<img width="560" src="https://raw.githubusercontent.com/c2d7fa/thinktool/master/screenshot.png"/>
</p>
<p align="center">(Screenshot showing links, backreferences and multiple parents.)</p>
</blockquote>

## Project status

No-one else is working on Thinktool, so development is slow. However, I use Thinktool for all my note-taking (after switching from [Obsidian](https://obsidian.md)), and I'm still actively working on it (as of January 2022).

Currently, the main priorities are improving the desktop client and offline-only support for improved privacy and data security as well as improving the UX and "learnability". There is no specific roadmap or time estimates.

The website and newsletter haven't been updated in a while. If you want to follow Thinktool's development, watch this repository.

## Comparison to other software

**Offline client:** [Obsidian](https://obsidian.md/) and [Logseq](https://logseq.com/) have excellent offline clients, which let you store your data in Markdown files locally. [Thinktool](https://thinktool.io) does have an offline desktop client, but it's janky in comparison and uses a SQLite database for data storage.

**Graph structure:** [Roam Research](https://roamresearch.com/), [Logseq](https://logseq.com) and [Obsidian](https://obsidian.md/) let you link different pages together and use that graph structure to explore your notes. However, only pages -- not individual items -- can be connected like this. In contrast, Thinktool lets you connect individual items to multiple parents, so the same item can exist in multiple places.

**Transclusion:** To work around the issue of connecting individual items, [Roam Research](https://roamresearch.com/) and [Logseq](https://logseq.com) support embedding (transcluding) blocks. However, recursive transclusion is not supported, and transclusions are second-class. [Thinktool](https://thinktool.io) doesn't need transclusion, because the same item can simply exist in multiple places -- there is no difference between the "original" item and its clones.

**Hierarchical structure:** If you want to connect pages hierarchically, [Roam Research](https://roamresearch.com/), [Logseq](https://logseq.com)  and [Obsidian](https://obsidian.md/) require you to create a separate index page where you link the different pages together (or use some other custom system). [Thinktool](https://thinktool.io) makes no distinction between pages and items, so you can simply add one page as a child of another page.

**Bidirectional links:** All of these tools, including [Thinktool](https://thinktool.io) are built around bidirectional linking and have similar features.

**Miscellaneous features:** [Roam Research](https://roamresearch.com/), and to a lesser extent [Logseq](https://logseq.com), have a bunch of neat features that let you use it for task management, spaced repetition and more. [Thinktool](https://thinktool.io) is designed just for note-taking, so it doesn't have a lot of extra features.

**Ease of use and UI:** Even though [Thinktool's](https://thinktool.io/) data model is arguably simpler than these other tools, the UI is quite a bit worse, so it ends up being harder to understand.

## Open Source

All content of this repository to which I own the copyright is licensed under the terms of the GNU AGPLv3 or any later version as described in `LICENSE.md`.

This repository is not currently accepting issues or pull requests. Please see Thinktool's web page for information about how to contact me with your feedback about Thinktool. I may occationally force push to this repository, since I'm not expecting anyone else to be actively working on it. You are welcome to create your own fork.

The instructions in this README are mostly written for myself, and may not be sufficient to compile this project on your own. However, you can find some hints on how to run it in `.github/workflows`.

You will always be able to compile and use this version of Thinktool for free. The online service hosted at https://thinktool.io *may* eventually become a subscription service, but it's currently also free, and probably will be for a while.

## Directory Structure

Source code:

| Directory      | Purpose                                            | Package                                                                                                                                         |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/src/shared/` | Code shared between client and server.             | [![@thinktool/shared](https://img.shields.io/npm/v/@thinktool/shared?label=@thinktool/shared)](https://www.npmjs.com/package/@thinktool/shared) |
| `/src/client/` | Client code shared between web and desktop client. | [![@thinktool/client](https://img.shields.io/npm/v/@thinktool/client?label=@thinktool/client)](https://www.npmjs.com/package/@thinktool/client) |
| `/src/search/` | Code for Web Worker that handles search            | [![@thinktool/search](https://img.shields.io/npm/v/@thinktool/search?label=@thinktool/search)](https://www.npmjs.com/package/@thinktool/search) |
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

The application consists of three parts:

1. Static resources, output to `/dist/static/`
2. Node.js server, output to `/dist/server/`
3. Electron-based desktop client, output to `/dist/desktop/`

The static resources should be deployed to a static site hosting service, while
the server code should be run on an appropriate server using Node.js. The
desktop client is bundled as an executable app.

Yarn is required, since we use Yarn Workspaces. You will need to have the
following dependencies installed:

- Node.js
- Yarn
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

### Dependencies

We use Yarn to manage dependencies. The `src/` directory is set up as a
workspace:

    $ cd src

From there, you can install everything with a single command:

    $ yarn install

This will automatically link local packages together, so you can test the whole
application, even if the packages are published separately. However, this also
means that you will need to build the dependencies. To build all packages, run:

    $ yarn workspaces run build

### Static Resources

Set the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

Then build the web client and other static resources with:

    $ ./tools/build-web.sh

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

For sending emails (used for "Forgot my password" functionality), we use [Mailgun](https://mailgun.com/). Configure the following environment variables:

- `MAILGUN_API_KEY` &mdash; API key

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
        -e MAILGUN_API_KEY \
        -e DIAFORM_STATIC_HOST \
        -p 80:80 \
        thinktool

### Releasing new client version

When you are ready to push out a client-side update, run
`tools/dev/release-client.sh <version>`. This will bump the version number to
`<version>`, publish the package, and also update the relevant dependency in
the web and desktop clients.

Then commit the changes, push to origin, and in the GitHub repository, run the
action titled "Deploy to Azure Storage".

