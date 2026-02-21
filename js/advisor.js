// ============================================================
// SECTION 2: GPU ADVISOR
// ============================================================

let advisorState = { step:1, workloadType:null, modelConfig:{}, requirements:{}, results:null };

function renderGPUAdvisor() {
    const section = document.getElementById('section-advisor');
    section.innerHTML = '';

    // Wizard steps bar
    const steps = ['Workload Type','Model Config','Requirements','Recommendation'];
    let stepsHtml = '<div class="wizard-steps">';
    steps.forEach((s,i) => {
        const st = i+1;
        const cls = st < advisorState.step ? 'completed' : st === advisorState.step ? 'active' : '';
        stepsHtml += `<div class="wizard-step ${cls}"><span class="wizard-step-num">${st}.</span>${s}</div>`;
    });
    stepsHtml += '</div>';

    let contentHtml = '';
    if(advisorState.step === 1) contentHtml = renderAdvisorStep1();
    else if(advisorState.step === 2) contentHtml = renderAdvisorStep2();
    else if(advisorState.step === 3) contentHtml = renderAdvisorStep3();
    else if(advisorState.step === 4) contentHtml = renderAdvisorStep4();

    section.innerHTML = stepsHtml + contentHtml;
    attachAdvisorEvents();
}

function renderAdvisorStep1() {
    const types = [
        { id:'pretrain', icon:'🧠', title:'Pre-Training', desc:'Train a model from scratch on large datasets' },
        { id:'posttrain', icon:'🎯', title:'Post-Training', desc:'SFT, LoRA, QLoRA, RLHF, DPO fine-tuning' },
        { id:'inference', icon:'⚡', title:'Inference', desc:'Production model serving at scale' },
        { id:'batch', icon:'📦', title:'Batch Processing', desc:'Embeddings, offline scoring, evaluation' },
    ];
    let html = '<div class="selection-cards">';
    types.forEach(t => {
        const sel = advisorState.workloadType===t.id ? 'selected' : '';
        html += `<div class="selection-card ${sel}" data-type="${t.id}">
            <span class="selection-card-icon">${t.icon}</span>
            <div class="selection-card-title">${t.title}</div>
            <div class="selection-card-desc">${t.desc}</div>
        </div>`;
    });
    html += '</div>';
    if(advisorState.workloadType) {
        html += '<div style="text-align:right"><button class="btn btn-primary btn-lg" id="advisorNext1">Continue →</button></div>';
    }
    return html;
}

function renderAdvisorStep2() {
    const mc = advisorState.modelConfig;
    const isPost = advisorState.workloadType === 'posttrain';
    const isMoE = mc.architecture === 'moe';

    let html = '<div class="grid-2"><div>';

    // Model params
    html += `<div class="form-group">
        <label class="form-label">Model Parameters</label>
        <div class="slider-group">
            <input type="range" class="form-range" id="paramSlider" min="1" max="2000" value="${mc.params||70}" step="1">
            <span class="slider-value" id="paramValue">${mc.params||70}B</span>
        </div>
        <div class="preset-buttons">
            ${[7,8,13,34,70,140,405,671].map(p=>`<button class="preset-btn ${mc.params===p?'active':''}" data-param="${p}">${p}B</button>`).join('')}
            <button class="preset-btn ${mc.params===2000?'active':''}" data-param="2000">2T</button>
        </div>
    </div>`;

    // Architecture
    html += `<div class="form-group">
        <label class="form-label">Architecture</label>
        <div style="display:flex;gap:8px">
            <button class="btn ${mc.architecture!=='moe'?'btn-primary':''}" id="archDense">Dense</button>
            <button class="btn ${mc.architecture==='moe'?'btn-primary':''}" id="archMoE">MoE</button>
        </div>
    </div>`;

    if(isMoE) {
        html += `<div class="form-group">
            <label class="form-label">Active Parameters (MoE)</label>
            <input type="number" class="form-input" id="activeParams" value="${mc.activeParams||37}" placeholder="e.g. 37 for 37B active of 671B total">
            <div class="text-xs text-muted" style="margin-top:4px">Billion parameters active per token</div>
        </div>`;
    }

    // Precision
    html += `<div class="form-group">
        <label class="form-label">Precision</label>
        <select class="form-select" id="precisionSelect">
            ${['FP32','BF16','FP16','FP8','INT8','INT4','FP4'].map(p=>`<option value="${p}" ${mc.precision===p?'selected':''}>${p}</option>`).join('')}
        </select>
    </div>`;

    html += '</div><div>';

    // Context length
    html += `<div class="form-group">
        <label class="form-label">Context Length</label>
        <select class="form-select" id="ctxSelect">
            ${['2K','4K','8K','16K','32K','64K','128K','256K','1M'].map(c=>`<option value="${c}" ${mc.contextLength===c?'selected':''}>${c}</option>`).join('')}
        </select>
    </div>`;

    // Fine-tuning method (if post-training)
    if(isPost) {
        html += `<div class="form-group">
            <label class="form-label">Fine-tuning Method</label>
            <select class="form-select" id="ftMethod">
                ${['Full','LoRA','QLoRA','RLHF','DPO'].map(m=>`<option value="${m}" ${mc.ftMethod===m?'selected':''}>${m}</option>`).join('')}
            </select>
        </div>`;
    }

    // Batch size (for inference)
    if(advisorState.workloadType === 'inference') {
        html += `<div class="form-group">
            <label class="form-label">Batch Size / Concurrent Requests</label>
            <input type="number" class="form-input" id="batchSize" value="${mc.batchSize||32}" min="1">
        </div>`;
    }

    html += '</div></div>';
    html += `<div style="display:flex;justify-content:space-between;margin-top:16px">
        <button class="btn" id="advisorBack2">← Back</button>
        <button class="btn btn-primary btn-lg" id="advisorNext2">Continue →</button>
    </div>`;
    return html;
}

