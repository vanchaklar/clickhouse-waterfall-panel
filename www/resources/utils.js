function showError(...message) {
    message = message.join(' ');
    console.error(message)
    let progress_bar = document.getElementById('query-errors')
    let content = document.createElement('div')
    content.setAttribute('class', 'error')
    content.innerHTML = message
    progress_bar.appendChild(content)
    setTimeout(function () { content.remove() }, 5000)
}

function login() {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    if (username === 'monitoring') {
        username = localStorage.getItem('username');
        password = localStorage.getItem('password');
        if (!username || username === '') {
            username = 'monitoring';
            password = '';
            document.getElementById('show-login').checked = false;
        } else {
            document.getElementById('show-login').checked = true;
        }
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
        return;
    }
    if (username === '') {
        localStorage.removeItem('username');
        localStorage.removeItem('password');
        document.getElementById('username').value = 'monitoring';
        document.getElementById('password').value = '';
        document.getElementById('show-login').checked = false;
        return;
    }
    localStorage.setItem('username', username);
    localStorage.setItem('password', password);
    document.getElementById('show-login').checked = true;
}

async function loadSources(source_type) {
    let query = `select '' as name`;
    switch (source_type) {
        case 'clickhouse':
            query = `SELECT 'localhost' as name `
                + `union all `
                + `select name from system.named_collections where name like 'clickhouse_%'`
                ;
            break;
        case 'mysql':
            query = `SELECT name FROM system.named_collections where name like 'mysql_%'`;
            break;
        case 'postgresql':
        case 'postgres':
            query = `SELECT name FROM system.named_collections where name like 'postgres_%'`;
            break;
        case 'mongodb':
        case 'mongo':
            query = `SELECT name FROM system.named_collections where name like 'mongo_%'`;
            break;
        case 'jdbc':
            query = `select name from jdbc('', 'SHOW DATASOURCES')`;
            break;
        default:
            query = `SELECT '' as name`;
    }
    data = await executeQuery(query)
    if (data.exception) {
        showError('Error loading sources:', data.exception);
        return;
    }
    let result = document.getElementById('source-selector');
    result.innerHTML = '';
    data.data.forEach((row) => {
        let option = document.createElement('option');
        option.value = row.name;
        option.innerText = row.name;
        result.appendChild(option);
    });
    loadDatabases()
}

async function loadDatabases() {
    let source_type = document.getElementById('query-type').value;
    let source = document.getElementById('source-selector').value;
    let query = `select '' as name`;
    switch (source_type) {
        case 'clickhouse':
            if (source == 'localhost') {
                query = `SELECT name FROM system.databases`;
            } else if (source.startsWith('clickhouse_')) {
                query = `select name from remote(${source}, database='system', db='system', table='databases') settings implicit_transaction=0`
            } else {
                query = `select '' as name`;
            }
            break;
        case 'mysql':
            query = `select '' as name`;
            break;
        case 'postgresql':
        case 'postgres': // TODO
            query = `select datname as name from postgresql(${source}, database='postgres', schema='pg_catalog', table='pg_database') where not datistemplate `;
            break;
        case 'mongodb':
        case 'mongo':
            // query = `select name from admin.mongodb_databases where source_name = '${source}'`;
            query = `select '' as name`;
            break;
        case 'jdbc':
            query = `select name from jdbc('${source}', 'select name from sys.databases where name not in (''model'', ''master'', ''tempdb'', ''msdb'')')`;
            break;
        default:
            query = `SELECT '' as name`;
    }
    data = await executeQuery(query)
    if (data.exception) {
        showError('Error loading databases:', data.exception);
        return;
    }
    let result = document.getElementById('database-selector');
    result.innerHTML = '';
    data.data.forEach((row) => {
        let option = document.createElement('option');
        option.value = row.name;
        option.innerText = row.name;
        result.appendChild(option);
    });
    loadSchemas()
}

async function loadSchemas() {
    let source_type = document.getElementById('query-type').value;
    let source = document.getElementById('source-selector').value;
    let database = document.getElementById('database-selector').value;
    let query = `select '' as name`;
    switch (source_type) {
        case 'clickhouse':
            query = `select '' as name`;
            break;
        case 'mysql':
            query = `select distinct TABLE_SCHEMA as name from mysql(${source}, database='information_schema', table='TABLES')`;
            break;
        case 'postgresql':
        case 'postgres': // TODO;
            query = `select schema_name as name from postgresql(${source}, database='${database}', schema='information_schema', table='schemata')`;
            break;
        case 'mongodb':
        case 'mongo':
            query = `select '' as name`;
            break;
        case 'jdbc':
            query = `select name from jdbc('${source}', 'select name from ${database}.sys.schemas where left(name, 3) <> ''db_'' and name not in (''INFORMATION_SCHEMA'', ''sys'', ''guest'')')`;
            break;
        default:
            query = `select '' as name`;
    }
    data = await executeQuery(query)
    if (data.exception) {
        showError('Error loading schemas:', data.exception);
        return;
    }
    let result = document.getElementById('schema-selector');
    result.innerHTML = '';
    data.data.forEach((row) => {
        let option = document.createElement('option');
        option.value = row.name;
        option.innerText = row.name;
        result.appendChild(option);
    });
    loadTables()
}

async function loadTables() {
    let source_type = document.getElementById('query-type').value;
    let source = document.getElementById('source-selector').value;
    let database = document.getElementById('database-selector').value;
    let schema = document.getElementById('schema-selector').value;
    let query = `select '' as name`;
    switch (source_type) {
        case 'clickhouse':
            if (source == 'localhost') {
                query = `SELECT name FROM system.tables WHERE database = '${database}'`;
            } else if (source.startsWith('clickhouse_')) {
                query = `select name from remote(${source}, database='system', db='system', table='tables') WHERE database = '${database}' settings implicit_transaction=0`
            } else {
                query = `select '' as name`;
            }
            break;
        case 'mysql':
            query = `select distinct TABLE_NAME as name from mysql(${source}, database='information_schema', table='TABLES') where TABLE_SCHEMA = '${schema}'`;
            break;
        case 'postgresql':
        case 'postgres': // TODO
            query = `select table_name as name from postgresql(${source}, database='${database}', schema='information_schema', table='tables') where table_schema = '${schema}'`;
            break;
        case 'mongodb':
        case 'mongo':
            query = `select '' as name`;
            break;
        case 'jdbc':
            query = `SELECT name as name FROM jdbc('${source}', 'select name from ${database}.sys.tables where schema_id = (select schema_id from ${database}.sys.schemas where name = ''${schema}'')')`;
            break;
        default:
            query = `SELECT '' as name`;
    }
    data = await executeQuery(query)
    if (data.exception) {
        showError('Error loading tables:', data.exception);
        return;
    }
    let result = document.getElementById('table-selector');
    result.innerHTML = '';
    data.data.forEach((row) => {
        let option = document.createElement('option');
        option.value = row.name;
        option.innerText = row.name;
        result.appendChild(option);
    });
}

