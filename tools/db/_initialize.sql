-- Initialize an emtpy database to the latest version from scratch.

CREATE TABLE "users" (
	"name" TEXT PRIMARY KEY,
	password TEXT,
	email TEXT,
	tutorial_finished BOOLEAN NOT NULL DEFAULT false,
	registered TIMESTAMP WITH TIME ZONE
);

CREATE TABLE things (
	"user" TEXT REFERENCES "users" (name),
	name TEXT NOT NULL,
	json_content JSON NOT NULL DEFAULT '[]',
	last_modified TIMESTAMP WITH TIME ZONE,
	first_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	is_page BOOLEAN NOT NULL DEFAULT false,
	PRIMARY KEY ("user", name)
);

CREATE TABLE connections (
    "user" TEXT REFERENCES "users" (name),
    name TEXT NOT NULL,
    parent text NOT NULL,
    child text NOT NULL,
    parent_index INTEGER NOT NULL,
    PRIMARY KEY ("user", name),
    FOREIGN KEY ("user", parent) REFERENCES things ("user", name),
    FOREIGN KEY ("user", child) REFERENCES things ("user", name)
);

CREATE TABLE sessions (
	"user" TEXT NOT NULL REFERENCES "users" (name),
	key TEXT NOT NULL,
	expire TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE reset_keys (
	"user" TEXT NOT NULL REFERENCES "users" (name),
	key TEXT NOT NULL,
	expire TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE newsletter_subscriptions (
	email TEXT PRIMARY KEY,
	registered TIMESTAMP WITH TIME ZONE,
	unsubscribed TIMESTAMP WITH TIME ZONE,
	unsubscribe_token TEXT
);

CREATE TABLE newsletter_sent (
	newsletter_id TEXT NOT NULL,
	recipient TEXT NOT NULL REFERENCES newsletter_subscriptions (email),
	sent TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE toolbar_shown (
	"user" TEXT REFERENCES "users" (name),
	shown BOOLEAN NOT NULL DEFAULT true
);
