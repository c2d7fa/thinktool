#!/usr/bin/env python

import pymongo
import os

client = pymongo.MongoClient(os.getenv("DATABASE_URI", "mongodb://localhost:27017"))
things = client.diaform.things

for thing in things.find({"page": {"$exists": True}}):
  new_name = thing["name"] + "-page"
  things.insert_one({"name": new_name, "user": thing["user"], "content": "Page: " + thing["page"]})
  things.update_one({"_id": thing["_id"]}, {"$unset": {"page": ""}, "$push": {"children": {"$each": [new_name], "$position": 0}}})
