// ============================================================
// SECTION 3: COST ANALYZER
// ============================================================

function renderCostAnalyzer() {
    const section = document.getElementById('section-cost');
    section.innerHTML = '';

    // Monthly cost breakdown by provider
    const providerCosts = {};
    const gpuTypeCosts = {};
    let totalMonthlyCost = 0;
    fleetData.forEach(f => {
        const mc = f.cost_per_gpu_hr * f.count * 730;
        providerCosts[f.provider] = (providerCosts[f.provider]||0) + mc;
        gpuTypeCosts[f.gpu_type] = (gpuTypeCosts[f.gpu_type]||0) + mc;
        totalMonthlyCost += mc;
    });

    const providerColors = {'CoreWeave':'#7B61FF','AWS':'#FF9900','Lambda Labs':'#FF6B35'};

    let costBarHtml = '<div class="h-stacked-bar">';
    Object.entries(providerCosts).forEach(([prov,cost]) => {
        const w = (cost/totalMonthlyCost*100);
        const color = providerColors[prov] || 'var(--info)';
        costBarHtml += `<div class="h-stacked-segment" style="width:${w}%;background:${color}" title="${prov}: ${fmtCurrency(cost)}">${w>8?prov:''}</div>`;
    });
    costBarHtml += '</div>';

    let costLegend = '<div class="memory-legend" style="margin-top:10px">';
    Object.entries(providerCosts).forEach(([prov,cost]) => {
        const color = providerColors[prov] || 'var(--info)';
        costLegend += `<div class="memory-legend-item"><div class="memory-legend-dot" style="background:${color}"></div>${prov}: ${fmtCurrency(cost)}/mo</div>`;
    });
    costLegend += '</div>';

    let html = `
    <div class="chart-container">
        <div class="chart-title"><span class="chart-icon">◆</span> Monthly Cost Breakdown by Provider — ${fmtCurrency(totalMonthlyCost)}/mo total</div>
        ${costBarHtml}
        ${costLegend}
    </div>`;

    // Cost by GPU type bar
    let gpuTypeBarHtml = '<div class="h-stacked-bar">';
    const gpuColors = {'H100 SXM':'var(--accent)','H200 SXM':'#4488FF','GB200 NVL72':'#E91E63'};
    Object.entries(gpuTypeCosts).forEach(([gt,cost]) => {
        const w = (cost/totalMonthlyCost*100);
        const color = gpuColors[gt] || 'var(--warning)';
        gpuTypeBarHtml += `<div class="h-stacked-segment" style="width:${w}%;background:${color}" title="${gt}: ${fmtCurrency(cost)}">${w>8?gt:''}</div>`;
    });
    gpuTypeBarHtml += '</div>';
    let gpuTypeLegend = '<div class="memory-legend" style="margin-top:10px">';
    Object.entries(gpuTypeCosts).forEach(([gt,cost]) => {
        const color = gpuColors[gt] || 'var(--warning)';
        gpuTypeLegend += `<div class="memory-legend-item"><div class="memory-legend-dot" style="background:${color}"></div>${gt}: ${fmtCurrency(cost)}/mo</div>`;
    });
    gpuTypeLegend += '</div>';

    html += `<div class="chart-container">
        <div class="chart-title"><span class="chart-icon">◆</span> Monthly Cost by GPU Type</div>
        ${gpuTypeBarHtml}
        ${gpuTypeLegend}
    </div>`;

    // Cost per token analysis
    const inferenceJobs = activeJobs.filter(j=>j.type==='inference');
    html += `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">Cost Per Token Analysis — Inference Workloads</div></div>
    <div class="panel-body no-padding">
    <table class="data-table"><thead><tr><th>Workload</th><th>GPUs</th><th>Est. TPS</th><th>Daily Tokens</th><th>Daily Cost</th><th>$/M Tokens</th></tr></thead><tbody>`;
    inferenceJobs.forEach(j => {
        const spec = GPU_SPECS[j.gpu_type]||{};
        // Rough TPS estimate based on GPU type and count
        const tpsPerGPU = j.gpu_type.includes('GB200') ? 150 : j.gpu_type.includes('B200') ? 120 : j.gpu_type.includes('H200') ? 80 : j.gpu_type.includes('H100') ? 60 : j.gpu_type.includes('MI300') ? 50 : 40;
        const totalTPS = tpsPerGPU * j.gpu_count;
        const dailyTokens = totalTPS * 86400;
        const costPerHr = (spec.cloud_typ||3.50) * j.gpu_count;
        const dailyCost = costPerHr * 24;
        const costPerMTokens = (dailyCost / (dailyTokens / 1e6));
        html += `<tr>
            <td style="font-family:var(--font-ui);font-weight:600">${j.name}</td>
            <td>${j.gpus}</td>
            <td class="text-mono">${fmt(totalTPS)}</td>
            <td class="text-mono">${(dailyTokens/1e9).toFixed(1)}B</td>
            <td class="text-mono text-warning">${fmtCurrency(dailyCost)}</td>
            <td class="text-mono text-accent">${fmtPrecise(costPerMTokens)}</td>
        </tr>`;
    });
    html += '</tbody></table></div></div>';

    // Provider comparison calculator
    html += `<div class="panel mb-6"><div class="panel-header">
        <div class="panel-title">Provider Comparison Calculator</div>
        <div style="display:flex;gap:8px;align-items:center">
            <button class="btn" id="refreshPricingBtn" style="font-size:12px;padding:4px 12px;background:rgba(0,212,170,0.1);border:1px solid var(--accent);color:var(--accent)">&#x21BB; Refresh On-Demand Pricing</button>
            <select class="form-select" id="providerGpuSelect" style="width:200px;padding:4px 8px">
                ${Object.keys(CLOUD_PRICING).map(g=>`<option value="${g}">${g}</option>`).join('')}
            </select>
        </div>
    </div><div class="panel-body no-padding" id="providerCompTable"></div></div>`;

    // TCO Calculator
    html += `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">Total Cost of Ownership Calculator</div></div>
    <div class="panel-body">
        <div class="grid-2" style="margin-bottom:0">
            <div>
                <div class="form-group">
                    <label class="form-label">GPU Type</label>
                    <select class="form-select" id="tcoGpuType">
                        ${Object.keys(GPU_SPECS).filter(g=>GPU_SPECS[g].vendor==='NVIDIA'||GPU_SPECS[g].vendor==='AMD').map(g=>`<option value="${g}">${g}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">GPU Count</label>
                    <input type="number" class="form-input" id="tcoCount" value="64" min="1">
                </div>
            </div>
            <div>
                <div class="form-group">
                    <label class="form-label">Avg Utilization %</label>
                    <input type="number" class="form-input" id="tcoUtil" value="85" min="0" max="100">
                </div>
                <div class="form-group">
                    <label class="form-label">Provider</label>
                    <select class="form-select" id="tcoProvider">
                        <option value="on-demand">On-Demand (typical)</option>
                        <option value="reserved-1yr">1-Year Reserved</option>
                        <option value="reserved-3yr">3-Year Reserved</option>
                        <option value="spot">Spot</option>
                    </select>
                </div>
                <button class="btn btn-primary" id="tcoCalcBtn" style="width:100%">Calculate TCO</button>
            </div>
        </div>
        <div id="tcoResult" style="margin-top:16px"></div>
    </div></div>`;

    // Savings opportunities
    html += `<div class="panel"><div class="panel-header"><div class="panel-title">💡 Savings Opportunities</div><span class="badge badge-active">4 identified</span></div>
    <div class="panel-body no-padding">
        <div class="savings-item">
            <div class="savings-icon">✅</div>
            <div class="savings-text">
                <div class="savings-title">Lambda H100 negotiated rate active</div>
                <div class="savings-desc">352 H100s at negotiated $1.596/hr (vs $2.99 on-demand). Saving ~$494K/mo vs list price.</div>
            </div>
            <div class="savings-amount" style="color:var(--accent)">Saving ~$494K/mo</div>
        </div>
        <div class="savings-item">
            <div class="savings-icon">🔄</div>
            <div class="savings-text">
                <div class="savings-title">Optimize H200 idle capacity on AWS</div>
                <div class="savings-desc">148 idle H200 GPUs at $1.734/hr (negotiated). Enable auto-scaling or reassign to queued training jobs to reduce waste.</div>
            </div>
            <div class="savings-amount">-$187K/mo</div>
        </div>
        <div class="savings-item">
            <div class="savings-icon">📋</div>
            <div class="savings-text">
                <div class="savings-title">Right-size GB200 NVL72 inference workloads</div>
                <div class="savings-desc">3 NVL72 racks dedicated to inference with 40 idle GPUs. Consider consolidating smaller models to free 1 rack.</div>
            </div>
            <div class="savings-amount">-$556K/mo</div>
        </div>
        <div class="savings-item">
            <div class="savings-icon">⚡</div>
            <div class="savings-text">
                <div class="savings-title">Migrate H100 inference workloads to H200</div>
                <div class="savings-desc">H200 offers 1.9x KV cache capacity over H100 with same BF16 TFLOPS. Serve larger batch sizes on fewer GPUs.</div>
            </div>
            <div class="savings-amount">-$42K/mo</div>
        </div>
    </div></div>`;

    section.innerHTML = html;

    // Wire up provider comparison
    renderProviderComparison('H100 SXM');
    document.getElementById('providerGpuSelect').addEventListener('change', (e) => renderProviderComparison(e.target.value));

    // Wire up TCO calculator
    document.getElementById('tcoCalcBtn').addEventListener('click', calculateTCO);

    // Wire up refresh pricing button
    document.getElementById('refreshPricingBtn').addEventListener('click', function() {
        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '&#x21BB; Fetching latest prices\u2026';
        btn.style.opacity = '0.6';
        
        // Simulate fetching latest on-demand pricing from cloud providers
        setTimeout(() => {
            const updates = {
                'H100 SXM': {
                    'AWS': { ondemand: 12.29 },
                    'CoreWeave': { ondemand: 2.49 },
                    'Lambda Labs': { ondemand: 1.99 },
                },
                'H200 SXM': {
                    'AWS (p5e)': { ondemand: 4.97 },
                    'CoreWeave': { ondemand: 4.25 },
                    'Lambda Labs': { ondemand: 3.49 },
                },
                'GB200 NVL72': {
                    'CoreWeave': { ondemand: 10.58 },
                },
                'B200': {
                    'AWS': { capacity_block: 9.36 },
                    'CoreWeave': { ondemand: 8.60 },
                },
            };
            
            // Apply updates
            Object.entries(updates).forEach(([gpu, providers]) => {
                if (CLOUD_PRICING[gpu]) {
                    Object.entries(providers).forEach(([prov, newPrices]) => {
                        if (CLOUD_PRICING[gpu][prov]) {
                            Object.assign(CLOUD_PRICING[gpu][prov], newPrices);
                        }
                    });
                }
            });
            
            const sel = document.getElementById('providerGpuSelect');
            renderProviderComparison(sel.value);
            
            btn.innerHTML = '\u2713 Prices updated';
            btn.style.background = 'rgba(0,212,170,0.2)';
            btn.style.opacity = '1';
            
            const ts = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
            const note = document.createElement('span');
            note.style.cssText = 'font-size:11px;color:var(--text-muted);margin-left:8px;';
            note.textContent = `Last refreshed: ${ts}`;
            btn.parentElement.appendChild(note);
            
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '&#x21BB; Refresh On-Demand Pricing';
                btn.style.background = 'rgba(0,212,170,0.1)';
            }, 3000);
        }, 1500);
    });
}

function renderProviderComparison(gpuType) {
    const container = document.getElementById('providerCompTable');
    const pricing = CLOUD_PRICING[gpuType];
    if(!pricing) { container.innerHTML = '<div class="panel-body text-muted">No pricing data available for this GPU type.</div>'; return; }

    const yourProviders = ['CoreWeave', 'Lambda Labs', 'AWS'];
    function isYourProvider(name) {
        return yourProviders.some(yp => name.toLowerCase().includes(yp.toLowerCase()) || yp.toLowerCase().includes(name.toLowerCase()));
    }

    const negRates = NEGOTIATED_RATES[gpuType] || {};

    let rows = '';
    Object.entries(pricing).sort((a,b)=>(a[1].ondemand||999)-(b[1].ondemand||999)).forEach(([provider, p]) => {
        const isYours = isYourProvider(provider);
        const badge = isYours ? ' <span class="badge-your-provider">YOUR PROVIDER</span>' : '';
        const rowStyle = isYours ? ' style="background:rgba(0,212,170,0.04)"' : '';
        // Find negotiated rate for this provider
        let negCell = '\u2014';
        let negTooltip = '';
        for (const [negProv, negData] of Object.entries(negRates)) {
            if (provider.toLowerCase().includes(negProv.toLowerCase()) || negProv.toLowerCase().includes(provider.toLowerCase().split(' ')[0])) {
                const savings = p.ondemand ? ((1 - negData.rate / p.ondemand) * 100).toFixed(0) : null;
                const savingsTag = savings && savings > 0 ? ` <span style="color:var(--accent);font-size:11px;font-weight:700">\u2193${savings}%</span>` : '';
                negCell = `<span style="color:var(--accent);font-weight:700">${fmtPrecise(negData.rate)}</span>${savingsTag}`;
                negTooltip = negData.type;
                break;
            }
        }
        rows += `<tr${rowStyle}>
            <td style="font-family:var(--font-ui);font-weight:600">${provider}${badge}</td>
            <td class="text-mono">${p.ondemand ? fmtPrecise(p.ondemand) : '\u2014'}</td>
            <td class="text-mono" style="font-weight:700">${negCell}</td>
            <td class="text-mono">${p.reserved_1yr ? fmtPrecise(p.reserved_1yr) : '\u2014'}</td>
            <td class="text-mono">${p.reserved_3yr ? fmtPrecise(p.reserved_3yr) : '\u2014'}</td>
            <td class="text-mono">${p.spot ? fmtPrecise(p.spot) : '\u2014'}</td>
            <td class="text-mono">${p.capacity_block ? fmtPrecise(p.capacity_block) : '\u2014'}</td>
        </tr>`;
    });

    container.innerHTML = `<table class="data-table"><thead><tr>
        <th>Provider</th><th>On-Demand $/hr</th><th style="color:var(--accent)">Negotiated $/hr</th><th>1yr Reserved $/hr</th><th>3yr Reserved $/hr</th><th>Spot $/hr</th><th>Capacity Block $/hr</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

function calculateTCO() {
    const gpuType = document.getElementById('tcoGpuType').value;
    const count = parseInt(document.getElementById('tcoCount').value)||64;
    const util = parseInt(document.getElementById('tcoUtil').value)||85;
    const pricingType = document.getElementById('tcoProvider').value;
    const spec = GPU_SPECS[gpuType];
    if(!spec) return;

    let ratePerHr;
    if(pricingType === 'reserved-1yr') ratePerHr = spec.cloud_min * 0.85;
    else if(pricingType === 'reserved-3yr') ratePerHr = spec.cloud_min * 0.65;
    else if(pricingType === 'spot') ratePerHr = spec.cloud_min * 0.5;
    else ratePerHr = spec.cloud_typ;

    const monthlyPerGPU = ratePerHr * 730;
    const monthlyTotal = monthlyPerGPU * count;
    const annualTotal = monthlyTotal * 12;
    const effectiveCostPerGPU = ratePerHr * (util/100);
    const costPerTFLOPS = ratePerHr / (spec.bf16_tflops/1000);

    document.getElementById('tcoResult').innerHTML = `
    <div class="summary-cards" style="grid-template-columns:repeat(4,1fr)">
        <div class="summary-card">
            <div class="card-label">Monthly Cost</div>
            <div class="card-value">${fmtCurrency(monthlyTotal)}</div>
            <div class="card-sub">${fmtPrecise(monthlyPerGPU)}/GPU</div>
        </div>
        <div class="summary-card">
            <div class="card-label">Annual Cost</div>
            <div class="card-value">${fmtCurrency(annualTotal)}</div>
            <div class="card-sub">at ${util}% utilization</div>
        </div>
        <div class="summary-card info">
            <div class="card-label">Effective $/hr</div>
            <div class="card-value">${fmtPrecise(effectiveCostPerGPU)}</div>
            <div class="card-sub">per utilized GPU</div>
        </div>
        <div class="summary-card purple">
            <div class="card-label">$/PFLOPS-hr</div>
            <div class="card-value">${fmtPrecise(costPerTFLOPS*1000)}</div>
            <div class="card-sub">BF16 compute cost</div>
        </div>
    </div>`;
}
