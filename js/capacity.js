// ============================================================
// SECTION 5: CAPACITY PLANNER
// ============================================================

function renderCapacityPlanner() {
    const section = document.getElementById('section-capacity');
    section.innerHTML = '';

    const totals = computeFleetTotals();
    const currentGPUs = totals.totalGPUs;
    const currentActive = totals.totalActive;

    // Growth projection chart (SVG)
    const months = ['Now','Mo 1','Mo 2','Mo 3','Mo 4','Mo 5','Mo 6'];
    const inferenceGrowth = 0.15;
    const trainingGrowth = 0.08;
    const infBase = Math.round(currentActive * 0.6);
    const trainBase = Math.round(currentActive * 0.4);

    const infProjection = months.map((_,i) => Math.round(infBase * Math.pow(1+inferenceGrowth, i)));
    const trainProjection = months.map((_,i) => Math.round(trainBase * Math.pow(1+trainingGrowth, i)));
    const totalDemand = months.map((_,i) => infProjection[i] + trainProjection[i]);
    const capacity = months.map(() => currentGPUs);

    const maxVal = Math.max(...totalDemand, currentGPUs) * 1.15;
    const chartW = 700, chartH = 280, padL = 60, padR = 20, padT = 20, padB = 40;
    const plotW = chartW - padL - padR, plotH = chartH - padT - padB;

    function xPos(i) { return padL + (i / (months.length-1)) * plotW; }
    function yPos(v) { return padT + plotH - (v / maxVal) * plotH; }

    let svgContent = '';
    // Grid lines
    for(let i=0; i<5; i++) {
        const y = padT + (plotH/4)*i;
        const val = Math.round(maxVal - (maxVal/4)*i);
        svgContent += `<line x1="${padL}" y1="${y}" x2="${chartW-padR}" y2="${y}" class="grid-line"/>`;
        svgContent += `<text x="${padL-8}" y="${y+4}" text-anchor="end" class="axis-label">${val}</text>`;
    }
    // X labels
    months.forEach((m,i) => {
        svgContent += `<text x="${xPos(i)}" y="${chartH-5}" text-anchor="middle" class="axis-label">${m}</text>`;
    });

    // Capacity line
    const capPoints = months.map((_,i)=>`${xPos(i)},${yPos(capacity[i])}`).join(' ');
    svgContent += `<polyline points="${capPoints}" class="data-line" stroke="var(--text-muted)" stroke-dasharray="6 4"/>`;

    // Demand area (gap highlight)
    let gapArea = '';
    for(let i=0;i<months.length;i++) {
        if(totalDemand[i] > capacity[i]) {
            if(i>0 && totalDemand[i-1] <= capacity[i-1]) gapArea += `M${xPos(i-1)},${yPos(capacity[i-1])} `;
            gapArea += `L${xPos(i)},${yPos(totalDemand[i])} `;
        }
    }

    // Total demand line
    const demandPoints = months.map((_,i)=>`${xPos(i)},${yPos(totalDemand[i])}`).join(' ');
    const demandArea = months.map((_,i)=>`${xPos(i)},${yPos(totalDemand[i])}`).join(' ') + ` ${xPos(months.length-1)},${yPos(0)} ${xPos(0)},${yPos(0)}`;
    svgContent += `<polygon points="${demandArea}" class="data-area" fill="var(--accent)"/>`;
    svgContent += `<polyline points="${demandPoints}" class="data-line" stroke="var(--accent)"/>`;

    // Capacity gap fill
    for(let i=1;i<months.length;i++) {
        if(totalDemand[i] > capacity[i]) {
            svgContent += `<rect x="${xPos(i)-plotW/months.length/2}" y="${yPos(totalDemand[i])}" width="${plotW/months.length}" height="${yPos(capacity[i])-yPos(totalDemand[i])}" fill="var(--danger)" opacity="0.15" rx="2"/>`;
        }
    }

    // Inference line
    const infPoints = months.map((_,i)=>`${xPos(i)},${yPos(infProjection[i])}`).join(' ');
    svgContent += `<polyline points="${infPoints}" class="data-line" stroke="var(--info)" stroke-dasharray="4 3"/>`;

    // Data dots
    months.forEach((_,i) => {
        svgContent += `<circle cx="${xPos(i)}" cy="${yPos(totalDemand[i])}" r="4" fill="var(--accent)" stroke="var(--bg-primary)" class="data-dot"/>`;
    });

    let chartHtml = `<div class="chart-container">
        <div class="chart-title"><span class="chart-icon">◐</span> GPU Demand Projection — Next 6 Months</div>
        <svg class="line-chart-svg" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="xMidYMid meet">${svgContent}</svg>
        <div class="memory-legend" style="margin-top:12px">
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--accent)"></div>Total Demand (Inf +15%/mo, Train +8%/mo)</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--info)"></div>Inference Demand</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--text-muted)"></div>Current Capacity (${currentGPUs} GPUs)</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--danger)"></div>Capacity Gap</div>
        </div>
        <div class="warning-box" style="margin-top:12px">
            <span class="warning-box-icon">⚠</span>
            <span class="warning-box-text">Projected demand exceeds capacity by Month ${months.findIndex((_,i)=>totalDemand[i]>capacity[i])||'3'}. 
            At current growth, you'll need ~${totalDemand[6]-currentGPUs} additional GPUs by Month 6 
            (${totalDemand[6]} needed vs ${currentGPUs} available).</span>
        </div>
    </div>`;

    // Procurement scenarios
    const scenarioAcost = 512 * 4.97 * 730;
    const scenarioBcost = 72 * 18.00 * 730;
    const scenarioCcost = 256 * 4.97 * 730;

    let scenariosHtml = `<div class="section-title" style="margin-bottom:12px">Procurement Scenarios</div>
    <div class="grid-3">
        <div class="scenario-card">
            <div class="scenario-label">SCENARIO A</div>
            <div class="scenario-title">+512x H200 via AWS Reserved</div>
            <div class="scenario-desc">Expand H200 fleet with additional reserved capacity. Extends inference and training headroom by ~3 months.</div>
            <div class="scenario-stats">
                <div><div class="scenario-stat-label">Monthly Cost</div><div class="scenario-stat-value">${fmtCurrency(scenarioAcost)}</div></div>
                <div><div class="scenario-stat-label">Covers Until</div><div class="scenario-stat-value">Mo 4</div></div>
                <div><div class="scenario-stat-label">Total New GPUs</div><div class="scenario-stat-value">512</div></div>
                <div><div class="scenario-stat-label">New Fleet Total</div><div class="scenario-stat-value">${fmt(currentGPUs+512)}</div></div>
            </div>
        </div>
        <div class="scenario-card" style="border-color:var(--accent-dim)">
            <div class="scenario-label">SCENARIO B — RECOMMENDED</div>
            <div class="scenario-title">+1x GB300 NVL72 Rack</div>
            <div class="scenario-desc">Next-gen GB300 with 2x BF16 TFLOPS vs GB200. Massive inference throughput leap + future training headroom.</div>
            <div class="scenario-stats">
                <div><div class="scenario-stat-label">Monthly Cost</div><div class="scenario-stat-value">${fmtCurrency(scenarioBcost)}</div></div>
                <div><div class="scenario-stat-label">Covers Until</div><div class="scenario-stat-value">Mo 6+</div></div>
                <div><div class="scenario-stat-label">Total New GPUs</div><div class="scenario-stat-value">72</div></div>
                <div><div class="scenario-stat-label">Eff. Equivalent</div><div class="scenario-stat-value">~360 H100s</div></div>
            </div>
        </div>
        <div class="scenario-card">
            <div class="scenario-label">SCENARIO C</div>
            <div class="scenario-title">Hybrid: +256x H200 + Optimize Fleet</div>
            <div class="scenario-desc">Add H200s for training queue backlog + consolidate idle H100 workloads. Balanced approach.</div>
            <div class="scenario-stats">
                <div><div class="scenario-stat-label">Monthly Cost</div><div class="scenario-stat-value">${fmtCurrency(scenarioCcost)}</div></div>
                <div><div class="scenario-stat-label">Covers Until</div><div class="scenario-stat-value">Mo 5</div></div>
                <div><div class="scenario-stat-label">Total New GPUs</div><div class="scenario-stat-value">256</div></div>
                <div><div class="scenario-stat-label">Freed from Optim</div><div class="scenario-stat-value">~100 equiv</div></div>
            </div>
        </div>
    </div>`;

    // GPU Lifecycle Tracker
    let lifecycleHtml = `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">GPU Lifecycle & Contract Tracker</div></div><div class="panel-body">`;
    const now = new Date('2026-02-19');
    contracts.forEach(c => {
        const start = new Date(c.start);
        const end = new Date(c.end);
        const totalDays = (end - start) / (1000*60*60*24);
        const elapsedDays = (now - start) / (1000*60*60*24);
        const progressPct = Math.min(100, Math.max(0, (elapsedDays/totalDays)*100));
        const remainDays = Math.max(0, Math.round((end - now)/(1000*60*60*24)));
        const color = remainDays < 90 ? 'var(--danger)' : remainDays < 180 ? 'var(--warning)' : 'var(--accent)';

        lifecycleHtml += `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <div>
                    <span class="text-mono text-sm font-bold">${c.count}x ${c.gpu_type}</span>
                    <span class="text-xs text-muted"> — ${c.provider} (${c.type})</span>
                </div>
                <div>
                    <span class="text-mono text-xs" style="color:${color}">${remainDays}d remaining</span>
                    <span class="text-xs text-muted"> — expires ${end.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                </div>
            </div>
            <div class="lifecycle-bar">
                <div class="lifecycle-fill" style="left:0;width:${progressPct}%;background:${color}">${progressPct>20?Math.round(progressPct)+'%':''}</div>
            </div>
        </div>`;
    });
    lifecycleHtml += '</div></div>';

    // What-if simulator
    let whatIfHtml = `<div class="panel"><div class="panel-header"><div class="panel-title">What-If Simulator</div></div><div class="panel-body">
        <div class="grid-2" style="margin-bottom:0">
            <div>
                <div class="form-group">
                    <label class="form-label">Inference Traffic Growth Rate (%/month)</label>
                    <div class="slider-group">
                        <input type="range" class="form-range" id="whatIfInfGrowth" min="0" max="50" value="15">
                        <span class="slider-value" id="whatIfInfVal">15%</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Training Demand Growth Rate (%/month)</label>
                    <div class="slider-group">
                        <input type="range" class="form-range" id="whatIfTrainGrowth" min="0" max="30" value="8">
                        <span class="slider-value" id="whatIfTrainVal">8%</span>
                    </div>
                </div>
            </div>
            <div>
                <div class="form-group">
                    <label class="form-label">Fleet Migration Scenario</label>
                    <select class="form-select" id="whatIfMigration">
                        <option value="none">No migration</option>
                        <option value="a100_to_h100">Migrate A100 → H100</option>
                        <option value="h100_to_b200">Migrate H100 → B200</option>
                        <option value="add_nvl72">Add GB200 NVL72 rack</option>
                    </select>
                </div>
                <button class="btn btn-primary" id="whatIfCalc" style="width:100%;margin-top:8px">Simulate</button>
            </div>
        </div>
        <div id="whatIfResult" style="margin-top:16px"></div>
    </div></div>`;

    section.innerHTML = chartHtml + scenariosHtml + lifecycleHtml + whatIfHtml;

    // Wire up what-if
    document.getElementById('whatIfInfGrowth').addEventListener('input', (e) => {
        document.getElementById('whatIfInfVal').textContent = e.target.value + '%';
    });
    document.getElementById('whatIfTrainGrowth').addEventListener('input', (e) => {
        document.getElementById('whatIfTrainVal').textContent = e.target.value + '%';
    });
    document.getElementById('whatIfCalc').addEventListener('click', () => {
        const ig = parseInt(document.getElementById('whatIfInfGrowth').value)/100;
        const tg = parseInt(document.getElementById('whatIfTrainGrowth').value)/100;
        const mig = document.getElementById('whatIfMigration').value;

        let addedCapacity = 0;
        let note = '';
        if(mig === 'a100_to_h100') { addedCapacity = 44; note = 'Migrating A100 workloads to H100 frees ~44 GPU equivalents'; }
        else if(mig === 'h100_to_b200') { addedCapacity = 150; note = 'B200 provides ~2.5x perf per GPU, effective +150 GPU equivalents'; }
        else if(mig === 'add_nvl72') { addedCapacity = 180; note = 'GB200 NVL72 rack adds 72 GPUs (~180 H100-equivalent)'; }

        const effCapacity = currentGPUs + addedCapacity;
        const projDemand = [];
        for(let i=0;i<=6;i++) {
            projDemand.push(Math.round(infBase*Math.pow(1+ig,i) + trainBase*Math.pow(1+tg,i)));
        }
        const gapMonth = projDemand.findIndex(d=>d>effCapacity);

        document.getElementById('whatIfResult').innerHTML = `
        <div class="summary-cards" style="grid-template-columns:repeat(4,1fr)">
            <div class="summary-card">
                <div class="card-label">Effective Capacity</div>
                <div class="card-value">${fmt(effCapacity)}</div>
                <div class="card-sub">${addedCapacity>0?'+'+addedCapacity+' from migration':'No changes'}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Mo 3 Demand</div>
                <div class="card-value">${fmt(projDemand[3])}</div>
                <div class="card-sub">${projDemand[3]>effCapacity?'⚠ EXCEEDS CAPACITY':'✓ Within capacity'}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Mo 6 Demand</div>
                <div class="card-value">${fmt(projDemand[6])}</div>
                <div class="card-sub">${projDemand[6]>effCapacity?'⚠ EXCEEDS CAPACITY':'✓ Within capacity'}</div>
            </div>
            <div class="summary-card ${gapMonth===-1?'':'danger'}">
                <div class="card-label">Capacity Gap</div>
                <div class="card-value">${gapMonth===-1?'None':'Mo '+gapMonth}</div>
                <div class="card-sub">${gapMonth===-1?'Sufficient through Mo 6':'Need '+fmt(projDemand[6]-effCapacity)+' more GPUs'}</div>
            </div>
        </div>
        ${note?`<div class="text-sm text-muted" style="margin-top:8px">📝 ${note}</div>`:''}`;
    });
}