async function loadViewRefreshes() {
    let query = `select \` \`, pipeline, database, view, status, progress, schedule,exception_type, exception from monitoring.view_refreshes order by pipeline, database, view`
    let actions = function (row) {
        let td = document.createElement('td')
        let b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('system start view {database:Identifier}.{view:Identifier}', { 'param_database': '${row.database}', 'param_view': '${row.view}'});loadViewRefreshes();`)
        b.innerHTML = '⏵';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('system stop view {database:Identifier}.{view:Identifier}', { 'param_database': '${row.database}', 'param_view': '${row.view}'});loadViewRefreshes();`)
        b.innerHTML = '⏹';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('system cancel view {database:Identifier}.{view:Identifier}', { 'param_database': '${row.database}', 'param_view': '${row.view}'});loadViewRefreshes();`)
        b.innerHTML = '⏸';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('system refresh view {database:Identifier}.{view:Identifier}', { 'param_database': '${row.database}', 'param_view': '${row.view}'});loadViewRefreshes();`)
        b.innerHTML = '🗘';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `generateQuery('show-create', source_type='clickhouse', source='localhost', database='${row.database}', schema=undefined, table='${row.view}');loadViewRefreshes();`)
        b.innerHTML = '🗐';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('select extractAlterRefresh({database:String},{view:String}) as value', { 'param_database': '${row.database}', 'param_view': '${row.view}'}).then(function(data){setShellValue(data.data[0].value);loadViewRefreshes();})`)
        b.innerHTML = '🕰';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('select extractAlterSelect({database:String},{view:String}) as value', { 'param_database': '${row.database}', 'param_view': '${row.view}'}).then(function(data){setShellValue(data.data[0].value);loadViewRefreshes();})`)
        b.innerHTML = '🖉';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `executeQuery('select extractAlterComment({database:String},{view:String}) as value', { 'param_database': '${row.database}', 'param_view': '${row.view}'}).then(function(data){setShellValue(data.data[0].value);loadViewRefreshes();})`)
        b.innerHTML = '🖆';
        td.appendChild(b)
        return td
    }
    let data = await executeQuery(query)
    let table = createTable(data, actions)
    let section = document.getElementById('section-view_refreshes')
    let old = section.getElementsByTagName('table');
    if (old.length > 0) {
        section.removeChild(old[0]);
    }
    section.appendChild(table)
    console.log('Data loaded successfully:', section);
}

async function loadWaterfallTables() {
    let section = document.getElementById(`section-waterfall_tables`);
    isVisible = !section.getElementsByTagName('input')[0].checked;
    if (!isVisible) {
        return;
    }
    let query = `select * from admin_panel.waterfall_tables`
    let actions = function (row) {
        let td = document.createElement('td')
        let b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `generateQuery('select',source_type='clickhouse',source=undefined, database='${row.database}',schema=undefined, table='${row.name}');loadWaterfallTables();`)
        b.innerHTML = '🔍';
        td.appendChild(b)
        b = document.createElement('button')
        b.setAttribute('class', 'action-button')
        b.setAttribute('onclick', `generateQuery('show-create',source_type='clickhouse',source=undefined, database='${row.database}',schema=undefined, table='${row.name}');loadWaterfallTables();`)
        b.innerHTML = '🖉';
        td.appendChild(b)
        return td
    }
    let data = await executeQuery(query)
    let table = createTable(data, actions)
    let old = section.getElementsByTagName('table');
    if (old.length > 0) {
        section.removeChild(old[0]);
    }
    section.appendChild(table)
    console.log('Data loaded successfully:', section);
}

