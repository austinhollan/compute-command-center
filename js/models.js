// ============================================================
// PERPLEXITY COMPUTE COMMAND CENTER — models.js
// Model Management & Registry
// ============================================================
// Uses API object from api.js for all data access.
// Uses el(), fmt(), fmtCurrency(), pct() from data.js.
// Entry point: renderModelManagement() — called by nav.js.
// ============================================================

'use strict';

// ============================================================
// ENTRY POINT
// ============================================================

function renderModelManagement() {
    const section = document.getElementById('section-models');
    section.innerHTML = '';

    // Show loading spinner
    section.innerHTML = '<div style="color:var(--text-muted);padding:40px 0;text-align:center;letter-spacing:0.08em;font-size:12px;">LOADING MODEL REGISTRY...</div>';

    Promise.all([
        API.models.list(),
        API.deployments.list(),
    ]).then(([models, deployments]) => {
        section.innerHTML = '';

        // 1. Summary cards
        section.appendChild(_buildModelSummaryCards(models));

        // 2. Model Registry Table
        section.appendChild(_buildModelRegistryPanel(models, deployments));

        // 3. Register New Model Form
        section.appendChild(_buildRegisterModelForm());

        // 4. Model Health Dashboard
        section.appendChild(_buildModelHealthDashboard(models, deployments));

        // 5. Version History Panel
        section.appendChild(_buildVersionHistoryPanel(models));

    }).catch(err => {
        section.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading model data: ${err.message}</div>`;
    });
}

// ============================================================
// SUMMARY CARDS
// ============================================================

function _buildModelSummaryCards(models) {
    const total      = models.length;
    const deployed   = models.filter(m => m.status === 'deployed');
    const training   = models.filter(m => m.status === 'training');
    const registered = models.filter(m => m.status === 'registered');

    const wrap = el('div', 'summary-cards mb-6');
    wrap.style.gridTemplateColumns = 'repeat(4,1fr)';

    // Total Models
    const cardTotal = el('div', 'summary-card');
    cardTotal.innerHTML = `
        <div class="card-label">Total Models</div>
        <div class="card-value">${total}</div>
        <div class="card-sub">In registry</div>
    `;
    wrap.appendChild(cardTotal);

    // Deployed
    const cardDeployed = el('div', 'summary-card accent');
    cardDeployed.innerHTML = `
        <div class="card-label">Deployed</div>
        <div class="card-value" style="display:flex;align-items:center;gap:8px">
            ${deployed.length}
            <span class="badge badge-success" style="font-size:10px;padding:2px 6px">LIVE</span>
        </div>
        <div class="card-sub">Active inference endpoints</div>
    `;
    wrap.appendChild(cardDeployed);

    // In Training
    const cardTraining = el('div', 'summary-card info');
    cardTraining.innerHTML = `
        <div class="card-label">In Training</div>
        <div class="card-value" style="display:flex;align-items:center;gap:8px">
            ${training.length}
            <span class="badge badge-info" style="font-size:10px;padding:2px 6px">TRAINING</span>
        </div>
        <div class="card-sub">Active training jobs</div>
    `;
    wrap.appendChild(cardTraining);

    // Registered / Pending
    const cardReg = el('div', 'summary-card');
    cardReg.innerHTML = `
        <div class="card-label">Registered / Pending</div>
        <div class="card-value" style="display:flex;align-items:center;gap:8px">
            ${registered.length}
            <span class="badge" style="font-size:10px;padding:2px 6px;background:rgba(150,150,180,0.15);color:var(--text-secondary);border:1px solid var(--border-primary)">READY</span>
        </div>
        <div class="card-sub">Ready to deploy</div>
    `;
    wrap.appendChild(cardReg);

    return wrap;
}

// ============================================================
// MODEL REGISTRY TABLE
// ============================================================

function _buildModelRegistryPanel(models, deployments) {
    const panel = el('div', 'panel mb-6');

    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">\u25c8 Model Registry</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body no-padding');

    // Group models by base name (e.g., "pplx-sonar-large" groups v2.4 and v2.5-beta)
    const groups = {};
    models.forEach(m => {
        if (!groups[m.name]) groups[m.name] = [];
        groups[m.name].push(m);
    });

    const table = el('table', 'data-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Status</th>
                <th>Model Name</th>
                <th>Version</th>
                <th>Framework</th>
                <th>Params</th>
                <th>GPU Requirements</th>
                <th>Replicas</th>
                <th>Endpoint</th>
                <th>Actions</th>
            </tr>
        </thead>
    `;

    const tbody = el('tbody', '');

    Object.entries(groups).forEach(([baseName, versions]) => {
        // Sort: deployed first, then training, then registered; within same status by version
        versions.sort((a, b) => {
            const order = { deployed: 0, training: 1, registered: 2 };
            return (order[a.status] || 9) - (order[b.status] || 9);
        });

        versions.forEach((m, idx) => {
            const isSecondary = idx > 0;

            // Find linked deployment for metrics
            const dep = deployments.find(d =>
                d.model_name === m.name && d.model_version === m.version
            );

            // Find training job
            let trainingJobLink = '';
            if (m.status === 'training') {
                trainingJobLink = `<a href="#" onclick="navigateTo('scheduler');return false;" style="color:var(--info);font-size:11px;text-decoration:none">\u2192 View Job</a>`;
            }

            const statusBadge = _modelStatusBadge(m.status);

            const endpointCell = m.endpoint_url
                ? `<a href="${m.endpoint_url}" target="_blank" style="color:var(--accent);font-family:var(--font-mono);font-size:11px;text-decoration:none;word-break:break-all" title="${m.endpoint_url}">${m.endpoint_url.replace('https://','').replace('.inference.perplexity.internal','')}</a>`
                : (m.status === 'training'
                    ? `<span style="color:var(--text-muted);font-size:11px">\u21b3 ${trainingJobLink}</span>`
                    : '<span style="color:var(--text-muted);font-size:11px">\u2014</span>');

            const gpuReq = m.gpu_requirements
                ? `${m.gpu_requirements.min_count}\u00d7 ${m.gpu_requirements.min_gpu_type}`
                : '\u2014';

            const actionsCell = _modelActionsCell(m, dep);

            const replicasCell = m.status === 'deployed' && dep
                ? `<span class="text-mono" style="color:var(--accent)">${dep.replicas}</span><span class="text-muted"> / ${dep.max_replicas}</span>`
                : `<span class="text-mono text-muted">${m.current_replicas}</span>`;

            const row = el('tr', isSecondary ? 'model-version-secondary' : '');
            row.style.cssText = isSecondary
                ? 'border-left:3px solid var(--border-primary);background:rgba(255,255,255,0.015);'
                : '';

            row.innerHTML = `
                <td>${statusBadge}</td>
                <td style="font-family:var(--font-ui);font-weight:600;${isSecondary ? 'padding-left:24px;color:var(--text-secondary)' : ''}">
                    ${isSecondary ? '<span style="color:var(--border-primary);margin-right:6px">\u2514</span>' : ''}${m.name}
                </td>
                <td><span class="text-mono" style="color:var(--text-secondary)">${m.version}</span></td>
                <td><span class="text-mono" style="font-size:11px;color:var(--info)">${m.framework}</span></td>
                <td><span class="text-mono" style="font-weight:600">${m.params || '\u2014'}</span></td>
                <td style="font-size:12px">${gpuReq}</td>
                <td>${replicasCell}</td>
                <td>${endpointCell}</td>
                <td>${actionsCell}</td>
            `;

            tbody.appendChild(row);
        });
    });

    table.appendChild(tbody);
    body.appendChild(table);
    panel.appendChild(body);

    // Wire up action buttons after DOM insertion
    setTimeout(() => _wireModelTableButtons(), 0);

    return panel;
}

function _modelStatusBadge(status) {
    switch (status) {
        case 'deployed':
            return '<span class="badge badge-success" style="font-size:11px;padding:3px 8px;letter-spacing:0.05em">LIVE</span>';
        case 'training':
            return '<span class="badge badge-info" style="font-size:11px;padding:3px 8px;letter-spacing:0.05em">TRAINING</span>';
        case 'registered':
            return '<span class="badge" style="font-size:11px;padding:3px 8px;letter-spacing:0.05em;background:rgba(150,150,180,0.12);color:var(--text-secondary);border:1px solid var(--border-primary)">READY</span>';
        case 'pending_approval':
            return '<span class="badge badge-warning" style="font-size:11px;padding:3px 8px;letter-spacing:0.05em">PENDING</span>';
        default:
            return `<span class="badge" style="font-size:11px;padding:3px 8px">${status.toUpperCase()}</span>`;
    }
}

function _modelActionsCell(model, dep) {
    const btns = [];

    if (model.status === 'deployed' && dep) {
        btns.push(`<button class="btn" style="font-size:11px;padding:3px 10px;background:rgba(0,212,170,0.1);border:1px solid var(--accent-dim);color:var(--accent)" data-action="scale" data-model-id="${model.id}" data-dep-id="${dep.id}" data-replicas="${dep.replicas}" data-max-replicas="${dep.max_replicas}">Scale</button>`);
        btns.push(`<button class="btn" style="font-size:11px;padding:3px 10px" data-action="view-metrics" data-model-id="${model.id}">View Metrics</button>`);
        btns.push(`<button class="btn" style="font-size:11px;padding:3px 10px" data-action="update-version" data-model-id="${model.id}" data-model-name="${model.name}">Update Version</button>`);
    } else if (model.status === 'registered') {
        btns.push(`<button class="btn" style="font-size:11px;padding:3px 14px;background:rgba(68,136,255,0.1);border:1px solid var(--info);color:var(--info)" data-action="deploy" data-model-id="${model.id}" data-model-name="${model.name}">Deploy</button>`);
    } else if (model.status === 'training') {
        btns.push(`<button class="btn" style="font-size:11px;padding:3px 10px;opacity:0.5;cursor:default">Training...</button>`);
    }

    return `<div style="display:flex;gap:4px;flex-wrap:wrap">${btns.join('')}</div>`;
}

function _wireModelTableButtons() {
    // Scale buttons
    document.querySelectorAll('[data-action="scale"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const depId = btn.dataset.depId;
            const current = parseInt(btn.dataset.replicas);
            const max = parseInt(btn.dataset.maxReplicas);
            _showScaleModal(depId, current, max, btn);
        });
    });

    // View Metrics buttons
    document.querySelectorAll('[data-action="view-metrics"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modelId = btn.dataset.modelId;
            const healthEl = document.getElementById('model-health-dashboard');
            if (healthEl) {
                healthEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                healthEl.style.outline = '2px solid var(--accent)';
                setTimeout(() => { healthEl.style.outline = ''; }, 1500);
            }
        });
    });

    // Update Version buttons
    document.querySelectorAll('[data-action="update-version"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modelName = btn.dataset.modelName;
            _showUpdateVersionNotice(modelName, btn);
        });
    });

    // Deploy buttons
    document.querySelectorAll('[data-action="deploy"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modelId = btn.dataset.modelId;
            const modelName = btn.dataset.modelName;
            _deployModel(modelId, modelName, btn);
        });
    });
}

