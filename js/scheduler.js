// ============================================================
// PERPLEXITY COMPUTE COMMAND CENTER — scheduler.js
// Split Scheduler: Training Jobs + Inference Deployments
// ============================================================
// Uses API object from api.js for all data access.
// Uses el(), fmt(), fmtCurrency(), fmtPrecise(), pct() from data.js.
// Entry point: renderJobScheduler() — called by nav.js.
// ============================================================

'use strict';

// ---- Module State ----
let _schedulerTab = 'training'; // 'training' | 'inference'

// ============================================================
// ENTRY POINT
// ============================================================

function renderJobScheduler() {
    const section = document.getElementById('section-scheduler');
    section.innerHTML = '';

    // Tab bar
    const tabBar = _buildTabBar();
    section.appendChild(tabBar);

    // Tab content container
    const contentWrap = el('div', 'scheduler-tab-content');
    contentWrap.id = 'scheduler-content';
    section.appendChild(contentWrap);

    // Render active tab
    _renderActiveTab();
}

// ============================================================
// TAB BAR
// ============================================================

function _buildTabBar() {
    const wrap = el('div', 'tabs mb-6');
    wrap.style.cssText = 'border-bottom:1px solid var(--border-primary);padding-bottom:0;margin-bottom:20px;';

    const trainingTab = el('button', 'tab' + (_schedulerTab === 'training' ? ' active' : ''), '⚙ Training Jobs');
    trainingTab.style.cssText = 'cursor:pointer;background:none;border:none;font-family:var(--font-ui);font-size:13px;letter-spacing:0.04em;padding:10px 20px 12px;';
    trainingTab.addEventListener('click', () => {
        _schedulerTab = 'training';
        _refreshTabBar();
        _renderActiveTab();
    });

    const inferenceTab = el('button', 'tab' + (_schedulerTab === 'inference' ? ' active' : ''), '⚡ Inference Deployments');
    inferenceTab.style.cssText = 'cursor:pointer;background:none;border:none;font-family:var(--font-ui);font-size:13px;letter-spacing:0.04em;padding:10px 20px 12px;';
    inferenceTab.addEventListener('click', () => {
        _schedulerTab = 'inference';
        _refreshTabBar();
        _renderActiveTab();
    });

    wrap.appendChild(trainingTab);
    wrap.appendChild(inferenceTab);
    return wrap;
}

function _refreshTabBar() {
    const tabs = document.querySelectorAll('#section-scheduler .tab');
    tabs.forEach((t, i) => {
        const isActive = (i === 0 && _schedulerTab === 'training') || (i === 1 && _schedulerTab === 'inference');
        t.classList.toggle('active', isActive);
    });
}

function _renderActiveTab() {
    const wrap = document.getElementById('scheduler-content');
    if (!wrap) return;
    wrap.innerHTML = '';
    const spinner = el('div', '', '<div style="color:var(--text-muted);padding:40px 0;text-align:center;letter-spacing:0.08em;font-size:12px;">LOADING...</div>');
    wrap.appendChild(spinner);

    if (_schedulerTab === 'training') {
        _renderTrainingTab(wrap);
    } else {
        _renderInferenceTab(wrap);
    }
}

// ============================================================
// TRAINING TAB
// ============================================================

