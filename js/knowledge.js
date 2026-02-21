// ============================================================
// SECTION 6: GPU KNOWLEDGE BASE
// ============================================================

let kbCompareGPUs = [];

// HBM type lookup — derived from architecture/product name
function getHBMType(name, spec) {
    if (name.includes('A100') || name.includes('MI250'))   return 'HBM2e';
    if (name.includes('H100'))                              return name.includes('PCIe') ? 'HBM2e' : 'HBM3';
    if (name.includes('H200'))                              return 'HBM3e';
    if (name.includes('B200') || name.includes('GB200'))    return 'HBM3e';
    if (name.includes('GB300'))                             return 'HBM3e';
    if (name.includes('MI300X'))                            return 'HBM3';
    if (name.includes('MI325X'))                            return 'HBM3e';
    if (name.includes('MI350X') || name.includes('MI355X')) return 'HBM3e';
    if (name.includes('MI300A'))                            return 'HBM3';
    if (name.includes('L40') || name.includes('L4'))        return 'GDDR6';
    if (name.includes('Gaudi'))                             return 'HBM2e';
    if (name.includes('TPU'))                               return 'HBM';
    return '—';
}

function renderKnowledgeBase() {
    const section = document.getElementById('section-knowledge');
    section.innerHTML = '';

    // Tabs
    let html = `<div class="tabs" id="kbTabs">
        <div class="tab active" data-tab="matrix">Comparison Matrix</div>
        <div class="tab" data-tab="comparator">Head-to-Head</div>
        <div class="tab" data-tab="frameworks">Framework Compat</div>
        <div class="tab" data-tab="calculator">Model Fit Calculator</div>
        <div class="tab" data-tab="workloads">Workload Guides</div>
        <div class="tab" data-tab="benchmarks">Benchmarks</div>
    </div>`;

    // Filter bar — only relevant for matrix tab
    html += `<div class="filter-bar" id="kbFilterBar">
        <input type="text" class="filter-input" id="kbFilter" placeholder="Filter GPUs... (e.g. H100, AMD, 192GB)">
        <select class="form-select" id="kbVendorFilter" style="width:140px;padding:6px 8px">
            <option value="">All Vendors</option>
            <option value="NVIDIA">NVIDIA</option>
            <option value="AMD">AMD</option>
            <option value="Intel">Intel</option>
            <option value="Google">Google</option>
        </select>
    </div>`;

    // Matrix tab
    html += `<div id="kbTab-matrix">`;
    html += renderGPUMatrix('');
    html += `</div>`;

    // Head-to-head tab
    html += `<div id="kbTab-comparator" style="display:none">`;
    html += renderComparator();
    html += `</div>`;

    // Framework compat tab
    html += `<div id="kbTab-frameworks" style="display:none">`;
    html += renderFrameworkCompat();
    html += `</div>`;

    // Model fit calculator tab
    html += `<div id="kbTab-calculator" style="display:none">`;
    html += renderModelFitCalc();
    html += `</div>`;

    // Workload guides tab
    html += `<div id="kbTab-workloads" style="display:none">`;
    html += renderWorkloadGuides();
    html += `</div>`;

    // Benchmarks tab
    html += `<div id="kbTab-benchmarks" style="display:none">`;
    html += renderBenchmarks();
    html += `</div>`;

    section.innerHTML = html;

    // Wire up tabs
    const allTabs = ['matrix','comparator','frameworks','calculator','workloads','benchmarks'];
    document.querySelectorAll('#kbTabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#kbTabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            allTabs.forEach(t => {
                document.getElementById('kbTab-'+t).style.display = t === tab.dataset.tab ? 'block' : 'none';
            });
            // Show/hide filter bar — only useful on matrix tab
            const filterBar = document.getElementById('kbFilterBar');
            if (filterBar) filterBar.style.display = tab.dataset.tab === 'matrix' ? 'flex' : 'none';
        });
    });

    // Wire up filters
    document.getElementById('kbFilter').addEventListener('input', () => refreshKBMatrix());
    document.getElementById('kbVendorFilter').addEventListener('change', () => refreshKBMatrix());

    // Wire up comparator and model fit
    attachComparatorEvents();
    attachModelFitEvents();
}

function refreshKBMatrix() {
    const filter = document.getElementById('kbFilter').value.toLowerCase();
    const vendor = document.getElementById('kbVendorFilter').value;
    document.getElementById('kbTab-matrix').innerHTML = renderGPUMatrix(filter, vendor);
}

