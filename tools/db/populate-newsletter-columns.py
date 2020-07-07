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

print("\x1B[1mAdding unsubscribe tokens...\x1B[0m")
postgres.execute("SELECT email FROM newsletter_subscriptions")
for subscription in postgres.fetchall():
  email = subscription[0]
  unsubscribe_token = "".join(random.choices(string.ascii_letters + string.digits, k=24))
  print("  {} \x1B[34m{}\x1B[0m".format(email, unsubscribe_token))
  postgres.execute("UPDATE newsletter_subscriptions SET unsubscribe_token = %(unsubscribe_token)s WHERE email = %(email)s AND unsubscribe_token IS NULL", {"unsubscribe_token": unsubscribe_token, "email": email})

postgres.close()
postgres_conn.commit()
postgres_conn.close()
