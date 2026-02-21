// ============================================================
// PERPLEXITY COMPUTE COMMAND CENTER — admin.js
// Admin Dashboard: Approvals, Accounting, Users, Audit Log
// ============================================================
// Uses API object from api.js for all data access.
// Uses el(), fmt(), fmtCurrency(), pct() from data.js.
// Entry point: renderAdminDashboard() — called by nav.js.
// ============================================================

'use strict';

// ---- Module State ----
let _adminTab = 'approvals'; // 'approvals' | 'accounting' | 'users' | 'audit'

// Mock user list
const _adminUsers = [
    { name: 'Austin Hollan',   email: 'austin.hollan@perplexity.ai', role: 'Admin',    groups: 'compute-admins',    lastActive: 'Now' },
    { name: 'Kevin Chen',      email: 'kevin@perplexity.ai',         role: 'Admin',    groups: 'compute-admins',    lastActive: '15 min ago' },
    { name: 'ML Infra Team',   email: 'ml-infra@perplexity.ai',      role: 'Operator', groups: 'compute-operators', lastActive: '1h ago' },
    { name: 'Research Team',   email: 'research@perplexity.ai',      role: 'Operator', groups: 'compute-operators', lastActive: '3h ago' },
    { name: 'Safety Team',     email: 'safety@perplexity.ai',        role: 'Operator', groups: 'compute-operators', lastActive: '5h ago' },
    { name: 'Engineering',     email: 'eng-team@perplexity.ai',      role: 'Operator', groups: 'compute-operators', lastActive: '30 min ago' },
];

// ============================================================
// ENTRY POINT
// ============================================================

function renderAdminDashboard() {
    const section = document.getElementById('section-admin');
    section.innerHTML = '';

    // Auth gate
    if (!API.auth.isAdmin()) {
        section.appendChild(_buildAccessDenied());
        return;
    }

    // Tab bar
    section.appendChild(_buildAdminTabBar());

    // Tab content container
    const contentWrap = el('div', '');
    contentWrap.id = 'admin-tab-content';
    section.appendChild(contentWrap);

    _renderAdminActiveTab();
}

// ============================================================
// ACCESS DENIED
// ============================================================

function _buildAccessDenied() {
    const wrap = el('div', '');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;gap:16px;';

    wrap.innerHTML = `
        <div style="width:64px;height:64px;border-radius:50%;background:var(--danger-dim);border:2px solid var(--danger);display:flex;align-items:center;justify-content:center;font-size:28px">\u2298</div>
        <div style="font-size:20px;font-weight:700;color:var(--danger);letter-spacing:0.04em">ACCESS DENIED</div>
        <div style="color:var(--text-secondary);font-size:13px;text-align:center;max-width:380px">
            Admin role required to access this dashboard.<br>
            Your current role does not have permission to view approvals, accounting, or user management.
        </div>
        <div style="padding:12px 20px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:6px;font-size:12px;color:var(--text-muted)">
            Contact <span style="color:var(--accent)">austin.hollan@perplexity.ai</span> or <span style="color:var(--accent)">kevin@perplexity.ai</span> to request access.
        </div>
    `;
    return wrap;
}

// ============================================================
// TAB BAR
// ============================================================

function _buildAdminTabBar() {
    const wrap = el('div', 'tabs mb-6');
    wrap.id = 'admin-tab-bar';
    wrap.style.cssText = 'border-bottom:1px solid var(--border-primary);padding-bottom:0;margin-bottom:20px;';

    const tabs = [
        { key: 'approvals',  icon: '\u22a1', label: 'Approvals' },
        { key: 'accounting', icon: '\u25c6', label: 'Accounting' },
        { key: 'users',      icon: '\u25c8', label: 'Users' },
        { key: 'audit',      icon: '\u25a4', label: 'Audit Log' },
    ];

    tabs.forEach(t => {
        const btn = el('button', 'tab' + (_adminTab === t.key ? ' active' : ''),
            `${t.icon} ${t.label}`);
        btn.style.cssText = 'cursor:pointer;background:none;border:none;font-family:var(--font-ui);font-size:13px;letter-spacing:0.04em;padding:10px 20px 12px;';
        btn.addEventListener('click', () => {
            _adminTab = t.key;
            _refreshAdminTabBar();
            _renderAdminActiveTab();
        });
        wrap.appendChild(btn);
    });

    return wrap;
}

function _refreshAdminTabBar() {
    const tabKeys = ['approvals', 'accounting', 'users', 'audit'];
    document.querySelectorAll('#admin-tab-bar .tab').forEach((btn, i) => {
        btn.classList.toggle('active', tabKeys[i] === _adminTab);
    });
}