function _showScaleModal(depId, current, max, triggerBtn) {
    // Build inline scale UI near the button
    const parent = triggerBtn.closest('td');
    const existingModal = parent.querySelector('.inline-scale-ui');
    if (existingModal) { existingModal.remove(); return; }

    const ui = el('div', 'inline-scale-ui');
    ui.style.cssText = 'margin-top:6px;padding:8px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap';
    ui.innerHTML = `
        <span style="font-size:11px;color:var(--text-secondary)">Replicas:</span>
        <input type="number" value="${current}" min="0" max="${max}" style="width:56px;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-primary);border-radius:3px;color:var(--text-primary);font-family:var(--font-mono);font-size:12px">
        <button class="btn" style="font-size:11px;padding:3px 10px;background:rgba(0,212,170,0.15);border:1px solid var(--accent);color:var(--accent)">Apply</button>
        <button class="btn" style="font-size:11px;padding:3px 8px;color:var(--text-muted)">&times;</button>
        <span style="font-size:10px;color:var(--text-muted)">max: ${max}</span>
    `;
    parent.appendChild(ui);

    const input = ui.querySelector('input');
    const applyBtn = ui.querySelector('.btn:nth-child(3)');
    const cancelBtn = ui.querySelector('.btn:nth-child(4)');

    cancelBtn.addEventListener('click', () => ui.remove());
    applyBtn.addEventListener('click', () => {
        const newReplicas = parseInt(input.value);
        if (isNaN(newReplicas) || newReplicas < 0 || newReplicas > max) {
            input.style.border = '1px solid var(--danger)';
            return;
        }
        applyBtn.textContent = '...';
        applyBtn.disabled = true;
        API.deployments.scale(depId, newReplicas).then(() => {
            ui.remove();
            triggerBtn.dataset.replicas = newReplicas;
            // Refresh the view
            renderModelManagement();
        }).catch(err => {
            applyBtn.textContent = 'Error';
            applyBtn.style.color = 'var(--danger)';
            console.error(err);
        });
    });
}

