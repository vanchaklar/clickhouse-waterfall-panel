CREATE VIEW admin_panel.waterfall_graph
(
    `waterfall_graph` JSON
)
AS WITH
    (
        SELECT groupArray(CAST(CAST((source, target, label), 'Tuple(source String, target String, label String)'), 'JSON'))
        FROM admin_panel.waterfall_graph_edges
    ) AS edges,
    (
        SELECT groupArray(CAST(CAST((id, label), 'Tuple(id String, label String)'), 'JSON'))
        FROM admin_panel.waterfall_graph_nodes
    ) AS nodes
SELECT CAST(CAST((nodes, edges), 'Tuple(nodes Array(JSON), edges Array(JSON))'), 'JSON') AS waterfall_graph
