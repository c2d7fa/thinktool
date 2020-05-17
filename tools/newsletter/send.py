#!/usr/bin/env python

import os
import random
import string

import psycopg2

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

smtp_host = os.getenv("DIAFORM_SMTP_HOST")
smtp_port = int(os.getenv("DIAFORM_SMTP_PORT"))
smtp_username = os.getenv("DIAFORM_SMTP_USERNAME")
smtp_password = os.getenv("DIAFORM_SMTP_PASSWORD")

subject = "Working on an offline app for Thinktool"

print("Connecting over SMTP to {}:{}...".format(smtp_host, smtp_port))
with smtplib.SMTP_SSL(host=smtp_host, port=smtp_port) as smtp_conn:
  smtp_conn.ehlo_or_helo_if_needed()
  smtp_conn.login(smtp_username, smtp_password)
  print("  Logged in to SMTP server as {}.".format(smtp_username))

  postgres_conn = psycopg2.connect(
      host=os.getenv("DIAFORM_POSTGRES_HOST"),
      port=int(os.getenv("DIAFORM_POSTGRES_PORT")),
      user=os.getenv("DIAFORM_POSTGRES_USERNAME"),
      password=os.getenv("DIAFORM_POSTGRES_PASSWORD"),
      dbname="postgres"
  )
  postgres = postgres_conn.cursor()

  def send_email(email, text, html, unsubscribe_post_url):
    message = MIMEMultipart("alternative") # MIME type is multipart/alternative
    message["Subject"] = subject
    message["From"] = "Thinktool Newsletter <newsletter@thinktool.io>"
    message["To"] = email
    message["List-Unsubscribe"] = "<{}>, <mailto:newsletter@thinktool.io?subject=unsubscribe>".format(unsubscribe_post_url)
    message["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    message["Bcc"] = "newsletter+cc@thinktool.io"  # (Note: Intercepted by send_message; not actually sent)
    text_part = MIMEText(text, "plain")
    html_part = MIMEText(html, "html")
    message.attach(text_part)
    message.attach(html_part)
    smtp_conn.send_message(message)

  def send_newsletter(email, unsubscribe):
    text_template = None
    with open("newsletter.txt") as file:
      text_template = file.read()
    text_output = text_template.format(unsubscribe=unsubscribe)

    html_template = None
    with open("newsletter.html") as file:
      html_template = file.read()
    html_output = html_template.format(unsubscribe=unsubscribe)

    send_email(email, text_output, html_output, "https://api.thinktool.io/unsubscribe?key={unsubscribe}".format(unsubscribe=unsubscribe))

  print("\x1B[1mPress ENTER to send...\x1B[0m")

  postgres.execute("SELECT email, registered, unsubscribe_token FROM newsletter_subscriptions ORDER BY registered ASC NULLS FIRST")
  for subscription in postgres.fetchall():
    email = subscription[0]
    registered = subscription[1]
    unsubscribe = subscription[2]

    # Ask for confirmation
    print("  \x1B[30mWAIT\x1B[0m \x1B[32;1m{}\x1B[0m (registered \x1B[34m{:%Y-%m-%d}\x1B[0m): ".format(email, registered), end="")
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
    postgres.execute("UPDATE newsletter_subscriptions SET last_sent = NOW() WHERE email = %s", (email,))
    postgres_conn.commit()

postgres.close()
postgres_conn.close()