// ── Comparison Matrix ────────────────────────────────────────────
function renderGPUMatrix(filter='', vendorFilter='') {
    let rows = '';
    Object.entries(GPU_SPECS).forEach(([name, spec]) => {
        if (vendorFilter && spec.vendor !== vendorFilter) return;
        if (filter && !name.toLowerCase().includes(filter) &&
            !spec.vendor.toLowerCase().includes(filter) &&
            !(spec.vram+'').includes(filter)) return;

        const hbm = getHBMType(name, spec);

        rows += `<tr class="gpu-row" data-gpu="${name}">
            <td style="font-family:var(--font-ui);font-weight:600">${name}</td>
            <td>${spec.vendor}</td>
            <td class="text-mono">${spec.vram} GB</td>
            <td class="text-mono">${fmt(spec.bw)} GB/s</td>
            <td class="text-mono">${fmt(spec.bf16_tflops)}</td>
            <td class="text-mono">${spec.fp8_tflops ? fmt(spec.fp8_tflops) : '—'}</td>
            <td class="text-mono">${spec.tdp}W</td>
            <td class="text-mono">${spec.nvlink_bw ? spec.nvlink_bw+' GB/s' : '—'}</td>
            <td class="text-mono">${fmtPrecise(spec.cloud_min)}–${fmtPrecise(spec.cloud_typ)}</td>
            <td class="text-mono" style="font-size:11px">${hbm}</td>
            <td style="font-size:11px">${spec.process || '—'}</td>
            <td class="text-mono">${spec.year || '—'}</td>
            <td style="font-size:11px">${spec.best_for}</td>
        </tr>`;
    });

    return `<div class="data-table-wrap"><table class="data-table" id="gpuMatrix"><thead><tr>
        <th onclick="sortTable('gpuMatrix',0)">GPU <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',1)">Vendor <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',2)">VRAM <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',3)">Bandwidth <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',4)">BF16 TFLOPS <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',5)">FP8 TFLOPS <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',6)">TDP <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',7)">NVLink BW <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',8)">$/hr Range <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',9)">HBM Type <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',10)">Process <span class="sort-arrow">▼</span></th>
        <th onclick="sortTable('gpuMatrix',11)">Year <span class="sort-arrow">▼</span></th>
        <th>Best For</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ── Head-to-Head Comparator ──────────────────────────────────────────────
function renderComparator() {
    const gpuNames = Object.keys(GPU_SPECS);
    let html = `<div class="comparator-select">
        <select class="form-select" id="compGPU1" style="width:200px"><option value="">Select GPU 1</option>${gpuNames.map(g=>`<option value="${g}" ${kbCompareGPUs[0]===g?'selected':''}>${g}</option>`).join('')}</select>
        <select class="form-select" id="compGPU2" style="width:200px"><option value="">Select GPU 2</option>${gpuNames.map(g=>`<option value="${g}" ${kbCompareGPUs[1]===g?'selected':''}>${g}</option>`).join('')}</select>
        <select class="form-select" id="compGPU3" style="width:200px"><option value="">Select GPU 3 (optional)</option>${gpuNames.map(g=>`<option value="${g}" ${kbCompareGPUs[2]===g?'selected':''}>${g}</option>`).join('')}</select>
    </div>
    <div id="compResult"></div>`;
    return html;
}

function updateComparator() {
    const gpus = kbCompareGPUs.filter(g => g && GPU_SPECS[g]);
    const container = document.getElementById('compResult');
    if (gpus.length < 2) { container.innerHTML = '<div class="text-muted">Select at least 2 GPUs to compare.</div>'; return; }

    const metrics = [
        { key:'vram',       label:'VRAM (GB)',          unit:'GB' },
        { key:'bw',         label:'Memory Bandwidth',   unit:'GB/s' },
        { key:'bf16_tflops',label:'BF16 TFLOPS',        unit:'TFLOPS' },
        { key:'fp8_tflops', label:'FP8 TFLOPS',         unit:'TFLOPS' },
        { key:'tdp',        label:'TDP',                unit:'W', inverse:true },
        { key:'nvlink_bw',  label:'NVLink Bandwidth',   unit:'GB/s' },
    ];
    const colors = ['var(--accent)','var(--info)','var(--purple)'];

    let html = '';
    metrics.forEach(m => {
        const maxVal = Math.max(...gpus.map(g => GPU_SPECS[g][m.key]||0));
        if (maxVal === 0) return;
        html += `<div class="comp-bar-container"><div class="comp-bar-label">${m.label}</div>`;
        gpus.forEach((g, i) => {
            const val = GPU_SPECS[g][m.key] || 0;
            const p = (val / maxVal * 100);
            html += `<div class="comp-bar-row">
                <div class="comp-bar-name">${g.split(' ')[0]}</div>
                <div class="comp-bar-track"><div class="comp-bar-fill" style="width:${p}%;background:${colors[i]}">${val>0?fmt(val):''}</div></div>
            </div>`;
        });
        html += '</div>';
    });

    // Detail cards side by side
    html += '<div style="display:grid;grid-template-columns:repeat('+gpus.length+',1fr);gap:12px;margin-top:20px">';
    gpus.forEach((g, i) => {
        const s = GPU_SPECS[g];
        html += `<div class="panel">
            <div class="panel-header" style="border-left:3px solid ${colors[i]}"><div class="panel-title">${g}</div></div>
            <div class="panel-body">
                <div class="text-xs text-muted">Architecture: <span class="text-primary">${s.arch}</span></div>
                <div class="text-xs text-muted">Process: <span class="text-primary">${s.process}</span></div>
                <div class="text-xs text-muted">Year: <span class="text-primary">${s.year}</span></div>
                <div class="text-xs text-muted">Vendor: <span class="text-primary">${s.vendor}</span></div>
                <div class="text-xs text-muted" style="margin-top:6px">Price: <span class="text-warning">${fmtPrecise(s.cloud_min)}-${fmtPrecise(s.cloud_typ)}/hr</span></div>
                <div class="text-xs text-muted">Frameworks: <span class="text-primary">${s.framework}</span></div>
                <div class="text-xs text-muted" style="margin-top:6px">Best For:</div>
                <div class="text-sm">${s.best_for}</div>
            </div>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

function attachComparatorEvents() {
    ['compGPU1','compGPU2','compGPU3'].forEach((id, i) => {
        const sel = document.getElementById(id);
        if (sel) sel.addEventListener('change', (e) => {
            kbCompareGPUs[i] = e.target.value;
            updateComparator();
        });
    });
}

// ── Framework Compatibility ──────────────────────────────────────────────
function renderFrameworkCompat() {
    let rows = '';
    Object.entries(GPU_SPECS).forEach(([name, spec]) => {
        const isNVIDIA  = spec.vendor === 'NVIDIA';
        const isAMD     = spec.vendor === 'AMD';
        const isGoogle  = spec.vendor === 'Google';
        const isIntel   = spec.vendor === 'Intel';
        const isAMDMI3  = isAMD && name.includes('MI3');

        const cuda      = spec.framework.includes('CUDA') ? '✅' : '❌';
        const rocm      = spec.framework.includes('ROCm') ? '✅' : isAMD ? '✅' : '❌';
        const triton    = spec.framework.includes('Triton') ? '✅' : '⚠️';
        const jax       = spec.framework.includes('JAX') ? '✅' : isGoogle ? '✅' : '⚠️';
        const pytorch   = isGoogle ? (spec.framework.includes('PyTorch') ? '✅' : '⚠️') : '✅';
        const tf        = isGoogle ? '✅' : '✅';
        const deepspeed = isNVIDIA ? '✅' : isAMD ? '⚠️' : '❌';
        const vllm      = isNVIDIA ? '✅' : (isAMDMI3 ? '✅' : '❌');

        // New columns: TGI, Megatron-LM, FSDP
        const tgi       = isNVIDIA ? '✅' : (isAMDMI3 ? '⚠️' : '❌');
        const megatron  = isNVIDIA ? '✅' : '❌';
        const fsdp      = isNVIDIA ? '✅' : isAMD ? '✅' : isGoogle ? '⚠️' : isIntel ? '⚠️' : '❌';

        rows += `<tr>
            <td style="font-family:var(--font-ui);font-weight:600">${name}</td>
            <td>${cuda}</td><td>${rocm}</td><td>${triton}</td>
            <td>${jax}</td><td>${pytorch}</td><td>${deepspeed}</td><td>${vllm}</td>
            <td>${tgi}</td><td>${megatron}</td><td>${fsdp}</td>
        </tr>`;
    });

    return `<div class="data-table-wrap"><table class="data-table"><thead><tr>
        <th>GPU</th><th>CUDA</th><th>ROCm</th><th>Triton</th>
        <th>JAX</th><th>PyTorch</th><th>DeepSpeed</th><th>vLLM</th>
        <th>TGI</th><th>Megatron-LM</th><th>FSDP</th>
    </tr></thead><tbody>${rows}</tbody></table></div>
    <div class="text-xs text-muted" style="margin-top:8px">
        ✅ Full support &nbsp; ⚠️ Partial / experimental &nbsp; ❌ Not supported<br>
        <span style="margin-top:4px;display:block">TGI = HuggingFace Text Generation Inference &nbsp;|&nbsp; Megatron-LM = NVIDIA Megatron (NVIDIA GPUs only) &nbsp;|&nbsp; FSDP = PyTorch Fully Sharded Data Parallel (AMD via ROCm)</span>
    </div>`;
}

// ── Model Fit Calculator ─────────────────────────────────────────────────────
function renderModelFitCalc() {
    return `<div class="panel"><div class="panel-header"><div class="panel-title">Model Fit Calculator</div></div>
    <div class="panel-body">
        <div class="grid-2" style="margin-bottom:0">
            <div>
                <div class="form-group">
                    <label class="form-label">Model Parameters (Billions)</label>
                    <input type="number" class="form-input" id="fitParams" value="70" min="1">
                </div>
                <div class="form-group">
                    <label class="form-label">Precision</label>
                    <select class="form-select" id="fitPrecision">
                        <option value="FP32">FP32 (4 bytes)</option>
                        <option value="BF16" selected>BF16 (2 bytes)</option>
                        <option value="FP8">FP8 (1 byte)</option>
                        <option value="INT8">INT8 (1 byte)</option>
                        <option value="INT4">INT4 (0.5 bytes)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Use Case</label>
                    <select class="form-select" id="fitUseCase">
                        <option value="inference">Inference</option>
                        <option value="training">Training (full)</option>
                        <option value="lora">LoRA Fine-tuning</option>
                        <option value="qlora">QLoRA Fine-tuning</option>
                    </select>
                </div>
                <button class="btn btn-primary" id="fitCalcBtn" style="width:100%">Check Fit</button>
            </div>
            <div id="fitResult" style="padding-top:4px"></div>
        </div>
    </div></div>`;
}

function attachModelFitEvents() {
    const btn = document.getElementById('fitCalcBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const params   = parseFloat(document.getElementById('fitParams').value) * 1e9;
        const precision = document.getElementById('fitPrecision').value;
        const useCase  = document.getElementById('fitUseCase').value;

        const bytesMap = {'FP32':4,'BF16':2,'FP16':2,'FP8':1,'INT8':1,'INT4':0.5,'FP4':0.5};
        const bpp = bytesMap[precision] || 2;

        let memNeeded;
        if      (useCase === 'inference') memNeeded = (params * bpp * 1.1) / 1e9;
        else if (useCase === 'training')  memNeeded = (params * 16) / 1e9;
        else if (useCase === 'lora')      memNeeded = (params * 2 + params * 0.01 * 16) / 1e9;
        else                              memNeeded = (params * 0.5 + params * 0.01 * 16) / 1e9;

        let html = `<div class="text-xs text-muted mb-4">Memory needed: <span class="text-accent text-mono font-bold">${fmt(memNeeded,1)} GB</span></div>`;

        const gpuList = Object.entries(GPU_SPECS).sort((a,b) => a[1].vram - b[1].vram);
        html += '<div style="display:flex;flex-direction:column;gap:6px">';
        gpuList.forEach(([name, spec]) => {
            const singleFit = memNeeded <= spec.vram * 0.85;
            const minGPUs   = Math.ceil(memNeeded / (spec.vram * 0.85));
            const icon  = singleFit ? '✅' : minGPUs <= 8 ? '⚠️' : '🔴';
            const label = singleFit ? 'Fits on 1 GPU' : `Needs ${minGPUs}x GPUs`;
            html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-secondary)">
                <span>${icon}</span>
                <span class="text-mono text-sm" style="width:160px">${name}</span>
                <span class="text-xs ${singleFit?'text-accent':'text-warning'}" style="width:120px">${label}</span>
                <div style="flex:1;height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden">
                    <div style="width:${Math.min(100,memNeeded/spec.vram*100)}%;height:100%;background:${singleFit?'var(--accent)':memNeeded/spec.vram<2?'var(--warning)':'var(--danger)'};border-radius:3px"></div>
                </div>
                <span class="text-mono text-xs text-muted">${spec.vram}GB</span>
            </div>`;
        });
        html += '</div>';

        document.getElementById('fitResult').innerHTML = html;
    });
}

// ── Workload Guides ───────────────────────────────────────────────────────────
function renderWorkloadGuides() {
    // Inference GPU Tiers
    const inferenceTiers = [
        { tier:'A', gpu:'H100 SXM',    vram:'80 GB',  best:'7B–34B at FP8/INT8; multi-tenant via MIG' },
        { tier:'B', gpu:'H200 SXM',    vram:'141 GB', best:'34B–70B+; 32K–128K context; decode-dominant workloads' },
        { tier:'C', gpu:'B200 / GB200', vram:'192 GB', best:'100B–200B+; 128K+ context; extreme scale inference' },
        { tier:'D', gpu:'AMD MI300X',  vram:'192 GB', best:'70B+ single-GPU; memory-bound MoE; large-batch offline' },
        { tier:'E', gpu:'A100 80GB',   vram:'80 GB',  best:'7B–34B at lower cost; no native FP8 support' },
    ];

    let inferenceTierRows = inferenceTiers.map(r =>
        `<tr>
            <td><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#000;font-weight:700;text-align:center;line-height:22px;font-size:12px">${r.tier}</span></td>
            <td style="font-weight:600;font-family:var(--font-ui)">${r.gpu}</td>
            <td class="text-mono">${r.vram}</td>
            <td style="font-size:12px">${r.best}</td>
        </tr>`
    ).join('');

    // Training Configuration
    const trainingConfigs = [
        { size:'7B',      weights:'14 GB',  vram:'~60–80 GB',  config:'1× H100 (80 GB)' },
        { size:'13B',     weights:'26 GB',  vram:'~125 GB',    config:'2× H100' },
        { size:'70B',     weights:'140 GB', vram:'~500 GB',    config:'8× H100 (ZeRO-3 / FSDP)' },
        { size:'405B',    weights:'810 GB', vram:'~3.25 TB',   config:'32–64× H100 (multi-node)' },
        { size:'671B MoE',weights:'—',      vram:'—',          config:'2,048× H800 (DeepSeek-V3)' },
    ];

    let trainingRows = trainingConfigs.map(r =>
        `<tr>
            <td class="text-mono" style="font-weight:600">${r.size}</td>
            <td class="text-mono">${r.weights}</td>
            <td class="text-mono">${r.vram}</td>
            <td style="font-size:12px">${r.config}</td>
        </tr>`
    ).join('');

    // Post-Training Methods
    const postTrainMethods = [
        { method:'Full Fine-Tune', mem:'1× (16 GB/param)', speed:'Slowest', quality:'Highest',       gpu:'8× H100+' },
        { method:'LoRA',           mem:'~0.6×',            speed:'Fast',    quality:'Near-full',      gpu:'1–2× H100' },
        { method:'QLoRA',          mem:'~0.15×',           speed:'Fast',    quality:'Good',           gpu:'1× H100 for 70B' },
        { method:'RLHF (PPO)',     mem:'4× (4 models)',    speed:'Slow',    quality:'Task-specific',  gpu:'16×+ H100' },
        { method:'DPO',            mem:'~2× (policy+ref)', speed:'Moderate',quality:'Task-specific',  gpu:'8× H100' },
    ];

    let postTrainRows = postTrainMethods.map(r =>
        `<tr>
            <td style="font-weight:600;font-family:var(--font-ui)">${r.method}</td>
            <td class="text-mono" style="font-size:12px">${r.mem}</td>
            <td style="font-size:12px">${r.speed}</td>
            <td style="font-size:12px">${r.quality}</td>
            <td class="text-mono" style="font-size:12px">${r.gpu}</td>
        </tr>`
    ).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:20px">

        <!-- Inference GPU Tiers -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Inference GPU Tiers</div>
                <div class="panel-subtitle">GPU selection guide for LLM inference workloads — decode is memory-bandwidth-bound</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th style="width:50px">Tier</th>
                        <th>GPU</th>
                        <th>VRAM</th>
                        <th>Best For</th>
                    </tr></thead>
                    <tbody>${inferenceTierRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px;border-left:3px solid var(--accent)">
                    <strong>Key insight:</strong> LLM decode is <strong>memory-bandwidth-bound</strong>, not compute-bound. H200 vs H100 is primarily a memory upgrade (76% more VRAM, 43% higher bandwidth, same compute die).
                    MLPerf shows H200 reaches <strong>31,712 tok/s vs H100's 21,806 tok/s</strong> on Llama 2 70B — a 45% improvement driven by HBM3e bandwidth.
                    For 70B+ models, a single H200 replacing 2× H100 saves ~$1.70/hr at cloud pricing.
                </div>
            </div>
        </div>

        <!-- Training Configuration -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Training VRAM Requirements by Model Size</div>
                <div class="panel-subtitle">Full BF16/FP16 pre-training — includes weights, optimizer states, gradients, activations</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Model Size</th>
                        <th>Weights (BF16)</th>
                        <th>Training VRAM Total</th>
                        <th>Minimum Config</th>
                    </tr></thead>
                    <tbody>${trainingRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px;border-left:3px solid var(--info)">
                    <strong>Rule of thumb:</strong> Full FP16 training requires ~16 GB VRAM per 1B parameters (weights + gradients + optimizer states).
                    <strong>ZeRO-3 / FSDP</strong> shards optimizer states, gradients, and parameters across GPUs — enabling 70B training on 8× 80GB H100s that couldn't fit with naive data parallelism.
                    For context, Llama 3 405B used ~16,000 H100s and DeepSeek-V3 (671B MoE) trained on 2,048 H800s for $5.576M.
                </div>
            </div>
        </div>

        <!-- Post-Training Methods -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Post-Training Method Comparison</div>
                <div class="panel-subtitle">Memory overhead and GPU requirements relative to full fine-tuning</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Method</th>
                        <th>Memory vs Full FT</th>
                        <th>Speed</th>
                        <th>Quality</th>
                        <th>Min GPU Config</th>
                    </tr></thead>
                    <tbody>${postTrainRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px">
                    <strong>QLoRA detail:</strong> 4-bit NormalFloat quantization of the frozen base model + LoRA adapters in BF16. Enables 70B fine-tuning on 1× H100 (~46 GB) vs 8× H100 for full FT.
                    &nbsp;|&nbsp; <strong>DPO advantage:</strong> 2× lower memory than PPO (no critic model), no reward model approximation errors, more stable training — used in Llama 3 and Qwen-Chat.
                    &nbsp;|&nbsp; <strong>RLHF (PPO) note:</strong> Requires 4 models simultaneously: actor, critic, reward, reference. At 7B scale, PPO needs ~280 GB total (4× H100 minimum).
                </div>
            </div>
        </div>

        <!-- MoE Guidance -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Mixture of Experts (MoE) — GPU Selection Guide</div>
                <div class="panel-subtitle">MoE models have a fundamental VRAM vs compute asymmetry</div>
            </div>
            <div class="panel-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                    <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-secondary)">
                        <div class="text-xs text-muted" style="font-weight:700;margin-bottom:8px;color:var(--accent)">VRAM vs Compute Asymmetry</div>
                        <div class="text-xs text-muted">MoE models route each token to only a subset of "experts" (FFN blocks), so compute cost ∝ <strong>active parameters</strong>, but VRAM requirement ∝ <strong>total parameters</strong>.</div>
                        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
                            <div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border-secondary)">
                                <span>Mixtral 8×7B (46.7B total)</span><span class="text-accent">~13B active compute</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border-secondary)">
                                <span>DeepSeek-V3 (671B total)</span><span class="text-accent">~37B active compute</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0">
                                <span>Llama 4 400B MoE</span><span class="text-accent">~17B active compute</span>
                            </div>
                        </div>
                    </div>
                    <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-secondary)">
                        <div class="text-xs text-muted" style="font-weight:700;margin-bottom:8px;color:var(--info)">Expert Parallelism (EP)</div>
                        <div class="text-xs text-muted">Distribute different experts across GPUs. Each GPU holds a <strong>subset of experts</strong> and receives only tokens routed to its experts via all-to-all communication.</div>
                        <div class="text-xs text-muted" style="margin-top:8px"><strong>Within a node (NVLink):</strong> 8 experts across 8 H100s — fast all-to-all at 900 GB/s</div>
                        <div class="text-xs text-muted" style="margin-top:4px"><strong>Across nodes (InfiniBand):</strong> Higher latency; DeepSeek-V3 achieved near-full overlap via DualPipe + custom NCCL kernels</div>
                        <div class="text-xs text-muted" style="margin-top:4px"><strong>Rule:</strong> All expert weights must reside in VRAM — no swapping. Size your fleet accordingly.</div>
                    </div>
                </div>

                <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-secondary);margin-bottom:14px">
                    <div class="text-xs text-muted" style="font-weight:700;margin-bottom:8px;color:var(--warning)">DeepSeek-V3 Configuration (Reference)</div>
                    <div class="text-xs text-muted">671B total params / 37B active per token &nbsp;|&nbsp; Trained on <strong>2,048× H800 GPUs</strong> for $5.576M &nbsp;|&nbsp; No tensor parallelism — used EP + PP only</div>
                    <div class="text-xs text-muted" style="margin-top:6px">Inference: Requires ~670 GB at FP8 → <strong>4× AMD MI300X</strong> (192 GB each = 768 GB) is the most cost-effective single-node config. Within-node EP via PCIe 5.0.</div>
                    <div class="text-xs text-muted" style="margin-top:6px"><strong>GB200 NVL72 advantage:</strong> 72-GPU NVLink 5.0 domain (1.8 TB/s per GPU) enables massive EP without InfiniBand — ideal for ultra-low-latency MoE serving at the rack scale.</div>
                </div>

                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Scenario</th><th>Recommended GPU</th><th>Interconnect</th><th>Rationale</th>
                    </tr></thead>
                    <tbody>
                        <tr><td>MoE inference, small (Mixtral 8×7B)</td><td class="text-mono">1–2× H100</td><td>NVLink</td><td style="font-size:11px">47 GB total → fits in 1× H200 at FP8</td></tr>
                        <tr><td>MoE inference, large (671B)</td><td class="text-mono">4× MI300X</td><td>PCIe 5.0</td><td style="font-size:11px">192 GB × 4 = 768 GB; large memory wins</td></tr>
                        <tr><td>MoE training, medium scale</td><td class="text-mono">H100 cluster</td><td>NVLink + NDR IB</td><td style="font-size:11px">EP within node (NVLink), DP across (IB)</td></tr>
                        <tr><td>MoE training, frontier scale</td><td class="text-mono">H100/H800</td><td>NVLink + IB</td><td style="font-size:11px">DeepSeek-V3: 2,048 H800s, custom all-to-all kernels</td></tr>
                        <tr><td>MoE serving, ultra-low latency</td><td class="text-mono">GB200 NVL72</td><td>NVLink 5 (1.8 TB/s)</td><td style="font-size:11px">72-GPU NVLink domain; no IB for EP</td></tr>
                    </tbody>
                </table></div>
            </div>
        </div>

    </div>`;
}

// ── Benchmarks ───────────────────────────────────────────────────────────────────────
function renderBenchmarks() {
    // Framework comparison rows
    const frameworkData = [
        { fw:'vLLM',          ttft:'123 ms',  tput:'~400 tok/s', use:'High-concurrency (100+ req/s), TTFT-sensitive, broad HuggingFace model support' },
        { fw:'SGLang',        ttft:'340 ms',  tput:'460 tok/s',  use:'Structured generation, multi-turn, RadixAttention prefix caching (10–20% compute savings)' },
        { fw:'TensorRT-LLM',  ttft:'194 ms',  tput:'~380 tok/s', use:'Single-user / low-concurrency (<10 req), max GPU utilization extraction, production NVIDIA' },
    ];

    let fwRows = frameworkData.map(r =>
        `<tr>
            <td style="font-weight:600;font-family:var(--font-ui)">${r.fw}</td>
            <td class="text-mono">${r.ttft}</td>
            <td class="text-mono">${r.tput}</td>
            <td style="font-size:12px">${r.use}</td>
        </tr>`
    ).join('');

    // High-concurrency benchmark rows
    const concData = [
        { c:'1',   vllm:'187',   sglang:'231',   trt:'243' },
        { c:'10',  vllm:'863',   sglang:'988',   trt:'867' },
        { c:'50',  vllm:'2,212', sglang:'3,109', trt:'2,163' },
        { c:'100', vllm:'4,742', sglang:'3,222', trt:'1,943' },
    ];

    let concRows = concData.map(r => {
        const vals = [parseFloat(r.vllm.replace(',','')), parseFloat(r.sglang.replace(',','')), parseFloat(r.trt.replace(',',''))];
        const max = Math.max(...vals);
        const highlight = (v) => parseFloat(v.replace(',','')) === max ? ' style="color:var(--accent);font-weight:700"' : '';
        return `<tr>
            <td class="text-mono" style="font-weight:600">${r.c}</td>
            <td class="text-mono"${highlight(r.vllm)}>${r.vllm}</td>
            <td class="text-mono"${highlight(r.sglang)}>${r.sglang}</td>
            <td class="text-mono"${highlight(r.trt)}>${r.trt}</td>
        </tr>`;
    }).join('');

    // Training MFU rows
    const mfuData = [
        { model:'GPT-3 175B',  cluster:'128 H100s',   bf16:'54%',  fp8:'39.5%' },
        { model:'Llama 3 70B', cluster:'64 H100s',    bf16:'54.5%',fp8:'38.1%' },
        { model:'Llama 3 70B', cluster:'2,048 H100s', bf16:'53.7%',fp8:'35.5%' },
    ];

    let mfuRows = mfuData.map(r =>
        `<tr>
            <td style="font-weight:600;font-family:var(--font-ui)">${r.model}</td>
            <td class="text-mono">${r.cluster}</td>
            <td class="text-mono" style="color:var(--accent)">${r.bf16}</td>
            <td class="text-mono" style="color:var(--info)">${r.fp8}</td>
        </tr>`
    ).join('');

    // Quantization impact rows
    const quantData = [
        { fmt:'BF16',           mem:'1×',     tput:'1×',          acc:'100%',   gpus:'All' },
        { fmt:'FP8',            mem:'~0.5×',  tput:'~1.5–2×',     acc:'>99.9%', gpus:'H100, H200, L4, L40S, B200' },
        { fmt:'INT8',           mem:'~0.5×',  tput:'~1.5–2×',     acc:'~99.96%',gpus:'A100, H100, most modern' },
        { fmt:'INT4 (GPTQ/AWQ)',mem:'~0.25×', tput:'~2.5–2.7×',   acc:'~98.1%', gpus:'All (compute in FP16)' },
    ];

    let quantRows = quantData.map(r =>
        `<tr>
            <td class="text-mono" style="font-weight:600">${r.fmt}</td>
            <td class="text-mono">${r.mem}</td>
            <td class="text-mono" style="color:var(--accent)">${r.tput}</td>
            <td class="text-mono">${r.acc}</td>
            <td style="font-size:11px">${r.gpus}</td>
        </tr>`
    ).join('');

    // Memory bandwidth chart — GPU list with BW values, sorted descending
    const bwGPUs = Object.entries(GPU_SPECS)
        .filter(([,s]) => s.bw > 0)
        .sort((a,b) => b[1].bw - a[1].bw);
    const maxBW = Math.max(...bwGPUs.map(([,s]) => s.bw));

    const bwColors = {
        'NVIDIA': 'var(--accent)',
        'AMD':    'var(--info)',
        'Intel':  'var(--warning)',
        'Google': 'var(--purple)',
    };

    let bwBars = bwGPUs.map(([name, spec]) => {
        const pctW = (spec.bw / maxBW * 100).toFixed(1);
        const color = bwColors[spec.vendor] || 'var(--accent)';
        const bwLabel = spec.bw >= 1000
            ? `${(spec.bw/1000).toFixed(1)} TB/s`
            : `${fmt(spec.bw)} GB/s`;
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <div style="width:120px;font-size:11px;font-family:var(--font-ui);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${name}">${name}</div>
            <div style="flex:1;height:16px;background:var(--bg-primary);border-radius:4px;overflow:hidden;position:relative">
                <div style="width:${pctW}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s"></div>
            </div>
            <div style="width:70px;font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">${bwLabel}</div>
            <div style="width:40px;font-size:10px;color:var(--text-muted)">${spec.vendor}</div>
        </div>`;
    }).join('');

    // Legend for bandwidth chart
    const bwLegend = Object.entries(bwColors).map(([vendor, color]) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:14px;font-size:11px">
            <span style="width:10px;height:10px;border-radius:2px;background:${color};display:inline-block"></span>${vendor}
        </span>`
    ).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:20px">

        <!-- Inference Framework Comparison -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Inference Framework Comparison</div>
                <div class="panel-subtitle">Llama 3.1 70B FP8 on 1× H100 SXM — TTFT (time-to-first-token) and throughput benchmarks</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Framework</th>
                        <th>TTFT (batch=1)</th>
                        <th>Throughput (batch=64)</th>
                        <th>Best Use Case</th>
                    </tr></thead>
                    <tbody>${fwRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px">
                    Source: <a href="https://www.cerebrium.ai/blog/benchmarking-vllm-sglang-tensorrt-for-llama-3-1-api" target="_blank" style="color:var(--accent)">Cerebrium benchmark</a>.
                    vLLM fastest TTFT, SGLang fastest batch throughput. Choice depends on workload — TTFT-sensitive APIs favor vLLM; structured/agent workloads favor SGLang.
                </div>
            </div>
        </div>

        <!-- High Concurrency Benchmark -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">High-Concurrency Throughput (tok/s)</div>
                <div class="panel-subtitle">GPT-OSS-120B — tokens/second across concurrency levels. Highlighted value = winner per row.</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Concurrency</th>
                        <th>vLLM (tok/s)</th>
                        <th>SGLang (tok/s)</th>
                        <th>TRT-LLM (tok/s)</th>
                    </tr></thead>
                    <tbody>${concRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px">
                    Source: <a href="https://www.clarifai.com/blog/comparing-sglang-vllm-and-tensorrt-llm-with-gpt-oss-120b" target="_blank" style="color:var(--accent)">Clarifai benchmark</a>.
                    SGLang leads at moderate concurrency (10–50); vLLM dominates at extreme concurrency (100+) due to its optimized continuous batching at scale.
                    TRT-LLM excels only at single-user; throughput degrades sharply above 50 concurrent requests.
                </div>
            </div>
        </div>

        <!-- Training MFU -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Training MFU (Model FLOP Utilization)</div>
                <div class="panel-subtitle">Production H100 cluster benchmarks — BF16 MFU is stable across scale; FP8 degrades more at large scale</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Model</th>
                        <th>Cluster</th>
                        <th>BF16 MFU</th>
                        <th>FP8 MFU</th>
                    </tr></thead>
                    <tbody>${mfuRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px">
                    Source: <a href="https://newsletter.semianalysis.com/p/h100-vs-gb200-nvl72-training-benchmarks" target="_blank" style="color:var(--accent)">SemiAnalysis</a>.
                    BF16 MFU loses only ~1% from 64→2,048 GPUs (54.5%→53.7%). FP8 is more sensitive to collective communication latency — 10% drop at large scale.
                    GPT-3 175B improved from <strong>34% MFU (Jan 2024) → 54% (Dec 2024)</strong> on the same hardware via software stack improvements alone.
                    Typical production MFU range: 35–45%; well-tuned: 51–52% (CoreWeave data).
                </div>
            </div>
        </div>

        <!-- Quantization Impact -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Quantization Impact on H100</div>
                <div class="panel-subtitle">Memory savings, throughput gains, and accuracy retention by precision format</div>
            </div>
            <div class="panel-body" style="padding-top:0">
                <div class="data-table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Format</th>
                        <th>Memory vs BF16</th>
                        <th>Throughput vs BF16</th>
                        <th>Accuracy Retention</th>
                        <th>GPU Support</th>
                    </tr></thead>
                    <tbody>${quantRows}</tbody>
                </table></div>
                <div class="text-xs text-muted" style="margin-top:10px;padding:10px;background:var(--bg-secondary);border-radius:6px">
                    Source: <a href="https://research.aimultiple.com/llm-quantization/" target="_blank" style="color:var(--accent)">AIMultiple quantization benchmark</a>.
                    Qwen3-32B on single H100 — INT4 (GPTQ): 18.1 GB weights, <strong>47 concurrent users vs 4 for BF16</strong>, 2.69× throughput increase.
                    <strong>FP8 requires native hardware</strong> (Hopper/Ada/Blackwell) — A100 uses INT8 instead. AWQ typically delivers up to 1.7× speedup vs GPTQ at INT4 with &lt;1% accuracy loss.
                </div>
            </div>
        </div>

        <!-- Memory Bandwidth Chart -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title">Memory Bandwidth Comparison</div>
                <div class="panel-subtitle">Higher bandwidth = faster decode for memory-bound LLM inference workloads</div>
            </div>
            <div class="panel-body">
                <div style="margin-bottom:10px">${bwLegend}</div>
                <div class="chart-container" style="padding:12px 0">
                    ${bwBars}
                </div>
                <div class="text-xs text-muted" style="margin-top:8px;padding:10px;background:var(--bg-secondary);border-radius:6px;border-left:3px solid var(--accent)">
                    LLM token generation (decode) is <strong>memory-bandwidth-bound</strong>. Each output token must load all model weights from VRAM.
                    H200's 4.8 TB/s vs H100's 3.35 TB/s → ~43% decode speedup for the same model.
                    MI300X at 5.3 TB/s beats H100 on bandwidth-heavy workloads (large MoE, long-context).
                    B200/MI350X/GB200 at 8.0 TB/s represent the current bandwidth frontier.
                </div>
            </div>
        </div>

    </div>`;
}
