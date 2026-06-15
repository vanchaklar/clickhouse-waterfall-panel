CREATE TABLE admin_panel.templates
(
    `name` String,
    `query` String
)
ENGINE = MergeTree
ORDER BY name
SETTINGS index_granularity = 8192