function _renderTrainingTab(container) {
    Promise.all([
        API.jobs.list(),
        API.models.list(),
    ]).then(([jobs, models]) => {
        container.innerHTML = '';

        // --- Summary Cards ---
        container.appendChild(_buildTrainingSummaryCards(jobs));

        // --- Submit Form ---
        container.appendChild(_buildJobSubmitForm(models));

        // --- Active Jobs Table ---
        container.appendChild(_buildJobsTable(jobs));

        // --- Gantt Timeline ---
        container.appendChild(_buildGanttTimeline(jobs));

        // --- Scheduling Suggestions ---
        container.appendChild(_buildSchedulingSuggestions());

    }).catch(err => {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading training data: ${err.message}</div>`;
    });
}

// --- Training Summary Cards ---
function _buildTrainingSummaryCards(jobs) {
    const running   = jobs.filter(j => j.status === 'running');
    const queued    = jobs.filter(j => j.status === 'queued');
    const pending   = jobs.filter(j => j.status === 'pending_approval');
    const completed = jobs.filter(j => j.status === 'completed');

    const runningGPUs = running.reduce((s, j) => s + (j.gpu_count || 0), 0);
    // GPU Hours this month: estimate from cost data at avg ~$2.50/GPU/hr
    const gpuHrsThisMonth = Math.round(
        jobs.filter(j => j.status === 'running' || j.status === 'completed')
            .reduce((s, j) => s + ((j.cost_accrued || 0) / 2.50), 0)
    );

    const wrap = el('div', 'summary-cards mb-6');
    wrap.style.gridTemplateColumns = 'repeat(4,1fr)';

    wrap.appendChild(_summaryCard(
        'Running Jobs',
        running.length,
        `${fmt(runningGPUs)} GPUs active`,
        '',
        'accent'
    ));
    wrap.appendChild(_summaryCard(
        'Queued Jobs',
        queued.length,
        queued.length === 1 ? '1 job waiting' : `${queued.length} jobs waiting`,
        '',
        'info'
    ));
    wrap.appendChild(_summaryCard(
        'Pending Approval',
        pending.length,
        'Awaiting admin review',
        '',
        'warning'
    ));
    wrap.appendChild(_summaryCard(
        'GPU Hours This Month',
        fmt(gpuHrsThisMonth),
        `${completed.length} jobs completed`,
        '',
        'purple'
    ));

    return wrap;
}

function _summaryCard(label, value, sub, extra, colorClass) {
    const card = el('div', 'summary-card' + (colorClass ? ' ' + colorClass : ''));
    card.innerHTML = `
        <div class="card-label">${label}</div>
        <div class="card-value">${value}</div>
        <div class="card-sub">${sub}</div>
        ${extra ? `<div style="margin-top:4px;font-size:11px;color:var(--text-muted)">${extra}</div>` : ''}
    `;
    return card;
}

// --- Job Submit Form ---
function _buildJobSubmitForm(models) {
    const panel = el('div', 'panel mb-6');

    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">Submit Training Job</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const modelOptions = models
        .map(m => `<option value="${m.id}">${m.name} (${m.params || '?'})</option>`)
        .join('');

    body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
            <div class="form-group">
                <label class="form-label">Job Name</label>
                <input type="text" class="form-input" id="tj-name" placeholder="e.g. Sonar v3 SFT">
            </div>
            <div class="form-group">
                <label class="form-label">Model</label>
                <select class="form-select" id="tj-model">
                    ${modelOptions}
                    <option value="__custom__">Custom / Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">GPU Type</label>
                <select class="form-select" id="tj-gpu-type">
                    <option value="H100 SXM">H100 SXM</option>
                    <option value="H200 SXM" selected>H200 SXM</option>
                    <option value="GB200 NVL72">GB200 NVL72</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">GPU Count</label>
                <input type="number" class="form-input" id="tj-gpu-count" value="8" min="1" max="1024">
            </div>
            <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" id="tj-priority">
                    <option value="P0">P0 — Critical</option>
                    <option value="P1" selected>P1 — High</option>
                    <option value="P2">P2 — Normal</option>
                    <option value="P3">P3 — Low</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Est. Duration</label>
                <input type="text" class="form-input" id="tj-duration" placeholder="e.g. 3d, 12h, 30m">
            </div>
            <div class="form-group">
                <label class="form-label">Max Budget ($)</label>
                <input type="number" class="form-input" id="tj-budget" value="50000" min="100">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end">
                <button class="btn btn-primary" id="tj-submit-btn" style="width:100%;justify-content:center">
                    + Submit Job
                </button>
            </div>
        </div>
        <div id="tj-submit-msg" style="margin-top:8px;font-size:12px;min-height:18px;"></div>
    `;

    panel.appendChild(body);

    // Wire up submit
    setTimeout(() => {
        const btn = document.getElementById('tj-submit-btn');
        if (!btn) return;
        btn.addEventListener('click', () => _handleJobSubmit(models));
    }, 0);

    return panel;
}

function _handleJobSubmit(models) {
    const name      = document.getElementById('tj-name').value.trim() || 'Untitled Job';
    const modelId   = document.getElementById('tj-model').value;
    const gpuType   = document.getElementById('tj-gpu-type').value;
    const gpuCount  = parseInt(document.getElementById('tj-gpu-count').value) || 8;
    const priority  = document.getElementById('tj-priority').value;
    const duration  = document.getElementById('tj-duration').value.trim() || '1d';
    const budget    = parseInt(document.getElementById('tj-budget').value) || 10000;

    const modelObj  = models.find(m => m.id === modelId);
    const modelName = modelObj ? modelObj.name : modelId;

    const msgEl = document.getElementById('tj-submit-msg');
    const btn   = document.getElementById('tj-submit-btn');

    btn.disabled = true;
    btn.textContent = 'Submitting…';

    API.jobs.submit({
        name,
        type: 'training',
        model: modelName,
        gpu_type: gpuType,
        gpu_count: gpuCount,
        priority,
        est_duration: duration,
        max_budget: budget,
        progress: 0,
        checkpoint: null,
    }).then(() => {
        if (msgEl) {
            msgEl.style.color = 'var(--accent)';
            msgEl.textContent = `✓ Job "${name}" submitted — awaiting approval.`;
        }
        btn.disabled = false;
        btn.textContent = '+ Submit Job';
        // Re-render training tab to show the new job
        _renderActiveTab();
    }).catch(err => {
        if (msgEl) {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = `Error: ${err.message}`;
        }
        btn.disabled = false;
        btn.textContent = '+ Submit Job';
    });
}

// --- Jobs Table ---
function _buildJobsTable(jobs) {
    const isAdmin = API.auth.isAdmin();
    const panel = el('div', 'panel mb-6');

    const running  = jobs.filter(j => j.status === 'running').length;
    const pending  = jobs.filter(j => j.status === 'pending_approval').length;

    const header = el('div', 'panel-header');
    header.innerHTML = `
        <div class="panel-title">Active Training Jobs</div>
        <div style="display:flex;gap:8px;align-items:center">
            <span class="badge badge-active">${running} running</span>
            ${pending > 0 ? `<span class="badge badge-idle">${pending} pending</span>` : ''}
        </div>
    `;
    panel.appendChild(header);

    const wrap = el('div', 'panel-body no-padding');
    const table = el('table', 'data-table');
    table.innerHTML = `<thead><tr>
        <th>Status</th>
        <th>Job Name</th>
        <th>Model</th>
        <th>GPUs</th>
        <th>Priority</th>
        <th style="min-width:140px">Progress</th>
        <th>Duration</th>
        <th>Cost Accrued</th>
        <th>Actions</th>
    </tr></thead>`;

    const tbody = el('tbody', '');

    // Sort: running first, then pending_approval, queued, completed, cancelled
    const order = { running: 0, pending_approval: 1, queued: 2, approved: 3, completed: 4, cancelled: 5, denied: 6 };
    const sorted = [...jobs].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

    sorted.forEach(job => {
        const tr = el('tr', '');

        // Muted style for completed/cancelled
        if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'denied') {
            tr.style.opacity = '0.55';
        }

        // Status badge
        let badgeCls, badgeLabel;
        switch (job.status) {
            case 'running':          badgeCls = 'badge-active';  badgeLabel = 'RUNNING';    break;
            case 'queued':           badgeCls = 'badge-idle';    badgeLabel = 'QUEUED';     break;
            case 'approved':         badgeCls = 'badge-info';    badgeLabel = 'APPROVED';   break;
            case 'pending_approval': badgeCls = 'badge-idle';    badgeLabel = 'PENDING';    break;
            case 'completed':        badgeCls = 'badge-info';    badgeLabel = 'COMPLETED';  break;
            case 'cancelled':        badgeCls = '';              badgeLabel = 'CANCELLED';  break;
            case 'denied':           badgeCls = 'badge-maint';   badgeLabel = 'DENIED';     break;
            default:                 badgeCls = '';              badgeLabel = job.status.toUpperCase();
        }

        // Priority badge color
        const priCls = job.priority === 'P0' ? 'badge-maint' :
                       job.priority === 'P1' ? 'badge-active' :
                       job.priority === 'P2' ? 'badge-info' : '';

        // Progress bar
        const prog = job.progress || 0;
        const progressHtml = job.status === 'running' ? `
            <div style="width:100%">
                <div style="background:var(--bg-primary);border-radius:3px;height:6px;overflow:hidden;margin-bottom:3px">
                    <div style="height:100%;width:${prog}%;background:var(--accent);border-radius:3px;transition:width 0.5s ease"></div>
                </div>
                <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${prog}% ${job.checkpoint ? '\u00b7 ' + job.checkpoint : ''}</div>
            </div>
        ` : job.status === 'completed' ? `
            <div style="width:100%">
                <div style="background:var(--bg-primary);border-radius:3px;height:6px;overflow:hidden;margin-bottom:3px">
                    <div style="height:100%;width:100%;background:var(--info);border-radius:3px"></div>
                </div>
                <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">100% \u00b7 final</div>
            </div>
        ` : `<span style="font-size:11px;color:var(--text-muted)">\u2014</span>`;

        // Duration
        const durationText = job.status === 'running' && job.started_at ?
            _elapsedSince(job.started_at) + ' / ' + (job.est_duration || '?') :
            (job.est_duration || '\u2014');

        // Actions
        let actionsHtml = '';
        if (job.status === 'pending_approval' && isAdmin) {
            actionsHtml = `
                <button class="btn btn-sm btn-primary" data-action="approve-job" data-id="${job.id}" style="margin-right:4px">Approve</button>
                <button class="btn btn-sm" data-action="deny-job" data-id="${job.id}" style="background:var(--danger-dim);color:var(--danger);border-color:var(--danger)">Deny</button>
            `;
        } else if (job.status === 'pending_approval') {
            actionsHtml = `<span style="font-size:11px;color:var(--warning);font-style:italic">Awaiting Approval</span>`;
        } else if (job.status === 'running') {
            actionsHtml = `<button class="btn btn-sm" data-action="cancel-job" data-id="${job.id}" style="background:var(--danger-dim);color:var(--danger);border-color:var(--danger)">Cancel</button>`;
        } else {
            actionsHtml = `<span style="font-size:11px;color:var(--text-muted)">\u2014</span>`;
        }

        tr.innerHTML = `
            <td><span class="badge ${badgeCls}">${badgeLabel}</span></td>
            <td style="font-weight:600;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${job.name}">${job.name}</td>
            <td style="color:var(--text-secondary);font-family:var(--font-mono);font-size:12px">${job.model || '\u2014'}</td>
            <td class="text-mono" style="white-space:nowrap">${fmt(job.gpu_count || 0)}\u00d7 <span style="color:var(--text-muted)">${(job.gpu_type || '').split(' ').slice(0, 2).join(' ')}</span></td>
            <td><span class="badge ${priCls}">${job.priority || '\u2014'}</span></td>
            <td>${progressHtml}</td>
            <td class="text-mono" style="font-size:12px;white-space:nowrap">${durationText}</td>
            <td class="text-mono" style="color:${job.cost_accrued > 0 ? 'var(--warning)' : 'var(--text-muted)'}">
                ${job.cost_accrued > 0 ? fmtCurrency(job.cost_accrued) : job.max_budget ? '<span style="color:var(--text-muted)">&le; ' + fmtCurrency(job.max_budget) + '</span>' : '\u2014'}
            </td>
            <td>${actionsHtml}</td>
        `;

        tbody.appendChild(tr);
    });

    if (sorted.length === 0) {
        const emptyRow = el('tr', '');
        emptyRow.innerHTML = `<td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">No training jobs found.</td>`;
        tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    panel.appendChild(wrap);

    // Wire up action buttons after paint
    setTimeout(() => _wireJobTableActions(panel), 0);

    return panel;
}

function _wireJobTableActions(panel) {
    panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'cancel-job') {
                if (!confirm('Cancel this job?')) return;
                API.jobs.cancel(id).then(() => _renderActiveTab());

            } else if (action === 'approve-job' || action === 'deny-job') {
                // Find the approval record that matches this job
                API.approvals.list({ type: 'job', status: 'pending' }).then(approvals => {
                    const apr = approvals.find(a => a.target_id === id);
                    if (!apr) {
                        // Approval record might not exist (e.g. older queued jobs), approve/deny job directly
                        API.jobs.list().then(jobs => {
                            const job = jobs.find(j => j.id === id);
                            if (job) {
                                job.status = action === 'approve-job' ? 'approved' : 'denied';
                                _renderActiveTab();
                            }
                        });
                        return;
                    }
                    const call = action === 'approve-job'
                        ? API.approvals.approve(apr.id)
                        : API.approvals.deny(apr.id, 'Denied by admin');
                    call.then(() => _renderActiveTab());
                });
            }
        });
    });
}

