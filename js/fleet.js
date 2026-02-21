// ============================================================
// SECTION 1: FLEET DASHBOARD
// ============================================================

function renderFleetDashboard() {
    const section = document.getElementById('section-fleet');
    section.innerHTML = '';

    // Compute aggregates
    const totals = computeFleetTotals();

    // Summary cards
    const cardsHtml = `
    <div class="summary-cards">
        <div class="summary-card">
            <div class="card-label">Total GPUs</div>
            <div class="card-value">${fmt(totals.totalGPUs)}</div>
            <div class="card-sub">${totals.uniqueTypes} GPU types across ${totals.totalNodes} nodes</div>
        </div>
        <div class="summary-card">
            <div class="card-label">Active</div>
            <div class="card-value">${fmt(totals.totalActive)}</div>
            <div class="card-sub">${pct(totals.totalActive, totals.totalGPUs).toFixed(1)}% utilization</div>
        </div>
        <div class="summary-card warning">
            <div class="card-label">Idle</div>
            <div class="card-value">${fmt(totals.totalIdle)}</div>
            <div class="card-sub">${pct(totals.totalIdle, totals.totalGPUs).toFixed(1)}% of fleet</div>
        </div>
        <div class="summary-card danger">
            <div class="card-label">Maintenance</div>
            <div class="card-value">${fmt(totals.totalMaint)}</div>
            <div class="card-sub">${pct(totals.totalMaint, totals.totalGPUs).toFixed(1)}% of fleet</div>
        </div>
        <div class="summary-card info">
            <div class="card-label">Total VRAM</div>
            <div class="card-value">${fmt(totals.totalVRAM/1000,1)} TB</div>
            <div class="card-sub">${fmt(totals.totalVRAM)} GB aggregate</div>
        </div>
        <div class="summary-card purple">
            <div class="card-label">Est. Monthly Cost</div>
            <div class="card-value">${fmtCurrency(totals.monthlyCost)}</div>
            <div class="card-sub">${fmtPrecise(totals.monthlyCost/totals.totalGPUs)}/GPU/mo avg</div>
        </div>
    </div>`;

    // Utilization chart
    const gpuTypes = {};
    fleetData.forEach(f => {
        if(!gpuTypes[f.gpu_type]) gpuTypes[f.gpu_type] = {active:0, idle:0, maint:0, count:0};
        gpuTypes[f.gpu_type].active += f.active;
        gpuTypes[f.gpu_type].idle += f.idle;
        gpuTypes[f.gpu_type].maint += f.maintenance;
        gpuTypes[f.gpu_type].count += f.count;
    });

    let barRows = '';
    Object.keys(gpuTypes).forEach(type => {
        const g = gpuTypes[type];
        const aPct = pct(g.active, g.count);
        const iPct = pct(g.idle, g.count);
        const mPct = pct(g.maint, g.count);
        barRows += `
        <div class="bar-row">
            <div class="bar-label">${type} (${g.count})</div>
            <div class="bar-track">
                <div class="bar-fill active" style="width:${aPct}%" title="Active: ${g.active}">${aPct>12?g.active:''}</div>
                <div class="bar-fill idle" style="width:${iPct}%" title="Idle: ${g.idle}">${iPct>8?g.idle:''}</div>
                <div class="bar-fill maintenance" style="width:${mPct}%" title="Maint: ${g.maint}">${mPct>5?g.maint:''}</div>
            </div>
            <div class="bar-value">${aPct.toFixed(0)}%</div>
        </div>`
    });

    const chartHtml = `
    <div class="chart-container">
        <div class="chart-title"><span class="chart-icon">◈</span> GPU Utilization by Type</div>
        <div class="bar-chart">${barRows}</div>
        <div class="memory-legend" style="margin-top:12px">
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--accent)"></div>Active</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--warning)"></div>Idle</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--danger)"></div>Maintenance</div>
        </div>
    </div>`;

    // Fleet breakdown table
    let tableRows = '';
    fleetData.forEach((f,i) => {
        const spec = GPU_SPECS[f.gpu_type] || {};
        const vramPerGPU = spec.vram || 0;
        const totalVRAM = vramPerGPU * f.count;
        const monthly = f.cost_per_gpu_hr * f.count * 730;
        const utilPct = pct(f.active, f.count);
        tableRows += `<tr>
            <td>${f.gpu_type}</td>
            <td>${f.provider}</td>
            <td class="text-mono">${f.count}</td>
            <td><span class="badge badge-active">${f.active}</span></td>
            <td><span class="badge badge-idle">${f.idle}</span></td>
            <td><span class="badge badge-maint">${f.maintenance}</span></td>
            <td class="text-mono">${vramPerGPU} GB</td>
            <td class="text-mono">${fmt(totalVRAM)} GB</td>
            <td class="text-mono">${fmtPrecise(f.cost_per_gpu_hr)}</td>
            <td class="text-mono text-warning">${fmtCurrency(monthly)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="flex:1;height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden">
                        <div style="width:${utilPct}%;height:100%;background:${utilPct>80?'var(--accent)':utilPct>50?'var(--warning)':'var(--danger)'};border-radius:3px"></div>
                    </div>
                    <span class="text-mono text-sm">${utilPct.toFixed(0)}%</span>
                </div>
            </td>
        </tr>`;
    });

    const tableHtml = `
    <div class="section-header">
        <div class="section-title">Fleet Breakdown</div>
        <div class="section-actions">
            <button class="btn btn-sm" onclick="document.getElementById('csvFileInput').click()">⬆ Import CSV</button>
        </div>
    </div>
    <div class="data-table-wrap">
        <table class="data-table" id="fleetTable">
            <thead><tr>
                <th onclick="sortTable('fleetTable',0)">GPU Type <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',1)">Provider <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',2)">Count <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',3)">Active <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',4)">Idle <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',5)">Maint <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',6)">VRAM/GPU <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',7)">Total VRAM <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',8)">$/GPU/hr <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',9)">Monthly Cost <span class="sort-arrow">▼</span></th>
                <th onclick="sortTable('fleetTable',10)">Avg Util <span class="sort-arrow">▼</span></th>
            </tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>`;

    // Active jobs panel
    let jobsHtml = '<div class="panel"><div class="panel-header"><div class="panel-title">Active Jobs</div><div class="badge badge-active">' + activeJobs.length + ' running</div></div><div class="panel-body no-padding">';
    activeJobs.forEach(j => {
        jobsHtml += `
        <div class="job-item">
            <div class="job-status-dot running"></div>
            <div class="job-info">
                <div class="job-name">${j.name}</div>
                <div class="job-meta">
                    <span>${j.gpus}</span>
                    <span>⏱ ${j.running}</span>
                    <span class="badge badge-${j.priority==='P0'?'active':j.priority==='P1'?'info':'idle'}" style="padding:1px 5px">${j.priority}</span>
                </div>
            </div>
            <div class="job-cost">${fmtCurrency(j.cost)}</div>
        </div>`;
    });
    jobsHtml += '</div></div>';

    section.innerHTML = cardsHtml + '<div class="grid-2">' +
        '<div>' + chartHtml + '</div>' +
        '<div>' + jobsHtml + '</div>' +
        '</div>' + tableHtml;
}

