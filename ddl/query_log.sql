CREATE VIEW admin_panel.query_log
(
    `query_kind` LowCardinality(String),
    `query` String
)
AS SELECT DISTINCT
    query_kind,
    query
FROM system.query_log
WHERE (user = currentUser()) AND (query_kind NOT IN ('None', 'Show'))
ORDER BY
    event_date DESC,
    event_time DESC
LIMIT 100