function _showUpdateVersionNotice(modelName, triggerBtn) {
    const parent = triggerBtn.closest('td');
    const existing = parent.querySelector('.inline-version-notice');
    if (existing) { existing.remove(); return; }

    const notice = el('div', 'inline-version-notice');
    notice.style.cssText = 'margin-top:6px;padding:8px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:4px;font-size:11px;color:var(--text-secondary);max-width:240px';
    notice.innerHTML = `
        <div style="margin-bottom:4px;color:var(--text-primary)">Update ${modelName}</div>
        <div style="color:var(--text-muted)">Register a new version via the form below, then deploy it from the registry.</div>
        <button class="btn" style="margin-top:6px;font-size:10px;padding:2px 8px;color:var(--text-muted)">Dismiss &times;</button>
    `;
    parent.appendChild(notice);
    notice.querySelector('button').addEventListener('click', () => notice.remove());
}

function _deployModel(modelId, modelName, btn) {
    const confirmed = window.confirm(`Deploy ${modelName}?\n\nThis will create a deployment request that requires admin approval.`);
    if (!confirmed) return;

    btn.textContent = 'Submitting...';
    btn.disabled = true;

    API.models.deploy(modelId, {
        gpu_type: 'H200 SXM',
        gpu_count: 8,
        min_replicas: 1,
        max_replicas: 4,
        namespace: 'inference-prod',
    }).then(() => {
        btn.textContent = '\u2713 Submitted';
        btn.style.color = 'var(--accent)';
        btn.style.borderColor = 'var(--accent)';
        setTimeout(() => renderModelManagement(), 1500);
    }).catch(err => {
        btn.textContent = 'Error';
        btn.style.color = 'var(--danger)';
        btn.disabled = false;
        console.error(err);
    });
}

