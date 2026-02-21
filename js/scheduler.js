// ============================================================
// SECTION 4: JOB SCHEDULER
// ============================================================

let schedulerJobs = [...activeJobs.map(j=>({...j})), ...queuedJobs.map(j=>({...j}))];

function renderJobScheduler() {
    const section = document.getElementById('section-scheduler');
    section.innerHTML = '';

    // New Job Form
    let formHtml = `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">Schedule New Job</div></div>
    <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
            <div class="form-group"><label class="form-label">Job Name</label><input type="text" class="form-input" id="newJobName" placeholder="My training job"></div>
            <div class="form-group"><label class="form-label">Workload Type</label>
                <select class="form-select" id="newJobType"><option>Training</option><option>Inference</option><option>Batch</option></select>
            </div>
            <div class="form-group"><label class="form-label">Model</label><input type="text" class="form-input" id="newJobModel" placeholder="e.g. Llama-70B"></div>
            <div class="form-group"><label class="form-label">GPU Type</label>
                <select class="form-select" id="newJobGPU"><option>H100 SXM</option><option>H200 SXM</option><option>GB200 NVL72</option></select>
            </div>
            <div class="form-group"><label class="form-label">GPU Count</label><input type="number" class="form-input" id="newJobCount" value="8" min="1"></div>
            <div class="form-group"><label class="form-label">Priority</label>
                <select class="form-select" id="newJobPriority"><option>P0</option><option>P1</option><option selected>P2</option><option>P3</option></select>
            </div>
            <div class="form-group"><label class="form-label">Est. Duration</label><input type="text" class="form-input" id="newJobDuration" placeholder="e.g. 3d, 12h"></div>
            <div class="form-group"><label class="form-label">Max Budget ($)</label><input type="number" class="form-input" id="newJobBudget" value="10000" min="100"></div>
        </div>
        <div style="text-align:right;margin-top:8px"><button class="btn btn-primary" id="addJobBtn">+ Add to Queue</button></div>
    </div></div>`;

    // Job Queue Table
    const running = schedulerJobs.filter(j=>j.status==='running');
    const queued = schedulerJobs.filter(j=>j.status!=='running');

    let queueHtml = `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">Job Queue</div>
        <div style="display:flex;gap:8px">
            <span class="badge badge-active">${running.length} running</span>
            <span class="badge badge-idle">${queued.length} queued</span>
        </div>
    </div><div class="panel-body no-padding">
    <table class="data-table" id="jobQueueTable"><thead><tr>
        <th>Status</th><th>Job Name</th><th>Type</th><th>GPUs</th><th>Priority</th><th>Duration/Est</th><th>Cost/Budget</th>
    </tr></thead><tbody>`;
    schedulerJobs.forEach(j => {
        const statusBadge = j.status==='running' ? 'badge-active' : j.status==='scheduled' ? 'badge-info' : 'badge-idle';
        const statusLabel = j.status === 'running' ? 'RUNNING' : j.status === 'scheduled' ? 'SCHEDULED' : 'QUEUED';
        queueHtml += `<tr>
            <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
            <td style="font-family:var(--font-ui);font-weight:600">${j.name}</td>
            <td>${j.type||'training'}</td>
            <td class="text-mono">${j.gpus || j.gpu_count+'x '+j.gpu_type}</td>
            <td><span class="badge ${j.priority==='P0'?'badge-active':j.priority==='P1'?'badge-info':'badge-idle'}">${j.priority}</span></td>
            <td class="text-mono">${j.running||j.est_duration||'—'}</td>
            <td class="text-mono text-warning">${j.cost?fmtCurrency(j.cost):(j.max_budget?'≤'+fmtCurrency(j.max_budget):'—')}</td>
        </tr>`;
    });
    if (schedulerJobs.length === 0) {
        queueHtml += '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">No active jobs. Connect to your cluster to see real-time job data.</td></tr>';
    }
    queueHtml += '</tbody></table></div></div>';

    // Gantt timeline
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let ganttHtml = `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">Resource Timeline — This Week</div></div><div class="panel-body">`;
    ganttHtml += `<div class="timeline-header"><div class="timeline-label-spacer"></div><div class="timeline-days">${days.map(d=>`<div class="timeline-day">${d}</div>`).join('')}</div></div>`;

    const ganttColors = ['var(--accent)','#4488FF','#8B5CF6','#E91E63','#FF9900','var(--warning)','#06B6D4','#10B981','#FF4466','#F59E0B'];
    const allRunning = schedulerJobs.filter(j=>j.status==='running');
    allRunning.slice(0,10).forEach((j, i) => {
        // Simulate random start/end positions
        const startDay = i < 3 ? 0 : i < 6 ? Math.floor(i/2) : Math.floor(i/3);
        const endDay = Math.min(6, startDay + 2 + Math.floor(Math.random()*4));
        const leftPct = (startDay/7*100);
        const widthPct = ((endDay-startDay+1)/7*100);
        ganttHtml += `<div class="gantt-row">
            <div class="gantt-label" title="${j.name}">${j.name.substring(0,25)}${j.name.length>25?'...':''}</div>
            <div class="gantt-track">
                <div class="gantt-bar" style="left:${leftPct}%;width:${widthPct}%;background:${ganttColors[i%ganttColors.length]}">${j.gpus||''}</div>
            </div>
        </div>`;
    });
    const scheduledJobs = schedulerJobs.filter(j=>j.status!=='running').slice(0,4);
    scheduledJobs.forEach((j, i) => {
        const startDay = 3 + i;
        const endDay = Math.min(6, startDay + 1 + i);
        const leftPct = (startDay/7*100);
        const widthPct = ((endDay-startDay+1)/7*100);
        ganttHtml += `<div class="gantt-row">
            <div class="gantt-label" title="${j.name}" style="color:var(--text-muted)">${j.name.substring(0,25)}${j.name.length>25?'...':''}</div>
            <div class="gantt-track">
                <div class="gantt-bar" style="left:${leftPct}%;width:${widthPct}%;background:var(--border-primary);color:var(--text-muted)">${j.gpu_count||''}x ${(j.gpu_type||'').split(' ')[0]}</div>
            </div>
        </div>`;
    });
    ganttHtml += '</div></div>';

    // Resource calendar
    let calendarHtml = `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">GPU Allocation Calendar</div></div><div class="panel-body">`;
    calendarHtml += '<div class="calendar-grid">';
    // Header row
    calendarHtml += '<div class="calendar-header-cell"></div>';
    days.forEach(d => calendarHtml += `<div class="calendar-header-cell">${d}</div>`);
    // GPU type rows
    const gpuRowTypes = ['H100 SXM', 'H200 SXM', 'GB200 NVL72'];
    const gpuRowTotals = {'H100 SXM':657,'H200 SXM':1808,'GB200 NVL72':720};
    gpuRowTypes.forEach(gt => {
        calendarHtml += `<div class="calendar-cell calendar-label">${gt}<br><span class="text-xs">${gpuRowTotals[gt]} total</span></div>`;
        days.forEach((d, di) => {
            const used = Math.floor(gpuRowTotals[gt] * (0.7 + Math.random()*0.25));
            const free = gpuRowTotals[gt] - used;
            const usedPct = (used/gpuRowTotals[gt]*100);
            calendarHtml += `<div class="calendar-cell">
                <div style="height:4px;background:var(--bg-primary);border-radius:2px;overflow:hidden;margin-bottom:4px">
                    <div style="height:100%;width:${usedPct}%;background:${usedPct>90?'var(--danger)':usedPct>70?'var(--warning)':'var(--accent)'}"></div>
                </div>
                <span class="text-mono text-xs">${used}/${gpuRowTotals[gt]}</span>
                ${free>0?`<span class="text-xs text-accent"> (${free} free)</span>`:''}
            </div>`;
        });
    });
    calendarHtml += '</div></div></div>';

    // Scheduling suggestions
    let suggestHtml = `<div class="panel"><div class="panel-header"><div class="panel-title">⚡ Scheduling Suggestions</div></div>
    <div class="panel-body no-padding">
        <div class="savings-item">
            <div class="savings-icon" style="background:var(--info-dim);color:var(--info)">🕐</div>
            <div class="savings-text">
                <div class="savings-title">Move "Code-Llama 70B Fine-tune" to Wednesday slot</div>
                <div class="savings-desc">8 H200 GPUs free up Wed morning. Job can start 6 hours earlier than current Thursday slot.</div>
            </div>
        </div>
        <div class="savings-item">
            <div class="savings-icon" style="background:var(--accent-dim);color:var(--accent)">🔄</div>
            <div class="savings-text">
                <div class="savings-title">Batch "Code Model Evaluation" with "Safety Evaluation Suite"</div>
                <div class="savings-desc">Both use A100s. Run sequentially on same allocation to avoid scheduler overhead. Saves ~2hr setup time.</div>
            </div>
        </div>
        <div class="savings-item">
            <div class="savings-icon" style="background:var(--warning-dim);color:var(--warning)">⬆️</div>
            <div class="savings-text">
                <div class="savings-title">Upgrade "Embedding v3 Training" from A100 to H100</div>
                <div class="savings-desc">16 idle H100s available. ~3x faster training, net savings $1.2K despite higher hourly rate.</div>
            </div>
        </div>
    </div></div>`;

    section.innerHTML = formHtml + queueHtml + ganttHtml + calendarHtml + suggestHtml;

    // Wire up add job button
    document.getElementById('addJobBtn').addEventListener('click', () => {
        const name = document.getElementById('newJobName').value || 'Untitled Job';
        const type = document.getElementById('newJobType').value.toLowerCase();
        const gpu_type = document.getElementById('newJobGPU').value;
        const gpu_count = parseInt(document.getElementById('newJobCount').value)||8;
        const priority = document.getElementById('newJobPriority').value;
        const est_duration = document.getElementById('newJobDuration').value || '1d';
        const max_budget = parseInt(document.getElementById('newJobBudget').value)||10000;
        schedulerJobs.push({
            name, type, gpu_type, gpu_count,
            gpus: gpu_count+'x '+gpu_type,
            priority, est_duration, max_budget,
            status:'queued'
        });
        renderJobScheduler();
    });
}
