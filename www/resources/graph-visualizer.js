// let mermaid;
// Notes: Group containers
// - Nodes that share the same `group` property will be wrapped in a Mermaid `subgraph` block.
// - To test: open the page that uses this script, inspect the element with class `mermaid` or
//   check the `#raw-schema` textarea to see the generated Mermaid code. Groups become
//   `subgraph GroupName` blocks and should be boxed by Mermaid's renderer.
// - Follow-ups:add optional colors per-group, or support nested groups if needed.

let rawSchema;
let schemaDiagram;
let schemaContainer;
let zoomInBtn;
let zoomOutBtn;
let resetZoomBtn;
let fitContentBtn;
let currentZoomLevel = 1;
const ZOOM_STEP = 0.1;
const MAX_ZOOM = 3;
const MIN_ZOOM = 0.3;

// Graph configuration
const ORIENTATIONS = {
    TB: 'Top to Bottom',
    BT: 'Bottom to Top',
    LR: 'Left to Right',
    RL: 'Right to Left'
};
let currentOrientation = 'LR'; // Default orientation

// Zoom functions
function zoomIn() {
    currentZoomLevel = Math.min(currentZoomLevel + ZOOM_STEP, MAX_ZOOM);
    applyZoom();
}

function zoomOut() {
    currentZoomLevel = Math.max(currentZoomLevel - ZOOM_STEP, MIN_ZOOM);
    applyZoom();
}

function resetZoom() {
    currentZoomLevel = 1;
    applyZoom();
    // Reset scroll position
    schemaContainer.scrollTo(0, 0);
}

function fitContent() {
    const containerWidth = schemaContainer.clientWidth;
    const containerHeight = schemaContainer.clientHeight;
    const contentWidth = schemaDiagram.scrollWidth;
    const contentHeight = schemaDiagram.scrollHeight;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    currentZoomLevel = Math.min(scaleX, scaleY, 1);
    applyZoom();
}

function applyZoom() {
    if (schemaDiagram) {
        schemaDiagram.style.transform = `scale(${currentZoomLevel})`;
    }
}

// Mouse drag functionality
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

function startDragging(e) {
    isDragging = true;
    schemaContainer.style.cursor = 'grabbing';
    startX = e.pageX - schemaContainer.offsetLeft;
    startY = e.pageY - schemaContainer.offsetTop;
    scrollLeft = schemaContainer.scrollLeft;
    scrollTop = schemaContainer.scrollTop;
}

function stopDragging() {
    isDragging = false;
    schemaContainer.style.cursor = 'grab';
}

function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    const x = e.pageX - schemaContainer.offsetLeft;
    const y = e.pageY - schemaContainer.offsetTop;

    const moveX = (x - startX);
    const moveY = (y - startY);

    schemaContainer.scrollLeft = scrollLeft - moveX;
    schemaContainer.scrollTop = scrollTop - moveY;
}

// Initialize Mermaid
function initializeMermaid() {
    rawSchema = document.getElementById('raw-schema');
    schemaDiagram = document.getElementById('schema-diagram');
    schemaContainer = document.querySelector('.schema-container');
    // zoomInBtn = document.getElementById('zoom-in-btn');
    // zoomOutBtn = document.getElementById('zoom-out-btn');
    // resetZoomBtn = document.getElementById('reset-zoom-btn');
    // fitContentBtn = document.getElementById('fit-content-btn');

    // Event listeners
    schemaContainer.addEventListener('mousedown', startDragging);
    schemaContainer.addEventListener('mouseleave', stopDragging);
    schemaContainer.addEventListener('mouseup', stopDragging);
    schemaContainer.addEventListener('mousemove', drag);

    // Mouse wheel zoom
    schemaContainer.addEventListener('wheel', (event) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const delta = event.deltaY;
            if (delta < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    }, { passive: false });

    // Button event listeners
    // zoomInBtn.addEventListener('click', zoomIn);
    // zoomOutBtn.addEventListener('click', zoomOut);
    // resetZoomBtn.addEventListener('click', resetZoom);
    // fitContentBtn.addEventListener('click', fitContent);

    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            defaultRenderer: 'elk',
            orientation: currentOrientation
        }
    });
}

