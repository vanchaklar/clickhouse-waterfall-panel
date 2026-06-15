CREATE VIEW admin_panel.data_sources
(
    `name` Nullable(String),
    `type` String
)
AS SELECT
    name,
    splitByChar('_', name)[1] AS type
FROM system.named_collections
WHERE name NOT IN ('jira_headers')
UNION ALL
SELECT
    name,
    'jdbc'
FROM jdbc('', 'SHOW DATASOURCES')
