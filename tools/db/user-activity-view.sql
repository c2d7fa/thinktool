CREATE VIEW user_activity ("user", things, last_active) AS
  SELECT "user", count(*) AS things, max(last_modified) AS last_active
  FROM things
  GROUP BY "user"
  ORDER BY last_active DESC nulls last, things DESC;
