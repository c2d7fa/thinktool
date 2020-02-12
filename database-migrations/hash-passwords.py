#!/usr/bin/env python

import pymongo
import os
import bcrypt

client = pymongo.MongoClient(os.getenv("DATABASE_URI", "mongodb://localhost:27017"))
users = client.diaform.users

for user in users.find({"password": {"$exists": True}}):
  print("Hashing password for user '{}'".format(user["name"]))
  hashed_password = bcrypt.hashpw(user["password"].encode("utf-8"), bcrypt.gensalt(6)).decode("utf-8")
  users.update_one({"_id": user["_id"]}, {"$unset": {"password": ""}, "$set": {"hashedPassword": hashed_password}})
