add `www/` to clickhouse `user_files/`
or you can execute this query to do it:
```sql
insert into table function file('www/monitoring.html')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/monitoring.html');
insert into table function file('www/admin.html')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/admin.html');
insert into table function file('www/resources/utils.js')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/utils.js');
insert into table function file('www/resources/graph-visualizer.js')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/graph-visualizer.js');
insert into table function file('www/resources/graphs.css')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/graphs.css');
insert into table function file('www/styles.css'')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/styles.css');
```