// --- Gantt Timeline ---
function _buildGanttTimeline(jobs) {
    const panel = el('div', 'panel mb-6');
    panel.innerHTML = '<div class="panel-header"><div class="panel-title">Resource Timeline \u2014 GPU Allocation by Day</div></div>';

    const body = el('div', 'panel-body');

    // Days spanning from today
    const today = new Date('2026-02-21');
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }

    // Header
    const hdr = el('div', 'timeline-header');
    hdr.innerHTML = `
        <div class="timeline-label-spacer"></div>
        <div class="timeline-days">${days.map(d => `<div class="timeline-day" style="font-size:10px">${d}</div>`).join('')}</div>
    `;
    body.appendChild(hdr);

    // Rows for running and queued jobs
    const ganttColors = [
        'var(--accent)', '#4488FF', '#8B5CF6', 'var(--warning)',
        '#06B6D4', '#10B981', '#E91E63', '#F59E0B',
    ];

    const visibleJobs = jobs.filter(j => ['running', 'queued', 'approved'].includes(j.status)).slice(0, 10);

    if (visibleJobs.length === 0) {
        body.innerHTML += '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">No active or queued jobs.</div>';
        panel.appendChild(body);
        return panel;
    }

    visibleJobs.forEach((job, i) => {
        const isRunning = job.status === 'running';

        // Calculate bar position from started_at / queued position
        let startDay = 0;
        let durationDays = 1;

        if (job.started_at) {
            const start = new Date(job.started_at);
            const diff = Math.floor((start - today) / 86400000);
            startDay = Math.max(0, Math.min(6, diff));
        } else {
            startDay = Math.min(6, 2 + i); // queued jobs stagger to the right
        }

        if (job.est_duration) {
            const match = job.est_duration.match(/^(\d+(?:\.\d+)?)(d|h|m)$/);
            if (match) {
                const val = parseFloat(match[1]);
                const unit = match[2];
                durationDays = unit === 'd' ? val : unit === 'h' ? val / 24 : val / 1440;
            }
        }

        const endDay = Math.min(7, startDay + Math.max(0.5, durationDays));
        const leftPct  = (startDay / 7) * 100;
        const widthPct = ((endDay - startDay) / 7) * 100;
        const color    = isRunning ? ganttColors[i % ganttColors.length] : 'var(--border-primary)';
        const labelColor = isRunning ? 'var(--text-primary)' : 'var(--text-muted)';
        const gpuLabel = `${fmt(job.gpu_count || 0)}\u00d7 ${(job.gpu_type || '').split(' ')[0]}`;

        const row = el('div', 'gantt-row');
        row.innerHTML = `
            <div class="gantt-label" title="${job.name}" style="color:${labelColor}">
                ${job.name.length > 24 ? job.name.substring(0, 24) + '\u2026' : job.name}
            </div>
            <div class="gantt-track">
                <div class="gantt-bar" style="left:${leftPct.toFixed(1)}%;width:${Math.max(3, widthPct).toFixed(1)}%;background:${color};opacity:${isRunning ? '1' : '0.5'}">
                    ${gpuLabel}
                </div>
            </div>
        `;
        body.appendChild(row);
    });

    panel.appendChild(body);
    return panel;
}