// ============================================================
// REGISTER NEW MODEL FORM
// ============================================================

function _buildRegisterModelForm() {
    const panel = el('div', 'panel mb-6');

    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">\u2295 Register New Model</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    // Get NVIDIA GPU types from GPU_SPECS
    const nvidiaGPUs = Object.entries(GPU_SPECS)
        .filter(([, spec]) => spec.vendor === 'NVIDIA')
        .map(([name]) => name);

    const gpuOptions = nvidiaGPUs
        .map(g => `<option value="${g}">${g} (${GPU_SPECS[g].vram}GB VRAM)</option>`)
        .join('');

    body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
            <div class="form-group">
                <label class="form-label">Model Name</label>
                <input type="text" class="form-input" id="reg-name" placeholder="e.g. pplx-sonar-v3">
            </div>
            <div class="form-group">
                <label class="form-label">Version</label>
                <input type="text" class="form-input" id="reg-version" placeholder="e.g. v1.0">
            </div>
            <div class="form-group">
                <label class="form-label">Framework</label>
                <select class="form-select" id="reg-framework">
                    <option value="vLLM">vLLM</option>
                    <option value="TGI">TGI</option>
                    <option value="Triton">Triton</option>
                    <option value="ONNX Runtime">ONNX Runtime</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Parameters</label>
                <input type="text" class="form-input" id="reg-params" placeholder="e.g. 70B">
            </div>
            <div class="form-group">
                <label class="form-label">Minimum GPU Type (NVIDIA)</label>
                <select class="form-select" id="reg-gpu-type" onchange="document.getElementById('reg-vram').value = (GPU_SPECS[this.value] ? GPU_SPECS[this.value].vram + ' GB' : '')">
                    ${gpuOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Minimum VRAM (auto-filled)</label>
                <input type="text" class="form-input" id="reg-vram" readonly placeholder="Auto-filled" style="color:var(--text-secondary);background:var(--bg-secondary)">
            </div>
            <div class="form-group">
                <label class="form-label">Minimum GPU Count</label>
                <input type="number" class="form-input" id="reg-gpu-count" value="1" min="1" max="512">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end">
                <button class="btn btn-primary" id="reg-submit-btn" style="width:100%;height:38px">Register Model</button>
            </div>
        </div>
        <div id="reg-feedback" style="display:none;padding:8px 12px;border-radius:4px;font-size:12px;margin-top:4px"></div>
    `;
    panel.appendChild(body);

    // Auto-fill VRAM from first NVIDIA GPU default
    setTimeout(() => {
        const gpuSelect = document.getElementById('reg-gpu-type');
        const vramInput = document.getElementById('reg-vram');
        if (gpuSelect && vramInput) {
            const spec = GPU_SPECS[gpuSelect.value];
            if (spec) vramInput.value = spec.vram + ' GB';

            gpuSelect.addEventListener('change', () => {
                const s = GPU_SPECS[gpuSelect.value];
                vramInput.value = s ? s.vram + ' GB' : '';
            });
        }

        const submitBtn = document.getElementById('reg-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', _handleRegisterModel);
        }
    }, 0);

    return panel;
}

function _handleRegisterModel() {
    const name       = document.getElementById('reg-name').value.trim();
    const version    = document.getElementById('reg-version').value.trim();
    const framework  = document.getElementById('reg-framework').value;
    const params     = document.getElementById('reg-params').value.trim();
    const gpuType    = document.getElementById('reg-gpu-type').value;
    const gpuCount   = parseInt(document.getElementById('reg-gpu-count').value) || 1;
    const vramInput  = document.getElementById('reg-vram').value;
    const vram       = parseInt(vramInput) || (GPU_SPECS[gpuType] ? GPU_SPECS[gpuType].vram : 80);

    const feedback = document.getElementById('reg-feedback');
    const btn      = document.getElementById('reg-submit-btn');

    if (!name || !version) {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--danger-dim)';
        feedback.style.color = 'var(--danger)';
        feedback.style.border = '1px solid var(--danger)';
        feedback.textContent = 'Model Name and Version are required.';
        return;
    }

    btn.textContent = 'Registering...';
    btn.disabled = true;

    API.models.register({
        name,
        version,
        framework,
        params,
        gpu_requirements: {
            min_gpu_type: gpuType,
            min_vram: vram,
            min_count: gpuCount,
        },
    }).then(newModel => {
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(0,212,170,0.1)';
        feedback.style.color = 'var(--accent)';
        feedback.style.border = '1px solid var(--accent-dim)';
        feedback.textContent = `\u2713 Model "${newModel.name} ${newModel.version}" registered successfully (ID: ${newModel.id})`;
        btn.textContent = 'Register Model';
        btn.disabled = false;

        // Clear fields
        ['reg-name', 'reg-version', 'reg-params'].forEach(id => {
            const el2 = document.getElementById(id);
            if (el2) el2.value = '';
        });

        // Refresh the model registry table
        setTimeout(() => renderModelManagement(), 800);
    }).catch(err => {
        feedback.style.display = 'block';
        feedback.style.background = 'var(--danger-dim)';
        feedback.style.color = 'var(--danger)';
        feedback.style.border = '1px solid var(--danger)';
        feedback.textContent = `Error: ${err.message}`;
        btn.textContent = 'Register Model';
        btn.disabled = false;
    });
}

// ============================================================
// MODEL HEALTH DASHBOARD
// ============================================================

function _buildModelHealthDashboard(models, deployments) {
    const panel = el('div', 'panel mb-6');
    panel.id = 'model-health-dashboard';

    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">\u25c9 Model Health Dashboard</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const deployedModels = models.filter(m => m.status === 'deployed');

    if (deployedModels.length === 0) {
        body.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:24px">No deployed models</div>';
        panel.appendChild(body);
        return panel;
    }

    const grid = el('div', '');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px';

    deployedModels.forEach(model => {
        const dep = deployments.find(d =>
            d.model_name === model.name && d.model_version === model.version
        );

        const qps           = dep ? dep.qps            : 0;
        const p50           = dep ? dep.p50_latency    : 0;
        const p99           = dep ? dep.p99_latency    : 0;
        const dailyTokens   = dep ? dep.daily_tokens   : 0;
        const replicas      = dep ? dep.replicas       : model.current_replicas;
        const maxReplicas   = dep ? dep.max_replicas   : 4;

        // Traffic indicator: green <100ms p99, yellow <300ms, red >=300ms
        const trafficColor = p99 === 0 ? 'var(--text-muted)'
                           : p99 < 100  ? 'var(--accent)'
                           : p99 < 300  ? 'var(--warning)'
                           : 'var(--danger)';

        const trafficLabel = p99 === 0 ? 'NO TRAFFIC'
                           : p99 < 100  ? 'HEALTHY'
                           : p99 < 300  ? 'DEGRADED'
                           : 'CRITICAL';

        const replicaPct = maxReplicas > 0 ? (replicas / maxReplicas) * 100 : 0;

        const card = el('div', 'panel');
        card.style.cssText = 'margin:0;border:1px solid var(--border-primary);background:var(--bg-card)';

        card.innerHTML = `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border-secondary)">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <div style="font-weight:600;font-size:13px">${model.name}</div>
                        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${model.version} &middot; ${model.framework}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px">
                        <div style="display:flex;gap:3px;align-items:center">
                            <div style="width:8px;height:8px;border-radius:50%;background:${trafficColor}${p99 < 100 && p99 > 0 ? ';animation:pulse 2s infinite' : ''}"></div>
                            <div style="width:8px;height:8px;border-radius:50%;background:${p99 > 0 ? trafficColor : 'var(--text-muted)'};opacity:0.6"></div>
                            <div style="width:8px;height:8px;border-radius:50%;background:${p99 > 0 ? trafficColor : 'var(--text-muted)'};opacity:0.3"></div>
                        </div>
                        <span style="font-size:10px;color:${trafficColor};letter-spacing:0.05em">${trafficLabel}</span>
                    </div>
                </div>
            </div>
            <div style="padding:12px 16px">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px">
                    <div>
                        <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:2px">QPS</div>
                        <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;color:var(--text-primary)">${fmt(qps)}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:2px">DAILY TOKENS</div>
                        <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;color:var(--text-primary)">${(dailyTokens/1e9).toFixed(1)}B</div>
                    </div>
                    <div>
                        <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:2px">P50 LATENCY</div>
                        <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;color:var(--accent)">${p50}ms</div>
                    </div>
                    <div>
                        <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:2px">P99 LATENCY</div>
                        <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;color:${trafficColor}">${p99}ms</div>
                    </div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span style="font-size:11px;color:var(--text-secondary)">Replicas</span>
                        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${replicas} / ${maxReplicas}</span>
                    </div>
                    <div style="height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden">
                        <div style="height:100%;width:${replicaPct}%;background:var(--accent);border-radius:2px;transition:width 0.3s ease"></div>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    body.appendChild(grid);
    panel.appendChild(body);
    return panel;
}

