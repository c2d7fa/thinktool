#!/usr/bin/env python

import os
import random
import string
import argparse

import psycopg2

import requests

api_key = os.environ.get("MAILGUN_API_KEY")

argparser = argparse.ArgumentParser()
argparser.add_argument("newsletter_id")
args = argparser.parse_args()

newsletter_id = args.newsletter_id

def slurp(path):
  with open(path) as file:
    return file.read()

def spit(path, content):
  with open(path, "w") as file:
    file.write(content)

subject = slurp(newsletter_id + ".subject")
text_template = slurp(newsletter_id + ".txt")
html_template = slurp(newsletter_id + ".html")

def send_newsletter(email, unsubscribe_token):
  text = text_template.format(unsubscribe=unsubscribe_token, email=email)
  html = html_template.format(unsubscribe=unsubscribe_token, email=email)

  requests.post(
    "https://api.eu.mailgun.net/v3/thinktool.io/messages",
    auth=("api", api_key),
    data={
      "to": email,
      "subject": subject,
      "from": "Thinktool Newsletter <newsletter@thinktool.io>",
      "h:Reply-To": "Jonas Hvid (Thinktool) <jonas@thinktool.io>",
      "text": text,
      "html": html
    }
  )

  spit("last_sent.txt", text)
  spit("last_sent.html", html)

postgres_conn = psycopg2.connect(
  host=os.getenv("DIAFORM_POSTGRES_HOST"),
  port=int(os.getenv("DIAFORM_POSTGRES_PORT")),
  user=os.getenv("DIAFORM_POSTGRES_USERNAME"),
  password=os.getenv("DIAFORM_POSTGRES_PASSWORD"),
  dbname="postgres"
)
postgres = postgres_conn.cursor()

postgres.execute("""
    SELECT email, unsubscribe_token FROM newsletter_subscriptions
    WHERE
      NOT EXISTS (
        SELECT * FROM newsletter_sent
        WHERE recipient = email AND newsletter_id = %s
      ) AND
      unsubscribed IS NULL
    ORDER BY registered ASC
  """, (newsletter_id,))

print("\x1B[1mPress ENTER to send...\x1B[0m")
for subscription in postgres.fetchall():
  email = subscription[0]
  unsubscribe = subscription[1]

  # Ask for confirmation
  print("  \x1B[30mWAIT\x1B[0m \x1B[32;1m{}\x1B[0m: ".format(email), end="")
  try:
    input()
  except:
    print("\x1B[G  \x1B[31;1mABRT\x1B[0m\x1B[E", end="")
    print()
    exit()

  # Send
  print("\x1B[F  \x1B[1mSENT\x1B[0m\x1B[E", end="")
  send_newsletter(email, unsubscribe)

  # Update sent status
  postgres.execute("INSERT INTO newsletter_sent (newsletter_id, recipient, sent) VALUES (%s, %s, NOW())", (newsletter_id, email))
  postgres_conn.commit()

postgres.close()
postgres_conn.close()
