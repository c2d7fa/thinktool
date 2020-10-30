The `send.py` script is a temporary script to send out newsletters, while we're working on getting a third-party solution set up.

To create a newsletter with the ID `id`, create three files:

* `id.html` — HTML version of the newsletter.
* `id.txt` — Plain text version of the newsletter.
* `id.subject` — The newsletter's subject line.

For both the HTML and plain text versions, the string `{unsubscribe}` will be replaced for each recipient with that recipient's unsubscribe key. You probably want to use the following unsubscribe *link*:

    https://api.thinktool.io/unsubscribe?key={unsubscribe}

Once these files have been created, set the following environment variables:

* `MAILGUN_API_KEY` — Mailgun API key.
* `DIAFORM_POSTGRES_HOST` — Host of PostgreSQL database; see also main README.
* `DIAFORM_POSTGRES_PORT` — Port of PostgreSQL database; see also main README.
* `DIAFORM_POSTGRES_USERNAME` — Username for PostgreSQL database; see also main README.
* `DIAFORM_POSTGRES_PASSWORD` — Password for PostgreSQL database; see also main README.

Finally, run the script with `python3 send.py id`.
