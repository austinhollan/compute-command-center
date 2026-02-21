// ============================================================
// SECTION 7: REPORTS
// ============================================================

function renderReports() {
    const section = document.getElementById('section-reports');
    section.innerHTML = '';

    const totals = computeFleetTotals();

    // Fleet Utilization Report
    let html = `<div class="panel mb-6"><div class="panel-header">
        <div class="panel-title">📊 Fleet Utilization Report</div>
        <div class="section-actions">
            <button class="btn btn-sm" onclick="copyReport('fleetReport')">📋 Copy</button>
            <button class="btn btn-sm" onclick="window.print()">🖨 Print</button>
        </div>
    </div><div class="panel-body" id="fleetReport">
        <div class="text-xs text-muted mb-4">Generated: ${new Date().toLocaleString()} | Fleet Version: v2.4.1</div>
        <div class="summary-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
            <div class="summary-card"><div class="card-label">Total GPUs</div><div class="card-value">${fmt(totals.totalGPUs)}</div></div>
            <div class="summary-card"><div class="card-label">Utilization</div><div class="card-value">${pct(totals.totalActive,totals.totalGPUs).toFixed(1)}%</div></div>
            <div class="summary-card"><div class="card-label">Total VRAM</div><div class="card-value">${fmt(totals.totalVRAM/1000,1)} TB</div></div>
            <div class="summary-card"><div class="card-label">Monthly Cost</div><div class="card-value">${fmtCurrency(totals.monthlyCost)}</div></div>
        </div>
        <h3 style="font-size:13px;font-weight:700;margin:16px 0 8px">Fleet Composition</h3>`;

    // Fleet composition table
    html += '<table class="data-table" style="margin-bottom:16px"><thead><tr><th>GPU Type</th><th>Provider</th><th>Count</th><th>Active</th><th>Idle</th><th>Maint</th><th>Utilization</th></tr></thead><tbody>';
    fleetData.forEach(f => {
        html += `<tr><td>${f.gpu_type}</td><td>${f.provider}</td><td>${f.count}</td><td>${f.active}</td><td>${f.idle}</td><td>${f.maintenance}</td><td>${pct(f.active,f.count).toFixed(0)}%</td></tr>`;
    });
    html += '</tbody></table>';

    html += `<h3 style="font-size:13px;font-weight:700;margin:16px 0 8px">Active Workloads</h3>`;
    html += '<table class="data-table"><thead><tr><th>Job</th><th>GPUs</th><th>Duration</th><th>Cost</th><th>Priority</th></tr></thead><tbody>';
    activeJobs.forEach(j => {
        html += `<tr><td>${j.name}</td><td>${j.gpus}</td><td>${j.running}</td><td>${fmtCurrency(j.cost)}</td><td>${j.priority}</td></tr>`;
    });
    html += '</tbody></table>';
    html += `</div></div>`;

    // Cost Summary Report
    html += `<div class="panel mb-6"><div class="panel-header">
        <div class="panel-title">💰 Cost Summary Report</div>
        <div class="section-actions">
            <button class="btn btn-sm" onclick="copyReport('costReport')">📋 Copy</button>
            <button class="btn btn-sm" onclick="window.print()">🖨 Print</button>
        </div>
    </div><div class="panel-body" id="costReport">
        <div class="text-xs text-muted mb-4">Period: February 2026 | Generated: ${new Date().toLocaleString()}</div>`;

    // Cost by provider
    html += '<h3 style="font-size:13px;font-weight:700;margin:16px 0 8px">Monthly Spend by Provider</h3>';
    html += '<table class="data-table" style="margin-bottom:16px"><thead><tr><th>Provider</th><th>GPU Type</th><th>Count</th><th>Rate $/hr/GPU</th><th>Monthly Cost</th><th>% of Total</th></tr></thead><tbody>';
    fleetData.forEach(f => {
        const mc = f.cost_per_gpu_hr * f.count * 730;
        html += `<tr><td>${f.provider}</td><td>${f.gpu_type}</td><td>${f.count}</td><td>${fmtPrecise(f.cost_per_gpu_hr)}</td><td>${fmtCurrency(mc)}</td><td>${pct(mc,totals.monthlyCost).toFixed(1)}%</td></tr>`;
    });
    html += `<tr style="font-weight:700;background:var(--bg-tertiary)"><td colspan="4">TOTAL</td><td>${fmtCurrency(totals.monthlyCost)}</td><td>100%</td></tr>`;
    html += '</tbody></table>';

    // Cost by workload
    html += '<h3 style="font-size:13px;font-weight:700;margin:16px 0 8px">Active Workload Costs</h3>';
    const totalJobCost = activeJobs.reduce((s,j)=>s+j.cost,0);
    html += '<table class="data-table"><thead><tr><th>Workload</th><th>Type</th><th>GPUs</th><th>Accrued Cost</th><th>% of Active Spend</th></tr></thead><tbody>';
    activeJobs.sort((a,b)=>b.cost-a.cost).forEach(j => {
        html += `<tr><td>${j.name}</td><td>${j.type}</td><td>${j.gpus}</td><td>${fmtCurrency(j.cost)}</td><td>${pct(j.cost,totalJobCost).toFixed(1)}%</td></tr>`;
    });
    html += `<tr style="font-weight:700;background:var(--bg-tertiary)"><td colspan="3">TOTAL ACTIVE SPEND</td><td>${fmtCurrency(totalJobCost)}</td><td>100%</td></tr>`;
    html += '</tbody></table>';
    html += `</div></div>`;

    // Recommendations Summary
    html += `<div class="panel mb-6"><div class="panel-header">
        <div class="panel-title">💡 Recommendations Summary</div>
        <div class="section-actions">
            <button class="btn btn-sm" onclick="copyReport('recReport')">📋 Copy</button>
            <button class="btn btn-sm" onclick="window.print()">🖨 Print</button>
        </div>
    </div><div class="panel-body" id="recReport">
        <div class="text-xs text-muted mb-4">Based on current fleet analysis | Generated: ${new Date().toLocaleString()}</div>

        <h3 style="font-size:13px;font-weight:700;margin:16px 0 8px;color:var(--accent)">Cost Optimization (Est. $1.2M/mo savings)</h3>
        <div style="margin-bottom:16px">
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-accent text-mono font-bold">1.</span> <strong>Negotiate Lambda H100 volume pricing</strong> — 352 GPUs at on-demand rate. Reserved commitment saves: <span class="text-accent">$75K/mo</span>
            </div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-accent text-mono font-bold">2.</span> <strong>Optimize H200 idle capacity on AWS</strong> — 148 idle GPUs costing $4.97/hr each. Auto-scale or reassign to queued jobs. Potential saving: <span class="text-accent">$536K/mo</span>
            </div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-accent text-mono font-bold">3.</span> <strong>Right-size GB200 NVL72 inference allocation</strong> — 40 idle GPUs across 10 racks. Consolidate workloads to free 1 rack. Potential saving: <span class="text-accent">$556K/mo</span>
            </div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-accent text-mono font-bold">4.</span> <strong>Migrate H100 inference to H200</strong> — H200's 141GB VRAM enables larger batch sizes. Saves: <span class="text-accent">$42K/mo</span>
            </div>
        </div>

        <h3 style="font-size:13px;font-weight:700;margin:16px 0 8px;color:var(--warning)">Capacity Planning</h3>
        <div style="margin-bottom:16px">
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-warning text-mono font-bold">▸</span> Current fleet utilization at ${pct(totals.totalActive,totals.totalGPUs).toFixed(0)}% — approaching capacity constraints
            </div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-warning text-mono font-bold">▸</span> Demand projected to exceed supply by Month 3 at 15%/mo inference growth
            </div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-warning text-mono font-bold">▸</span> Recommended: Procure 1x GB200 NVL72 rack for next-gen inference capacity
            </div>
        </div>

        <h3 style="font-size:13px;font-weight:700;margin:16px 0 8px;color:var(--info)">Contract Renewals</h3>
        <div>`;
    contracts.forEach(c => {
        const end = new Date(c.end);
        const now = new Date('2026-02-19');
        const remainDays = Math.round((end-now)/(1000*60*60*24));
        if(remainDays < 365) {
            html += `<div style="padding:8px 0;border-bottom:1px solid var(--border-secondary)">
                <span class="text-info text-mono font-bold">▸</span> ${c.count}x ${c.gpu_type} (${c.provider}) — ${c.type} expires in <span class="${remainDays<180?'text-warning':'text-info'}">${remainDays} days</span> (${end.toLocaleDateString('en-US',{month:'short',year:'numeric'})})
            </div>`;
        }
    });
    html += `</div></div></div>`;

    section.innerHTML = html;
}