function _renderAdminActiveTab() {
    const wrap = document.getElementById('admin-tab-content');
    if (!wrap) return;
    wrap.innerHTML = '<div style="color:var(--text-muted);padding:40px 0;text-align:center;letter-spacing:0.08em;font-size:12px;">LOADING...</div>';

    switch (_adminTab) {
        case 'approvals':  _renderApprovalsTab(wrap);  break;
        case 'accounting': _renderAccountingTab(wrap); break;
        case 'users':      _renderUsersTab(wrap);      break;
        case 'audit':      _renderAuditTab(wrap);      break;
    }
}

// ============================================================
// APPROVALS TAB
// ============================================================

function _renderApprovalsTab(container) {
    Promise.all([
        API.approvals.list({ status: 'pending' }),
        API.approvals.list(),
    ]).then(([pending, all]) => {
        container.innerHTML = '';

        // Summary banner
        const banner = el('div', '');
        banner.style.cssText = 'margin-bottom:20px;padding:12px 18px;background:rgba(255,184,0,0.08);border:1px solid rgba(255,184,0,0.3);border-radius:6px;display:flex;align-items:center;gap:12px';
        banner.innerHTML = `
            <span style="font-size:20px;line-height:1">\u22a1</span>
            <div>
                <span style="font-weight:700;font-size:16px;color:var(--warning)">${pending.length}</span>
                <span style="color:var(--text-secondary);font-size:13px;margin-left:6px">pending approval${pending.length !== 1 ? 's' : ''} awaiting your review</span>
            </div>
        `;
        container.appendChild(banner);

        // Pending approval cards
        if (pending.length > 0) {
            const pendingHeader = el('div', '');
            pendingHeader.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px';
            pendingHeader.textContent = 'Pending Approvals';
            container.appendChild(pendingHeader);

            const cardsWrap = el('div', '');
            cardsWrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:14px;margin-bottom:28px';

            pending.forEach(approval => {
                cardsWrap.appendChild(_buildApprovalCard(approval));
            });
            container.appendChild(cardsWrap);
        }

        // Recent resolved section
        const resolved = all
            .filter(a => a.status !== 'pending')
            .sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at))
            .slice(0, 10);

        if (resolved.length > 0) {
            const resolvedPanel = el('div', 'panel mb-6');
            const resolvedHeader = el('div', 'panel-header');
            resolvedHeader.innerHTML = '<div class="panel-title">Recent Resolved</div>';
            resolvedPanel.appendChild(resolvedHeader);

            const resolvedBody = el('div', 'panel-body no-padding');
            const table = el('table', 'data-table');
            table.innerHTML = `
                <thead><tr>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Requester</th>
                    <th>Approver</th>
                    <th>Status</th>
                    <th>Resolved At</th>
                </tr></thead>
            `;
            const tbody = el('tbody', '');
            resolved.forEach(a => {
                const targetLabel = a.payload
                    ? (a.payload.model || a.payload.name || a.target_id)
                    : a.target_id;
                const resolvedAt = a.resolved_at
                    ? new Date(a.resolved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '\u2014';
                const statusBadge = a.status === 'approved'
                    ? '<span class="badge badge-success" style="font-size:10px;padding:2px 7px">APPROVED</span>'
                    : '<span class="badge badge-danger" style="font-size:10px;padding:2px 7px">DENIED</span>';
                const typeBadge = a.type === 'deployment'
                    ? '<span class="badge" style="font-size:10px;padding:2px 7px;background:rgba(139,92,246,0.15);color:var(--purple);border:1px solid rgba(139,92,246,0.3)">DEPLOY</span>'
                    : '<span class="badge badge-info" style="font-size:10px;padding:2px 7px">JOB</span>';
                const row = el('tr', '');
                row.innerHTML = `
                    <td>${typeBadge}</td>
                    <td style="font-size:12px;font-family:var(--font-mono)">${targetLabel}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${a.requester}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${a.approver || '\u2014'}</td>
                    <td>${statusBadge}</td>
                    <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${resolvedAt}</td>
                `;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            resolvedBody.appendChild(table);
            resolvedPanel.appendChild(resolvedBody);
            container.appendChild(resolvedPanel);
        }

    }).catch(err => {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading approvals: ${err.message}</div>`;
    });
}

function _buildApprovalCard(approval) {
    const card = el('div', 'panel');
    card.style.cssText = 'margin:0;border:1px solid var(--border-primary);background:var(--bg-card);transition:border-color 0.2s';
    card.dataset.approvalId = approval.id;

    const isDeployment = approval.type === 'deployment';
    const typeBadge = isDeployment
        ? '<span class="badge" style="font-size:11px;padding:3px 9px;background:rgba(139,92,246,0.15);color:var(--purple);border:1px solid rgba(139,92,246,0.3)">DEPLOYMENT</span>'
        : '<span class="badge badge-info" style="font-size:11px;padding:3px 9px">JOB</span>';

    const payload = approval.payload || {};
    const createdAgo = _timeAgo(approval.created_at);

    // Cost display
    const costKey = payload.est_monthly_cost ? 'est_monthly_cost' : 'est_cost';
    const costVal = payload[costKey];
    const costLabel = payload.est_monthly_cost ? 'Est. Monthly Cost' : 'Est. Total Cost';

    // Key details rows
    const details = [];
    if (payload.model || payload.name) details.push(['Model / Job', payload.model || payload.name]);
    if (payload.gpu_type)              details.push(['GPU Type',    payload.gpu_type]);
    if (payload.gpu_count)             details.push(['GPU Count',   `${payload.gpu_count}\u00d7 GPUs`]);
    if (payload.replicas)              details.push(['Replicas',    payload.replicas]);
    if (payload.est_duration)          details.push(['Duration',    payload.est_duration]);
    if (costVal)                       details.push([costLabel,     fmtCurrency(costVal)]);

    const detailRows = details.map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-secondary)">
            <span style="font-size:11px;color:var(--text-muted)">${k}</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${v}</span>
        </div>
    `).join('');

    card.innerHTML = `
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-secondary);display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;gap:8px;align-items:center">
                ${typeBadge}
                <span style="font-size:12px;color:var(--text-secondary)">${approval.requester}</span>
            </div>
            <span style="font-size:11px;color:var(--text-muted)">${createdAgo}</span>
        </div>
        <div style="padding:12px 16px">
            <div style="margin-bottom:10px">${detailRows}</div>
            <div class="approval-actions" style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
                <button class="btn" style="flex:1;padding:7px 0;background:rgba(0,212,170,0.12);border:1px solid var(--accent);color:var(--accent);font-weight:600;font-size:12px" data-approve="${approval.id}">
                    \u2713 Approve
                </button>
                <button class="btn" style="flex:1;padding:7px 0;background:rgba(255,68,102,0.1);border:1px solid var(--danger);color:var(--danger);font-weight:600;font-size:12px" data-deny-trigger="${approval.id}">
                    \u2715 Deny
                </button>
            </div>
            <div class="deny-reason-wrap" style="display:none;margin-top:8px">
                <input type="text" class="form-input" placeholder="Reason for denial (required)" style="margin-bottom:6px;font-size:12px">
                <div style="display:flex;gap:6px">
                    <button class="btn" style="flex:1;padding:5px 0;background:rgba(255,68,102,0.15);border:1px solid var(--danger);color:var(--danger);font-size:11px" data-deny-confirm="${approval.id}">Confirm Deny</button>
                    <button class="btn" style="padding:5px 12px;font-size:11px" data-deny-cancel>Cancel</button>
                </div>
            </div>
            <div class="approval-feedback" style="display:none;margin-top:8px;padding:7px 10px;border-radius:4px;font-size:12px"></div>
        </div>
    `;

    // Wire up buttons
    setTimeout(() => _wireApprovalCard(card, approval.id), 0);
    return card;
}

function _wireApprovalCard(card, approvalId) {
    const approveBtn     = card.querySelector(`[data-approve="${approvalId}"]`);
    const denyTriggerBtn = card.querySelector(`[data-deny-trigger="${approvalId}"]`);
    const denyConfirmBtn = card.querySelector(`[data-deny-confirm="${approvalId}"]`);
    const denyCancelBtn  = card.querySelector('[data-deny-cancel]');
    const denyWrap       = card.querySelector('.deny-reason-wrap');
    const denyInput      = card.querySelector('.deny-reason-wrap input');
    const actionsWrap    = card.querySelector('.approval-actions');
    const feedback       = card.querySelector('.approval-feedback');

    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            approveBtn.textContent = 'Approving...';
            approveBtn.disabled = true;
            if (denyTriggerBtn) denyTriggerBtn.disabled = true;

            API.approvals.approve(approvalId).then(() => {
                actionsWrap.style.display = 'none';
                feedback.style.display = 'block';
                feedback.style.background = 'rgba(0,212,170,0.1)';
                feedback.style.border = '1px solid var(--accent-dim)';
                feedback.style.color = 'var(--accent)';
                feedback.textContent = '\u2713 Approved \u2014 resource will be deployed shortly.';
                card.style.borderColor = 'var(--accent-dim)';
                card.style.opacity = '0.7';
                // Refresh tab after brief delay
                setTimeout(() => _renderAdminActiveTab(), 1200);
            }).catch(err => {
                approveBtn.textContent = '\u2713 Approve';
                approveBtn.disabled = false;
                if (denyTriggerBtn) denyTriggerBtn.disabled = false;
                feedback.style.display = 'block';
                feedback.style.background = 'var(--danger-dim)';
                feedback.style.border = '1px solid var(--danger)';
                feedback.style.color = 'var(--danger)';
                feedback.textContent = `Error: ${err.message}`;
            });
        });
    }

    if (denyTriggerBtn) {
        denyTriggerBtn.addEventListener('click', () => {
            denyWrap.style.display = 'block';
            denyTriggerBtn.style.display = 'none';
            denyInput.focus();
        });
    }

    if (denyCancelBtn) {
        denyCancelBtn.addEventListener('click', () => {
            denyWrap.style.display = 'none';
            if (denyTriggerBtn) denyTriggerBtn.style.display = '';
            denyInput.value = '';
        });
    }

    if (denyConfirmBtn) {
        denyConfirmBtn.addEventListener('click', () => {
            const reason = denyInput.value.trim();
            if (!reason) {
                denyInput.style.border = '1px solid var(--danger)';
                denyInput.placeholder = 'Reason is required';
                return;
            }
            denyConfirmBtn.textContent = 'Denying...';
            denyConfirmBtn.disabled = true;

            API.approvals.deny(approvalId, reason).then(() => {
                actionsWrap.style.display = 'none';
                denyWrap.style.display = 'none';
                feedback.style.display = 'block';
                feedback.style.background = 'rgba(255,68,102,0.08)';
                feedback.style.border = '1px solid rgba(255,68,102,0.3)';
                feedback.style.color = 'var(--danger)';
                feedback.textContent = `\u2715 Denied \u2014 "${reason}"`;
                card.style.borderColor = 'rgba(255,68,102,0.3)';
                card.style.opacity = '0.7';
                setTimeout(() => _renderAdminActiveTab(), 1200);
            }).catch(err => {
                denyConfirmBtn.textContent = 'Confirm Deny';
                denyConfirmBtn.disabled = false;
                feedback.style.display = 'block';
                feedback.style.background = 'var(--danger-dim)';
                feedback.style.border = '1px solid var(--danger)';
                feedback.style.color = 'var(--danger)';
                feedback.textContent = `Error: ${err.message}`;
            });
        });
    }
}

