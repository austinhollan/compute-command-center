// ============================================================
// NAVIGATION & INIT
// ============================================================

const sectionTitles = {
    fleet: { title:'Fleet Dashboard', breadcrumb:'Overview › Real-time Fleet Status' },
    advisor: { title:'GPU Advisor', breadcrumb:'Tools › Workload Configuration Wizard' },
    cost: { title:'Cost Analyzer', breadcrumb:'Finance › Cost Analysis & Optimization' },
    scheduler: { title:'Job Scheduler', breadcrumb:'Operations › Job Queue & Scheduling' },
    capacity: { title:'Capacity Planner', breadcrumb:'Planning › Growth & Procurement' },
    knowledge: { title:'GPU Knowledge Base', breadcrumb:'Reference › GPU Specifications & Comparison' },
    reports: { title:'Reports', breadcrumb:'Export › Fleet Reports & Summaries' },
    monitoring: { title:'GPU Monitoring', breadcrumb:'Operations › Real-time GPU Telemetry & Health' },
    grafana: { title:'Grafana Connector', breadcrumb:'Integrations › Grafana Dashboard Configuration' },
    models:  { title:'Model Registry',     breadcrumb:'MLOps › Model Versioning & Deployment' },
    admin:   { title:'Admin Dashboard',    breadcrumb:'Admin › Approvals, Accounting, Users & Audit' },
};

let currentSection = 'fleet';

function navigateTo(sectionId) {
    if(currentSection === sectionId) return;
    currentSection = sectionId;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Update page title
    const st = sectionTitles[sectionId] || {};
    document.getElementById('pageTitle').textContent = st.title || '';
    document.getElementById('pageBreadcrumb').innerHTML = st.breadcrumb || '';

    // Show section
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + sectionId);
    if(target) target.classList.add('active');

    // Render on demand
    renderSection(sectionId);
}

function renderSection(id) {
    switch(id) {
        case 'fleet': renderFleetDashboard(); break;
        case 'advisor': renderGPUAdvisor(); break;
        case 'cost': renderCostAnalyzer(); break;
        case 'scheduler': renderJobScheduler(); break;
        case 'capacity': renderCapacityPlanner(); break;
        case 'knowledge': renderKnowledgeBase(); break;
        case 'reports': renderReports(); break;
        case 'monitoring': renderGPUMonitoring(); break;
        case 'grafana': renderGrafanaConnector(); break;
        case 'models':  renderModelManagement();   break;
        case 'admin':   renderAdminDashboard();    break;
    }
}

// Nav click handlers
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.section);
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    const sections = ['fleet','scheduler','models','monitoring','advisor','capacity','cost','knowledge','grafana'];
    const key = parseInt(e.key);
    if(key >= 1 && key <= 9) {
        e.preventDefault();
        navigateTo(sections[key-1]);
    }
});

// ============================================================
// SIDEBAR TOGGLE (Collapsible)
// ============================================================
(function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const body = document.body;

    function openSidebar() { body.classList.add('sidebar-open'); }
    function closeSidebar() { body.classList.remove('sidebar-open'); }
    function toggleSidebar() { body.classList.toggle('sidebar-open'); }

    // Hamburger button
    if (toggle) toggle.addEventListener('click', toggleSidebar);

    // Overlay click closes sidebar (mobile)
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Nav item click closes sidebar on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    // Escape key closes sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && body.classList.contains('sidebar-open')) {
            closeSidebar();
        }
    });

    // On desktop, start with sidebar open; on mobile, start closed
    if (window.innerWidth > 768) openSidebar();
})();

// Clock
function updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2,'0');
    const m = now.getMinutes().toString().padStart(2,'0');
    const s = now.getSeconds().toString().padStart(2,'0');
    document.getElementById('clock').textContent = `${h}:${m}:${s} PST`;
}
setInterval(updateClock, 1000);
updateClock();

// Initialize
renderFleetDashboard();
