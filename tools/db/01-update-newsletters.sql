-- We split the old "newsletter_subscriptions" table into two. One holds the
-- subscriptions; the other holds information about which newsletters were sent
-- to which recipients.

begin;

create table newsletter_sent (
  newsletter_id text not null,
  recipient text not null references newsletter_subscriptions (email),
  sent timestamptz not null
);

insert into newsletter_sent
select '0' as newsletter_id, email as recipient, last_sent as sent
from newsletter_subscriptions
where last_sent is not null;

alter table newsletter_subscriptions drop column last_sent;

create view newsletter_recipients as
select email as recipient, count(newsletter_id) as newsletters_sent, max(sent) as last_sent, registered, unsubscribed from newsletter_subscriptions
full join newsletter_sent on email = recipient
group by email
order by newsletters_sent desc, registered desc, last_sent desc;

commit;
