add `www/` to clickhouse `user_files/`
or you can execute this query to do it:
```sql
insert into table function file('www/monitoring.html', 'LineAsString')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/monitoring.html')
settings engine_file_allow_create_multiple_files=1, engine_file_truncate_on_insert = 1;
insert into table function file('www/admin.html', 'LineAsString')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/admin.html')
settings engine_file_allow_create_multiple_files=1, engine_file_truncate_on_insert = 1;
insert into table function file('www/resources/utils.js', 'LineAsString')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/utils.js')
settings engine_file_allow_create_multiple_files=1, engine_file_truncate_on_insert = 1;
insert into table function file('www/resources/graph-visualizer.js', 'LineAsString')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/graph-visualizer.js')
settings engine_file_allow_create_multiple_files=1, engine_file_truncate_on_insert = 1;
insert into table function file('www/resources/graphs.css', 'LineAsString')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/graphs.css')
settings engine_file_allow_create_multiple_files=1, engine_file_truncate_on_insert = 1;
insert into table function file('www/styles.css', 'LineAsString')
select * from url('https://raw.githubusercontent.com/vanchaklar/clickhouse-waterfall-panel/refs/heads/main/www/resources/styles.css')
settings engine_file_allow_create_multiple_files=1, engine_file_truncate_on_insert = 1;
```