function copyReport(id) {
    const el = document.getElementById(id);
    if(!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text).then(() => {
        // Brief visual feedback
        const btn = el.parentElement.querySelector('.btn');
        if(btn) { const orig = btn.innerHTML; btn.innerHTML = '✓ Copied'; setTimeout(()=>btn.innerHTML=orig, 2000); }
    });
}


// ============================================================
// TABLE SORTING
// ============================================================

const sortStates = {};

function sortTable(tableId, colIdx) {
    const table = document.getElementById(tableId);
    if(!table) return;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const key = tableId + '-' + colIdx;
    const asc = sortStates[key] = !sortStates[key];

    rows.sort((a,b) => {
        let av = a.cells[colIdx]?.textContent.trim() || '';
        let bv = b.cells[colIdx]?.textContent.trim() || '';
        // Try numeric
        const an = parseFloat(av.replace(/[^0-9.\-]/g,''));
        const bn = parseFloat(bv.replace(/[^0-9.\-]/g,''));
        if(!isNaN(an) && !isNaN(bn)) return asc ? an-bn : bn-an;
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    rows.forEach(r => tbody.appendChild(r));

    // Update header state
    table.querySelectorAll('th').forEach((th,i) => {
        th.classList.toggle('sorted', i===colIdx);
        const arrow = th.querySelector('.sort-arrow');
        if(arrow) arrow.textContent = (i===colIdx) ? (asc ? '▲' : '▼') : '▼';
    });
}