async function generateQuery(
    mode = 'select',
    source_type = undefined,
    source = undefined,
    database = undefined,
    schema = undefined,
    table = undefined
) {
    if (source_type === undefined) { source_type = document.getElementById('query-type').value; }
    if (source === undefined) { source = document.getElementById('source-selector').value; }
    if (database === undefined) { database = document.getElementById('database-selector').value; }
    if (schema === undefined) { schema = document.getElementById('schema-selector').value; }
    if (table === undefined) { table = document.getElementById('table-selector').value; }
    let etl_source = `${source}.${database}.${schema}.${table}`.replace(/[.]+/g, '.');
    let query = '';
    switch (source_type) {
        case 'clickhouse':
            if (source === 'localhost') {
                if (mode === 'show-create') {
                    query = `show create ${database}.${table}`
                } else {
                    query = `SELECT * FROM system.columns where database = '${database}' AND table = '${table}' and default_kind != 'EPHEMERAL'`;
                }
            } else if (source.startsWith('clickhouse_')) {
                if (mode === 'show-create') {
                    query = `SELECT formatQuery(create_table_query) as statement FROM remote(${source}, database='system', db='system', table='tables') where database = '${database}' AND table = '${table}' settings implicit_transaction=0`;
                } else {
                    query = `SELECT * FROM remote(${source}, database='system', db='system', table='columns') where database = '${database}' AND table = '${table}' and default_kind != 'EPHEMERAL' settings implicit_transaction=0`;
                }
            }
            break;
        case 'mysql':
            query = `select COLUMN_NAME as name, COLUMN_TYPE as type, * from mysql(${source}, database='information_schema', table='COLUMNS') where TABLE_SCHEMA = '${schema}' and TABLE_NAME = '${table}'`;
            break;
        case 'postgresql':
        case 'postgres': // TODO
            query = `select column_name as name, * from postgresql(${source}, database='${database}', schema='information_schema', table='columns') where table_schema = '${schema}' and table_name = '${table}' order by ordinal_position`;
            break;
        case 'mongodb':
        case 'mongo':
            query = `select '' as name`;
            break;
        case 'jdbc':
            query = `select * from jdbc('${source}', 'select * from ${database}.sys.columns where object_id = (select object_id from ${database}.sys.tables where name = ''${table}'')')`;
            break;
        default:
            query = `SELECT '' as name`;
    }
    let data = await executeQuery(query);
    if (data && data.exception) {
        showError('Error generating query:', data.exception);
        return;
    }
    if (data && !data.data || data.data.length === 0) {
        showError('No data returned from query');
        return;
    }
    if (mode === 'show-create') {
        query = data.data[0]['statement']
        query = query.replaceAll('\\r\\n', '\n')
        query = query.replaceAll('\\n', '\n')
        console.log(query)
        setShellValue(query)
        return query;
    }
    source_columns = data.data;
    let columns = source_columns.map(row => row.name).join(',\n');
    switch (source_type) {
        case 'clickhouse':
            if (source === 'localhost') {
                query = formatSQL(`SELECT ${columns} FROM ${database}.${table} limit 100`);
            } else if (source.startsWith('clickhouse_')) {
                query = formatSQL(`SELECT ${columns} FROM remote(${source}, database='${database}', db='${database}', table='${table}') limit 100 settings implicit_transaction=0`);
            }
            break;
        case 'mysql':
            query = formatSQL(`SELECT ${columns} FROM mysql(${source}, database='${schema}', table='${table}') limit 100`);
            break;
        case 'jdbc':
            query = formatSQL(`SELECT ${columns} FROM jdbc`) + `('${source}', '
-- You can add VARIABLES here
`
                + formatSQL(`SELECT top 1000 -- \n ${data.data.map(row => {
                    if (row.user_type_id && row.user_type_id === 43) { // datetimeoffset
                        return `try_cast(${row.name} as datetime) as ${row.name}`;
                    }
                    return row.name;
                }).join(', ')} FROM ${database}.${schema}.${table} with(nolock)`)
                + `
-- You can add WHERE conditions here
-- You can add ORDER BY here
')`;
            break;
        case 'postgresql':
        case 'postgres': // TODO
            query = `select * from postgresql(${source}, database='${database}', schema='${schema}', table='${table}') limit 100`;
            break;
        case 'mongodb':
        case 'mongo':
            query = `select --{columns}\nfrom mongodb(${source}, '{database}', '{table}', '{structure}')`;
        default:
    }
    try {
        let database_name;
        let params_e
        let params
        let required_params
        let data
        let table_name
        let column_definitions
        let partitioning_keys
        let primary_key
        let uniqe_key
        let partitioning_key
        let where_conditions
        let order_by_keys
        let variable_declarations
        switch (mode) {
            case 'create-dam-table':
            case 'create-swamp-table':
            case 'create-lake-table':
            case 'create-pool-table':
            case 'create-spring-view':
            case 'create-flow-view':
            case 'create-river-view':
            case 'create-geyser-view':
                params_e = document.getElementById('params-container').getElementsByTagName('textarea')
                params = {}
                required_params = getParamsFromShellQuery()
                required_params.forEach((v) => {
                    params['param_' + v] = params_e.namedItem('param_' + v).value;
                })
                data = await executeQuery(`describe (${query})`, params);

                table_name = document.getElementById('table-selector').value;
                column_definitions = data.data.map(row => row.name.startsWith('ETL_') ? `-- ${row.name} ${row.type}` : `${row.name} ${row.type}`).join(',\n    ')
                partitioning_keys = []
                primary_key = ''
                uniqe_key = ''
                where_conditions = []
                order_by_keys = []
                variable_declarations = []
                source_columns.forEach(row => {
                    // jdbc mssql:
                    if (row.is_identity) {
                        primary_key = uniqe_key = row.name
                    }
                    if (row.name && [
                        'create_time', 'createtime',
                        'create_date', 'createdate',
                        'create_datetime', 'createdatetime',
                        'create_timestamp', 'createtimestamp',
                        'created_at', 'createdat',
                        'created_on', 'createdon',
                        'time',
                        'date',
                        'datetime',
                        'timestamp'
                    ].includes(row.name.toLowerCase())) {
                        if (data.data.find(r => r.name === row.name).type === 'Int64') {
                            column_definitions += `,\n    ETL_partition_by Int32 default toYYYYMM(fromUnixTimestamp(${row.name}))`
                            partitioning_keys.push(`ETL_partition_by`)
                        } else {
                            partitioning_keys.push(`toYYYYMM(${row.name})`)
                        }
                    }
                    if (row.name && [
                        'tracker'
                    ].includes(row.name.toLowerCase())) {
                        if (data.data.find(r => r.name === row.name).type === 'String') {
                            column_definitions += `,\n    ETL_version UInt64 default toRowVersion(${row.name}))`
                            variable_declarations.push(`declare @last_version timestamp = ' || (select max(ETL_version) from dam.${table_name}) || '`)
                            where_conditions.push(`${row.name} > @last_version`)
                            order_by_keys.push(`${row.name} asc`)
                        }
                    }
                    // clickhouse:
                    if (row.is_in_primary_key === 1) {
                        primary_key = row.name
                    }
                    if (row.is_in_sorting_key === 1) {
                        uniqe_key = row.name
                    }

                    // mysql:
                    if (row.COLUMN_KEY === 'PRI') {
                        primary_key = row.COLUMN_NAME
                        uniqe_key = row.COLUMN_NAME
                    }
                    if (row.COLUMN_KEY === 'UNI') {
                        primary_key = row.COLUMN_NAME
                        uniqe_key = row.COLUMN_NAME
                    }
                    // postgresql:
                    if (row.is_identity === 'YES') {
                        primary_key = row.name
                        uniqe_key = row.name
                    }

                    // mongodb: TODO

                })
                partitioning_key = partitioning_keys.join(', ')
                break;
            default:
        }
        switch (mode) {
            case 'select':
            case 'show-create':
                break
            case 'create-dam-table':
            case 'create-swamp-table':
            case 'create-lake-table':
            case 'create-pool-table':
                database_name = mode.split('-')[1];
                query = `create table ${database_name}.${table_name} (
    ${column_definitions},
    ETL_source LowCardinality(String) default '${etl_source}',
    ETL_version Int64 default 0,
    ETL_datetime datetime default now(),
    index idx_ETL_source ETL_source type set(0)
)
engine = ReplacingMergeTree(ETL_datetime)
primary key (${primary_key})
partition by (${partitioning_key})
order by (${uniqe_key})
comment '${table_name}'`
                break;
            case 'create-spring-view':
                if (variable_declarations.length > 0) {
                    query = query.replace('-- You can add VARIABLES here', variable_declarations.join('\n'))
                }
                if (where_conditions.length > 0) {
                    query = query.replace('-- You can add WHERE conditions here', 'WHERE ' + where_conditions.join('\n    AND '))
                }
                if (order_by_keys.length > 0) {
                    query = query.replace('-- You can add ORDER BY here', 'ORDER BY ' + order_by_keys.join(',\n    '))
                }
                query = `create materialized view spring.${table_name}
refresh every 1 minute append to dam.${table_name}
as (${query})
comment '${table_name}'`
                break;
            case 'create-flow-view':
                query = `create materialized view flow.${table_name}
to swamp.${table_name} 
as (select
    ${columns},
    ETL_source,
    ETL_version,
    ETL_datetime
from dam.${table_name}
settings
    final = 1
)
comment '${table_name}'`
                break;
            case 'create-river-view':
                query = `create materialized view river.${table_name}
to lake.${table_name} 
as (select
    ${columns},
    ETL_source,
    ETL_version,
    ETL_datetime
from swamp.${table_name}
settings
    final = 1
)
comment '${table_name}'`
                break;
            case 'create-geyser-view':
                query = `create materialized view geyser.${table_name}
to pool_main.${table_name} 
as (select
    ${columns},
    ETL_source,
    ETL_version,
    ETL_datetime
from lake.${table_name}
settings
    final = 1
)
comment '${table_name}'`
                break;
            default:
                showError('Invalid mode:', mode);
        }
    } catch (e) {
        showError('Error executing shell query:', e);
    }

    // Set the shell textarea value to the generated query
    setShellValue(query)
    return query;
}

