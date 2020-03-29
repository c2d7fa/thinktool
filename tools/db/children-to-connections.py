#!/usr/bin/env python

# Convert "children" property to new connections collection. Note: After running
# this script, manually remove the old "children" property, which is no longer
# used.

import pymongo
import os

client = pymongo.MongoClient(os.getenv("DIAFORM_DATABASE"))

things = client.diaform.things

things.update_many({}, {"$set": {"connections": []}})

users = map(lambda u: u["name"], client.diaform.users.find({}))

for user in users:
    new_connection_id = 0
    for thing in things.find({"user": user}):
        if "children" in thing:
            for child in thing["children"]:
                client.diaform.connections.insert_one({"user": user, "name": str(new_connection_id), "parent": thing["name"], "child": child})
                things.update_one({"_id": thing["_id"]}, {"$push": {"connections": str(new_connection_id)}})
                new_connection_id += 1

print("Done")