// ============================================================
// ACCOUNTING TAB
// ============================================================

function _renderAccountingTab(container) {
    API.costs.getSummary().then(costs => {
        container.innerHTML = '';

        // Summary Cards
        container.appendChild(_buildAccountingSummaryCards(costs));

        // Two column layout: Cost by Team + Cost by Model
        const row = el('div', '');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px';

        row.appendChild(_buildCostByTeamPanel(costs.byTeam));
        row.appendChild(_buildCostByModelPanel(costs.byModel));
        container.appendChild(row);

        // Provider bar
        container.appendChild(_buildProviderBarPanel(costs.byProvider, costs.totalMonthly));

        // Monthly trend chart
        container.appendChild(_buildMonthlyTrendChart(costs.monthlyTrend));

    }).catch(err => {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading cost data: ${err.message}</div>`;
    });
}

function _buildAccountingSummaryCards(costs) {
    const utilPct = Math.round((costs.totalMTD / costs.budget) * 100);
    const utilColor = utilPct >= 90 ? 'var(--danger)'
                    : utilPct >= 75 ? 'var(--warning)'
                    : 'var(--accent)';

    const wrap = el('div', 'summary-cards mb-6');
    wrap.style.gridTemplateColumns = 'repeat(4,1fr)';

    // Total Monthly
    const c1 = el('div', 'summary-card');
    c1.innerHTML = `
        <div class="card-label">Total Monthly</div>
        <div class="card-value" style="color:var(--text-primary);font-size:22px">${fmtCurrency(costs.totalMonthly)}</div>
        <div class="card-sub">Committed fleet cost</div>
    `;
    wrap.appendChild(c1);

    // MTD Spend
    const c2 = el('div', 'summary-card accent');
    c2.innerHTML = `
        <div class="card-label">MTD Spend</div>
        <div class="card-value" style="font-size:22px">${fmtCurrency(costs.totalMTD)}</div>
        <div class="card-sub">Month-to-date actual</div>
    `;
    wrap.appendChild(c2);

    // Budget
    const c3 = el('div', 'summary-card');
    c3.innerHTML = `
        <div class="card-label">Budget</div>
        <div class="card-value" style="font-size:22px">${fmtCurrency(costs.budget)}</div>
        <div class="card-sub">Approved monthly budget</div>
    `;
    wrap.appendChild(c3);

    // Budget Utilization
    const c4 = el('div', 'summary-card');
    c4.innerHTML = `
        <div class="card-label">Budget Utilization</div>
        <div class="card-value" style="font-size:22px;color:${utilColor}">${utilPct}%</div>
        <div style="margin-top:8px">
            <div style="height:5px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${utilPct}%;background:${utilColor};border-radius:3px;transition:width 0.4s ease"></div>
            </div>
        </div>
        <div class="card-sub" style="margin-top:4px">${fmtCurrency(costs.budget - costs.totalMTD)} remaining</div>
    `;
    wrap.appendChild(c4);

    return wrap;
}

function _buildCostByTeamPanel(byTeam) {
    const panel = el('div', 'panel');
    panel.style.cssText = 'margin:0';
    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">Cost by Team</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body no-padding');
    const table = el('table', 'data-table');
    table.innerHTML = `
        <thead><tr>
            <th>Team</th>
            <th>Monthly</th>
            <th>MTD</th>
            <th>Budget</th>
            <th style="min-width:80px">% Used</th>
            <th>GPUs</th>
        </tr></thead>
    `;
    const tbody = el('tbody', '');
    byTeam.forEach(t => {
        const used = Math.round((t.mtd / t.budget) * 100);
        const barColor = used >= 90 ? 'var(--danger)' : used >= 75 ? 'var(--warning)' : 'var(--accent)';
        const row = el('tr', '');
        row.innerHTML = `
            <td style="font-weight:600;font-size:12px">${t.team}</td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${fmtCurrency(t.monthly)}</td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">${fmtCurrency(t.mtd)}</td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${fmtCurrency(t.budget)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:6px">
                    <div style="flex:1;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;min-width:50px">
                        <div style="height:100%;width:${Math.min(used,100)}%;background:${barColor};border-radius:2px"></div>
                    </div>
                    <span style="font-family:var(--font-mono);font-size:10px;color:${barColor};white-space:nowrap">${used}%</span>
                </div>
            </td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${fmt(t.gpus)}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    panel.appendChild(body);
    return panel;
}

function _buildCostByModelPanel(byModel) {
    const panel = el('div', 'panel');
    panel.style.cssText = 'margin:0';
    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">Cost by Model</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body no-padding');
    const table = el('table', 'data-table');
    table.innerHTML = `
        <thead><tr>
            <th>Model</th>
            <th>Monthly Cost</th>
            <th>GPUs</th>
            <th>Provider</th>
        </tr></thead>
    `;
    const tbody = el('tbody', '');
    byModel.forEach(m => {
        const row = el('tr', '');
        const providerColor = m.provider === 'CoreWeave' ? '#7B61FF'
                            : m.provider === 'AWS'       ? '#FF9900'
                            : m.provider === 'Lambda Labs' ? '#FF6B35'
                            : 'var(--text-secondary)';
        row.innerHTML = `
            <td style="font-weight:600;font-size:12px;font-family:var(--font-mono)">${m.model}</td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">${fmtCurrency(m.monthly)}</td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${fmt(m.gpus)}</td>
            <td><span style="font-size:11px;color:${providerColor};font-weight:600">${m.provider}</span></td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    body.appendChild(table);
    panel.appendChild(body);
    return panel;
}

function _buildProviderBarPanel(byProvider, totalMonthly) {
    const panel = el('div', 'panel mb-6');
    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">\u25c6 Cost by Provider</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const providerColors = { 'CoreWeave': '#7B61FF', 'AWS': '#FF9900', 'Lambda Labs': '#FF6B35' };

    // Stacked horizontal bar
    let barHtml = '<div class="h-stacked-bar" style="margin-bottom:12px">';
    byProvider.forEach(p => {
        const color = providerColors[p.provider] || 'var(--info)';
        barHtml += `<div class="h-stacked-segment" style="width:${p.pct}%;background:${color}" title="${p.provider}: ${fmtCurrency(p.monthly)}">
            ${p.pct > 10 ? p.provider : ''}
        </div>`;
    });
    barHtml += '</div>';

    let legendHtml = '<div class="memory-legend" style="margin-top:8px">';
    byProvider.forEach(p => {
        const color = providerColors[p.provider] || 'var(--info)';
        legendHtml += `
            <div class="memory-legend-item">
                <div class="memory-legend-dot" style="background:${color}"></div>
                <span>${p.provider}:</span>
                <span style="font-family:var(--font-mono);margin-left:4px;color:var(--text-primary)">${fmtCurrency(p.monthly)}/mo</span>
                <span style="color:var(--text-muted);margin-left:4px">(${fmt(p.gpus)} GPUs &middot; ${p.pct}%)</span>
            </div>
        `;
    });
    legendHtml += '</div>';

    body.innerHTML = barHtml + legendHtml;
    panel.appendChild(body);
    return panel;
}

function _buildMonthlyTrendChart(monthlyTrend) {
    const panel = el('div', 'panel mb-6');
    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title"><span class="chart-icon">\u25c6</span> Monthly Cost Trend</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const values = monthlyTrend.map(d => d.cost);
    const labels = monthlyTrend.map(d => d.month);
    const maxVal = Math.max(...values) * 1.15;
    const minVal = 0;

    const chartW = 680, chartH = 220, padL = 72, padR = 20, padT = 20, padB = 40;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;
    const n = values.length;

    function xPos(i) { return padL + (i / (n - 1)) * plotW; }
    function yPos(v) { return padT + plotH - ((v - minVal) / (maxVal - minVal)) * plotH; }

    let svgContent = '';

    // Grid lines + Y labels
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
        const v = minVal + ((maxVal - minVal) / gridCount) * i;
        const y = yPos(v);
        svgContent += `<line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" class="grid-line"/>`;
        svgContent += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="axis-label">${fmtCurrency(v)}</text>`;
    }

    // X labels
    labels.forEach((lbl, i) => {
        svgContent += `<text x="${xPos(i)}" y="${chartH - 5}" text-anchor="middle" class="axis-label">${lbl.replace(' 2025', "'25").replace(' 2026', "'26")}</text>`;
    });

    // Area fill
    const areaPoints = values.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ')
        + ` ${xPos(n - 1)},${padT + plotH} ${xPos(0)},${padT + plotH}`;
    svgContent += `<polygon points="${areaPoints}" fill="var(--accent)" opacity="0.08"/>`;

    // Line
    const linePoints = values.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ');
    svgContent += `<polyline points="${linePoints}" class="data-line" stroke="var(--accent)" stroke-width="2"/>`;

    // Dots + value labels
    values.forEach((v, i) => {
        const isLast = i === n - 1;
        svgContent += `<circle cx="${xPos(i)}" cy="${yPos(v)}" r="${isLast ? 5 : 4}" fill="var(--accent)" stroke="var(--bg-primary)" stroke-width="2" class="data-dot"/>`;
        if (isLast) {
            svgContent += `<text x="${xPos(i)}" y="${yPos(v) - 10}" text-anchor="middle" style="font-family:var(--font-mono);font-size:10px;fill:var(--accent);font-weight:700">${fmtCurrency(v)}</text>`;
        }
    });

    body.innerHTML = `
        <div class="chart-container" style="padding:0">
            <svg class="line-chart-svg" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto">${svgContent}</svg>
            <div class="memory-legend" style="margin-top:8px">
                <div class="memory-legend-item">
                    <div class="memory-legend-dot" style="background:var(--accent)"></div>
                    Monthly cloud spend \u2014 Sep 2025 to Feb 2026
                </div>
                <div class="memory-legend-item" style="color:var(--text-muted);font-size:11px">
                    MoM growth: +${Math.round(((values[n-1] - values[0]) / values[0]) * 100)}% over 6 months
                </div>
            </div>
        </div>
    `;
    panel.appendChild(body);
    return panel;
}

// ============================================================
// USERS TAB
// ============================================================

function _renderUsersTab(container) {
    API.auth.getCurrentUser().then(user => {
        container.innerHTML = '';

        // Current user info card
        const currentUserCard = el('div', 'panel mb-6');
        const cuHeader = el('div', 'panel-header');
        cuHeader.innerHTML = '<div class="panel-title">\u25c8 Current Session</div>';
        currentUserCard.appendChild(cuHeader);

        const cuBody = el('div', 'panel-body');
        cuBody.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-dim);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--accent)">
                    ${user.avatar || user.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                    <div style="font-weight:700;font-size:15px">${user.name}</div>
                    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${user.email}</div>
                    <div style="margin-top:4px;display:flex;gap:8px;align-items:center">
                        <span style="font-size:11px;padding:2px 8px;background:rgba(0,212,170,0.12);border:1px solid var(--accent-dim);color:var(--accent);border-radius:3px;letter-spacing:0.05em">${user.role.toUpperCase()}</span>
                        <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${(user.oktaGroups || []).join(', ')}</span>
                    </div>
                </div>
            </div>
        `;
        currentUserCard.appendChild(cuBody);
        container.appendChild(currentUserCard);

        // RBAC roles explanation
        container.appendChild(_buildRBACPanel());

        // User list
        container.appendChild(_buildUserListPanel());

    }).catch(err => {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading user data: ${err.message}</div>`;
    });
}

function _buildRBACPanel() {
    const panel = el('div', 'panel mb-6');
    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">\u229e RBAC Role Definitions</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body');
    body.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:14px';

    const roles = [
        {
            name: 'Admin',
            color: 'var(--accent)',
            colorDim: 'rgba(0,212,170,0.1)',
            border: 'var(--accent-dim)',
            icon: '\u25c8',
            group: 'compute-admins',
            permissions: [
                'Full dashboard access',
                'Approve / deny requests',
                'Manage fleet & contracts',
                'View all cost & accounting',
                'Manage users & audit log',
            ],
        },
        {
            name: 'Operator',
            color: 'var(--info)',
            colorDim: 'rgba(68,136,255,0.1)',
            border: 'rgba(68,136,255,0.3)',
            icon: '\u25c6',
            group: 'compute-operators',
            permissions: [
                'Submit training jobs',
                'Deploy models (pending approval)',
                'Scale existing deployments',
                'View cost summaries',
                'Read-only fleet view',
            ],
        },
        {
            name: 'Viewer',
            color: 'var(--text-secondary)',
            colorDim: 'rgba(150,150,180,0.08)',
            border: 'var(--border-primary)',
            icon: '\u25a4',
            group: 'compute-viewers',
            permissions: [
                'Read-only dashboard access',
                'View fleet status',
                'View job queue (no submit)',
                'View model registry',
                'No cost data access',
            ],
        },
    ];

    roles.forEach(role => {
        const card = el('div', '');
        card.style.cssText = `padding:14px;background:${role.colorDim};border:1px solid ${role.border};border-radius:6px`;
        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="color:${role.color};font-size:16px">${role.icon}</span>
                <span style="font-weight:700;font-size:14px;color:${role.color}">${role.name}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Okta group: <span style="font-family:var(--font-mono);color:var(--text-secondary)">${role.group}</span></div>
            <ul style="list-style:none;padding:0;margin:0">
                ${role.permissions.map(p => `
                    <li style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--text-secondary);padding:3px 0">
                        <span style="color:${role.color};margin-top:1px">&middot;</span> ${p}
                    </li>
                `).join('')}
            </ul>
        `;
        body.appendChild(card);
    });

    panel.appendChild(body);
    return panel;
}

function _buildUserListPanel() {
    const panel = el('div', 'panel mb-6');
    const header = el('div', 'panel-header');
    header.innerHTML = '<div class="panel-title">Users</div>';
    panel.appendChild(header);

    const body = el('div', 'panel-body no-padding');

    const table = el('table', 'data-table');
    table.innerHTML = `
        <thead><tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Okta Groups</th>
            <th>Last Active</th>
        </tr></thead>
    `;
    const tbody = el('tbody', '');

    _adminUsers.forEach(u => {
        const roleColor = u.role === 'Admin'    ? 'var(--accent)'
                        : u.role === 'Operator' ? 'var(--info)'
                        : 'var(--text-secondary)';
        const roleBg    = u.role === 'Admin'    ? 'rgba(0,212,170,0.1)'
                        : u.role === 'Operator' ? 'rgba(68,136,255,0.1)'
                        : 'rgba(150,150,180,0.08)';
        const roleBorder = u.role === 'Admin'    ? 'var(--accent-dim)'
                         : u.role === 'Operator' ? 'rgba(68,136,255,0.3)'
                         : 'var(--border-primary)';

        const isCurrentUser = u.email === 'austin.hollan@perplexity.ai';

        const row = el('tr', '');
        if (isCurrentUser) row.style.background = 'rgba(0,212,170,0.03)';
        row.innerHTML = `
            <td style="font-weight:600;font-size:13px">
                ${u.name}
                ${isCurrentUser ? '<span style="font-size:10px;color:var(--accent);margin-left:6px">(you)</span>' : ''}
            </td>
            <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${u.email}</td>
            <td>
                <span style="font-size:11px;padding:2px 8px;background:${roleBg};border:1px solid ${roleBorder};color:${roleColor};border-radius:3px;letter-spacing:0.04em">
                    ${u.role.toUpperCase()}
                </span>
            </td>
            <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${u.groups}</td>
            <td style="font-size:12px;color:${u.lastActive === 'Now' ? 'var(--accent)' : 'var(--text-muted)'}">
                ${u.lastActive === 'Now' ? '<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:7px;height:7px;border-radius:50%;background:var(--accent);display:inline-block;animation:pulse 2s infinite"></span>Now</span>' : u.lastActive}
            </td>
        `;
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    body.appendChild(table);

    const footer = el('div', '');
    footer.style.cssText = 'padding:10px 16px;border-top:1px solid var(--border-secondary);font-size:11px;color:var(--text-muted);background:var(--bg-secondary)';
    footer.innerHTML = '\u21b3 User management synced from <span style="color:var(--text-secondary)">Okta</span>. To add/remove users, update Okta group memberships.';
    body.appendChild(footer);

    panel.appendChild(body);
    return panel;
}

// ============================================================
// AUDIT LOG TAB
// ============================================================

function _renderAuditTab(container) {
    API.audit.list(100).then(entries => {
        container.innerHTML = '';

        const panel = el('div', 'panel mb-6');
        const header = el('div', 'panel-header');

        // Refresh button in header
        const refreshBtn = el('button', 'btn');
        refreshBtn.style.cssText = 'font-size:11px;padding:3px 10px;background:rgba(0,212,170,0.08);border:1px solid var(--accent-dim);color:var(--accent)';
        refreshBtn.textContent = '\u21b3 Refresh';
        refreshBtn.addEventListener('click', () => {
            _adminTab = 'audit';
            _renderAdminActiveTab();
        });

        header.innerHTML = '<div class="panel-title">\u25a4 Audit Log</div>';
        header.appendChild(refreshBtn);
        panel.appendChild(header);

        const body = el('div', 'panel-body no-padding');

        const table = el('table', 'data-table');
        table.innerHTML = `
            <thead><tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Target</th>
                <th>Details</th>
            </tr></thead>
        `;
        const tbody = el('tbody', '');

        entries.forEach(entry => {
            const ts = new Date(entry.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            });

            const actionBadge = _auditActionBadge(entry.action);

            const row = el('tr', '');
            row.innerHTML = `
                <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);white-space:nowrap">${ts}</td>
                <td>${actionBadge}</td>
                <td style="font-size:12px;color:var(--text-secondary)">${entry.user}</td>
                <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${entry.target}</td>
                <td style="font-size:12px;color:var(--text-secondary);max-width:300px">${entry.details || '\u2014'}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        body.appendChild(table);

        if (entries.length === 0) {
            const empty = el('div', '');
            empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-size:12px;letter-spacing:0.06em';
            empty.textContent = 'No audit log entries';
            body.appendChild(empty);
        }

        panel.appendChild(body);
        container.appendChild(panel);

    }).catch(err => {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error loading audit log: ${err.message}</div>`;
    });
}

function _auditActionBadge(action) {
    const config = {
        'approve':          { color: 'var(--accent)',    bg: 'rgba(0,212,170,0.12)',   border: 'var(--accent-dim)',           label: 'APPROVE' },
        'deny':             { color: 'var(--danger)',    bg: 'rgba(255,68,102,0.1)',   border: 'rgba(255,68,102,0.3)',        label: 'DENY' },
        'scale':            { color: 'var(--info)',      bg: 'rgba(68,136,255,0.1)',   border: 'rgba(68,136,255,0.3)',        label: 'SCALE' },
        'deploy':           { color: 'var(--purple)',    bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',        label: 'DEPLOY' },
        'submit_job':       { color: 'var(--warning)',   bg: 'rgba(255,184,0,0.1)',    border: 'rgba(255,184,0,0.3)',         label: 'SUBMIT JOB' },
        'submit_deployment':{ color: 'var(--purple)',    bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',        label: 'SUBMIT DEPLOY' },
        'register_model':   { color: 'var(--info)',      bg: 'rgba(68,136,255,0.1)',   border: 'rgba(68,136,255,0.3)',        label: 'REGISTER' },
        'cancel_job':       { color: 'var(--danger)',    bg: 'rgba(255,68,102,0.1)',   border: 'rgba(255,68,102,0.3)',        label: 'CANCEL' },
        'teardown':         { color: 'var(--danger)',    bg: 'rgba(255,68,102,0.1)',   border: 'rgba(255,68,102,0.3)',        label: 'TEARDOWN' },
        'complete_job':     { color: 'var(--accent)',    bg: 'rgba(0,212,170,0.08)',   border: 'var(--accent-dim)',           label: 'COMPLETE' },
    };
    const c = config[action] || { color: 'var(--text-secondary)', bg: 'rgba(150,150,180,0.08)', border: 'var(--border-primary)', label: action.toUpperCase() };
    return `<span style="font-size:10px;padding:2px 7px;background:${c.bg};border:1px solid ${c.border};color:${c.color};border-radius:3px;letter-spacing:0.05em;font-weight:600;white-space:nowrap">${c.label}</span>`;
}

// ============================================================
// UTILITIES
// ============================================================

function _timeAgo(isoStr) {
    if (!isoStr) return '\u2014';
    const now  = Date.now();
    const then = new Date(isoStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60)          return `${diff}s ago`;
    if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