async function clearQuery() {
    let shell = document.getElementById('shell');
    shell.value = '';
    shell.focus();

    document.getElementById('shell-result').innerText = '';
    let progressBar = document.getElementById('query-errors');
    progressBar.innerHTML = '';
}

function setShellValue(value) {
    if (value instanceof Promise) {
        console.log(value);
        throw new Error("invalid input: Promise");
    }
    let shellTextarea = document.getElementById('shell');
    shellTextarea.value = value;
    shellTextarea.focus();
    shellTextarea.lang = 'sql';
    highlightSQL()
}

function createTable(data, extra_cell_content_function = null) {
    let tableElement = document.createElement('table');
    let header = document.createElement('tr');
    let header2 = document.createElement('tr');
    let hasSecondHeader = false; // Initialize hasSecondHeader
    shouldPivot = false; // Initialize shouldPivot
    // Store column metadata and extremes
    let columnTypes = {};
    let columnExtremes = {};

    // Get column types and initialize extremes
    data.meta.forEach(col => {
        columnTypes[col.name] = col.type;
        let min = undefined, max = undefined;
        try {
            if (data.extremes) {
                min = parseFloat(data.extremes.min[col.name])
                max = parseFloat(data.extremes.max[col.name])
            }
            if (data.totals) {
                if (min !== undefined) {
                    min = (parseFloat(data.totals[col.name]) > min) ? min : data.totals[col.name]
                } else {
                    min = parseFloat(data.totals[col.name])
                }
                if (max !== undefined) {
                    max = (parseFloat(data.totals[col.name]) < max) ? max : data.totals[col.name]
                } else {
                    max = parseFloat(data.totals[col.name])
                }
            }
            columnExtremes[col.name] = { min, max };
        }
        catch (e) {
            showError('Error parsing extremes:', e);
        }
    });

    // Create header
    subColumns = {};
    data.meta.forEach(col => {
        let th = document.createElement('th');
        th.innerText = col.name;
        if (shouldPivot && columnExtremes[col.name] && typeof (columnExtremes[col.name].min) === 'object' && columnExtremes[col.name].min !== null) {
            hasSecondHeader = true;
            headerLength = Object.keys(columnExtremes[col.name].min).length;
            th.setAttribute('colspan', headerLength);
            subColumns[col.name] = columnExtremes[col.name].min
            Object.entries(subColumns[col.name]).forEach(([k, v]) => {
                let th2 = document.createElement('th');
                th2.innerText = k;
                header2.appendChild(th2);
            });
        } else {
            th.setAttribute('rowspan', 2);
        }
        header.appendChild(th);
    });
    tableElement.appendChild(header);
    tableElement.appendChild(header2);

    // Create rows
    function f(row, isTotals = false) {
        let tr = document.createElement('tr');
        tr.setAttribute('class', isTotals ? 'totals' : '');
        Object.entries(row).forEach(([key, value]) => {
            let td = document.createElement('td');
            if (value === null) {
                value = 'ᴺᵁᴸᴸ';
            } else if (typeof value === 'object') {
                try {
                    if (shouldPivot && hasSecondHeader && columnExtremes[key] && typeof (columnExtremes[key].min) === 'object') {
                        subColumns = columnExtremes[key].min;
                        Object.entries(subColumns).forEach(([index, _]) => { // Corrected to use forEach
                            let td2 = document.createElement('td');
                            if (value[index] === undefined) {
                                value[index] = 'ᴺᵁᴸᴸ';
                            } else if (value[index] === null) {
                                value[index] = 'ᴺᵁᴸᴸ';
                            }
                            if (typeof value[index] === 'object') {
                                value[index] = JSON.stringify(value[index]);
                            }
                            td2.innerText = value[index];
                            tr.appendChild(td2);
                        });
                        return; // Added return statement to exit the function
                    } else {
                        value = JSON.stringify(value);
                    }
                } catch (error) {
                    showError('Error processing object value:', error);
                }
            }
            td.onclick = () => {
                setShellValue(value)
            };
            td.innerText = value;

            // Add background gradient for numeric columns if we have extremes
            try {
                if (columnTypes[key]?.match(/^(Nullable\()?(U?Int|Decimal|Float)/) && columnExtremes[key]) {
                    let numValue = Number(value);
                    let { min, max } = columnExtremes[key];
                    if (!isNaN(numValue) && max >= min) {
                        if (min > 0) {
                            min = 0;
                        }
                        if (max < 0) {
                            max = 0;
                        }
                        let ratio = 0; // Set ratio to 0 if min equals max
                        if (!(max - min === 0)) {
                            ratio = 100 * (numValue - min) / (max - min);
                        }
                        td.style.background = `linear-gradient(to right, 
                                var(--bar-color) 0%, 
                                var(--bar-color) ${ratio}%, 
                                var(--element-background-color) ${ratio}%, 
                                var(--element-background-color) 100%)`;
                    }
                }
            } catch (error) {
                showError('Error applying background gradient:', error);
            }

            // Add tooltip for multiline values
            try {
                if (value && typeof (value) == 'string' && value.includes('\n')) {
                    let multi_line_value = value.replace(/\n/g, '<br>');
                    let tooltip = document.createElement('pre');
                    tooltip.innerHTML = multi_line_value;
                    tooltip.className = 'tooltip';
                    td.innerText = value.split('\n')[0];
                    td.appendChild(tooltip);
                }
            } catch (error) {
                showError('Error creating tooltip:', error);
            }

            tr.appendChild(td);
        });
        if (extra_cell_content_function) {
            tr.appendChild(extra_cell_content_function(row))
        }
        tableElement.appendChild(tr);
    }
    data.data.forEach(row => f(row));
    if (data.totals) { f(data.totals, true) }
    return tableElement;
}

async function fetchData(endpoint) {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    if (!username) {
        username = 'monitoring';
    }

    let response = await fetch(`/admin/${endpoint}`, {
        method: 'GET',
        headers: {
            'Authorization': 'never',
            'Content-Type': 'application/json',
            'X-ClickHouse-User': username,
            'X-ClickHouse-Key': password,
        }
    });
    if (!response.ok) {
        showError(`HTTP error! status: ${response.status}`);
    }
    let data = await response.json();
    return data;
}

async function loadData(endpoint = null) {
    let data;
    try {
        if (!endpoint) {
            throw new Error("Endpoint is required:", endpoint);
        }
        let section = document.getElementById(`section-${endpoint}`);
        isVisible = !section.getElementsByTagName('input')[0].checked;
        if (!isVisible) {
            return;
        }
        data = await fetchData(endpoint);
        // console.log(data)
        if (data.exception) {
            showError(data.exception)
            return;
        }
        let old = section.getElementsByTagName('table');
        let tableElement = createTable(data);
        if (old.length > 0) {
            section.removeChild(old[0]);
        }
        section.appendChild(tableElement);
        // console.log('Data loaded successfully:', section);
    } catch (error) {
        let section = document.getElementById(`section-${endpoint}`);
        let old = section.getElementsByTagName('table');
        if (old.length > 0) {
            section.removeChild(old[0]);
        }
        showError('Error loading data:', error);
        if (data && data.exception) {
            showError(data.exception)
        }
    }
    return;
}

let requests = [], responses = [];
async function executeQuery(query, params = null, show_progress = false) {
    console.log('Executing query:', query, params);
    if (!query.trim()) {
        return;
    }
    let default_format = show_progress ? 'JSONEachRowWithProgress' : 'JSON';
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    let url = `/query?add_http_cors_header=1&use_concurrency_control=0&workload=admin&default_format=${default_format}&extremes=1&implicit_select=1&implicit_transaction=0`;
    if (params) {
        Object.entries(params).forEach((v) => {
            url += `&${encodeURIComponent(v[0])}=${encodeURIComponent(v[1].replaceAll('\n', '\\n'))}`
        })
    }
    console.log(url)
    let request = fetch(url, {
        method: 'POST',
        body: query,
        headers: {
            'Authorization': 'never',
            'Content-Type': 'application/json',
            'X-ClickHouse-User': username,
            'X-ClickHouse-Key': password,
        }
    });
    function updateRequestsStatus() {
        let statusElem = document.getElementById('requests-status-container');
        statusElem.innerText = `Requests: ${requests.length}
        Responses: ${responses.length}
        Running: ${requests.length - responses.length}`;
    }
    requests.push(request);
    updateRequestsStatus();
    let response = await request
    console.log(response)
    responses.push(response);
    updateRequestsStatus();
    if (!response.ok) {
        // showError(`${response.statusText} (${response.status})`);
        let errorText = await response.text();
        // showError(errorText);
        return { exception: `${response.statusText} (${response.status}): ${errorText}` };

    }
    let response_data = {}, data = [];
    if (show_progress) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += decoder.decode(value, { stream: true });
            let lines = result.split('\n');
            for (line of lines) {
                try {
                    let parsed = undefined;
                    parsed = JSON.parse(line);
                    if (parsed.progress) {
                        updateProgress(parsed.progress);
                    }
                } catch (e) { }
            }
        };
        let lines = result.split('\n');
        for (line of lines) {
            try {
                parsed = JSON.parse(line);
                if (parsed.progress) {
                } else if (parsed.row) {
                    data.push(parsed.row);
                } else if (parsed.min) {
                    response_data.extremes = {
                        ...response_data.extremes,
                        min: parsed.min
                    };
                } else if (parsed.max) {
                    response_data.extremes = {
                        ...response_data.extremes,
                        max: parsed.max
                    };
                } else {
                    response_data = { ...response_data, ...parsed };
                }
            } catch (e) { }
        }
        response_data.data = data;
    } else {
        response_data = await response.json();
    }
    return response_data;

}

