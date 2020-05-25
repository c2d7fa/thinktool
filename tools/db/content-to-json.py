#!/usr/bin/env python

import os
import psycopg2
import json

postgres_conn = psycopg2.connect(
    host=os.getenv("DIAFORM_POSTGRES_HOST"),
    port=int(os.getenv("DIAFORM_POSTGRES_PORT")),
    user=os.getenv("DIAFORM_POSTGRES_USERNAME"),
    password=os.getenv("DIAFORM_POSTGRES_PASSWORD"),
    dbname="postgres"
)
postgres = postgres_conn.cursor()

postgres.execute("ALTER TABLE things ADD COLUMN IF NOT EXISTS json_content JSON NOT NULL DEFAULT '[]'")

processed = 0
postgres.execute("SELECT COUNT(*) FROM things")
total = postgres.fetchone()[0]

postgres.execute("SELECT \"user\", name, content FROM things")

def transform_content(content):
  result = []
  buffer = ""
  reading_link = False

  def commit():
    nonlocal result
    nonlocal buffer
    if buffer != "":
      if reading_link:
        result += [{"link": buffer}]
      else:
        result += [buffer]
    buffer = ""

  for ch in content:
    if ch == "#":
      commit()
      reading_link = True
    elif (reading_link):
      if (ch.isalnum() and ch.islower()) or ch.isdigit():
        buffer += ch
      else:
        commit()
        reading_link = False
        buffer = ch
    else:
      buffer += ch

  commit()
  return result

for thing in postgres.fetchall():
  user = thing[0]
  name = thing[1]
  string_content = thing[2]
  postgres.execute("UPDATE things SET json_content = %s WHERE \"user\" = %s AND name = %s", (json.dumps(transform_content(string_content)), user, name))

  processed += 1
  print("\x1B[GProcessed {} of {}".format(processed, total), end="", flush=True)

postgres.close()
postgres_conn.commit()
postgres_conn.close()
