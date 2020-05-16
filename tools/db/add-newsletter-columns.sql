ALTER TABLE "newsletter_subscriptions"
ADD COLUMN "unsubscribed" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "unsubscribe_token" text,
ADD COLUMN "last_sent" TIMESTAMP WITH TIME ZONE;
