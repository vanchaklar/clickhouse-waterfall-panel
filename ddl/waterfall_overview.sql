CREATE VIEW admin_panel.waterfall_overview
(
    `title` String,
    `spring` Nullable(String),
    `dam` Nullable(String),
    `flow` Nullable(String),
    `swamp` Nullable(String),
    `river` Nullable(String),
    `lake` Nullable(String),
    `geyser` Nullable(String),
    `pool` Nullable(String)
)
AS WITH CAST(arrayJoin(arrayZipUnaligned(spring.name, dam.name, flow.name, swamp.name, river.name, lake.name, geyser.name, pool.name)), 'Tuple(spring Nullable(String), dam Nullable(String), flow Nullable(String), swamp Nullable(String), river Nullable(String), lake Nullable(String), geyser Nullable(String), pool Nullable(String))') AS item
SELECT
    title,
    item.spring AS spring,
    item.dam AS dam,
    item.flow AS flow,
    item.swamp AS swamp,
    item.river AS river,
    item.lake AS lake,
    item.geyser AS geyser,
    item.pool AS pool
FROM
(
    WITH
        CAST((name, engine), 'Tuple(name String, engine String)') AS tbl,
        tupleToNameValuePairs(tbl) AS tvp,
        tbl AS val
    SELECT
        comment AS title,
        groupArrayIf(val, database = 'spring') AS spring,
        groupArrayIf(val, database = 'dam') AS dam,
        groupArrayIf(val, database = 'flow') AS flow,
        groupArrayIf(val, database = 'swamp') AS swamp,
        groupArrayIf(val, database = 'river') AS river,
        groupArrayIf(val, database = 'lake') AS lake,
        groupArrayIf(val, database = 'geyser') AS geyser,
        groupArrayIf(val, database LIKE 'pool_%') AS pool
    FROM system.tables AS t
    WHERE ((database IN ('spring', 'dam', 'flow', 'swamp', 'river', 'lake', 'geyser')) OR (database LIKE 'pool%')) AND (name NOT LIKE '_tmp%') AND (name NOT LIKE '_temp%') AND (comment NOT LIKE 'jira.%')
    GROUP BY comment
    ORDER BY comment ASC
) AS waterfall_overview
