CREATE VIEW admin_panel.waterfall_tables
(
    `comment` String,
    `database` String,
    `name` String,
    `engine` String,
    `records` Nullable(String),
    `size` Nullable(String),
    ` ` Nullable(String)
)
AS SELECT
    comment,
    database,
    name,
    engine,
    rightPad(formatReadableQuantity(total_rows), 15, '') AS records,
    rightPad(formatReadableSize(total_bytes), 12, '') AS size,
    bar(coalesce(total_bytes, 0), 0, max(total_bytes) OVER (), 10) AS ` `
FROM system.tables
WHERE ((database IN ('spring', 'dam', 'flow', 'swamp', 'river', 'lake', 'geyser')) OR (database LIKE 'pool%') OR (size IS NOT NULL)) AND (database NOT IN ('INFORMATION_SCHEMA', 'information_schema', 'system')) AND ((name NOT LIKE '_tmp%') AND (name NOT LIKE '_temp%') AND (name NOT LIKE '.inner_id.%'))
ORDER BY
    if((database IN ('spring', 'dam', 'flow', 'swamp', 'river', 'lake', 'geyser', 'pool_main')), CAST(database, 'Enum(\'spring\', \'dam\', \'flow\', \'swamp\', \'river\', \'lake\', \'geyser\', \'pool_main\')'), 10) ASC,
    comment ASC,
    database ASC
