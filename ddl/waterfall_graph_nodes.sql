CREATE VIEW admin_panel.waterfall_graph_nodes
(
    `id` String,
    `label` String
)
AS WITH multiIf(engine = 'View', 'View', engine = 'MaterializedView', 'MaterializedView', engine = 'Buffer', 'Buffer', 'Table') AS object_type
SELECT
    concat(database, '.', name) AS id,
    comment AS label
FROM system.tables
WHERE ((database IN ('spring', 'dam', 'flow', 'swamp', 'river', 'lake', 'geyser')) OR (database LIKE 'pool%')) AND (name NOT LIKE '_tmp%') AND (name NOT LIKE '_temp%') AND (comment NOT LIKE 'jira.%') AND (object_type = 'Table')
ORDER BY
    database ASC,
    name ASC
