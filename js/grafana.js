// ============================================================
// SECTION 9: GRAFANA CONNECTOR
// ============================================================

function renderGrafanaConnector() {
    const section = document.getElementById('section-grafana');
    section.innerHTML = '';

    let html = '';

    // A. Connection Setup Panel
    html += `<div class="panel mb-6"><div class="panel-header"><div class="panel-title">Connection Setup</div></div>
    <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr) auto;gap:12px;align-items:end">
            <div class="form-group" style="margin-bottom:0">
                <label class="form-label">Grafana URL</label>
                <input type="text" class="form-input" id="grafanaUrl" placeholder="https://grafana.perplexity.internal:3000">
            </div>
            <div class="form-group" style="margin-bottom:0">
                <label class="form-label">API Key / Service Account Token</label>
                <input type="password" class="form-input" id="grafanaApiKey" placeholder="glsa_xxxxxxxxx...">
            </div>
            <div class="form-group" style="margin-bottom:0">
                <label class="form-label">Organization ID</label>
                <input type="number" class="form-input" id="grafanaOrgId" value="1" min="1">
            </div>
            <button class="btn btn-primary" id="grafanaTestBtn" style="height:34px">Test Connection</button>
        </div>
        <div id="grafanaTestResult" style="margin-top:10px"></div>
    </div></div>`;

    // B. Provider Connection Cards
    html += `<div class="section-header"><div class="section-title">Provider Connections</div></div>`;
    html += `<div class="grafana-connection-cards">`;

    // CoreWeave
    html += `<div class="grafana-conn-card" style="border-top:3px solid #7B61FF">
        <div class="gcc-status"><span class="gcc-status-dot connected"></span> <span class="text-accent">Connected</span></div>
        <div style="font-weight:700;margin-bottom:6px">CoreWeave Grafana</div>
        <div class="gcc-url">https://grafana.coreweave.cloud</div>
        <div class="gcc-details">
            Dashboards discovered: <strong>14</strong><br>
            Data sources: Prometheus (DCGM Exporter), Loki (logs)<br>
            Fleet: <strong>720 GB200 NVL72</strong> (10 racks)<br>
            Last sync: <span class="text-accent">2 min ago</span>
        </div>
        <div class="gcc-actions">
            <a href="#" class="btn btn-sm" target="_blank">Open in Grafana</a>
            <button class="btn btn-sm btn-primary" onclick="toggleDashboardList('cwDashList')">View Dashboards</button>
        </div>
        <div id="cwDashList" style="display:none;margin-top:10px;border-top:1px solid var(--border-secondary);padding-top:8px">
            <ul class="dashboard-list">
                <li>GPU Utilization Overview</li>
                <li>DCGM Exporter Metrics</li>
                <li>Training Job Monitor</li>
                <li>Node Health & Alerts</li>
                <li>NVLink Bandwidth</li>
                <li>Power & Thermal</li>
                <li>Memory Utilization Trends</li>
                <li>PCIe Throughput</li>
                <li>ECC Error Tracking</li>
                <li>Cluster Capacity Overview</li>
                <li>Job Cost Attribution</li>
                <li>SLA Compliance</li>
            </ul>
        </div>
    </div>`;

    // Lambda Labs
    html += `<div class="grafana-conn-card" style="border-top:3px solid #FF6B35">
        <div class="gcc-status"><span class="gcc-status-dot connected"></span> <span class="text-accent">Connected</span></div>
        <div style="font-weight:700;margin-bottom:6px">Lambda Labs</div>
        <div class="gcc-url">https://cloud.lambda.ai/grafana</div>
        <div class="gcc-details">
            Dashboards discovered: <strong>8</strong><br>
            Data sources: Prometheus (DCGM Exporter)<br>
            Fleet: <strong>352 H100 SXM</strong><br>
            Last sync: <span class="text-accent">5 min ago</span>
        </div>
        <div class="gcc-actions">
            <a href="#" class="btn btn-sm" target="_blank">Open in Grafana</a>
            <button class="btn btn-sm btn-primary" onclick="toggleDashboardList('lambdaDashList')">View Dashboards</button>
        </div>
        <div id="lambdaDashList" style="display:none;margin-top:10px;border-top:1px solid var(--border-secondary);padding-top:8px">
            <ul class="dashboard-list">
                <li>GPU Utilization Overview</li>
                <li>DCGM Exporter Metrics</li>
                <li>Instance Health Monitor</li>
                <li>ROCm MI300X Dashboard</li>
                <li>NVLink & Interconnect</li>
                <li>Power Consumption</li>
                <li>Error & Event Log</li>
                <li>Fleet Summary</li>
            </ul>
        </div>
    </div>`;

    // AWS CloudWatch
    html += `<div class="grafana-conn-card" style="border-top:3px solid #FF9900">
        <div class="gcc-status"><span class="gcc-status-dot disconnected"></span> <span class="text-warning">Requires Configuration</span></div>
        <div style="font-weight:700;margin-bottom:6px">AWS CloudWatch</div>
        <div class="gcc-details" style="margin-top:6px">
            AWS GPU metrics use CloudWatch Agent with DCGM. Configure CloudWatch as a Grafana data source or use CloudWatch directly.<br>
            Fleet: <strong>305 H100 SXM + 1,808 H200 SXM</strong>
        </div>
        <div style="margin-top:8px">
            <div class="form-group" style="margin-bottom:8px">
                <label class="form-label">AWS Region</label>
                <select class="form-select" style="padding:4px 8px">
                    <option>us-east-1</option><option>us-west-2</option><option>eu-west-1</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom:8px">
                <label class="form-label">CloudWatch Namespace</label>
                <input class="form-input" placeholder="CWAgent/GPU" style="padding:4px 8px">
            </div>
            <div class="form-group" style="margin-bottom:8px">
                <label class="form-label">IAM Role ARN</label>
                <input class="form-input" placeholder="arn:aws:iam::role/grafana-cloudwatch-role" style="padding:4px 8px">
            </div>
            <button class="btn btn-sm btn-warning">Configure</button>
        </div>
    </div>`;

    html += '</div>';

    // C. Embedded Dashboard Preview
    html += `<div class="section-header"><div class="section-title">Embedded Dashboard Preview</div></div>`;
    html += renderGrafanaEmbedPreview();

    // D. DCGM Metrics Reference
    html += renderDCGMReference();

    // E. Integration Guide
    html += `<div class="section-header"><div class="section-title">Integration Guide</div></div>`;
    html += renderIntegrationGuide();

    section.innerHTML = html;

    document.getElementById('grafanaTestBtn').addEventListener('click', simulateConnectionTest);
}

