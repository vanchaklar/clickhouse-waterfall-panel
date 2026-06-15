CREATE VIEW admin_panel.waterfall_graph_edges
(
    `source` String,
    `target` String,
    `source_group` String,
    `target_group` String,
    `group` String,
    `type` String
)
AS WITH
    FilteredObjects AS
    (
        SELECT
            database,
            name,
            engine,
            create_table_query,
            dependencies_database,
            dependencies_table,
            comment
        FROM system.tables
        WHERE ((database IN ('spring', 'dam', 'flow', 'swamp', 'river', 'lake', 'geyser')) OR (database LIKE 'pool%')) AND (name NOT LIKE '_tmp%') AND (name NOT LIKE '_temp%')
    ),
    Dependencies AS
    (
        SELECT
            o.database AS source_db,
            o.name AS source_name,
            o.engine AS source_engine,
            'system_dep' AS dep_type,
            deps.1 AS dep_db,
            deps.2 AS dep_table,
            comment
        FROM FilteredObjects AS o
        ARRAY JOIN arrayZip(dependencies_database, dependencies_table) AS deps
        UNION ALL
        WITH arrayJoin(extractAllGroups(create_table_query, '(FROM|JOIN)\\s+(\\S+)'))[2] AS t
        SELECT
            (extractAllGroupsVertical(t, '`?([a-zA-Z0-9_]+)`?\\.`?([a-zA-Z0-9_]+)`?')[1])[1] AS database,
            (extractAllGroupsVertical(t, '`?([a-zA-Z0-9_]+)`?\\.`?([a-zA-Z0-9_]+)`?')[1])[2] AS name,
            o.engine,
            'query_ref' AS dep_type,
            o.database AS dep_db,
            o.name AS dep_table,
            comment
        FROM FilteredObjects AS o
        WHERE database != ''
        UNION ALL
        WITH arrayJoin(extractAllGroups(create_table_query, '(TO)\\s+(\\S+)'))[2] AS t
        SELECT
            o.database,
            o.name,
            o.engine,
            'create_ref' AS dep_type,
            (extractAllGroupsVertical(t, '`?([a-zA-Z0-9_]+)`?\\.`?([a-zA-Z0-9_]+)`?')[1])[1] AS dep_db,
            (extractAllGroupsVertical(t, '`?([a-zA-Z0-9_]+)`?\\.`?([a-zA-Z0-9_]+)`?')[1])[2] AS dep_table,
            comment
        FROM FilteredObjects AS o
        WHERE dep_db != ''
    )
SELECT
    concat(source_db, '.', source_name) AS source,
    concat(dep_db, '.', dep_table) AS target,
    source_db AS source_group,
    dep_db AS target_group,
    splitByChar('.', comment)[1] AS group,
    if((dep_type IN ('system_dep', 'create_ref')) AND (source_engine ILIKE '%view%'), 'pipe', 'node') AS type
FROM Dependencies
ORDER BY
    count() OVER (PARTITION BY group) DESC,
    comment ASC,
    source_db ASC,
    source_name ASC
LIMIT 1 BY
    source_db,
    source_name,
    dep_db,
    dep_table,
    comment
