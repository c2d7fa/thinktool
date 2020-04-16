#!/usr/bin/env python

# Migrate MongoDB data to PostgreSQL database.
#
# Expects the following environment variables:
# - DIAFORM_DATABASE -- MongoDB URL, e.g. 'mongodb://localhost:27017'
# - DIAFORM_POSTGRES_HOST
# - DIAFORM_POSTGRES_PORT
# - DIAFORM_POSTGRES_USERNAME
# - DIAFORM_POSTGRES_PASSWORD

import pymongo
import psycopg2
import os

mongo = pymongo.MongoClient(os.getenv("DIAFORM_DATABASE"))
postgres_conn = psycopg2.connect(
    host=os.getenv("DIAFORM_POSTGRES_HOST"),
    port=int(os.getenv("DIAFORM_POSTGRES_PORT")),
    user=os.getenv("DIAFORM_POSTGRES_USERNAME"),
    password=os.getenv("DIAFORM_POSTGRES_PASSWORD"),
    dbname="postgres"
)
postgres = postgres_conn.cursor()

# Migrate users
print("Migrating users...")
for user in mongo.diaform.users.find({}):
    name = user["name"]
    password = user["hashedPassword"]
    postgres.execute("INSERT INTO users (name, password) VALUES (%s, %s)", (name, password))

# Migrate things (not including connections)
print("Migrating things...")
finished = 0
total = mongo.diaform.things.count_documents({})
for thing in mongo.diaform.things.find({}):
    user = thing["user"]
    name = thing["name"]
    content = thing["content"]
    postgres.execute("INSERT INTO things (\"user\", name, content) VALUES (%s, %s, %s)", (user, name, content))

    finished += 1
    if finished % 10 == 0:
        print("Finished {}/{}".format(finished, total))

# Migrate connections (except index in parent)
print("Migrating connections...")
finished = 0
total = mongo.diaform.connections.count_documents({})
for connection in mongo.diaform.connections.find({}):
    user = connection["user"]
    name = connection["name"]
    parent = connection["parent"]
    child = connection["child"]
    tag = None
    if "tag" in connection:
        tag = connection["tag"]
    postgres.execute("INSERT INTO connections (\"user\", name, parent, child, tag, parent_index) VALUES (%s, %s, %s, %s, %s, -1)", (user, name, parent, child, tag))

    finished += 1
    if finished % 10 == 0:
        print("Finished {}/{}".format(finished, total))

# Fix connection indices
print("Fixing conncetion indices...")
finished = 0
total = mongo.diaform.things.count_documents({})
for thing in mongo.diaform.things.find({}):
    i = 0
    for connection_name in thing["connections"]:
        postgres.execute("UPDATE connections SET parent_index = %s WHERE \"user\" = %s AND name = %s", (i, thing["user"], connection_name))
        i += 1

    finished += 1
    if finished % 10 == 0:
        print("Finished {}/{}".format(finished, total))

print("Committing changes")

postgres_conn.commit()

print("Done")

postgres.close()
postgres_conn.close()
