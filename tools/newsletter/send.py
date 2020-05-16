#!/usr/bin/env python

import os
import random
import string

import psycopg2

postgres_conn = psycopg2.connect(
    host=os.getenv("DIAFORM_POSTGRES_HOST"),
    port=int(os.getenv("DIAFORM_POSTGRES_PORT")),
    user=os.getenv("DIAFORM_POSTGRES_USERNAME"),
    password=os.getenv("DIAFORM_POSTGRES_PASSWORD"),
    dbname="postgres"
)
postgres = postgres_conn.cursor()

def send_email(email, text, html):
  with open("email-{}.txt".format(email), "w") as file:
    file.write(text)
  with open("email-{}.html".format(email), "w") as file:
    file.write(html)

def send_newsletter(email, unsubscribe):
  text_template = None
  with open("newsletter.txt") as file:
    text_template = file.read()
  text_output = text_template.format(unsubscribe=unsubscribe)

  html_template = None
  with open("newsletter.html") as file:
    html_template = file.read()
  html_output = html_template.format(unsubscribe=unsubscribe)

  send_email(email, text_output, html_output)  

print("\x1B[1mPress ENTER to send...\x1B[0m")

postgres.execute("SELECT email, registered, unsubscribe_token FROM newsletter_subscriptions ORDER BY registered DESC NULLS FIRST")
for subscription in postgres.fetchall():
  email = subscription[0]
  registered = subscription[1]
  unsubscribe = subscription[2]

  # Ask for confirmation
  print("  \x1B[30mWAIT\x1B[0m \x1B[32;1m{}\x1B[0m (registered \x1B[34m{:%Y-%m-%d}\x1B[0m): ".format(email, registered), end="")
  input()

  # Send
  print("\x1B[F  \x1B[1mSENT\x1B[0m\x1B[E", end="")
  send_newsletter(email, unsubscribe)

postgres.close()
#postgres_conn.commit()
postgres_conn.close()
