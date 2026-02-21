// ============================================================
// SECTION 8: GPU MONITORING
// ============================================================

// Generate monitoring node data
function generateMonitoringNodes() {
    const nodes = [];
    const statuses = ['healthy','healthy','healthy','healthy','healthy','healthy','healthy','healthy','healthy','warning','critical','maintenance'];

    // 44 Lambda H100 nodes (352 GPUs / 8 per node)
    for (let i = 0; i < 44; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const util = status === 'maintenance' ? 0 : status === 'critical' ? 10 + Math.random() * 30 : status === 'warning' ? 50 + Math.random() * 30 : 70 + Math.random() * 25;
        const temp = status === 'maintenance' ? 25 : status === 'critical' ? 78 + Math.random() * 8 : status === 'warning' ? 72 + Math.random() * 10 : 55 + Math.random() * 20;
        const power = status === 'maintenance' ? 50 : Math.round(400 + util * 3);
        nodes.push({
            id: `lambda-h100-${String(i+1).padStart(3,'0')}`,
            provider: 'Lambda Labs',
            gpu_type: 'H100 SXM',
            gpu_count: 8,
            status, util: Math.round(util * 10) / 10, temp: Math.round(temp * 10) / 10, power
        });
    }

    // 39 AWS H100 nodes (305 GPUs / 8 per node, ~39 nodes)
    for (let i = 0; i < 39; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const util = status === 'maintenance' ? 0 : status === 'critical' ? 10 + Math.random() * 30 : status === 'warning' ? 50 + Math.random() * 30 : 70 + Math.random() * 25;
        const temp = status === 'maintenance' ? 25 : status === 'critical' ? 78 + Math.random() * 8 : status === 'warning' ? 72 + Math.random() * 10 : 55 + Math.random() * 20;
        const power = status === 'maintenance' ? 50 : Math.round(400 + util * 3);
        nodes.push({
            id: `aws-h100-${String(i+1).padStart(3,'0')}`,
            provider: 'AWS',
            gpu_type: 'H100 SXM',
            gpu_count: 8,
            status, util: Math.round(util * 10) / 10, temp: Math.round(temp * 10) / 10, power
        });
    }

    // 226 AWS H200 nodes (1808 GPUs / 8 per node)
    for (let i = 0; i < 226; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const util = status === 'maintenance' ? 0 : status === 'critical' ? 10 + Math.random() * 30 : status === 'warning' ? 50 + Math.random() * 30 : 70 + Math.random() * 25;
        const temp = status === 'maintenance' ? 25 : status === 'critical' ? 78 + Math.random() * 8 : status === 'warning' ? 72 + Math.random() * 10 : 55 + Math.random() * 20;
        const power = status === 'maintenance' ? 50 : Math.round(400 + util * 3);
        nodes.push({
            id: `aws-h200-${String(i+1).padStart(3,'0')}`,
            provider: 'AWS',
            gpu_type: 'H200 SXM',
            gpu_count: 8,
            status, util: Math.round(util * 10) / 10, temp: Math.round(temp * 10) / 10, power
        });
    }

    // 10 CoreWeave GB200 NVL72 racks (720 GPUs / 72 per rack)
    for (let i = 0; i < 10; i++) {
        const status = i === 7 ? 'warning' : 'healthy';
        const util = status === 'warning' ? 78.5 : 85 + Math.random() * 12;
        const temp = status === 'warning' ? 72.1 : 58 + Math.random() * 12;
        const power = Math.round(3800 + util * 10);
        nodes.push({
            id: `cw-gb200-nvl72-${String(i+1).padStart(3,'0')}`,
            provider: 'CoreWeave',
            gpu_type: 'GB200 NVL72',
            gpu_count: 72,
            status, util: Math.round(util * 10) / 10, temp: Math.round(temp * 10) / 10, power
        });
    }

    return nodes;
}

let monitoringNodes = generateMonitoringNodes();
let expandedNodeId = null;
let monitoringTelemetryData = null;
let monitoringRefreshInterval = null;

function generateTimeSeries(base, minVal, maxVal, points = 60) {
    const data = [];
    let current = base;
    for (let i = 0; i < points; i++) {
        current += (Math.random() - 0.48) * (maxVal - minVal) * 0.08;
        current = Math.max(minVal, Math.min(maxVal, current));
        data.push(Math.round(current * 100) / 100);
    }
    return data;
}