function computeFleetTotals() {
    let totalGPUs=0, totalActive=0, totalIdle=0, totalMaint=0, totalVRAM=0, monthlyCost=0, totalNodes=0;
    const types = new Set();
    fleetData.forEach(f => {
        totalGPUs += f.count;
        totalActive += f.active;
        totalIdle += f.idle;
        totalMaint += f.maintenance;
        const spec = GPU_SPECS[f.gpu_type];
        totalVRAM += (spec ? spec.vram : 0) * f.count;
        monthlyCost += f.cost_per_gpu_hr * f.count * 730;
        totalNodes += f.nodes || 0;
        types.add(f.gpu_type);
    });
    return { totalGPUs, totalActive, totalIdle, totalMaint, totalVRAM, monthlyCost, totalNodes, uniqueTypes:types.size };
}

// CSV Import
document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const lines = ev.target.result.split('\n').filter(l=>l.trim());
            const header = lines[0].toLowerCase();
            const newFleet = [];
            for(let i=1; i<lines.length; i++) {
                const cols = lines[i].split(',').map(c=>c.trim());
                if(cols.length<5) continue;
                const count = parseInt(cols[2])||0;
                const statusMap = (cols[3]||'active').toLowerCase();
                const cost = parseFloat(cols[4])||0;
                // Try to parse status - might be "420 active" or just a number
                let active=count, idle=0, maint=0;
                if(statusMap.includes('active')) active=parseInt(statusMap)||count;
                if(statusMap.includes('idle')) { idle=parseInt(statusMap)||0; active=count-idle; }
                newFleet.push({
                    gpu_type: cols[0],
                    provider: cols[1],
                    count: count,
                    active: active,
                    idle: idle,
                    maintenance: maint,
                    cost_per_gpu_hr: cost,
                    nodes: Math.ceil(count/8),
                    gpus_per_node: 8
                });
            }
            if(newFleet.length > 0) {
                fleetData = newFleet;
                renderFleetDashboard();
                renderCostAnalyzer();
            }
        } catch(err) { console.error('CSV parse error', err); }
    };
    reader.readAsText(file);
    e.target.value = '';
});