// --- Scheduling Suggestions ---
function _buildSchedulingSuggestions() {
    const panel = el('div', 'panel');
    panel.innerHTML = `
        <div class="panel-header">
            <div class="panel-title">\u26a1 Scheduling Suggestions</div>
        </div>
        <div class="panel-body no-padding">
            <div class="savings-item">
                <div class="savings-icon" style="background:var(--info-dim);color:var(--info)">🕐</div>
                <div class="savings-text">
                    <div class="savings-title">Move "Embeddings v4 Contrastive Training" to tonight's slot</div>
                    <div class="savings-desc">16\u00d7 H100 GPUs free up at 22:00 PST. Job can start 8 hours earlier than current tomorrow slot, saving est. <span style="color:var(--accent)">$1,840</span> in idle-reserve cost.</div>
                </div>
            </div>
            <div class="savings-item">
                <div class="savings-icon" style="background:var(--accent-dim);color:var(--accent)">🔄</div>
                <div class="savings-text">
                    <div class="savings-title">Batch "Safety Evaluation Suite" with "Embeddings v4" on same H100 allocation</div>
                    <div class="savings-desc">Both use H100 SXM. Running sequentially on the same allocation avoids 2\u00d7 scheduler overhead and warm-up time (~1.5 hr saved).</div>
                </div>
            </div>
            <div class="savings-item">
                <div class="savings-icon" style="background:var(--warning-dim);color:var(--warning)">⬆️</div>
                <div class="savings-text">
                    <div class="savings-title">Upgrade "Multilingual Alignment (Phase 2)" from H200 to GB200 NVL72</div>
                    <div class="savings-desc">2\u00d7 GB200 NVL72 racks available on CoreWeave. ~4\u00d7 throughput improvement cuts 4-day job to ~1.5 days. Net savings ~<span style="color:var(--accent)">$28K</span> despite higher hourly rate.</div>
                </div>
            </div>
        </div>
    `;
    return panel;
}