function renderAdvisorStep3() {
    const req = advisorState.requirements;
    const wt = advisorState.workloadType;
    let html = '<div class="grid-2"><div>';

    if(wt === 'inference') {
        html += `<div class="form-group">
            <label class="form-label">Target TTFT (ms)</label>
            <input type="number" class="form-input" id="ttft" value="${req.ttft||500}" min="50">
        </div>
        <div class="form-group">
            <label class="form-label">Target Tokens/Sec (TPS)</label>
            <input type="number" class="form-input" id="tps" value="${req.tps||50}" min="1">
        </div>
        <div class="form-group">
            <label class="form-label">Concurrent Users</label>
            <input type="number" class="form-input" id="concUsers" value="${req.concUsers||100}" min="1">
        </div>
        <div class="form-group">
            <label class="form-label">Requests/Sec</label>
            <input type="number" class="form-input" id="rps" value="${req.rps||10}" min="1">
        </div>`;
    } else {
        html += `<div class="form-group">
            <label class="form-label">Target Training Time</label>
            <select class="form-select" id="targetTime">
                ${['1 day','3 days','1 week','2 weeks','1 month','3 months'].map(t=>`<option value="${t}" ${req.targetTime===t?'selected':''}>${t}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Dataset Size (Tokens)</label>
            <select class="form-select" id="datasetSize">
                ${['1B','10B','100B','500B','1T','5T','15T'].map(s=>`<option value="${s}" ${req.datasetSize===s?'selected':''}>${s}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Budget Constraint (USD)</label>
            <input type="number" class="form-input" id="budgetConstraint" value="${req.budget||100000}" min="1000" step="1000">
        </div>`;
    }

    html += '</div><div>';
    if(wt === 'inference') {
        html += `<div class="form-group">
            <label class="form-label">Optimization Priority</label>
            <div class="selection-cards" style="grid-template-columns:repeat(3,1fr)">
                <div class="selection-card ${req.priority==='latency'?'selected':''}" data-priority="latency" style="padding:14px">
                    <span class="selection-card-icon" style="font-size:20px">⚡</span>
                    <div class="selection-card-title">Min Latency</div>
                    <div class="selection-card-desc" style="font-size:10px;color:var(--text-muted)">TTFT & TPS</div>
                </div>
                <div class="selection-card ${req.priority==='throughput'?'selected':''}" data-priority="throughput" style="padding:14px">
                    <span class="selection-card-icon" style="font-size:20px">📈</span>
                    <div class="selection-card-title">Max Throughput</div>
                    <div class="selection-card-desc" style="font-size:10px;color:var(--text-muted)">Requests/sec</div>
                </div>
                <div class="selection-card ${req.priority==='cost_per_token'||!req.priority?'selected':''}" data-priority="cost_per_token" style="padding:14px">
                    <span class="selection-card-icon" style="font-size:20px">💲</span>
                    <div class="selection-card-title">Cost/Token</div>
                    <div class="selection-card-desc" style="font-size:10px;color:var(--text-muted)">$/M tokens</div>
                </div>
            </div>
        </div>`;
    } else {
        html += `<div class="form-group">
            <label class="form-label">Optimization Priority</label>
            <div class="selection-cards" style="grid-template-columns:repeat(3,1fr)">
                <div class="selection-card ${req.priority==='perf'?'selected':''}" data-priority="perf" style="padding:14px">
                    <span class="selection-card-icon" style="font-size:20px">🚀</span>
                    <div class="selection-card-title">Max Performance</div>
                    <div class="selection-card-desc" style="font-size:10px;color:var(--text-muted)">Fastest time-to-train</div>
                </div>
                <div class="selection-card ${req.priority==='perf_per_dollar'||!req.priority?'selected':''}" data-priority="perf_per_dollar" style="padding:14px">
                    <span class="selection-card-icon" style="font-size:20px">⚖️</span>
                    <div class="selection-card-title">Perf / Dollar</div>
                    <div class="selection-card-desc" style="font-size:10px;color:var(--text-muted)">Best TFLOPS/$</div>
                </div>
                <div class="selection-card ${req.priority==='budget'?'selected':''}" data-priority="budget" style="padding:14px">
                    <span class="selection-card-icon" style="font-size:20px">💰</span>
                    <div class="selection-card-title">Budget Cap</div>
                    <div class="selection-card-desc" style="font-size:10px;color:var(--text-muted)">Stay under limit</div>
                </div>
            </div>
        </div>`;
    }
    html += '</div></div>';
    html += `<div style="display:flex;justify-content:space-between;margin-top:16px">
        <button class="btn" id="advisorBack3">← Back</button>
        <button class="btn btn-primary btn-lg" id="advisorCompute">⚡ Generate Recommendation</button>
    </div>`;
    return html;
}

// ============================================================
// FRAMEWORK RECOMMENDATIONS
// ============================================================

function getFrameworkRecs(workloadType, modelConfig) {
    if(workloadType === 'inference') {
        return [
            { name: 'vLLM', desc: 'Best for high-concurrency APIs, 100+ users, fastest TTFT at low concurrency. PagedAttention reduces KV cache waste from 60–80% to <4%, enabling 2–4× throughput improvement.' },
            { name: 'SGLang', desc: 'Best for structured output, multi-turn, RadixAttention prefix caching — 10–20% compute savings on shared-prefix workloads (RAG, agents). Fastest at 10–50 concurrent requests.' },
            { name: 'TensorRT-LLM', desc: 'Best for <10 concurrent requests, lowest per-token latency, Hopper/Blackwell optimized. Ideal for single-user or latency-critical production deployment.' },
        ];
    }
    if(workloadType === 'pretrain') {
        return [
            { name: 'Megatron-LM', desc: 'Gold standard for 70B+, 3D parallelism (TP+PP+DP), highest MFU at scale. Best-in-class for frontier model training; requires model code adaptation.' },
            { name: 'PyTorch FSDP', desc: 'Best for 7B–70B, native PyTorch, easy HuggingFace integration. ZeRO-3-style sharding without additional dependencies; ideal for research and mid-scale runs.' },
            { name: 'DeepSpeed ZeRO-3', desc: 'Memory-efficient sharding, good for memory-constrained setups. CPU/NVMe offload support enables training very large models on modest GPU counts.' },
        ];
    }
    if(workloadType === 'posttrain') {
        return [
            { name: 'HuggingFace TRL + PEFT', desc: 'LoRA/QLoRA/DPO, easiest integration. PEFT LoRA trains ~1% of parameters; QLoRA enables 70B fine-tuning on a single H100 80GB via 4-bit base quantization.' },
            { name: 'DeepSpeed ZeRO', desc: 'RLHF pipelines, InstructGPT-style training. Handles PPO\'s 4-model memory requirement with ZeRO-3 sharding across actor, critic, reward, and reference models.' },
            { name: 'Axolotl', desc: 'Turnkey fine-tuning, wraps best practices. Supports LoRA, QLoRA, full fine-tune, DPO, RLHF with minimal configuration; community-maintained recipe library.' },
        ];
    }
    if(workloadType === 'batch') {
        return [
            { name: 'vLLM', desc: 'Continuous batching, PagedAttention, highest throughput. In-flight batching keeps GPU at near-peak bandwidth utilization; best for large offline embedding/scoring jobs.' },
            { name: 'SGLang', desc: 'RadixAttention for shared-prefix batch workloads. Particularly efficient when many batch items share a common system prompt or document prefix.' },
        ];
    }
    return [];
}

// ============================================================
// RESEARCH-BACKED NOTES
// ============================================================

function getResearchNotes(workloadType, modelConfig, requirements, totalMemGB) {
    const notes = [];
    const params = modelConfig.params || 70;
    const precision = modelConfig.precision || 'BF16';
    const isMoE = modelConfig.architecture === 'moe';
    const ftMethod = modelConfig.ftMethod || 'Full';
    const isLoRA = ftMethod === 'LoRA' || ftMethod === 'QLoRA';

    if(workloadType === 'inference' || workloadType === 'batch') {
        // Bandwidth-bound note — always relevant for inference
        notes.push('LLM decode is memory-bandwidth-bound, not compute-bound. Each token requires loading full model weights from VRAM. Memory bandwidth is the dominant performance driver — this is why H200\'s 4.8 TB/s matters more than its identical compute die vs H100.');

        // H200 vs H100 speedup for large models
        if(params >= 70) {
            notes.push(`H200 delivers ~1.9× speedup over H100 on Llama 70B (MLPerf: 31,712 vs 21,806 tok/s) due to 43% more memory bandwidth (4.8 vs 3.35 TB/s) and 76% more VRAM. For ${params}B+ decode-dominant workloads, 1× H200 can replace 2× H100, saving ~$1.70/GPU-hr at cloud pricing.`);
        }

        // Prefill vs decode distinction
        notes.push('Prefill (processing input tokens) is compute-bound — H100\'s 989 TFLOPS FP16 vs A100\'s 312 TFLOPS gives ~2–3× faster TTFT. Decode (generating output tokens) is memory-bandwidth-bound — H100\'s 3.35 TB/s vs A100\'s 2.0 TB/s gives ~1.6× decode speedup.');

        // TP guidance for inference
        notes.push('Tensor parallelism across NVLink (intra-node) is efficient. Cross-node TP over InfiniBand hurts latency significantly — keep TP ≤ 8 for H100/H200 (NVLink domain = 8 GPUs). For throughput bottlenecks, prefer data parallelism (replicas) over TP.');

        // Framework note based on concurrency
        const concUsers = (requirements && requirements.concUsers) || 0;
        if(concUsers >= 100) {
            notes.push('For 100+ concurrent users: vLLM\'s PagedAttention and continuous batching reaches highest throughput at extreme concurrency (4,742 tok/s on GPT-OSS-120B at 100 concurrent vs SGLang\'s 3,222). Consider vLLM for production high-concurrency APIs.');
        } else if(concUsers > 0 && concUsers < 20) {
            notes.push('At low concurrency (<20 users): TensorRT-LLM achieves lowest per-token latency (243 tok/s at concurrency=1 vs vLLM\'s 187). Use TRT-LLM for latency-critical, low-concurrency deployments on NVIDIA hardware.');
        }
    }

    if(workloadType === 'pretrain') {
        // MFU baseline note
        notes.push('Typical MFU on H100 clusters: 35–45%. Well-tuned: 51–52% (CoreWeave benchmarks). Software improvements alone delivered 57% throughput improvement on GPT-3 175B over 12 months (Jan→Dec 2024), from 34% to 54% MFU with the same hardware.');

        // TP within NVLink domain for large models
        if(params > 100) {
            notes.push(`TP must stay within NVLink domain: max 8 GPUs for H100/H200, 72 GPUs for GB200 NVL72. Never span tensor parallelism across nodes — IB latency makes cross-node TP inefficient. For ${params}B+: use TP=8, PP=${Math.max(1,Math.ceil(params/175*4))}, DP=N (3D parallelism).`);
        }

        // Pipeline bubble note for large PP
        if(params > 200) {
            notes.push('Pipeline parallelism introduces bubbles: 1F1B schedule wastes (PP-1)/PP GPU compute during ramp-up. With PP=8, ~87% of initial pipeline stages are idle. Use interleaved scheduling or Megatron\'s virtual stages to reduce bubbles to <5%.');
        }

        // BF16 vs FP8 scaling stability
        notes.push('BF16 MFU is remarkably stable across scale: only 1–2% degradation from 64→2,408 GPUs (Llama3 70B: 54.5% → 53.7% MFU). FP8 shows ~10% more sensitivity due to increased collective communication latency at scale — prefer BF16 for reliability.');

        // Framework guidance
        if(params >= 70) {
            notes.push('Megatron-LM achieves best-in-class 3D parallelism efficiency for 70B+. PyTorch FSDP is simpler but shows cross-node performance degradation. For frontier training, Megatron-LM\'s hybrid sharding (TP+PP+DP) consistently achieves the highest MFU.');
        }
    }

    if(workloadType === 'posttrain') {
        // LoRA/QLoRA efficiency
        if(isLoRA) {
            if(ftMethod === 'LoRA') {
                notes.push(`LoRA trains only ~0.1–1% of parameters (rank 64–128 adapters). Memory: ${params}B LoRA needs ~${Math.round(params * 2.1)}GB vs ~${Math.round(params * 16)}GB for full fine-tune. Quality matches full fine-tuning for most tasks; consider rank 128+ for complex domain adaptation.`);
            } else {
                notes.push(`QLoRA enables 70B fine-tuning on a single H100 80GB by 4-bit quantizing base weights (NormalFloat4) while keeping LoRA adapters in BF16. Memory: ${params}B QLoRA needs ~${Math.round(params * 0.6)}GB vs ${Math.round(params * 16)}GB for full fine-tune — a ${Math.round(params*16/(params*0.6))}× reduction.`);
            }
        }

        // RLHF/PPO memory warning
        if(ftMethod === 'RLHF') {
            notes.push(`PPO requires 4 models simultaneously: policy (actor), critic, reward model, and reference model. For ${params}B base model, PPO requires ~${Math.round(params * 18 * 2 / 1e0)}GB total (4× model weight + optimizer states). Actor-reference colocation and vLLM rollout generation can reduce overhead by ~30%.`);
            notes.push('vLLM rollout generation handles ~80% of PPO wall-clock time. Using vLLM for the generation phase (actor inference) dramatically improves step throughput vs naive autoregressive generation.');
        }

        // DPO vs PPO tradeoff
        if(ftMethod === 'DPO') {
            notes.push('DPO requires only 2 models (policy + reference) vs PPO\'s 4 — 2× lower memory, no rollout generation phase, more stable training. SimPO (no reference model) reduces to 1 model if reference-free alignment is acceptable.');
        }
    }

    // MoE-specific notes
    if(isMoE) {
        notes.push('MoE expert parallelism (EP) replaces tensor parallelism. DeepSeek-V3 used EP=64, PP=16, no TP on 2,048 H800 GPUs. All expert weights must reside in VRAM even though only active experts process each token — memory estimate uses full parameter count for weights.');
        notes.push('MoE all-to-all expert routing communication benefits from both NVLink (intra-node) and InfiniBand (inter-node). For inference, AMD MI300X\'s 192GB VRAM can hold larger MoE models single-GPU, reducing routing communication overhead.');
    }

    // Quantization-specific notes
    if(precision === 'FP8') {
        notes.push('FP8 requires Hopper+ (H100/H200) or Ada (L4/L40S) or Blackwell (B200/GB200). A100 does not support FP8 natively — use INT8 instead. FP8 delivers ~1.5–2× throughput vs BF16 with >99.9% accuracy retention. Note: FP8 MFU shows ~10% more scaling degradation than BF16 at large cluster sizes.');
    }
    if(precision === 'INT4') {
        notes.push('INT4 (GPTQ/AWQ) delivers ~2.5–2.7× throughput increase vs BF16 with ~98% accuracy retention (Qwen3-32B benchmark: 2.69× at INT4 GPTQ). AWQ is typically 1.7× faster than GPTQ for instruction-tuned models with <1% accuracy loss — prefer AWQ for production INT4 deployment.');
    }
    if(precision === 'FP4') {
        notes.push('FP4 is exclusive to Blackwell architecture (B200/GB200 NVL72). Delivers ~18,000 TFLOPS peak (vs 9,000 FP8) with ~0.25× the memory footprint of BF16. Validate accuracy carefully — FP4 quantization may show more degradation than INT4 for some model families.');
    }

    return notes;
}

// ============================================================
// COMPUTATION
// ============================================================

function computeAdvisorRecommendation() {
    const mc = advisorState.modelConfig;
    const wt = advisorState.workloadType;
    const req = advisorState.requirements;

    const params = (mc.params || 70) * 1e9;
    const precision = mc.precision || 'BF16';
    const isMoE = mc.architecture === 'moe';
    const activeParamsB = isMoE ? (mc.activeParams || 37) * 1e9 : params;
    const ctxStr = mc.contextLength || '8K';
    const ctxLen = parseContextLength(ctxStr);
    const ftMethod = mc.ftMethod || 'Full';
    const batchSize = mc.batchSize || 32;

    // Bytes per parameter by precision
    const bytesMap = { 'FP32':4, 'BF16':2, 'FP16':2, 'FP8':1, 'INT8':1, 'INT4':0.5, 'FP4':0.5 };
    const bpp = bytesMap[precision] || 2;

    // Estimate layers, heads, dim for KV cache
    const estLayers = params > 500e9 ? 96 : params > 100e9 ? 80 : params > 30e9 ? 64 : params > 10e9 ? 40 : params > 3e9 ? 32 : 16;
    const estHeadDim = 128;
    const estKVHeads = params > 100e9 ? 64 : params > 30e9 ? 32 : params > 10e9 ? 16 : 8;

    let totalMemGB, weightsMemGB, kvCacheGB=0, optimizerMemGB=0, activationsGB=0;

    if(wt === 'inference' || wt === 'batch') {
        const weightsParams = isMoE ? params : params; // full weights always loaded
        weightsMemGB = (weightsParams * bpp) / 1e9;
        const kvPerToken = 2 * estKVHeads * estHeadDim * estLayers * 2;
        kvCacheGB = (kvPerToken * ctxLen * batchSize) / 1e9;
        const overhead = (weightsMemGB + kvCacheGB) * 0.10;
        totalMemGB = weightsMemGB + kvCacheGB + overhead;
    } else if(wt === 'pretrain') {
        // Mixed precision training: weights(2B) + gradients(2B) + optimizer(12B for Adam) = 16B per param
        weightsMemGB = (params * 16) / 1e9;
        activationsGB = (params * 2 * Math.min(ctxLen, 4096) / 1e6) / 1e3; // rough estimate
        activationsGB = Math.min(activationsGB, weightsMemGB * 0.3); // cap at 30% of weights mem
        totalMemGB = weightsMemGB + activationsGB;
    } else { // posttrain
        if(ftMethod === 'LoRA') {
            const loraParams = params * 0.01; // ~1% of params
            weightsMemGB = (params * 2 + loraParams * 16) / 1e9;
            activationsGB = weightsMemGB * 0.15;
            totalMemGB = weightsMemGB + activationsGB;
        } else if(ftMethod === 'QLoRA') {
            const loraParams = params * 0.01;
            weightsMemGB = (params * 0.5 + loraParams * 16) / 1e9;
            activationsGB = weightsMemGB * 0.15;
            totalMemGB = weightsMemGB + activationsGB;
        } else if(ftMethod === 'RLHF') {
            weightsMemGB = (params * 18 * 2) / 1e9; // policy + reward model
            activationsGB = weightsMemGB * 0.1;
            totalMemGB = weightsMemGB + activationsGB;
        } else if(ftMethod === 'DPO') {
            weightsMemGB = (params * 18) / 1e9;
            activationsGB = weightsMemGB * 0.1;
            totalMemGB = weightsMemGB + activationsGB;
        } else { // Full
            weightsMemGB = (params * 16) / 1e9;
            activationsGB = weightsMemGB * 0.15;
            totalMemGB = weightsMemGB + activationsGB;
        }
    }

    // Score each GPU — only use GPUs that actually exist in GPU_SPECS
    const candidates = [];
    const gpuList = Object.keys(GPU_SPECS).filter(name => {
        const s = GPU_SPECS[name];
        return (s.vendor === 'NVIDIA' || s.vendor === 'AMD') && !name.includes('A100 40GB') && !name.includes('TPU') && !name.includes('Gaudi');
    });

    gpuList.forEach(gpuName => {
        const spec = GPU_SPECS[gpuName];
        if(!spec) return;
        const usableVRAM = spec.vram * 0.85;
        let minGPUs = Math.ceil(totalMemGB / usableVRAM);
        if(spec.min_gpus) minGPUs = Math.max(minGPUs, spec.min_gpus);
        // Round up to multiples of 8 for training, or practical sizes
        if(wt !== 'inference' && wt !== 'batch') {
            if(minGPUs > 1 && minGPUs < 8) minGPUs = 8;
            else if(minGPUs > 8 && minGPUs % 8 !== 0) minGPUs = Math.ceil(minGPUs/8)*8;
        } else {
            if(minGPUs > 1 && minGPUs < 2) minGPUs = 2;
            if(minGPUs > 2 && minGPUs % 2 !== 0) minGPUs = Math.ceil(minGPUs/2)*2;
        }
        if(minGPUs > 4096) return;

        // Parallelism strategy
        // GB200 NVL72 has a 72-GPU NVLink domain — TP can go up to 72 within a single rack
        const isGB200NVL72 = gpuName.includes('GB200 NVL72') || gpuName.includes('GB300 NVL72');
        const nvlinkDomainSize = isGB200NVL72 ? 72 : 8;

        // For MoE models, prefer expert parallelism (EP) — use TP=1 for training/post-training
        const forceNoTP = isMoE && (wt === 'pretrain' || wt === 'posttrain');

        let tp, pp, dp;
        if(forceNoTP) {
            // MoE: EP replaces TP; set TP=1 and distribute via PP+DP
            tp = 1;
            pp = minGPUs > 16 ? Math.min(Math.ceil(minGPUs / 8), 16) : minGPUs > 1 ? Math.min(minGPUs, 8) : 1;
            dp = Math.max(1, Math.floor(minGPUs / (tp * pp)));
        } else {
            // TP must stay within NVLink domain — never exceed nvlinkDomainSize
            tp = Math.min(minGPUs, nvlinkDomainSize);
            pp = minGPUs > nvlinkDomainSize ? Math.min(Math.ceil(minGPUs / nvlinkDomainSize), 16) : 1;
            dp = Math.max(1, Math.floor(minGPUs / (tp * pp)));
        }
        const actualGPUs = tp * pp * dp;

        // Cost
        const costPerHr = spec.cloud_typ * actualGPUs;
        let totalCost, estTime;
        if(wt === 'inference') {
            estTime = '24/7 serving';
            totalCost = costPerHr * 730; // monthly
        } else {
            const targetDays = parseTargetTime(req.targetTime || '1 week');
            estTime = formatDays(targetDays);
            totalCost = costPerHr * targetDays * 24;
        }

        // Performance metrics
        const tflops = precision.includes('FP8') || precision.includes('INT') ? spec.fp8_tflops : spec.bf16_tflops;
        const totalTFLOPS = tflops * actualGPUs;
        const totalBW = spec.bw * actualGPUs; // memory bandwidth — critical for inference
        const perfPerDollar = totalTFLOPS / Math.max(1, costPerHr);

        // Inference-specific: bandwidth is king for token generation
        // Training-specific: TFLOPS is king for compute-bound work
        let inferenceScore, trainingScore, costPerTokenScore;

        // Inference latency score: bandwidth-weighted (BW drives token gen speed)
        inferenceScore = (totalBW * 0.6 + totalTFLOPS * 0.4) / Math.max(1, actualGPUs);

        // Throughput score: total aggregate compute * BW
        const throughputScore = totalTFLOPS * 0.5 + totalBW * 0.3 + (spec.nvlink_bw || 0) * actualGPUs * 0.2;

        // Cost-per-token score: perf/dollar with BW weighting
        costPerTokenScore = (totalBW * 0.5 + totalTFLOPS * 0.5) / Math.max(1, totalCost);

        // Training perf score: raw TFLOPS + interconnect
        trainingScore = totalTFLOPS + (spec.nvlink_bw || 0) * actualGPUs * 0.5;

        // Perf/dollar for training
        const perfPerDollarScore = trainingScore / Math.max(1, totalCost);

        // Build a human-readable parallelism note
        let parallelismNote = '';
        if(forceNoTP) {
            parallelismNote = `MoE: EP replaces TP (TP=1). PP=${pp}${dp>1?`, DP=${dp}`:''}. NVLink domain: ${nvlinkDomainSize} GPUs.`;
        } else if(tp > 8) {
            parallelismNote = `GB200 NVL72 single NVLink domain (72 GPUs). TP=${tp} within rack, PP=${pp}${dp>1?`, DP=${dp}`:''}. No cross-node TP required.`;
        } else {
            parallelismNote = `TP=${tp} within NVLink domain (max ${nvlinkDomainSize}), PP=${pp}${dp>1?`, DP=${dp}`:''}. ${actualGPUs <= nvlinkDomainSize ? 'Single-domain deployment.' : `Spans ${Math.ceil(actualGPUs/nvlinkDomainSize)} NVLink domains.`}`;
        }

        candidates.push({
            gpu: gpuName, count: actualGPUs, tp, pp, dp,
            costPerHr, totalCost, estTime,
            perfScore: perfPerDollar, inferenceScore, throughputScore, costPerTokenScore, trainingScore, perfPerDollarScore,
            memNeeded: totalMemGB, memAvailable: spec.vram * actualGPUs,
            headroom: ((spec.vram * actualGPUs - totalMemGB) / (spec.vram * actualGPUs) * 100),
            parallelismNote,
            spec
        });
    });

    // Sort by priority — PERFORMANCE-FIRST for inference, not cost-first
    const priority = req.priority || (wt === 'inference' ? 'cost_per_token' : 'perf_per_dollar');
    candidates.sort((a,b) => {
        // Inference priorities
        if(priority === 'latency') return b.inferenceScore - a.inferenceScore;
        if(priority === 'throughput') return b.throughputScore - a.throughputScore;
        if(priority === 'cost_per_token') return b.costPerTokenScore - a.costPerTokenScore;
        // Training priorities
        if(priority === 'perf') return b.trainingScore - a.trainingScore;
        if(priority === 'perf_per_dollar') return b.perfPerDollarScore - a.perfPerDollarScore;
        if(priority === 'budget') return a.totalCost - b.totalCost;
        // Fallback: perf per dollar
        return b.perfPerDollarScore - a.perfPerDollarScore;
    });

    // Generate warnings
    const warnings = [];
    if(totalMemGB > 80 && totalMemGB < 142) {
        warnings.push(`${(mc.params||70)}B ${precision} requires ~${totalMemGB.toFixed(0)} GB — tight fit on single H100 (80GB). Consider H200 or multi-GPU TP.`);
    }
    if(totalMemGB > 192 && totalMemGB < 260) {
        warnings.push(`Memory requirement of ${totalMemGB.toFixed(0)} GB exceeds single B200/MI300X. Multi-GPU tensor parallelism required.`);
    }
    if(wt === 'pretrain' && (mc.params||70) > 100) {
        warnings.push('Pre-training >100B params requires careful checkpoint strategy. Estimate does not include activation recomputation savings.');
    }
    if(isMoE) {
        warnings.push('MoE models: all expert weights must be in VRAM even though only active params process each token. Memory estimate uses total params for weights.');
        if(wt === 'pretrain' || wt === 'posttrain') {
            warnings.push('MoE training: use Expert Parallelism (EP) instead of Tensor Parallelism — EP routes tokens to distributed experts via all-to-all, replacing TP all-reduces. DeepSeek-V3 config: EP=64, PP=16, TP=1.');
        }
    }
    if(precision === 'FP4' || precision === 'INT4') {
        warnings.push(`${precision} quantization may degrade model quality. Validate with perplexity benchmarks before production deployment.`);
    }
    if(precision === 'FP8') {
        warnings.push('FP8 is not supported on A100 — only Hopper (H100/H200), Ada (L4/L40S), and Blackwell (B200/GB200). Any A100 recommendation will fall back to INT8 performance levels.');
    }

    advisorState.results = {
        primary: candidates[0] || null,
        alternatives: candidates.slice(1, 4),
        warnings,
        memBreakdown: { weights: weightsMemGB, kvCache: kvCacheGB, optimizer: optimizerMemGB, activations: activationsGB, total: totalMemGB },
        candidates,
        frameworkRecs: getFrameworkRecs(wt, mc),
        researchNotes: getResearchNotes(wt, mc, req, totalMemGB)
    };
}

// ============================================================
// STEP 4: RENDER RECOMMENDATION
// ============================================================

function renderAdvisorStep4() {
    const r = advisorState.results;
    if(!r || !r.primary) return '<div class="warning-box"><span class="warning-box-icon">⚠</span><span class="warning-box-text">No suitable GPU configuration found for these requirements.</span></div>';

    const p = r.primary;
    let html = '';

    // Primary recommendation
    html += `<div class="recommendation-box">
        <div class="rec-grid">
            <div class="rec-stat">
                <div class="rec-stat-label">GPU</div>
                <div class="rec-stat-value accent">${p.count}x ${p.gpu}</div>
            </div>
            <div class="rec-stat">
                <div class="rec-stat-label">Parallelism</div>
                <div class="rec-stat-value">TP=${p.tp} PP=${p.pp} DP=${p.dp}</div>
            </div>
            <div class="rec-stat">
                <div class="rec-stat-label">Cost/Hour</div>
                <div class="rec-stat-value">${fmtPrecise(p.costPerHr)}</div>
            </div>
            <div class="rec-stat">
                <div class="rec-stat-label">${advisorState.workloadType==='inference'?'Monthly Cost':'Est. Total Cost'}</div>
                <div class="rec-stat-value accent">${fmtCurrency(p.totalCost)}</div>
            </div>
        </div>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-secondary)">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">PARALLELISM STRATEGY</div>
            <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">
                ${p.parallelismNote || `Use <span class="text-accent">TP=${p.tp}</span> within each node, <span class="text-accent">PP=${p.pp}</span> across nodes${p.dp>1?`, <span class="text-accent">DP=${p.dp}</span> for data parallelism`:''}. ${p.count <= 8 ? 'Single-node deployment.' : `Requires ${Math.ceil(p.count/8)} nodes.`}`}
            </div>
        </div>
    </div>`;

    // Memory breakdown bar
    const mb = r.memBreakdown;
    const totalMem = p.memAvailable;
    const freeMem = totalMem - mb.total;
    const wPct = (mb.weights/totalMem*100);
    const kvPct = (mb.kvCache/totalMem*100);
    const oPct = (mb.optimizer/totalMem*100);
    const aPct = (mb.activations/totalMem*100);
    const fPct = (freeMem/totalMem*100);

    html += `<div class="chart-container">
        <div class="chart-title"><span class="chart-icon">▣</span> Memory Breakdown (${fmt(totalMem,0)} GB total across ${p.count} GPUs)</div>
        <div class="memory-bar">
            <div class="memory-segment" style="width:${wPct}%;background:var(--accent)">${mb.weights>0?fmt(mb.weights,0)+'GB':''}</div>
            <div class="memory-segment" style="width:${kvPct}%;background:var(--info)">${mb.kvCache>1?fmt(mb.kvCache,0)+'GB':''}</div>
            <div class="memory-segment" style="width:${aPct}%;background:var(--purple)">${mb.activations>1?fmt(mb.activations,0)+'GB':''}</div>
            <div class="memory-segment" style="width:${fPct}%;background:var(--bg-tertiary);color:var(--text-muted)">${fmt(freeMem,0)}GB free</div>
        </div>
        <div class="memory-legend">
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--accent)"></div>Weights (${fmt(mb.weights,1)} GB)</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--info)"></div>KV Cache (${fmt(mb.kvCache,1)} GB)</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--purple)"></div>Activations (${fmt(mb.activations,1)} GB)</div>
            <div class="memory-legend-item"><div class="memory-legend-dot" style="background:var(--bg-tertiary)"></div>Free Headroom (${fmt(freeMem,1)} GB / ${fPct.toFixed(0)}%)</div>
        </div>
    </div>`;

    // Alternatives
    if(r.alternatives.length > 0) {
        html += '<div class="section-title" style="margin-bottom:12px">Alternative Configurations</div><div class="grid-3">';
        r.alternatives.forEach((alt, i) => {
            const vsP = ((alt.totalCost - p.totalCost) / p.totalCost * 100);
            html += `<div class="alt-card">
                <div class="alt-card-header">
                    <span class="alt-label">OPTION ${String.fromCharCode(66+i)}</span>
                    <span class="badge ${vsP>0?'badge-idle':'badge-active'}">${vsP>0?'+':''}${vsP.toFixed(0)}% cost</span>
                </div>
                <div class="alt-card-title">${alt.count}x ${alt.gpu}</div>
                <div style="margin-top:8px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span class="text-xs text-muted">TP=${alt.tp} PP=${alt.pp} DP=${alt.dp}</span>
                        <span class="text-mono text-sm text-warning">${fmtPrecise(alt.costPerHr)}/hr</span>
                    </div>
                    <div style="display:flex;justify-content:space-between">
                        <span class="text-xs text-muted">Total VRAM: ${fmt(alt.memAvailable,0)} GB</span>
                        <span class="text-mono text-sm">${fmtCurrency(alt.totalCost)}</span>
                    </div>
                    <div style="margin-top:6px;font-size:11px;color:var(--text-muted)">Headroom: ${alt.headroom.toFixed(0)}%</div>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    // Cost comparison table
    html += `<div class="data-table-wrap"><table class="data-table"><thead><tr>
        <th>Config</th><th>GPU</th><th>Count</th><th>$/Hour</th><th>Total Cost</th><th>VRAM</th><th>Headroom</th>
    </tr></thead><tbody>`;
    [p, ...r.alternatives].forEach((c, i) => {
        html += `<tr${i===0?' style="background:var(--accent-glow)"':''}>
            <td>${i===0?'★ Primary':'Option '+String.fromCharCode(66+i-1)}</td>
            <td>${c.gpu}</td><td>${c.count}</td>
            <td class="text-warning">${fmtPrecise(c.costPerHr)}</td>
            <td class="text-warning">${fmtCurrency(c.totalCost)}</td>
            <td>${fmt(c.memAvailable,0)} GB</td>
            <td>${c.headroom.toFixed(0)}%</td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    // Recommended Frameworks panel
    if(r.frameworkRecs && r.frameworkRecs.length > 0) {
        html += `<div class="panel mb-6">
            <div class="panel-header"><div class="panel-title">⚡ Recommended Frameworks</div></div>
            <div class="panel-body">`;
        r.frameworkRecs.forEach(rec => {
            html += `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-secondary)">
                <div style="min-width:140px;font-weight:600;color:var(--text-primary);font-family:var(--font-mono);font-size:13px">${rec.name}</div>
                <div style="color:var(--text-muted);font-size:13px;line-height:1.5">${rec.desc}</div>
            </div>`;
        });
        html += `    </div>
        </div>`;
    }

    // Research Insights panel
    if(r.researchNotes && r.researchNotes.length > 0) {
        html += `<div class="panel mb-6">
            <div class="panel-header"><div class="panel-title">📊 Research-Backed Insights</div></div>
            <div class="panel-body">`;
        r.researchNotes.forEach(note => {
            html += `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-secondary);align-items:flex-start">
                <span style="color:var(--accent);font-size:14px;margin-top:1px;flex-shrink:0">▸</span>
                <span style="color:var(--text-secondary);font-size:13px;line-height:1.6">${note}</span>
            </div>`;
        });
        html += `    </div>
        </div>`;
    }

    // Warnings
    if(r.warnings.length > 0) {
        r.warnings.forEach(w => {
            html += `<div class="warning-box"><span class="warning-box-icon">⚠</span><span class="warning-box-text">${w}</span></div>`;
        });
    }

    html += `<div style="margin-top:20px;display:flex;gap:8px">
        <button class="btn" id="advisorReset">← Start Over</button>
        <button class="btn btn-primary" id="advisorExport">Export Recommendation</button>
    </div>`;
    return html;
}

// ============================================================
// EVENT HANDLERS
// ============================================================

function attachAdvisorEvents() {
    // Step 1 selection
    document.querySelectorAll('#section-advisor .selection-card[data-type]').forEach(card => {
        card.addEventListener('click', () => {
            advisorState.workloadType = card.dataset.type;
            renderGPUAdvisor();
        });
    });

    // Step 1 next
    const next1 = document.getElementById('advisorNext1');
    if(next1) next1.addEventListener('click', () => { advisorState.step = 2; renderGPUAdvisor(); });

    // Step 2 events
    const paramSlider = document.getElementById('paramSlider');
    if(paramSlider) {
        paramSlider.addEventListener('input', (e) => {
            const v = parseInt(e.target.value);
            advisorState.modelConfig.params = v;
            document.getElementById('paramValue').textContent = v >= 1000 ? (v/1000).toFixed(1)+'T' : v+'B';
        });
    }
    document.querySelectorAll('#section-advisor .preset-btn[data-param]').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = parseInt(btn.dataset.param);
            advisorState.modelConfig.params = v;
            if(paramSlider) paramSlider.value = v;
            renderGPUAdvisor();
        });
    });
    const archDense = document.getElementById('archDense');
    const archMoE = document.getElementById('archMoE');
    if(archDense) archDense.addEventListener('click', () => { advisorState.modelConfig.architecture = 'dense'; renderGPUAdvisor(); });
    if(archMoE) archMoE.addEventListener('click', () => { advisorState.modelConfig.architecture = 'moe'; renderGPUAdvisor(); });
    const precSel = document.getElementById('precisionSelect');
    if(precSel) precSel.addEventListener('change', (e) => { advisorState.modelConfig.precision = e.target.value; });
    const ctxSel = document.getElementById('ctxSelect');
    if(ctxSel) ctxSel.addEventListener('change', (e) => { advisorState.modelConfig.contextLength = e.target.value; });
    const ftMethod = document.getElementById('ftMethod');
    if(ftMethod) ftMethod.addEventListener('change', (e) => { advisorState.modelConfig.ftMethod = e.target.value; });
    const batchInput = document.getElementById('batchSize');
    if(batchInput) batchInput.addEventListener('change', (e) => { advisorState.modelConfig.batchSize = parseInt(e.target.value)||32; });
    const activeP = document.getElementById('activeParams');
    if(activeP) activeP.addEventListener('change', (e) => { advisorState.modelConfig.activeParams = parseInt(e.target.value)||37; });

    const back2 = document.getElementById('advisorBack2');
    if(back2) back2.addEventListener('click', () => { advisorState.step = 1; renderGPUAdvisor(); });
    const next2 = document.getElementById('advisorNext2');
    if(next2) next2.addEventListener('click', () => {
        if(!advisorState.modelConfig.precision) advisorState.modelConfig.precision = 'BF16';
        if(!advisorState.modelConfig.contextLength) advisorState.modelConfig.contextLength = '8K';
        if(!advisorState.modelConfig.params) advisorState.modelConfig.params = 70;
        advisorState.step = 3;
        renderGPUAdvisor();
    });

    // Step 3 events
    document.querySelectorAll('#section-advisor .selection-card[data-priority]').forEach(card => {
        card.addEventListener('click', () => {
            advisorState.requirements.priority = card.dataset.priority;
            document.querySelectorAll('#section-advisor .selection-card[data-priority]').forEach(c=>c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });

    const back3 = document.getElementById('advisorBack3');
    if(back3) back3.addEventListener('click', () => { advisorState.step = 2; renderGPUAdvisor(); });
    const compute = document.getElementById('advisorCompute');
    if(compute) compute.addEventListener('click', () => {
        // Gather step 3 inputs
        const r = advisorState.requirements;
        if(advisorState.workloadType === 'inference') {
            r.ttft = parseInt(document.getElementById('ttft')?.value)||500;
            r.tps = parseInt(document.getElementById('tps')?.value)||50;
            r.concUsers = parseInt(document.getElementById('concUsers')?.value)||100;
            r.rps = parseInt(document.getElementById('rps')?.value)||10;
        } else {
            r.targetTime = document.getElementById('targetTime')?.value||'1 week';
            r.datasetSize = document.getElementById('datasetSize')?.value||'100B';
            r.budget = parseInt(document.getElementById('budgetConstraint')?.value)||100000;
        }
        if(!r.priority) r.priority = 'balance';
        computeAdvisorRecommendation();
        advisorState.step = 4;
        renderGPUAdvisor();
    });

    // Step 4 events
    const reset = document.getElementById('advisorReset');
    if(reset) reset.addEventListener('click', () => {
        advisorState = { step:1, workloadType:null, modelConfig:{}, requirements:{}, results:null };
        renderGPUAdvisor();
    });
    const exp = document.getElementById('advisorExport');
    if(exp) exp.addEventListener('click', () => {
        const r = advisorState.results;
        if(!r) return;
        const p = r.primary;
        let text = `GPU ADVISOR RECOMMENDATION\n${'='.repeat(40)}\n`;
        text += `Workload: ${advisorState.workloadType}\n`;
        text += `Model: ${advisorState.modelConfig.params||70}B params, ${advisorState.modelConfig.precision||'BF16'}\n`;
        text += `\nPRIMARY: ${p.count}x ${p.gpu}\n`;
        text += `Parallelism: TP=${p.tp} PP=${p.pp} DP=${p.dp}\n`;
        text += `Cost/hr: ${fmtPrecise(p.costPerHr)}\n`;
        text += `Total: ${fmtCurrency(p.totalCost)}\n`;
        if(r.frameworkRecs && r.frameworkRecs.length > 0) {
            text += `\nRECOMMENDED FRAMEWORKS\n`;
            r.frameworkRecs.forEach(f => { text += `  • ${f.name}: ${f.desc}\n`; });
        }
        if(r.researchNotes && r.researchNotes.length > 0) {
            text += `\nRESEARCH INSIGHTS\n`;
            r.researchNotes.forEach(n => { text += `  • ${n}\n`; });
        }
        navigator.clipboard.writeText(text).then(()=>{ exp.textContent = '✓ Copied!'; setTimeout(()=>exp.textContent='Export Recommendation',2000); });
    });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function parseContextLength(s) {
    if(s.endsWith('M')) return parseFloat(s)*1e6;
    if(s.endsWith('K')) return parseFloat(s)*1e3;
    return parseInt(s);
}

function parseTargetTime(s) {
    if(s.includes('day')) return parseInt(s)||1;
    if(s.includes('week')) return (parseInt(s)||1)*7;
    if(s.includes('month')) return (parseInt(s)||1)*30;
    return 7;
}

function formatDays(d) {
    if(d < 1) return Math.round(d*24)+'h';
    if(d < 7) return d+'d';
    if(d < 30) return (d/7).toFixed(1)+'w';
    return (d/30).toFixed(1)+'mo';
}