function toggleDashboardList(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function simulateConnectionTest() {
    const btn = document.getElementById('grafanaTestBtn');
    const result = document.getElementById('grafanaTestResult');
    const url = document.getElementById('grafanaUrl').value;

    btn.disabled = true;
    result.innerHTML = '<span class="conn-spinner"></span> Testing connection...';

    setTimeout(() => {
        btn.disabled = false;
        if (url && url.includes('http')) {
            result.innerHTML = '<span class="conn-success">\u2713 Connection Successful</span> \u2014 Grafana v10.4.1 detected, 3 data sources available';
        } else {
            result.innerHTML = '<span class="conn-error">\u2716 Connection Failed</span> \u2014 Please enter a valid Grafana URL (must start with https://)';
        }
    }, 2000);
}

function renderGrafanaEmbedPreview() {
    function grafanaLine(baseVal, variance, points) {
        const data = [];
        let v = baseVal;
        for (let i = 0; i < points; i++) {
            v += (Math.random() - 0.48) * variance;
            v = Math.max(baseVal * 0.5, Math.min(baseVal * 1.5, v));
            data.push(v);
        }
        return data;
    }

    const grafanaColors = ['#73BF69', '#5794F2', '#FADE2A', '#FF9830', '#F2495C', '#B877D9', '#8AB8FF', '#FF6B35'];
    const timePoints = 36;

    function grafanaSvgLines(seriesArr, w, h, threshold) {
        const allVals = seriesArr.flat();
        const minV = Math.min(...allVals) * 0.9;
        const maxV = Math.max(...allVals) * 1.1;
        const range = maxV - minV || 1;

        let svg = '';
        for (let i = 0; i < 4; i++) {
            const y = (h / 4) * i + 5;
            svg += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#2C2F36" stroke-width="0.5"/>`;
        }

        if (threshold !== undefined) {
            const ty = h - ((threshold - minV) / range) * (h - 10) + 5;
            svg += `<line x1="0" y1="${ty}" x2="${w}" y2="${ty}" stroke="#F2495C" stroke-width="1" stroke-dasharray="4 3"/>`;
        }

        seriesArr.forEach((series, si) => {
            const points = series.map((v, i) => {
                const x = (i / (series.length - 1)) * w;
                const y = h - ((v - minV) / range) * (h - 10) + 5;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            const areaPoints = points + ` ${w},${h} 0,${h}`;
            svg += `<polygon points="${areaPoints}" fill="${grafanaColors[si % grafanaColors.length]}" opacity="0.05"/>`;
            svg += `<polyline points="${points}" fill="none" stroke="${grafanaColors[si % grafanaColors.length]}" stroke-width="1.5" stroke-linejoin="round"/>`;
        });

        return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100px">${svg}</svg>`;
    }

    function grafanaSvgStacked(seriesArr, w, h) {
        const maxTotal = Math.max(...Array.from({length: seriesArr[0].length}, (_, i) => seriesArr.reduce((s, sr) => s + sr[i], 0)));
        const range = maxTotal * 1.1 || 1;
        let svg = '';
        for (let i = 0; i < 4; i++) {
            const y = (h / 4) * i + 5;
            svg += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#2C2F36" stroke-width="0.5"/>`;
        }

        const bottom = Array(seriesArr[0].length).fill(h);
        seriesArr.forEach((series, si) => {
            const tops = series.map((v, i) => {
                const stackH = (v / range) * (h - 10);
                return bottom[i] - stackH;
            });
            let path = `M 0,${bottom[0]}`;
            tops.forEach((y, i) => {
                const x = (i / (series.length - 1)) * w;
                path += ` L ${x},${y}`;
            });
            for (let i = tops.length - 1; i >= 0; i--) {
                const x = (i / (series.length - 1)) * w;
                path += ` L ${x},${bottom[i]}`;
            }
            path += ' Z';
            svg += `<path d="${path}" fill="${grafanaColors[si % grafanaColors.length]}" opacity="0.6"/>`;
            tops.forEach((y, i) => { bottom[i] = y; });
        });

        return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100px">${svg}</svg>`;
    }

    const utilSeries = Array.from({length: 8}, () => grafanaLine(85, 8, timePoints));
    const memSeries = Array.from({length: 8}, () => grafanaLine(60, 5, timePoints));
    const tempSeries = Array.from({length: 8}, () => grafanaLine(67, 4, timePoints));
    const powerSeries = Array.from({length: 8}, () => grafanaLine(680, 30, timePoints));

    let html = `<div class="grafana-embed">
        <div class="grafana-embed-title">
            <span>CoreWeave GB200 NVL72 DCGM Exporter Dashboard \u2014 Last 6 hours</span>
            <span class="ge-time">Auto-refresh: 30s | cw-gb200-nvl72-001</span>
        </div>
        <div class="grafana-embed-grid">
            <div class="grafana-panel">
                <div class="grafana-panel-title">GPU Utilization %</div>
                ${grafanaSvgLines(utilSeries, 300, 100)}
            </div>
            <div class="grafana-panel">
                <div class="grafana-panel-title">GPU Memory Used (GB)</div>
                ${grafanaSvgStacked(memSeries, 300, 100)}
            </div>
            <div class="grafana-panel">
                <div class="grafana-panel-title">Temperature per GPU (\u00b0C)</div>
                ${grafanaSvgLines(tempSeries, 300, 100, 80)}
            </div>
            <div class="grafana-panel">
                <div class="grafana-panel-title">Power Draw per GPU (W)</div>
                ${grafanaSvgLines(powerSeries, 300, 100)}
            </div>
        </div>
        <div style="padding:8px 16px;font-size:10px;color:#8B8E99;border-top:1px solid #2C2F36">
            Live dashboard preview. For full interactive experience, <a href="#" style="color:#5794F2">open in Grafana \u2192</a>
        </div>
    </div>`;

    return html;
}

function renderDCGMReference() {
    const metrics = [
        ['DCGM_FI_DEV_GPU_UTIL', 'GPU Utilization (%)'],
        ['DCGM_FI_DEV_MEM_COPY_UTIL', 'Memory Utilization (%)'],
        ['DCGM_FI_DEV_GPU_TEMP', 'GPU Temperature (\u00b0C)'],
        ['DCGM_FI_DEV_POWER_USAGE', 'Power Draw (W)'],
        ['DCGM_FI_DEV_FB_FREE', 'Free Framebuffer Memory (MB)'],
        ['DCGM_FI_DEV_FB_USED', 'Used Framebuffer Memory (MB)'],
        ['DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL', 'NVLink Bandwidth (MB/s)'],
        ['DCGM_FI_DEV_PCIE_TX_THROUGHPUT', 'PCIe TX Throughput (KB/s)'],
        ['DCGM_FI_DEV_PCIE_RX_THROUGHPUT', 'PCIe RX Throughput (KB/s)'],
        ['DCGM_FI_DEV_SM_CLOCK', 'SM Clock (MHz)'],
        ['DCGM_FI_DEV_MEM_CLOCK', 'Memory Clock (MHz)'],
        ['DCGM_FI_DEV_XID_ERRORS', 'XID Error Count'],
        ['DCGM_FI_DEV_ECC_SBE_VOL_TOTAL', 'Single-Bit ECC Errors'],
        ['DCGM_FI_DEV_ECC_DBE_VOL_TOTAL', 'Double-Bit ECC Errors'],
        ['DCGM_FI_DEV_RETIRED_SBE', 'Retired Pages (Single-Bit)'],
        ['DCGM_FI_DEV_RETIRED_DBE', 'Retired Pages (Double-Bit)'],
        ['DCGM_FI_DEV_THROTTLE_REASONS', 'Active Throttle Reasons'],
    ];

    let rows = metrics.map(([name, desc]) =>
        `<div class="dcgm-metric"><span class="dm-name">${name}</span><span class="dm-desc">\u2014 ${desc}</span></div>`
    ).join('');

    return `<div class="dcgm-ref">
        <div class="dcgm-ref-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <span>DCGM Metrics Reference (${metrics.length} metrics)</span>
            <span>\u25bc</span>
        </div>
        <div class="dcgm-ref-body">${rows}</div>
    </div>`;
}

function renderIntegrationGuide() {
    return `<div class="integration-guide"><span class="ig-comment"># Grafana Integration Setup</span>

<h2>1. CoreWeave (Kubernetes / SUNK)</h2>
CoreWeave provides Grafana dashboards via CoreWeave Observe.
<span class="ig-cmd">\u2192</span> Navigate to CoreWeave dashboard \u2192 Observability
<span class="ig-cmd">\u2192</span> DCGM Exporter runs as a DaemonSet on all GPU nodes
<span class="ig-cmd">\u2192</span> Prometheus scrapes DCGM metrics at :9400/metrics
<span class="ig-cmd">\u2192</span> Import dashboard ID 12239 for NVIDIA DCGM Exporter

<h2>2. Lambda Labs</h2>
<span class="ig-cmd">\u2192</span> SSH into instances to install DCGM Exporter
<span class="ig-cmd">\u2192</span> Configure Prometheus to scrape Lambda instance IPs
<span class="ig-cmd">\u2192</span> Or use Lambda's built-in monitoring dashboard
<span class="ig-comment"># Example: Install DCGM Exporter on Lambda instance</span>
<span class="ig-cmd">$ docker run -d --gpus all -p 9400:9400 nvcr.io/nvidia/k8s/dcgm-exporter:latest</span>

<h2>3. AWS (CloudWatch)</h2>
<span class="ig-cmd">\u2192</span> Install CloudWatch Agent on P4de/P5e instances
<span class="ig-cmd">\u2192</span> Enable nvidia_gpu metrics collection
<span class="ig-cmd">\u2192</span> Configure CloudWatch as Grafana data source
<span class="ig-cmd">\u2192</span> Or use AWS CloudWatch NVIDIA GPU Solution dashboard
<span class="ig-comment"># CloudWatch Agent config excerpt</span>
<span class="ig-cmd">{
  "metrics": {
    "namespace": "CWAgent/GPU",
    "nvidia_gpu": {
      "measurement": ["utilization_gpu", "utilization_memory",
                      "temperature_gpu", "power_draw"]
    }
  }
}</span></div>`;
}
