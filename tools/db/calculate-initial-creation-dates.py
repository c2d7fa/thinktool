#!/usr/bin/env python

import os
import random
import string
import time

import psycopg2

postgres_conn = psycopg2.connect(
    host=os.getenv("DIAFORM_POSTGRES_HOST"),
    port=int(os.getenv("DIAFORM_POSTGRES_PORT")),
    user=os.getenv("DIAFORM_POSTGRES_USERNAME"),
    password=os.getenv("DIAFORM_POSTGRES_PASSWORD"),
    dbname="postgres"
)
postgres = postgres_conn.cursor()

postgres.execute("""SELECT "name" FROM things WHERE first_created IS NULL""")
for thing in postgres.fetchall():
  name = thing[0]
  try:
    d = int(name, 36) // (36 * 36)
    if d < 1000:
      continue
    if d > 2000000000:
      continue
    date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(d))
    print(name, date)
    postgres.execute("""UPDATE things SET first_created = %(date)s WHERE "name" = %(name)s AND first_created IS NULL""", {"date": date, "name": name})
  except:
    continue

postgres.close()
postgres_conn.commit()
postgres_conn.close()
