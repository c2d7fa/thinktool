#!/usr/bin/env python

import os
import random
import string
import argparse

import psycopg2

import sendgrid
import sendgrid.helpers.mail as mail

sendgrid_client = sendgrid.SendGridAPIClient(api_key=os.environ.get("SENDGRID_API_KEY"))

argparser = argparse.ArgumentParser()
argparser.add_argument("newsletter_id")
args = argparser.parse_args()

newsletter_id = args.newsletter_id

def slurp(path):
  with open(path) as file:
    return file.read()

subject = slurp(newsletter_id + ".subject")
text_template = slurp(newsletter_id + ".txt")
html_template = slurp(newsletter_id + ".html")

def send_newsletter(email, unsubscribe_token):
  text = text_template.format(unsubscribe=unsubscribe_token)
  html = html_template.format(unsubscribe=unsubscribe_token)

  message = mail.Mail()
  message.to = mail.To(email)
  message.bcc = mail.Bcc("cc@thinktool.io")
  message.subject = mail.Subject(subject)
  message.header = mail.Header("List-Unsubscribe", "<mailto:newsletter@thinktool.io?subject=unsubscribe>")
  message.from_email = mail.From("newsletter@thinktool.io", "Thinktool Newsletter")
  message.reply_to = mail.ReplyTo("jonas@thinktool.io", "Jonas Hvid (Thinktool)")
  message.content = [
    mail.Content("text/plain", text),
    mail.Content("text/html", html),
  ]

  sendgrid_client.send(message)

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