// ============================================================
// INFERENCE TAB
// ============================================================

function _renderInferenceTab(container) {
    Promise.all([
        API.deployments.list(),
        API.models.list(),
    ]).then(([deployments, models]) => {
        container.innerHTML = '';

        // --- Summary Cards ---
        container.appendChild(_buildInferenceSummaryCards(deployments));

        // --- Live Deployments Table ---
        container.appendChild(_buildDeploymentsTable(deployments));

        // --- Deploy New Model Form ---
        container.appendChild(_buildDeployForm(models));

    }).catch(err => {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading inference data: ${err.message}</div>`;
    });
}

// --- Inference Summary Cards ---
function _buildInferenceSummaryCards(deployments) {
    const active   = deployments.filter(d => d.status === 'running');
    const totalGPUs = active.reduce((s, d) => s + (d.gpu_count || 0) * (d.replicas || 1), 0);
    const avgQPS   = active.length > 0
        ? Math.round(active.reduce((s, d) => s + (d.qps || 0), 0) / active.length)
        : 0;
    const avgP50   = active.length > 0
        ? Math.round(active.reduce((s, d) => s + (d.p50_latency || 0), 0) / active.length)
        : 0;

    const wrap = el('div', 'summary-cards mb-6');
    wrap.style.gridTemplateColumns = 'repeat(4,1fr)';

    wrap.appendChild(_summaryCard(
        'Active Deployments',
        active.length,
        `${deployments.filter(d => d.status === 'pending_approval').length} pending approval`,
        '',
        'accent'
    ));
    wrap.appendChild(_summaryCard(
        'Total Inference GPUs',
        fmt(totalGPUs),
        `across ${active.length} deployments`,
        '',
        'info'
    ));
    wrap.appendChild(_summaryCard(
        'Avg QPS',
        fmt(avgQPS),
        'queries per second',
        '',
        'purple'
    ));
    wrap.appendChild(_summaryCard(
        'Avg P50 Latency',
        avgP50 + 'ms',
        'median response time',
        '',
        avgP50 > 100 ? 'warning' : ''
    ));

    return wrap;
}

// --- Live Deployments Table ---
function _buildDeploymentsTable(deployments) {
    const isAdmin = API.auth.isAdmin();
    const panel = el('div', 'panel mb-6');

    const running = deployments.filter(d => d.status === 'running').length;
    const pending = deployments.filter(d => d.status === 'pending_approval').length;

    const header = el('div', 'panel-header');
    header.innerHTML = `
        <div class="panel-title">Live Deployments</div>
        <div style="display:flex;gap:8px;align-items:center">
            <span class="badge badge-active">${running} running</span>
            ${pending > 0 ? `<span class="badge badge-idle">${pending} pending</span>` : ''}
        </div>
    `;
    panel.appendChild(header);

    const wrap = el('div', 'panel-body no-padding');
    const table = el('table', 'data-table');
    table.innerHTML = `<thead><tr>
        <th>Status</th>
        <th>Model</th>
        <th>Version</th>
        <th>GPUs</th>
        <th>Replicas</th>
        <th>Provider</th>
        <th>QPS</th>
        <th>P50 / P99</th>
        <th style="max-width:180px">Endpoint</th>
        <th>Actions</th>
    </tr></thead>`;

    const tbody = el('tbody', '');

    // Sort: running first, then pending, rest
    const orderDep = { running: 0, deploying: 1, pending_approval: 2, terminating: 3, terminated: 4, denied: 5 };
    const sorted = [...deployments].sort((a, b) => (orderDep[a.status] ?? 9) - (orderDep[b.status] ?? 9));

    sorted.forEach(dep => {
        const tr = el('tr', '');

        // Running rows: subtle green left border
        if (dep.status === 'running') {
            tr.style.borderLeft = '3px solid var(--accent)';
        } else if (dep.status === 'pending_approval') {
            tr.style.borderLeft = '3px solid var(--warning)';
        } else if (dep.status === 'terminating' || dep.status === 'terminated' || dep.status === 'denied') {
            tr.style.opacity = '0.5';
        }

        // Status indicator
        let statusHtml;
        if (dep.status === 'running') {
            statusHtml = `<span style="display:inline-flex;align-items:center;gap:5px">
                <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent);display:inline-block;animation:pulse 2s infinite"></span>
                <span style="color:var(--accent);font-size:11px;font-weight:600;letter-spacing:0.06em">LIVE</span>
            </span>`;
        } else if (dep.status === 'deploying') {
            statusHtml = `<span class="badge badge-info">DEPLOYING</span>`;
        } else if (dep.status === 'pending_approval') {
            statusHtml = `<span class="badge badge-idle">PENDING</span>`;
        } else if (dep.status === 'terminating') {
            statusHtml = `<span class="badge badge-maint">STOPPING</span>`;
        } else if (dep.status === 'terminated') {
            statusHtml = `<span class="badge" style="color:var(--text-muted)">STOPPED</span>`;
        } else {
            statusHtml = `<span class="badge badge-maint">${dep.status.toUpperCase()}</span>`;
        }

        // Replicas display
        const replicaDisplay = dep.status === 'running'
            ? `<span class="text-mono" style="font-size:12px">${dep.replicas}/${dep.max_replicas || '?'}</span>`
            : `<span style="color:var(--text-muted)">\u2014</span>`;

        // QPS display
        const qpsDisplay = dep.qps > 0
            ? `<span class="text-mono" style="color:var(--text-secondary)">${fmt(dep.qps)}</span>`
            : `<span style="color:var(--text-muted)">\u2014</span>`;

        // Latency
        const latencyDisplay = dep.p50_latency > 0
            ? `<span class="text-mono" style="font-size:12px">${dep.p50_latency}ms / <span style="color:var(--text-muted)">${dep.p99_latency}ms</span></span>`
            : `<span style="color:var(--text-muted)">\u2014</span>`;

        // Endpoint (truncated)
        const endpointDisplay = dep.endpoint_url
            ? `<a href="#" style="color:var(--info);font-family:var(--font-mono);font-size:10px;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:160px" title="${dep.endpoint_url}">${dep.endpoint_url.replace('https://', '')}</a>`
            : `<span style="color:var(--text-muted);font-size:11px">Not deployed</span>`;

        // Actions
        let actionsHtml = '';
        if (dep.status === 'running') {
            actionsHtml = `
                <div style="display:flex;gap:4px;align-items:center" id="dep-actions-${dep.id}">
                    <button class="btn btn-sm" data-action="scale-dep" data-id="${dep.id}" data-replicas="${dep.replicas}" data-max="${dep.max_replicas}" title="Scale replicas">
                        Scale
                    </button>
                    <button class="btn btn-sm" data-action="teardown-dep" data-id="${dep.id}" style="background:var(--danger-dim);color:var(--danger);border-color:var(--danger)">
                        Teardown
                    </button>
                </div>
            `;
        } else if (dep.status === 'pending_approval' && isAdmin) {
            actionsHtml = `
                <button class="btn btn-sm btn-primary" data-action="approve-dep" data-id="${dep.id}" style="margin-right:4px">Approve</button>
                <button class="btn btn-sm" data-action="deny-dep" data-id="${dep.id}" style="background:var(--danger-dim);color:var(--danger);border-color:var(--danger)">Deny</button>
            `;
        } else if (dep.status === 'pending_approval') {
            actionsHtml = `<span style="font-size:11px;color:var(--warning);font-style:italic">Awaiting Approval</span>`;
        } else {
            actionsHtml = `<span style="color:var(--text-muted);font-size:11px">\u2014</span>`;
        }

        tr.innerHTML = `
            <td>${statusHtml}</td>
            <td style="font-weight:600;font-size:13px">${dep.model_name || '\u2014'}</td>
            <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${dep.model_version || '\u2014'}</td>
            <td class="text-mono" style="white-space:nowrap">${fmt(dep.gpu_count || 0)}\u00d7 <span style="color:var(--text-muted)">${(dep.gpu_type || '').split(' ').slice(0, 2).join(' ')}</span></td>
            <td>${replicaDisplay}</td>
            <td style="color:var(--text-secondary);font-size:12px">${dep.provider || '\u2014'}</td>
            <td>${qpsDisplay}</td>
            <td>${latencyDisplay}</td>
            <td>${endpointDisplay}</td>
            <td>${actionsHtml}</td>
        `;

        tbody.appendChild(tr);
    });

    if (sorted.length === 0) {
        const emptyRow = el('tr', '');
        emptyRow.innerHTML = `<td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted)">No deployments found.</td>`;
        tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    panel.appendChild(wrap);

    // Wire up action buttons after paint
    setTimeout(() => _wireDeploymentTableActions(panel), 0);

    return panel;
}

