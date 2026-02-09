add `www/` to clickhouse `user_files/`
or you can execute this query to do it:
```sql
insert into table function file('www/monitoring.html')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/monitoring.html`);

...

```