async function executeScript(script_path) {
    return executeQuery(`select * from executable('${script_path}','LineAsString','result String')`)
}

async function executeShellQuery(mode = 'execute') {
    let data
    document.getElementById('query-progress').innerHTML = ''
    try {
        let query = document.getElementById('shell').value;
        console.log('Executing shell query:', query)
        let result = document.getElementById('shell-result');
        result.innerHTML = '';
        switch (mode) {
            case 'describe':
                query = `describe (${query})`;
                break;
            case 'explain estimate':
                query = `explain estimate ${query}`;
                break;
            case 'explain syntax':
                query = `explain syntax ${query}`;
                break;
            case 'execute':
            default:
        }
        let params_e = document.getElementById('params-container').getElementsByTagName('textarea')
        let params = {}
        let required_params = getParamsFromShellQuery()
        required_params.forEach((v) => {
            params['param_' + v] = params_e.namedItem('param_' + v).value;
        })
        console.log('params', params)
        data = await executeQuery(query, params, true);
        if (data.exception) {
            showError(data.exception);
        } else if (data.meta) {
            try {
                let table = createTable(data);
                result.appendChild(table);
            } catch (e) {
                showError(`Error creating table: ${e.message}`);
            }
        } else {
            result.innerHTML = JSON.stringify(data, null, 2);
        }
    } catch (e) {
        try {
            let errorText = data.exception;
            showError(`${errorText}`);
        } catch (e2) {
            showError(`Error executing query: ${e.message}`);
            showError(`Error parsing exception: ${e2.message}`);
            showError(`data: ${data}`);
        }

        // let progressBar = document.getElementById('query-errors');
        // progressBar.innerHTML = ''
    }
    loadData('templates')
    loadData('query_log')
    loadWaterfallTables()
    loadData('waterfall_overview')
}

function formatReadable(number = 0, decimals = 2, units = []) {
    const k = 1000;
    const i = number ? Math.floor(Math.log(number) / Math.log(k)) : 0;
    const unit = units[i];
    const dm = unit ? decimals : 0;
    return Number(number / Math.pow(k, i)).toFixed(dm) + unit;
}

function formatReadableBytes(bytes) {
    const units = [' B', ' KB', ' MB', ' GB', ' TB', ' PB', ' EB', ' ZB', ' YB'];

    return formatReadable(bytes, 2, units);
}

function formatReadableRows(rows) {
    const units = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion'];

    return formatReadable(rows, 2, units);
}