function _wireDeploymentTableActions(panel) {
    panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action   = btn.dataset.action;
            const id       = btn.dataset.id;

            if (action === 'teardown-dep') {
                if (!confirm(`Teardown this deployment? This will terminate all replicas.`)) return;
                API.deployments.teardown(id).then(() => _renderActiveTab());

            } else if (action === 'scale-dep') {
                _showScaleControl(btn, id);

            } else if (action === 'approve-dep' || action === 'deny-dep') {
                API.approvals.list({ type: 'deployment', status: 'pending' }).then(approvals => {
                    const apr = approvals.find(a => a.target_id === id);
                    if (!apr) return;
                    const call = action === 'approve-dep'
                        ? API.approvals.approve(apr.id)
                        : API.approvals.deny(apr.id, 'Denied by admin');
                    call.then(() => _renderActiveTab());
                });
            }
        });
    });
}

function _showScaleControl(triggerBtn, depId) {
    // Replace the actions cell with inline +/- scale control
    const actionsDiv = document.getElementById('dep-actions-' + depId);
    if (!actionsDiv) return;

    // Already showing scale control?
    if (actionsDiv.querySelector('.scale-control')) {
        actionsDiv.innerHTML = `
            <button class="btn btn-sm" data-action="scale-dep" data-id="${depId}" title="Scale replicas">Scale</button>
            <button class="btn btn-sm" data-action="teardown-dep" data-id="${depId}" style="background:var(--danger-dim);color:var(--danger);border-color:var(--danger)">Teardown</button>
        `;
        _wireDeploymentTableActions(actionsDiv.closest('.panel'));
        return;
    }

    API.deployments.get(depId).then(dep => {
        if (!dep) return;
        const current = dep.replicas;
        const min = dep.min_replicas || 1;
        const max = dep.max_replicas || 8;

        actionsDiv.innerHTML = `
            <div class="scale-control" style="display:flex;align-items:center;gap:4px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:var(--radius-sm);padding:3px 6px">
                <button class="btn btn-sm" id="scale-dec-${depId}" style="padding:2px 7px;min-width:0">\u2212</button>
                <span id="scale-val-${depId}" style="font-family:var(--font-mono);font-size:13px;min-width:18px;text-align:center">${current}</span>
                <button class="btn btn-sm" id="scale-inc-${depId}" style="padding:2px 7px;min-width:0">+</button>
                <button class="btn btn-sm btn-primary" id="scale-apply-${depId}" style="margin-left:4px;padding:3px 8px">Apply</button>
                <button class="btn btn-sm" id="scale-cancel-${depId}" style="padding:3px 6px">\u2715</button>
            </div>
        `;

        let val = current;

        document.getElementById('scale-dec-' + depId).addEventListener('click', () => {
            val = Math.max(min, val - 1);
            document.getElementById('scale-val-' + depId).textContent = val;
        });
        document.getElementById('scale-inc-' + depId).addEventListener('click', () => {
            val = Math.min(max, val + 1);
            document.getElementById('scale-val-' + depId).textContent = val;
        });
        document.getElementById('scale-apply-' + depId).addEventListener('click', () => {
            API.deployments.scale(depId, val).then(() => _renderActiveTab());
        });
        document.getElementById('scale-cancel-' + depId).addEventListener('click', () => {
            _renderActiveTab();
        });
    });
}

