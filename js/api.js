// ============================================================
// PERPLEXITY COMPUTE COMMAND CENTER — api.js
// Mock API Layer — Replace with real endpoints when backend is ready
// ============================================================
// All API calls return Promises to match real HTTP behavior.
// Data is stored in-memory (see data.js).
// Swap each function body with fetch() calls when backend is ready.
// ============================================================

'use strict';

const API_BASE = ''; // Set to real API URL when ready, e.g. 'https://api.compute.perplexity.internal'

// ---- Current user (simulated Okta session) ----
const currentUser = {
    email: 'austin.hollan@perplexity.ai',
    name: 'Austin Hollan',
    role: 'admin', // 'admin' | 'operator' | 'viewer'
    avatar: 'AH',
    oktaGroups: ['compute-admins', 'engineering'],
};

// ============================================================
// API — Top-level namespace
// All methods return Promises. Replace bodies with fetch() calls.
// ============================================================
const API = {

    // ----------------------------------------------------------
    // Auth
    // Simulates Okta session inspection.
    // ----------------------------------------------------------
    auth: {
        /** Returns the currently authenticated user object. */
        getCurrentUser() {
            return Promise.resolve(currentUser);
        },

        /**
         * Returns true if the current user meets or exceeds the given role.
         * Role hierarchy: admin > operator > viewer
         * @param {'admin'|'operator'|'viewer'} role
         */
        hasRole(role) {
            const hierarchy = { admin: 3, operator: 2, viewer: 1 };
            return hierarchy[currentUser.role] >= hierarchy[role];
        },

        /** Returns true if the current user has admin role. */
        isAdmin() {
            return currentUser.role === 'admin';
        },
    },

    // ----------------------------------------------------------
    // Deployments (Inference)
    // Manages live inference deployment lifecycle.
    // ----------------------------------------------------------
    deployments: {
        /**
         * List all deployments, with optional filters.
         * @param {{ status?: string, model?: string }} filters
         */
        list(filters = {}) {
            let results = [...deploymentData];
            if (filters.status) results = results.filter(d => d.status === filters.status);
            if (filters.model) results = results.filter(d => d.model_name.toLowerCase().includes(filters.model.toLowerCase()));
            return Promise.resolve(results);
        },

        /**
         * Get a single deployment by ID.
         * @param {string} id
         */
        get(id) {
            return Promise.resolve(deploymentData.find(d => d.id === id) || null);
        },

        /**
         * Create a new deployment. Automatically creates an approval request.
         * New deployments start in 'pending_approval' status.
         * @param {Object} deployment - Deployment config payload
         */
        create(deployment) {
            const newDep = {
                id: 'dep-' + Date.now(),
                ...deployment,
                status: 'pending_approval',
                created_by: currentUser.email,
                created_at: new Date().toISOString(),
                approved_by: null,
                replicas: deployment.min_replicas || 1,
            };
            deploymentData.push(newDep);
            // Auto-create an approval request for this deployment
            API.approvals.create({ type: 'deployment', target_id: newDep.id, payload: newDep });
            return Promise.resolve(newDep);
        },

        /**
         * Scale a deployment to the specified replica count.
         * Writes an audit log entry.
         * @param {string} id
         * @param {number} replicas
         */
        scale(id, replicas) {
            const dep = deploymentData.find(d => d.id === id);
            if (!dep) return Promise.reject(new Error('Deployment not found'));
            dep.replicas = replicas;
            dep.updated_at = new Date().toISOString();
            auditLog.push({
                action: 'scale',
                user: currentUser.email,
                target: id,
                details: `Scaled to ${replicas} replicas`,
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(dep);
        },

        /**
         * Initiate teardown of a deployment.
         * Sets status to 'terminating', then 'terminated' after a short delay.
         * Writes an audit log entry.
         * @param {string} id
         */
        teardown(id) {
            const dep = deploymentData.find(d => d.id === id);
            if (!dep) return Promise.reject(new Error('Deployment not found'));
            dep.status = 'terminating';
            setTimeout(() => { dep.status = 'terminated'; }, 3000);
            auditLog.push({
                action: 'teardown',
                user: currentUser.email,
                target: id,
                details: 'Teardown initiated',
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(dep);
        },
    },

    // ----------------------------------------------------------
    // Jobs (Training / Batch)
    // Manages training job submission and lifecycle.
    // ----------------------------------------------------------
    jobs: {
        /**
         * List all jobs, with optional filters.
         * @param {{ type?: string, status?: string, priority?: string }} filters
         */
        list(filters = {}) {
            let results = [...jobData];
            if (filters.type) results = results.filter(j => j.type === filters.type);
            if (filters.status) results = results.filter(j => j.status === filters.status);
            if (filters.priority) results = results.filter(j => j.priority === filters.priority);
            return Promise.resolve(results);
        },

        /**
         * Get a single job by ID.
         * @param {string} id
         */
        get(id) {
            return Promise.resolve(jobData.find(j => j.id === id) || null);
        },

        /**
         * Submit a new job for approval.
         * New jobs start in 'pending_approval' status.
         * Automatically creates an approval request.
         * @param {Object} job - Job config payload
         */
        submit(job) {
            const newJob = {
                id: 'job-' + Date.now(),
                ...job,
                status: 'pending_approval',
                submitted_by: currentUser.email,
                submitted_at: new Date().toISOString(),
                approved_by: null,
                started_at: null,
                completed_at: null,
                cost_accrued: 0,
            };
            jobData.push(newJob);
            API.approvals.create({ type: 'job', target_id: newJob.id, payload: newJob });
            return Promise.resolve(newJob);
        },

        /**
         * Cancel a job by ID.
         * Writes an audit log entry.
         * @param {string} id
         */
        cancel(id) {
            const job = jobData.find(j => j.id === id);
            if (!job) return Promise.reject(new Error('Job not found'));
            job.status = 'cancelled';
            auditLog.push({
                action: 'cancel_job',
                user: currentUser.email,
                target: id,
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(job);
        },
    },

    // ----------------------------------------------------------
    // Models (Model Registry)
    // Manages the model registry and model-to-deployment flow.
    // ----------------------------------------------------------
    models: {
        /** List all registered models. */
        list() {
            return Promise.resolve([...modelRegistry]);
        },

        /**
         * Get a single model by ID.
         * @param {string} id
         */
        get(id) {
            return Promise.resolve(modelRegistry.find(m => m.id === id) || null);
        },

        /**
         * Register a new model in the registry.
         * New models start in 'registered' status with 0 replicas.
         * Writes an audit log entry.
         * @param {Object} model - Model metadata payload
         */
        register(model) {
            const newModel = {
                id: 'model-' + Date.now(),
                ...model,
                status: 'registered',
                created_at: new Date().toISOString(),
                current_replicas: 0,
                endpoint_url: null,
            };
            modelRegistry.push(newModel);
            auditLog.push({
                action: 'register_model',
                user: currentUser.email,
                target: newModel.id,
                details: model.name,
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(newModel);
        },

        /**
         * Deploy a registered model by creating an inference deployment.
         * Delegates to API.deployments.create() with model metadata pre-filled.
         * @param {string} id - Model ID from the registry
         * @param {{ gpu_type: string, gpu_count: number, min_replicas?: number, max_replicas?: number, namespace?: string }} config
         */
        deploy(id, config) {
            const model = modelRegistry.find(m => m.id === id);
            if (!model) return Promise.reject(new Error('Model not found'));
            return API.deployments.create({
                model_name: model.name,
                model_version: model.version,
                model_id: model.id,
                gpu_type: config.gpu_type,
                gpu_count: config.gpu_count,
                min_replicas: config.min_replicas || 1,
                max_replicas: config.max_replicas || 4,
                namespace: config.namespace || 'inference-prod',
            });
        },
    },

    // ----------------------------------------------------------
    // Approvals (Admin Workflow)
    // All resource creation flows through an approval gate.
    // Approve/deny requires admin role.
    // ----------------------------------------------------------
    approvals: {
        /**
         * List approval queue entries, with optional filters.
         * @param {{ status?: string, type?: string }} filters
         */
        list(filters = {}) {
            let results = [...approvalQueue];
            if (filters.status) results = results.filter(a => a.status === filters.status);
            if (filters.type) results = results.filter(a => a.type === filters.type);
            return Promise.resolve(results);
        },

        /**
         * Create a new approval request.
         * Called automatically by deployments.create() and jobs.submit().
         * @param {{ type: string, target_id: string, payload: Object }} approval
         */
        create(approval) {
            const newApproval = {
                id: 'apr-' + Date.now(),
                ...approval,
                status: 'pending',
                requester: currentUser.email,
                created_at: new Date().toISOString(),
                resolved_at: null,
                approver: null,
            };
            approvalQueue.push(newApproval);
            return Promise.resolve(newApproval);
        },

        /**
         * Approve a pending request. Requires admin role.
         * - Deployments: transitions to 'deploying', then 'running' after a short delay.
         * - Jobs: transitions to 'approved'.
         * Writes an audit log entry.
         * @param {string} id - Approval ID
         */
        approve(id) {
            if (!API.auth.isAdmin()) return Promise.reject(new Error('Admin role required'));
            const approval = approvalQueue.find(a => a.id === id);
            if (!approval) return Promise.reject(new Error('Approval not found'));

            approval.status = 'approved';
            approval.approver = currentUser.email;
            approval.resolved_at = new Date().toISOString();

            // Update the target resource status based on type
            if (approval.type === 'deployment') {
                const dep = deploymentData.find(d => d.id === approval.target_id);
                if (dep) {
                    dep.status = 'deploying';
                    dep.approved_by = currentUser.email;
                    setTimeout(() => { dep.status = 'running'; }, 2000);
                }
            } else if (approval.type === 'job') {
                const job = jobData.find(j => j.id === approval.target_id);
                if (job) {
                    job.status = 'approved';
                    job.approved_by = currentUser.email;
                }
            }

            auditLog.push({
                action: 'approve',
                user: currentUser.email,
                target: id,
                details: `Approved ${approval.type}: ${approval.target_id}`,
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(approval);
        },

        /**
         * Deny a pending request. Requires admin role.
         * - Deployments: transitions to 'denied'.
         * - Jobs: transitions to 'denied'.
         * Writes an audit log entry with the denial reason.
         * @param {string} id - Approval ID
         * @param {string} reason - Human-readable reason for denial
         */
        deny(id, reason) {
            if (!API.auth.isAdmin()) return Promise.reject(new Error('Admin role required'));
            const approval = approvalQueue.find(a => a.id === id);
            if (!approval) return Promise.reject(new Error('Approval not found'));

            approval.status = 'denied';
            approval.approver = currentUser.email;
            approval.resolved_at = new Date().toISOString();
            approval.deny_reason = reason;

            // Update the target resource status based on type
            if (approval.type === 'deployment') {
                const dep = deploymentData.find(d => d.id === approval.target_id);
                if (dep) dep.status = 'denied';
            } else if (approval.type === 'job') {
                const job = jobData.find(j => j.id === approval.target_id);
                if (job) job.status = 'denied';
            }

            auditLog.push({
                action: 'deny',
                user: currentUser.email,
                target: id,
                details: reason,
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(approval);
        },
    },

    // ----------------------------------------------------------
    // Costs / Accounting
    // Read-only cost data. All figures are in USD.
    // ----------------------------------------------------------
    costs: {
        /**
         * Get the top-level cost summary.
         * @param {'month'|'mtd'} period
         */
        getSummary(period = 'month') {
            return Promise.resolve(costData);
        },

        /** Get cost breakdown by team. */
        getByTeam() {
            return Promise.resolve(costData.byTeam);
        },

        /** Get cost breakdown by model. */
        getByModel() {
            return Promise.resolve(costData.byModel);
        },

        /** Get cost breakdown by cloud provider. */
        getByProvider() {
            return Promise.resolve(costData.byProvider);
        },
    },

    // ----------------------------------------------------------
    // Fleet
    // Read-only GPU fleet inventory and contract data.
    // ----------------------------------------------------------
    fleet: {
        /** Get current fleet status across all providers. */
        getStatus() {
            return Promise.resolve([...fleetData]);
        },

        /** Get all GPU contracts/commitments. */
        getContracts() {
            return Promise.resolve([...contracts]);
        },
    },

    // ----------------------------------------------------------
    // Audit Log
    // Append-only log of all user and system actions.
    // ----------------------------------------------------------
    audit: {
        /**
         * List recent audit log entries, newest first.
         * @param {number} limit - Max number of entries to return (default 50)
         */
        list(limit = 50) {
            return Promise.resolve(auditLog.slice(-limit).reverse());
        },
    },
};