function updateProgress(progress) {
    let progress_elem = document.getElementById('query-progress');

    const rows = +progress.read_rows;
    const bytes = +progress.read_bytes;
    const total_rows = +progress.total_rows_to_read;
    elapsed_ns = +progress.elapsed_ns;

    let formatted_rows = formatReadableRows(rows);
    let formatted_bytes = formatReadableBytes(bytes);

    const rps = rows * 1e9 / elapsed_ns;
    const bps = bytes * 1e9 / elapsed_ns;

    let formatted_rps = formatReadableRows(rps) + '/sec';
    let formatted_bps = formatReadableBytes(bps) + '/sec';

    if (rows >= 1e11) { formatted_rows = `<b>${formatted_rows}<\/b>`; }
    if (bytes >= 1e12) { formatted_bytes = `<b>${formatted_bytes}<\/b>`; }
    if (rps >= 1e10) { formatted_rps = `<b>${formatted_rps}<\/b>`; }
    if (bps >= 1e10) { formatted_bps = `<b>${formatted_bps}<\/b>`; }

    let text = '';
    let progress_text = '';

    if (total_rows) {
        progress_text += (100 * Math.min(1.0, rows / total_rows)).toFixed(1) + '%, ';
    }

    text += `Read ${formatted_rows} rows, ${formatted_bytes}`;

    if (rps > 1e6) { text += ` (${formatted_rps}, ${formatted_bps})`; }

    if (elapsed_ns) { progress_text += `${(elapsed_ns / 1e9).toFixed(2)} sec, `; }
    progress_elem.innerText = progress_text + text;
    document.documentElement.style.setProperty('--progress',
        rows && total_rows ? (100 * rows / total_rows) + '%' : '0');

}

function formatSQL(query = null) {
    if (query) {
        return sqlFormatter.format(query, {
            language: 'sql',
            tabWidth: 2,
            useTabs: false,
            keywordCase: 'lower',
            indentStyle: 'standard',
            logicalOperatorNewline: 'before',
            tabulateAlias: false,
            commaPosition: 'after',
            expressionWidth: 50,
            linesBetweenQueries: 1,
            denseOperators: false,
            newlineBeforeSemicolon: false,
        });
    }
    let textarea = document.getElementById('shell');
    try {
        let formatted = sqlFormatter.format(textarea.value, {
            language: 'sql',
            tabWidth: 2,
            useTabs: false,
            keywordCase: 'lower',
            indentStyle: 'standard',
            logicalOperatorNewline: 'before',
            tabulateAlias: false,
            commaPosition: 'after',
            expressionWidth: 50,
            linesBetweenQueries: 1,
            denseOperators: false,
            newlineBeforeSemicolon: false,
        });
        textarea.value = formatted;
        highlightSQL();
    } catch (e) {
        showError('SQL formatting error:', e);
    }
}

function highlightSQL() {
    let textarea = document.getElementById('shell');
    let code = textarea.value;
    const tokens = await tokenize(code);
    const highlighted = renderQueryBackdrop(code, tokens, []);
    // Create a hidden div to show highlighted code
    let div = document.getElementById('highlighted-sql') || document.createElement('pre');
    div.id = 'highlighted-sql';
    div.className = 'hljs sql';
    div.style.position = 'absolute';
    div.style.pointerEvents = 'none';
    div.style.width = textarea.style.width;
    div.style.height = textarea.style.height;
    div.style.paddingBottom = '10px';
    // fix: the highlighted div wont resize  
    //div.width = textarea.offsetWidth + 'px';
    //div.height = textarea.offsetHeight + 'px';

    div.style.overflow = 'hidden';
    div.innerHTML = highlighted;
    if (!document.getElementById('highlighted-sql')) {
        textarea.parentNode.insertBefore(div, textarea.nextSibling);
        textarea.addEventListener('scroll', () => {
            div.scrollTop = textarea.scrollTop;
            div.scrollLeft = textarea.scrollLeft;
        });
    }
    div.scrollTop = textarea.scrollTop;
    div.scrollLeft = textarea.scrollLeft;
    createParamInputs();
}
// from clickhouse web ui
function renderQueryBackdrop(text, tokens, boundaries) {
    let html = '';
    let offset = 0;
    for (let i = 0; i < tokens.length; ++i) {
        const elem = tokens[i];
        const tokStart = offset;
        const tokEnd = offset + elem.token.length;
        offset = tokEnd;
        const cls = tokenClass(tokens, i);
        const escaped = escapeHTML(elem.token);
        if (cls) {
            html += '<span class="' + cls + '">' + escaped + '</span>';
        } else {
            html += escaped;
        }
    }
    if (offset < text.length) {
        html += '<span class="q-err">' + escapeHTML(text.substring(offset)) + '</span>';
    }
    if (html.endsWith('\n')) html += ' ';
    return html
}

function escapeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/// Numeric TokenType values, matching the order of the C++ enum in src/Parsers/Lexer.h.
/// Only the categories we actually classify are named; everything else is treated as
/// "default" (unstyled) and renders in the canonical text color via the diff blend.
const TT = {
    Whitespace: 0, Comment: 1, BareWord: 2, Number: 3, StringLiteral: 4, QuotedIdentifier: 5,
    OpeningRoundBracket: 6, ClosingRoundBracket: 7,
    Semicolon: 13, Asterisk: 16, HereDoc: 17, DollarSign: 18,
    Plus: 19, Minus: 20, Slash: 21, Percent: 22, Arrow: 23,
    QuestionMark: 24, Colon: 25, Caret: 26, DoubleColon: 27,
    Equals: 28, NotEquals: 29, Less: 30, Greater: 31,
    LessOrEquals: 32, GreaterOrEquals: 33, Spaceship: 34,
    PipeMark: 35, Concatenation: 36, At: 37, DoubleAt: 38,
};