// --- Deploy New Model Form ---
function _buildDeployForm(models) {
    const panel = el('div', 'panel');

    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">Deploy New Model</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const modelOptions = models
        .map(m => `<option value="${m.id}">${m.name} ${m.version} (${m.params || '?'})</option>`)
        .join('');

    body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr) repeat(3,1fr);gap:12px">
            <div class="form-group" style="grid-column:span 2">
                <label class="form-label">Model</label>
                <select class="form-select" id="dep-model-id">
                    ${modelOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">GPU Type</label>
                <select class="form-select" id="dep-gpu-type">
                    <option value="H100 SXM">H100 SXM</option>
                    <option value="H200 SXM" selected>H200 SXM</option>
                    <option value="GB200 NVL72">GB200 NVL72</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">GPU Count</label>
                <input type="number" class="form-input" id="dep-gpu-count" value="8" min="1" max="1024">
            </div>
            <div class="form-group">
                <label class="form-label">Min Replicas</label>
                <input type="number" class="form-input" id="dep-min-replicas" value="1" min="1" max="32">
            </div>
            <div class="form-group">
                <label class="form-label">Max Replicas</label>
                <input type="number" class="form-input" id="dep-max-replicas" value="4" min="1" max="32">
            </div>
            <div class="form-group">
                <label class="form-label">Namespace</label>
                <select class="form-select" id="dep-namespace">
                    <option value="inference-prod">inference-prod</option>
                    <option value="inference-staging">inference-staging</option>
                </select>
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end">
                <button class="btn btn-primary" id="dep-submit-btn" style="width:100%;justify-content:center">
                    \ud83d\ude80 Deploy
                </button>
            </div>
        </div>
        <div id="dep-submit-msg" style="margin-top:8px;font-size:12px;min-height:18px;"></div>
    `;

    panel.appendChild(body);

    // Wire up submit
    setTimeout(() => {
        const btn = document.getElementById('dep-submit-btn');
        if (!btn) return;
        btn.addEventListener('click', () => _handleDeploySubmit(models));
    }, 0);

    return panel;
}

function _handleDeploySubmit(models) {
    const modelId     = document.getElementById('dep-model-id').value;
    const gpuType     = document.getElementById('dep-gpu-type').value;
    const gpuCount    = parseInt(document.getElementById('dep-gpu-count').value) || 8;
    const minReplicas = parseInt(document.getElementById('dep-min-replicas').value) || 1;
    const maxReplicas = parseInt(document.getElementById('dep-max-replicas').value) || 4;
    const namespace   = document.getElementById('dep-namespace').value;

    const modelObj = models.find(m => m.id === modelId);
    const msgEl    = document.getElementById('dep-submit-msg');
    const btn      = document.getElementById('dep-submit-btn');

    btn.disabled = true;
    btn.textContent = 'Deploying\u2026';

    API.models.deploy(modelId, {
        gpu_type:     gpuType,
        gpu_count:    gpuCount,
        min_replicas: minReplicas,
        max_replicas: maxReplicas,
        namespace,
    }).then(dep => {
        if (msgEl) {
            msgEl.style.color = 'var(--accent)';
            msgEl.textContent = `\u2713 Deployment for "${modelObj ? modelObj.name : modelId}" submitted \u2014 awaiting approval.`;
        }
        btn.disabled = false;
        btn.textContent = '\ud83d\ude80 Deploy';
        _renderActiveTab();
    }).catch(err => {
        if (msgEl) {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = `Error: ${err.message}`;
        }
        btn.disabled = false;
        btn.textContent = '\ud83d\ude80 Deploy';
    });
}

// ============================================================
// UTILITY HELPERS
// ============================================================

/** Returns a human-readable elapsed time string given an ISO timestamp. */
function _elapsedSince(isoString) {
    const start = new Date(isoString);
    const now   = new Date('2026-02-21T11:29:00Z'); // match dashboard time
    const ms    = now - start;
    if (isNaN(ms) || ms < 0) return '\u2014';
    const hrs  = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs >= 24) return Math.floor(hrs / 24) + 'd ' + (hrs % 24) + 'h';
    if (hrs > 0)   return hrs + 'h ' + mins + 'm';
    return mins + 'm';
}