function generateTelemetryData() {
    return {
        gpuUtil: { current: 85.2, min: 78, max: 92, unit: '%', data: generateTimeSeries(85.2, 78, 92) },
        gpuTemp: { current: 67, min: 58, max: 74, unit: '\u00b0C', data: generateTimeSeries(67, 58, 74), threshold: 80 },
        powerDraw: { current: 487, min: 440, max: 520, unit: ' kW', data: generateTimeSeries(487, 440, 520) },
        memUtil: { current: 73.4, min: 65, max: 82, unit: '%', data: generateTimeSeries(73.4, 65, 82) },
        gpuErrors: { current: 3, unit: '', data: Array.from({length: 24}, () => Math.random() < 0.15 ? Math.ceil(Math.random() * 2) : 0) },
        netThroughput: { current: 2.4, min: 1.8, max: 3.1, unit: ' TB/s', data: generateTimeSeries(2.4, 1.8, 3.1) },
    };
}

function buildSvgSparkline(data, color, w, h, threshold) {
    const minVal = Math.min(...data) * 0.95;
    const maxVal = Math.max(...data) * 1.05;
    const range = maxVal - minVal || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - minVal) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const areaPoints = points + ` ${w},${h} 0,${h}`;

    let thresholdLine = '';
    if (threshold !== undefined) {
        const ty = h - ((threshold - minVal) / range) * h;
        if (ty > 0 && ty < h) {
            thresholdLine = `<line x1="0" y1="${ty.toFixed(1)}" x2="${w}" y2="${ty.toFixed(1)}" stroke="var(--danger)" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>`;
        }
    }

    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="tp-sparkline">
        <polygon points="${areaPoints}" fill="${color}" opacity="0.1"/>
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${thresholdLine}
    </svg>`;
}

function buildBarChart(data, color, w, h) {
    const maxVal = Math.max(...data, 1);
    const barW = w / data.length - 2;
    let bars = '';
    data.forEach((v, i) => {
        const barH = (v / maxVal) * h;
        const x = i * (w / data.length) + 1;
        const y = h - barH;
        bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="1" opacity="${v > 0 ? 0.8 : 0.1}"/>`;
    });
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="tp-sparkline">${bars}</svg>`;
}

function renderGPUMonitoring() {
    const section = document.getElementById('section-monitoring');
    section.innerHTML = '';

    if (!monitoringTelemetryData) {
        monitoringTelemetryData = generateTelemetryData();
    }

    let html = '';

    // A. Cluster Health Overview
    html += `<div class="section-header">
        <div class="section-title">Cluster Health Overview</div>
        <div class="badge badge-active">${monitoringNodes.length} nodes</div>
    </div>`;

    html += `<div class="monitoring-filter-bar">
        <select id="monFilterProvider">
            <option value="">All Providers</option>
            <option value="CoreWeave">CoreWeave</option>
            <option value="Lambda Labs">Lambda Labs</option>
            <option value="AWS">AWS</option>
        </select>
        <select id="monFilterGPU">
            <option value="">All GPU Types</option>
            <option value="H100 SXM">H100 SXM</option>
            <option value="H200 SXM">H200 SXM</option>
            <option value="GB200 NVL72">GB200 NVL72</option>
        </select>
        <select id="monFilterStatus">
            <option value="">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="maintenance">Maintenance</option>
        </select>
    </div>`;

    html += `<div class="monitoring-node-grid" id="monitoringNodeGrid">`;
    html += renderMonitoringNodes(monitoringNodes);
    html += `</div>`;

    html += `<div class="section-header"><div class="section-title">Real-Time Telemetry</div><div class="badge badge-active">LIVE</div></div>`;
    html += renderTelemetryPanels();

    html += `<div class="section-header"><div class="section-title">GPU Utilization Heatmap</div><div class="text-xs text-muted">Top 20 active nodes — hover for details</div></div>`;
    html += renderUtilizationHeatmap();

    html += `<div class="section-header"><div class="section-title">Alert Feed — Last 24h</div></div>`;
    html += renderAlertFeed();

    html += `<div class="section-header"><div class="section-title">Provider Summary</div></div>`;
    html += renderProviderSummaryCards();

    html += `<div class="heatmap-tooltip" id="hmTooltip"></div>`;

    section.innerHTML = html;

    ['monFilterProvider', 'monFilterGPU', 'monFilterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyMonitoringFilters);
    });

    document.querySelectorAll('.monitoring-node-card').forEach(card => {
        card.addEventListener('click', () => {
            const nodeId = card.dataset.nodeId;
            if (expandedNodeId === nodeId) {
                expandedNodeId = null;
            } else {
                expandedNodeId = nodeId;
            }
            applyMonitoringFilters();
        });
    });

    attachHeatmapTooltips();

    if (monitoringRefreshInterval) clearInterval(monitoringRefreshInterval);
    monitoringRefreshInterval = setInterval(refreshTelemetry, 5000);
}

function renderMonitoringNodes(nodes) {
    const providerColorMap = { 'CoreWeave': '#7B61FF', 'Lambda Labs': '#FF6B35', 'AWS': '#FF9900' };
    let html = '';

    nodes.forEach(node => {
        const statusIcon = node.status === 'healthy' ? '\u25cf' : node.status === 'warning' ? '\u25b2' : node.status === 'critical' ? '\u2716' : '\u25fc';
        const statusColor = node.status === 'healthy' ? 'var(--accent)' : node.status === 'warning' ? 'var(--warning)' : node.status === 'critical' ? 'var(--danger)' : 'var(--text-muted)';
        const provColor = providerColorMap[node.provider] || '#999';

        html += `<div class="monitoring-node-card status-${node.status}" data-node-id="${node.id}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <div class="node-id">${node.id}</div>
                <span style="color:${statusColor};font-size:8px">${statusIcon}</span>
            </div>
            <div style="margin-bottom:3px"><span class="provider-badge" style="background:${provColor}">${node.provider.split(' ')[0]}</span></div>
            <div class="node-stats">
                <span>${node.gpu_count} GPUs</span>
                <span>${node.util}%</span>
                <span>${node.temp}\u00b0C</span>
                <span>${node.power}W</span>
            </div>
        </div>`;

        if (expandedNodeId === node.id) {
            html += renderExpandedNode(node);
        }
    });

    return html;
}

function renderExpandedNode(node) {
    let gpuRows = '';
    const gpuCount = Math.min(node.gpu_count, 8);
    for (let g = 0; g < gpuCount; g++) {
        const util = node.status === 'maintenance' ? 0 : Math.max(5, node.util + (Math.random() - 0.5) * 20);
        const temp = node.status === 'maintenance' ? 25 : Math.max(40, node.temp + (Math.random() - 0.5) * 10);
        const power = node.status === 'maintenance' ? 50 : Math.round(node.power / gpuCount + (Math.random() - 0.5) * 40);
        const mem = node.status === 'maintenance' ? 0 : Math.round(60 + Math.random() * 30);
        const statusIcon = node.status === 'critical' && g === Math.floor(gpuCount/2) ? '<span class="text-danger">\u25cf ERROR</span>' : '<span class="text-accent">\u25cf OK</span>';

        gpuRows += `<tr>
            <td class="text-mono">GPU ${g}</td>
            <td class="text-mono">${util.toFixed(1)}%</td>
            <td class="text-mono">${temp.toFixed(1)}\u00b0C</td>
            <td class="text-mono">${power}W</td>
            <td class="text-mono">${mem}%</td>
            <td>${statusIcon}</td>
        </tr>`;
    }
    if (node.gpu_count > 8) {
        gpuRows += `<tr><td colspan="6" class="text-muted text-xs" style="text-align:center">... and ${node.gpu_count - 8} more GPUs</td></tr>`;
    }

    return `<div class="monitoring-node-expanded">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div>
                <span class="text-mono font-bold">${node.id}</span>
                <span class="text-xs text-muted" style="margin-left:8px">${node.gpu_type} — ${node.provider}</span>
            </div>
            <span class="badge badge-${node.status === 'healthy' ? 'active' : node.status === 'warning' ? 'idle' : node.status === 'critical' ? 'maint' : 'info'}">${node.status.toUpperCase()}</span>
        </div>
        <table class="data-table"><thead><tr>
            <th>GPU</th><th>Utilization</th><th>Temperature</th><th>Power</th><th>Memory</th><th>Status</th>
        </tr></thead><tbody>${gpuRows}</tbody></table>
    </div>`;
}

function applyMonitoringFilters() {
    const provider = document.getElementById('monFilterProvider')?.value || '';
    const gpuType = document.getElementById('monFilterGPU')?.value || '';
    const status = document.getElementById('monFilterStatus')?.value || '';

    let filtered = monitoringNodes;
    if (provider) filtered = filtered.filter(n => n.provider === provider);
    if (gpuType) filtered = filtered.filter(n => n.gpu_type.includes(gpuType));
    if (status) filtered = filtered.filter(n => n.status === status);

    const grid = document.getElementById('monitoringNodeGrid');
    if (grid) {
        grid.innerHTML = renderMonitoringNodes(filtered);
        grid.querySelectorAll('.monitoring-node-card').forEach(card => {
            card.addEventListener('click', () => {
                const nodeId = card.dataset.nodeId;
                expandedNodeId = expandedNodeId === nodeId ? null : nodeId;
                applyMonitoringFilters();
            });
        });
    }
}

function renderTelemetryPanels() {
    const td = monitoringTelemetryData;
    const panels = [
        { key: 'gpuUtil', title: 'Fleet GPU Utilization', color: 'var(--accent)' },
        { key: 'gpuTemp', title: 'Avg GPU Temperature', color: 'var(--warning)' },
        { key: 'powerDraw', title: 'Total Power Draw', color: 'var(--info)' },
        { key: 'memUtil', title: 'Memory Utilization', color: 'var(--purple)' },
        { key: 'gpuErrors', title: 'GPU Errors (24h)', color: 'var(--danger)', isBar: true },
        { key: 'netThroughput', title: 'Network Throughput', color: '#06B6D4' },
    ];

    let html = '<div class="telemetry-grid">';
    panels.forEach(p => {
        const d = td[p.key];
        const rangeText = d.min !== undefined ? `Range: ${d.min}\u2013${d.max}${d.unit}` : (p.key === 'gpuErrors' ? 'By hour, last 24h' : '');
        const sparkline = p.isBar
            ? buildBarChart(d.data, p.color, 200, 40)
            : buildSvgSparkline(d.data, p.color, 200, 40, d.threshold);

        html += `<div class="telemetry-panel" id="tp-${p.key}">
            <div class="tp-title">${p.title}</div>
            <div class="tp-value" id="tpv-${p.key}">${d.current}${d.unit}</div>
            <div class="tp-range">${rangeText}</div>
            ${sparkline}
        </div>`;
    });
    html += '</div>';
    return html;
}

function refreshTelemetry() {
    if (currentSection !== 'monitoring') return;
    const td = monitoringTelemetryData;
    if (!td) return;

    const jitter = (val, range) => {
        const delta = (Math.random() - 0.5) * range;
        return Math.round((val + delta) * 10) / 10;
    };

    td.gpuUtil.current = jitter(td.gpuUtil.current, 2);
    td.gpuTemp.current = jitter(td.gpuTemp.current, 1.5);
    td.powerDraw.current = Math.round(jitter(td.powerDraw.current, 8));
    td.memUtil.current = jitter(td.memUtil.current, 1.5);
    td.netThroughput.current = jitter(td.netThroughput.current, 0.3);

    const updates = [
        { id: 'tpv-gpuUtil', val: `${td.gpuUtil.current}%` },
        { id: 'tpv-gpuTemp', val: `${td.gpuTemp.current}\u00b0C` },
        { id: 'tpv-powerDraw', val: `${td.powerDraw.current} kW` },
        { id: 'tpv-memUtil', val: `${td.memUtil.current}%` },
        { id: 'tpv-netThroughput', val: `${td.netThroughput.current} TB/s` },
    ];

    updates.forEach(u => {
        const el = document.getElementById(u.id);
        if (el) {
            el.textContent = u.val;
            const panel = el.closest('.telemetry-panel');
            if (panel) {
                panel.classList.add('pulse-update');
                setTimeout(() => panel.classList.remove('pulse-update'), 500);
            }
        }
    });
}

function renderUtilizationHeatmap() {
    const activeNodes = [...monitoringNodes]
        .filter(n => n.status !== 'maintenance')
        .sort((a, b) => b.util - a.util)
        .slice(0, 20);

    let html = '<div class="chart-container"><div class="chart-title"><span class="chart-icon">\u25a6</span> Per-GPU Utilization Heatmap</div>';
    html += '<div class="heatmap-grid">';

    html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;margin-left:148px">
        <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;background:var(--accent);border-radius:2px"></div><span class="text-xs text-muted">&gt;80%</span></div>
        <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;background:var(--warning);border-radius:2px"></div><span class="text-xs text-muted">50-80%</span></div>
        <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;background:#FF6B35;border-radius:2px"></div><span class="text-xs text-muted">30-50%</span></div>
        <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;background:var(--danger);border-radius:2px"></div><span class="text-xs text-muted">&lt;30%</span></div>
        <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;background:var(--text-muted);opacity:0.3;border-radius:2px"></div><span class="text-xs text-muted">Offline</span></div>
    </div>`;

    html += `<div class="heatmap-row"><div class="heatmap-label"></div>`;
    for (let g = 0; g < 8; g++) {
        html += `<div style="width:28px;text-align:center;font-family:var(--font-mono);font-size:8px;color:var(--text-muted)">G${g}</div>`;
    }
    html += '</div>';

    activeNodes.forEach(node => {
        html += `<div class="heatmap-row"><div class="heatmap-label">${node.id}</div>`;
        const gpuCount = Math.min(node.gpu_count, 8);
        for (let g = 0; g < gpuCount; g++) {
            const util = Math.max(0, node.util + (Math.random() - 0.45) * 30);
            const temp = Math.max(40, node.temp + (Math.random() - 0.5) * 10);
            const power = Math.round(200 + util * 1.5 + Math.random() * 50);
            let cls = 'hm-high';
            if (util < 30) cls = 'hm-critical';
            else if (util < 50) cls = 'hm-low';
            else if (util < 80) cls = 'hm-mid';

            if (node.status === 'critical' && g === Math.floor(gpuCount / 2)) cls = 'hm-offline';

            html += `<div class="heatmap-cell ${cls}" data-hm-node="${node.id}" data-hm-gpu="${g}" data-hm-util="${util.toFixed(1)}" data-hm-temp="${temp.toFixed(1)}" data-hm-power="${power}"></div>`;
        }
        for (let g = gpuCount; g < 8; g++) {
            html += `<div style="width:28px;height:22px"></div>`;
        }
        html += '</div>';
    });

    html += '</div></div>';
    return html;
}