// Visualization function from waterfall_visualizer.js
function visualizeGraph(edges, orientation = currentOrientation) {
    currentOrientation = orientation;
    let mermaidCode = `flowchart ${orientation}\n`;
    const seen = new Set();
    const nodeStyles = new Set();
    const colors = {
        fill_node: '#303030',
        fill_pipe: '#205050',
        stroke_node: '#b6b6b6',
        stroke_pipe: '#708080',
        color_node: '#FFFFFF',
        color_pipe: '#FFFFFF'
    }

    // Group nodes by `group` property so we can emit Mermaid subgraphs (containers)
    let groups = new Map(); // groupName -> Set of node ids
    // unnamed group -> use 'default' key
    // groups.set('default', new Set());

    // First pass: register nodes and groups
    edges.forEach(({ source, target, group, type }) => {
        if (!seen.has(source)) {
            if (group && type === 'node') {
                seen.add(source);
                if (!groups.has(group)) groups.set(group, new Set());
                groups.get(group).add(source);
            }
        }
    });
    edges.forEach(({ source, target, group }) => {
        if (!seen.has(target)) {
            if (group) {
                seen.add(target);
                if (!groups.has(group)) groups.set(group, new Set());
                groups.get(group).add(target);
            }
        }
        if (!seen.has(source)) {
            if (group) {
                seen.add(source);
                if (!groups.has(group)) groups.set(group, new Set());
                groups.get(group).add(source);
            }
        }
    });
    edges.forEach(({ source, target, group }) => {
        if (!seen.has(target)) {
            seen.add(target);
            if (!groups.has('null')) groups.set('null', new Set());
            groups.get('null').add(target);
            
        }
        if (!seen.has(source)) {
            seen.add(source);
            if (!groups.has('null')) groups.set('null', new Set());
            groups.get('null').add(source);
        }
    });

    // Emit nodes grouped into subgraphs (for groups with a name)
    groups.forEach((nodeSet, groupName) => {
        if (groupName && groupName!=='null' && nodeSet.size > 0) {
            mermaidCode += `    subgraph ${(groupName)}["${groupName}"]\n`;
            nodeSet.forEach((nodeLabel) => {
                mermaidCode += `        ${cityHash(nodeLabel)}["${nodeLabel}"]\n`;
            });
            mermaidCode += `    end\n`;
        }
    });

    // Emit any nodes that are in the unnamed group ('null') or nodes that weren't grouped
    if (groups.has('null')) {
        groups.get('null').forEach((nodeLabel) => {
            mermaidCode += `    ${cityHash(nodeLabel)}["${nodeLabel}"]\n`;
        });
    }
    console.log('Groups:', groups);

    // Second pass: emit edges and styles
    edges.forEach(({ source, target, label, type }) => {
        // Add edge
        // if (label) {
        //     mermaidCode += `    ${cityHash(source)}-->|${label}|${cityHash(target)}\n`;
        // } else {
            mermaidCode += `    ${cityHash(source)}-->${cityHash(target)}\n`;
        // }

        // Add styles for source and target (avoid duplicate style lines)
        if (!nodeStyles.has(source)) {
            let fill = colors['fill_' + (type || 'node')];
            let stroke = colors['stroke_' + (type || 'node')];
            let color = colors['color_' + (type || 'node')];
            mermaidCode += `    style ${cityHash(source)} fill:${fill},stroke:${stroke},color:${color}\n`;
            nodeStyles.add(source);
        }
        if (!nodeStyles.has(target)) {
            mermaidCode += `    style ${cityHash(target)} fill:${colors['fill_node']},stroke:${colors['stroke_node']},color:${colors['color_node']}\n`;
            nodeStyles.add(target);
        }
    });

    // Update diagram
    diagram = document.querySelector('.mermaid')
    diagram.textContent = mermaidCode;
    diagram.removeAttribute('data-processed');
    console.log(mermaidCode);
    mermaid.run();

    // Show raw schema for debugging
    rawSchema.textContent = mermaidCode;
}

// Simple hash function (similar to city.Hash32)
function cityHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash)+10000000000;
}

document.addEventListener('DOMContentLoaded', function () {
    initializeMermaid();
});
