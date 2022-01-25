# Thinktool

This repository contains the source code of [**Thinktool**](https://thinktool.io/), an associative note-taking application inspired by TheBrain and Roam Research.

[**Check out the demo in your browser here!**](https://thinktool.io/demo)

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

## Deployment

The application consists of three parts:

1. Web client in `src/web`
2. Node.js server in `src/server`
3. Electron-based desktop client in `src/desktop`

To build the server, run `docker build . -f tools/Dockerfile -t thinktool` from
the top-level directory, and then run the `thinktool` image with the environment
variables listed below.

### Static Resources

To build the web client, run `yarn install --frozen-lockfile && yarn build` from
the `src/web` directory. This will build the web client into `out/`, which can
then be deployed as a static website.

Before running this command, set the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.
- `THINKTOOL_ASSETS_HOST` &mdash; Host for desktop client, including the protocol, e.g.
  `https://assets.thinktool.io`.

### Desktop

The desktop client can currently be built for Linux and Windows. We're planning
on supporting macOS in the future. It must be built on the same platform that is
being targeted.

Start by setting the following environment variables:

- `DIAFORM_API_HOST` &mdash; API server host, including the protocol, e.g.
  `https://api.thinktool.io`.

Then enter the `src/desktop` directory and run `yarn install --frozen-lockfile`.
Build the Linux client with `yarn bundle-linux` or the Windows client with
`yarn bundle-windows`.

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

## Development

While working on Thinktool, most changes should be made in the `src/client`
directory, since this is the package that's used for both the web client and the
desktop client. Enter the `src/client` directory and run `yarn install --frozen-lockfile`
and use `yarn webpack --watch --config webpack.dev.js` to continually rebuild.
Start a static web server and open `dev.html`  in a browser to see the demo
page.

### Releasing new client version

When you are ready to push out a client-side update, run
`tools/dev/release-client.sh <version>`. This will bump the version number to
`<version>`, publish the package, and also update the relevant dependency in
the web and desktop clients.

Then commit the changes, push to origin, and in the GitHub repository, run the
action titled "Deploy to Azure Storage".