function attachHeatmapTooltips() {
    const tooltip = document.getElementById('hmTooltip');
    if (!tooltip) return;

    document.querySelectorAll('.heatmap-cell').forEach(cell => {
        cell.addEventListener('mouseenter', (e) => {
            const node = cell.dataset.hmNode;
            const gpu = cell.dataset.hmGpu;
            const util = cell.dataset.hmUtil;
            const temp = cell.dataset.hmTemp;
            const power = cell.dataset.hmPower;
            tooltip.textContent = `${node}, GPU ${gpu}: ${util}% util, ${temp}\u00b0C, ${power}W`;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
        });
        cell.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
        });
        cell.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

function renderAlertFeed() {
    const alerts = [
        { level: 'critical', time: '14:23', node: 'aws-h200-042 GPU 5', msg: 'XID Error 94 (ECC uncorrectable) \u2014 Node drained, replacement initiated' },
        { level: 'warning', time: '13:47', node: 'lambda-h100-028 GPU 2', msg: 'Temperature 81\u00b0C \u2014 Throttling applied' },
        { level: 'info', time: '12:30', node: 'aws-h200-103', msg: 'Scheduled maintenance window begins in 2h' },
        { level: 'resolved', time: '11:15', node: 'aws-h100-034 GPU 0', msg: 'Memory utilization normalized (was 98.7%)' },
        { level: 'warning', time: '10:02', node: 'cw-gb200-nvl72-008 GPU 18', msg: 'NVLink CRC errors elevated \u2014 Monitoring' },
        { level: 'info', time: '09:45', node: 'cw-gb200-nvl72-001', msg: 'GB200 NVL72 rack: Liquid cooling pressure nominal (12.4 PSI)' },
        { level: 'critical', time: '08:30', node: 'aws-h200-156 GPU 7', msg: 'NVLink CRC errors detected \u2014 Link degraded to PCIe' },
        { level: 'resolved', time: '07:55', node: 'aws-h200-089 GPU 3', msg: 'Power consumption spike resolved \u2014 returned to 680W baseline' },
        { level: 'warning', time: '07:12', node: 'lambda-h100-015 GPU 0', msg: 'Single-bit ECC error count elevated (47 in 1h) \u2014 Monitoring' },
        { level: 'info', time: '06:30', node: 'aws-h200-011', msg: 'CloudWatch Agent updated to v1.300025.0 \u2014 GPU metrics streaming' },
        { level: 'resolved', time: '05:48', node: 'aws-h100-023', msg: 'NVLink bandwidth restored to 900 GB/s \u2014 CRC errors cleared' },
        { level: 'critical', time: '04:15', node: 'lambda-h100-019 GPU 4', msg: 'GPU fell off bus \u2014 Node rebooting, automatic recovery in progress' },
        { level: 'warning', time: '03:40', node: 'aws-h200-178 GPU 2', msg: 'Memory pages retired: 3 new SBE pages \u2014 Approaching threshold' },
        { level: 'info', time: '02:15', node: 'cw-gb200-nvl72-005', msg: 'DCGM Exporter health check passed \u2014 all 72 GPUs reporting' },
        { level: 'resolved', time: '01:30', node: 'cw-gb200-nvl72-003 GPU 41', msg: 'Temperature normalized to 64\u00b0C (was 78\u00b0C peak)' },
        { level: 'warning', time: '00:45', node: 'aws-h200-201 GPU 6', msg: 'SM clock throttled to 1410 MHz \u2014 Power limit active' },
        { level: 'info', time: '00:10', node: 'aws-h200-007', msg: 'Instance health check passed \u2014 All GPUs healthy' },
        { level: 'resolved', time: '23:22', node: 'lambda-h100-041 GPU 2', msg: 'Temperature normalized to 68\u00b0C (was 82\u00b0C peak)' },
    ];

    let html = '<div class="alert-feed">';
    alerts.forEach(a => {
        const tagCls = `alert-tag-${a.level}`;
        const tag = a.level.toUpperCase();
        html += `<div class="alert-line">
            <span class="${tagCls}">[${tag}]</span>
            <span class="alert-time"> ${a.time}</span>
            <span class="alert-msg"> \u2014 </span>
            <span class="alert-node">${a.node}</span>
            <span class="alert-msg">: ${a.msg}</span>
        </div>`;
    });
    html += '</div>';
    return html;
}

function renderProviderSummaryCards() {
    let html = '<div class="provider-summary-cards">';

    html += `<div class="provider-summary-card psc-lambda">
        <div class="psc-name" style="color:#FF6B35">Lambda Labs</div>
        <div class="psc-stats">
            <div><div class="psc-stat-label">Total GPUs</div><div class="psc-stat-value">352</div></div>
            <div><div class="psc-stat-label">Utilization</div><div class="psc-stat-value">88%</div></div>
            <div><div class="psc-stat-label">Active Alerts</div><div class="psc-stat-value" style="color:var(--warning)">2</div></div>
            <div><div class="psc-stat-label">Monthly Spend</div><div class="psc-stat-value" style="color:var(--warning)">$410K</div></div>
            <div><div class="psc-stat-label">GPU Mix</div><div class="psc-stat-value text-sm">352 H100 SXM</div></div>
            <div><div class="psc-stat-label">Grafana</div><div class="psc-stat-value"><span class="text-accent text-sm">Connected</span></div></div>
        </div>
    </div>`;

    html += `<div class="provider-summary-card psc-coreweave">
        <div class="psc-name" style="color:#7B61FF">CoreWeave</div>
        <div class="psc-stats">
            <div><div class="psc-stat-label">Total GPUs</div><div class="psc-stat-value">720</div></div>
            <div><div class="psc-stat-label">Utilization</div><div class="psc-stat-value">94%</div></div>
            <div><div class="psc-stat-label">Active Alerts</div><div class="psc-stat-value" style="color:var(--warning)">1</div></div>
            <div><div class="psc-stat-label">Monthly Spend</div><div class="psc-stat-value" style="color:var(--warning)">$1.65M</div></div>
            <div><div class="psc-stat-label">GPU Mix</div><div class="psc-stat-value text-sm">720 GB200 NVL72 (10 racks)</div></div>
            <div><div class="psc-stat-label">Grafana</div><div class="psc-stat-value"><span class="text-accent text-sm">Connected</span></div></div>
        </div>
    </div>`;

    html += `<div class="provider-summary-card psc-aws">
        <div class="psc-name" style="color:#FF9900">AWS</div>
        <div class="psc-stats">
            <div><div class="psc-stat-label">Total GPUs</div><div class="psc-stat-value">2,113</div></div>
            <div><div class="psc-stat-label">Utilization</div><div class="psc-stat-value">89%</div></div>
            <div><div class="psc-stat-label">Active Alerts</div><div class="psc-stat-value" style="color:var(--warning)">5</div></div>
            <div><div class="psc-stat-label">Monthly Spend</div><div class="psc-stat-value" style="color:var(--warning)">$2.70M</div></div>
            <div><div class="psc-stat-label">GPU Mix</div><div class="psc-stat-value text-sm">305 H100 + 1,808 H200</div></div>
            <div><div class="psc-stat-label">Grafana</div><div class="psc-stat-value"><span class="text-warning text-sm">Configure</span></div></div>
        </div>
    </div>`;

    html += '</div>';
    return html;
}
