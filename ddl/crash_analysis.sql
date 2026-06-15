CREATE VIEW admin_panel.crash_analysis
(
    `item` Tuple(
        keys LowCardinality(String),
        `values` LowCardinality(String)),
    `instance_effect` Float64,
    `effect` Float64,
    `queries` UInt64,
    `crashes` UInt64
)
AS WITH data AS
    (
        SELECT
            crash_log.event_time AS crash_time,
            count() AS queries,
            sum(pow(0.99, CAST(crash_log.event_time - query_log.event_time, 'int'))) AS effect,
            effect / queries AS instance_effect,
            arrayJoin(Settings) AS item
        FROM system.query_log
        ASOF INNER JOIN system.crash_log ON (query_log.event_date = crash_log.event_date) AND (query_log.event_time < crash_log.event_time)
        WHERE (query_log.event_date >= (today() - toIntervalDay(7))) AND (query_log.query_kind = 'Insert')
        GROUP BY
            crash_time,
            item
    )
SELECT
    item,
    sum(instance_effect) AS instance_effect,
    sum(effect) AS effect,
    sum(queries) AS queries,
    countDistinct(crash_time) AS crashes
FROM data
GROUP BY item
ORDER BY instance_effect DESC
