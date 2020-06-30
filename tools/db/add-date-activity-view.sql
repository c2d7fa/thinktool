create view date_activity
as select
	date(last_modified) as "date",
	count(*) as modifications,
	json_agg(distinct "user") as users
from things
where
	last_modified is not null
	and "user" <> 'jonas'
	and "user" not like 'test%'
group by date(last_modified)
order by date(last_modified) desc