/// SQL keywords recognized for highlighting. The lexer reports them as BareWord, so we
/// disambiguate identifiers from keywords here. Comparisons are case-insensitive.
const SQL_KEYWORDS = new Set([
    'ADD', 'AFTER', 'ALL', 'ALTER', 'AND', 'ANTI', 'ANY', 'ARRAY', 'AS', 'ASC', 'ASCENDING',
    'ASOF', 'AST', 'ASYNC', 'ATTACH', 'BACKUP', 'BEGIN', 'BETWEEN', 'BOTH', 'BY',
    'CACHE', 'CASCADE', 'CASE', 'CAST', 'CHANGE', 'CHANGED', 'CHECK', 'CLEAR', 'CLUSTER',
    'CODEC', 'COLLATE', 'COLUMN', 'COLUMNS', 'COMMENT', 'COMMIT', 'CONSTRAINT', 'CREATE',
    'CROSS', 'CUBE', 'CURRENT',
    'DATABASE', 'DATABASES', 'DAY', 'DEDUPLICATE', 'DEFAULT', 'DELETE', 'DESC', 'DESCENDING',
    'DESCRIBE', 'DETACH', 'DICTIONARIES', 'DICTIONARY', 'DISK', 'DISTINCT', 'DISTRIBUTED',
    'DROP', 'ELSE', 'END', 'ENGINE', 'ESTIMATE', 'EVENTS', 'EXCEPT', 'EXCHANGE', 'EXISTS',
    'EXPLAIN', 'EXPRESSION', 'EXTENDED', 'EXTRACT',
    'FALSE', 'FETCH', 'FETCHES', 'FILE', 'FILESYSTEM', 'FINAL', 'FIRST', 'FLUSH', 'FOLLOWING',
    'FOR', 'FOREIGN', 'FORMAT', 'FREEZE', 'FROM', 'FULL', 'FUNCTION',
    'GLOBAL', 'GRANT', 'GROUP', 'GROUPS', 'HAVING', 'HIERARCHICAL', 'HOUR',
    'ID', 'IDENTIFIED', 'IF', 'ILIKE', 'IN', 'INDEX', 'INF', 'INHERIT', 'INJECTIVE',
    'INNER', 'INSERT', 'INTERSECT', 'INTERVAL', 'INTO', 'INVISIBLE', 'IS', 'IS_OBJECT_ID',
    'JOIN', 'KEY', 'KEYED', 'KILL',
    'LAST', 'LATERAL', 'LAYOUT', 'LEADING', 'LEFT', 'LIFETIME', 'LIKE', 'LIMIT', 'LIMITS',
    'LIVE', 'LOCAL', 'LOGS',
    'MATERIALIZE', 'MATERIALIZED', 'MAX', 'MERGES', 'MICROSECOND', 'MILLISECOND', 'MIN',
    'MINUTE', 'MODIFY', 'MONTH', 'MOVE', 'MUTATION',
    'NAN_SQL', 'NEXT', 'NO', 'NONE', 'NOT', 'NULL', 'NULLS',
    'OFFSET', 'ON', 'ONLY', 'OPTIMIZE', 'OPTION', 'OR', 'ORDER', 'OUTER', 'OUTFILE', 'OVER',
    'PARTITION', 'PASTE', 'PERMANENTLY', 'PLAN', 'POPULATE', 'PRECEDING', 'PRECISION',
    'PREWHERE', 'PRIMARY', 'PROFILE', 'PROJECTION', 'QUARTER', 'QUERY', 'QUOTA',
    'RANDOMIZED', 'RANGE', 'RECURSIVE', 'REFRESH', 'REGEXP', 'RELOAD', 'REMOTE', 'RENAME',
    'REPLACE', 'REPLICA', 'REPLICAS', 'RESET', 'RESTORE', 'RESTRICT', 'RESTRICTIVE',
    'RETURNS', 'REVOKE', 'RIGHT', 'ROLE', 'ROLLBACK', 'ROLLUP', 'ROW', 'ROWS',
    'SAMPLE', 'SECOND', 'SELECT', 'SEMI', 'SENDS', 'SET', 'SETS', 'SETTINGS', 'SHARD',
    'SHOW', 'SIGNED', 'SOURCE', 'SQL_SECURITY', 'START', 'STEP', 'STORAGE', 'STRICT',
    'STRICTLY_ASCENDING', 'SUBPARTITION', 'SUBSTRING', 'SUSPEND', 'SYNC', 'SYNTAX', 'SYSTEM',
    'TABLE', 'TABLES', 'TEMPORARY', 'TEST', 'THEN', 'TIES', 'TIMESTAMP', 'TO', 'TOP',
    'TOTALS', 'TRACKING', 'TRAILING', 'TRANSACTION', 'TRIGGER', 'TRIM', 'TRUE', 'TRUNCATE',
    'TYPE',
    'UNBOUNDED', 'UNFREEZE', 'UNION', 'UNIQUE', 'UNSIGNED', 'UPDATE', 'USE', 'USING',
    'UUID', 'VALUES', 'VARYING', 'VIEW', 'VIRTUAL', 'VISIBLE',
    'WATCH', 'WEEK', 'WHEN', 'WHERE', 'WINDOW', 'WITH', 'WORK', 'WRITABLE',
    'XOR', 'YEAR', 'ZKPATH',
]);

/// Map a single token to a CSS class. For BareWords we also peek at the next
/// non-whitespace token to distinguish a function call (`foo(`) from a plain
/// identifier — the lexer alone cannot tell them apart.
function tokenClass(tokens, i) {
    const elem = tokens[i];
    switch (elem.type) {
        case TT.Comment: return 'q-com';
        case TT.Number: return 'q-num';
        case TT.StringLiteral:
        case TT.HereDoc: return 'q-str';
        case TT.QuotedIdentifier: return 'q-qid';
        case TT.BareWord: {
            if (SQL_KEYWORDS.has(elem.token.toUpperCase())) return 'q-kw';
            for (let j = i + 1; j < tokens.length; ++j) {
                if (tokens[j].type === TT.Whitespace) continue;
                return tokens[j].type === TT.OpeningRoundBracket ? 'q-fn' : 'q-id';
            }
            return 'q-id';
        }
        case TT.Asterisk: case TT.Plus: case TT.Minus: case TT.Slash: case TT.Percent:
        case TT.Arrow: case TT.QuestionMark: case TT.Colon: case TT.DoubleColon: case TT.Caret:
        case TT.Equals: case TT.NotEquals:
        case TT.Less: case TT.Greater: case TT.LessOrEquals: case TT.GreaterOrEquals:
        case TT.Spaceship: case TT.PipeMark: case TT.Concatenation:
        case TT.At: case TT.DoubleAt: case TT.DollarSign:
            return 'q-op';
        default:
            return '';
    }
}

