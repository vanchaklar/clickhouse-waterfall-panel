CREATE VIEW admin_panel.databases
(
    `name` String,
    `engine` String,
    `data_path` String,
    `metadata_path` String,
    `uuid` UUID,
    `engine_full` String,
    `comment` String
)
AS SELECT *
FROM system.databases