// ============================================================
// VERSION HISTORY PANEL
// ============================================================

function _buildVersionHistoryPanel(models) {
    const panel = el('div', 'panel mb-6');

    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">\u229e Version History</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body no-padding');

    // Group models by base name
    const groups = {};
    models.forEach(m => {
        if (!groups[m.name]) groups[m.name] = [];
        groups[m.name].push(m);
    });

    // Only show groups that have multiple versions OR are interesting
    const table = el('table', 'data-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Model</th>
                <th>All Versions</th>
                <th>Current Live</th>
                <th>Previous / Beta</th>
                <th>Status</th>
                <th>Registered</th>
            </tr>
        </thead>
    `;

    const tbody = el('tbody', '');

    Object.entries(groups).forEach(([baseName, versions]) => {
        const liveVersion = versions.find(v => v.status === 'deployed');
        const otherVersions = versions.filter(v => v !== liveVersion);

        const allVersionsBadges = versions
            .map(v => {
                const color = v.status === 'deployed' ? 'var(--accent)'
                            : v.status === 'training'  ? 'var(--info)'
                            : 'var(--text-secondary)';
                return `<span style="font-family:var(--font-mono);font-size:11px;color:${color};margin-right:8px">${v.version}</span>`;
            })
            .join('');

        const liveCell = liveVersion
            ? `<span style="font-family:var(--font-mono);font-size:12px;color:var(--accent);font-weight:600">${liveVersion.version}</span>`
            : '<span style="color:var(--text-muted)">&mdash;</span>';

        const prevCell = otherVersions.length > 0
            ? otherVersions.map(v => {
                const label = v.status === 'training' ? ` <span style="color:var(--info);font-size:10px">[training]</span>`
                            : v.status === 'registered' ? ` <span style="color:var(--text-muted);font-size:10px">[ready]</span>`
                            : '';
                return `<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${v.version}${label}</span>`;
            }).join('&nbsp;&nbsp;')
            : '<span style="color:var(--text-muted);font-size:11px">&mdash;</span>';

        const overallStatus = liveVersion ? _modelStatusBadge('deployed')
            : versions.some(v => v.status === 'training') ? _modelStatusBadge('training')
            : _modelStatusBadge('registered');

        const newestCreated = versions.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
        const createdStr = new Date(newestCreated.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const row = el('tr', '');
        row.innerHTML = `
            <td style="font-weight:600">${baseName}</td>
            <td>${allVersionsBadges}</td>
            <td>${liveCell}</td>
            <td>${prevCell}</td>
            <td>${overallStatus}</td>
            <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${createdStr}</td>
        `;
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    body.appendChild(table);
    panel.appendChild(body);
    return panel;
}