let lexer_module;
async function loadLexer() {
    // base64 -w0 build/src/Parsers/Lexer.wasm
    const lexer_base64 = "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A08NAkEBIQgDQCACLQAAIgVBMGshAQJAAkAgBwRAIAFB/wFxQQpJIAVBwQBrQQZJcg0CIAVB4QBrQQZPDQEMAgsgAUH/AXFBCkkNAQsgCCAFQd8AR3JBAXENBAJAIAJBAWoiCSADTw0AIAktAAAiBUEwayEBIAcEQCABQf8BcUEKSSAFQcEAa0EGSXINASAFQeEAa0EGTw0HDAELIAFB/wFxQQlLDQYLIAMgCUYNBAsgBiACQQFqIgI2AgBBACEIIAIgA0kNAAsMAgsgBiACQQFqIgI2AgBBACEIIAIgA0cNAAsLIAJBAWoiASADTw0AIAItAAAhBQJAIAcEQCAFQSByQfAARw0CDAELIAVBIHJB5QBHDQELIAYgATYCAAJAIAJBAmogA08NAAJAIAEtAABBK2sOAwABAAELIAYgAUEBaiIBNgIAIAEgA08NAgtBASECA0AgAS0AACIFQTBrQf8BcUEKTwRAIAIgBUHfAEdyQQFxDQMgAUEBaiICIANPDQMgAi0AAEEwa0H/AXFBCUsNAwsgBiABQQFqIgE2AgBBACECIAEgA0cNAAsMAQsgAiEBCwJ/AkACQCABIANPDQAgAS0AACICQd8ARiACQTBrQf8BcUEKSXJFIAJB3wFxQcEAa0H/AXFBGUtxDQAgAUEBaiEFA0AgBiAFIgE2AgAgASADTw0CIAFBAWohBSABLQAAIgdBMGshAiAHQd8ARiACQf8BcUEKSXIgB0HfAXFBwQBrQf8BcUEaSXINAAsgAUEBawwCCyAAIAE2AggMCgsgAUEBawshAwJAIAEgBE0NACAEQQFrIQUDQCAFQQFqIgUtAAAiAkEkRiACQd8ARnIgAkEwa0H/AXFBCklyRSACQd8BcUHBAGtB/wFxQRpPcUUEQCADIAVLDQEMAgsLIAAgATYCCCAAIAQ2AgQgAEEvOgAADwsMCQsgBiAEQQJqIgE2AgACQCABIANGDQADQCABLQAAQQpGDQEgAUEBaiIBIANHDQALIAMhAQsLIAAgATYCCCAAIAQ2AgQgAEEBOgAACyAGIAE2AgAPCyAAIAE2AgggACAENgIEIABBADoAAA8LIAAgBEEBaiIANgIIDAILIAAgBEECaiIANgIIDAELIAAgATYCCCAAIAQ2AgQgAEEoOgAADwsgBiAANgIADwsgACAENgIEIABBAzoAAA8LIAAgATYCCCAAIAQ2AgQgAEECOgAACyUAIABBADoAECAAIAM2AgwgACACNgIIIAAgATYCBCAAIAE2AgALNgEBfyMAQRBrIgMkACADQQRqIAAQASABIAMoAgg2AgAgAiADKAIMNgIAIAMtAAQgA0EQaiQACwcAIABBAUsLBwAgAEEnSwsHACAAQSdGCwsIAQBBgAgLARQAeQlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQEFY2xhbmdZMjAuMC4wZ2l0IChnaXRAZ2l0aHViLmNvbTpsbHZtL2xsdm0tcHJvamVjdC5naXQgNmNiYzY0ZWQ5MjJjYzY5YmMyOTJkMzk0YmE1YzY4MWZhMzA5ZjQwNCkAaw90YXJnZXRfZmVhdHVyZXMGKw9tdXRhYmxlLWdsb2JhbHMrE25vbnRyYXBwaW5nLWZwdG9pbnQrC2J1bGstbWVtb3J5KwhzaWduLWV4dCsPcmVmZXJlbmNlLXR5cGVzKwptdWx0aXZhbHVl";

    if (!lexer_module) {
        const binary = atob(lexer_base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        lexer_module = await WebAssembly.instantiate(bytes);
    }
}

async function tokenize(query) {
    await loadLexer();

    let exports = lexer_module.instance.exports;
    let buffer = exports.memory.buffer;
    let memory_offset = 0;

    /// Allocate memory for the lexer object
    const lexer = new Uint8Array(buffer, memory_offset, exports.clickhouse_lexer_size);
    memory_offset += exports.clickhouse_lexer_size;

    /// Allocate the query
    const bytes = new TextEncoder().encode(query);
    const query_array = new Uint8Array(buffer, memory_offset, bytes.length);
    query_array.set(bytes);
    const query_begin = memory_offset;
    memory_offset += bytes.length;
    const query_end = memory_offset;

    /// Initialize the lexer
    exports.clickhouse_lexer_create(lexer, query_begin, query_end, 65536);

    /// Allocate the out ptrs
    const token_begin = memory_offset;
    memory_offset += 4;
    const token_end = memory_offset;
    memory_offset += 4;

    let result = [];

    while (true) {
        const token_type = exports.clickhouse_lexer_next_token(lexer, token_begin, token_end);
        if (exports.clickhouse_lexer_token_is_error(token_type) || exports.clickhouse_lexer_token_is_end(token_type)) {
            break;
        }

        const view = new DataView(buffer);
        const begin = view.getUint32(token_begin, true);
        const end = view.getUint32(token_end, true);

        const token_bytes = new Uint8Array(buffer, begin, end - begin);
        let token = new TextDecoder().decode(token_bytes);

        result.push({type: token_type, significant: exports.clickhouse_lexer_token_is_significant(token_type), token: token});
    }

    return result;
}
// /from clickhouse web ui 

function getParamsFromShellQuery() {
    let params = [];
    let query = document.getElementById('shell').value;
    let regex = /{([a-zA-Z0-9_]*):[^}]*}/g;
    while ((matches = regex.exec(query)) !== null) {
        params.push(matches[1])
    };
    return params;
}

function createParamInputs() {
    let params = getParamsFromShellQuery();
    let paramContainer = document.getElementById('params-container');
    params.forEach(param => {
        let input = document.getElementById(`param_${param}`)
        if (!input) {

            let action = document.createElement('button');
            action.setAttribute('onclick', `setShellValue(getElementById('param_${param}').value)`);
            action.setAttribute('class', 'action-button')
            action.innerHTML = '🡸'
            paramContainer.appendChild(action)

            action = document.createElement('button');
            action.setAttribute('onclick', `getElementById('param_${param}').value = document.getElementById('shell').value`);
            action.setAttribute('class', 'action-button')
            action.innerHTML = '🡺'
            paramContainer.appendChild(action)

            input = document.createElement('textarea');
            input.placeholder = param;
            input.id = `param_${param}`;
            input.style.width = '250px'
            input.style.height = '30px';
            input.style.margin = '2px';
            input.style.boxSizing = 'border-box';
            input.style.verticalAlign = 'top';
            input.style.color = '#fff'
            // input.style.marginTop = '0px';
            input.style.resize = 'none';
            paramContainer.appendChild(input);

            let label = document.createElement('span');
            label.style.display = 'inline-block';
            label.style.marginLeft = '10px'
            label.innerText = param;
            label.setAttribute('for', `param_${param}`);
            paramContainer.appendChild(label);

            paramContainer.appendChild(document.createElement('br'));
        }
    });
}

function startWatcher() {
    let query = document.getElementById('watcher_query').value;
    if (window.watcherInterval) {
        clearInterval(window.watcherInterval);
    }
    window.watcherInterval = setInterval(async () => {
        if (window.is_running === true) return;
        window.is_running = true;
        try {
            let result = document.getElementById('watcher_result');
            let data = await executeQuery(query);
            if (data.meta) {
                result.innerHTML = '';
                let table = createTable(data);
                result.appendChild(table);
            }
        } catch (e) {
            showError(`Error creating table: ${e.message}`);
        }
        window.is_running = false;
    }, 1000);
}

function stopWatcher() {
    if (window.watcherInterval) {
        clearInterval(window.watcherInterval);
        window.watcherInterval = null;
    }
}
