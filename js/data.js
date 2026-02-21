// ============================================================
// PERPLEXITY COMPUTE COMMAND CENTER — data.js
// Complete GPU Fleet Management & Advisory Platform
// ============================================================

'use strict';

// ============================================================
// SECTION 0: DATA MODELS & CONSTANTS
// ============================================================

const GPU_SPECS = {
    'A100 40GB SXM': { vendor:'NVIDIA', vram:40, bw:2039, bf16_tflops:312, fp8_tflops:0, tdp:400, nvlink_bw:600, cloud_min:1.10, cloud_typ:1.80, arch:'Ampere', cuda_cores:6912, tensor_cores:432, process:'7nm', best_for:'Training, Inference (smaller models)', framework:'CUDA, ROCm (N/A), Triton', year:2020 },
    'A100 80GB SXM': { vendor:'NVIDIA', vram:80, bw:2039, bf16_tflops:312, fp8_tflops:0, tdp:400, nvlink_bw:600, cloud_min:1.79, cloud_typ:2.50, arch:'Ampere', cuda_cores:6912, tensor_cores:432, process:'7nm', best_for:'Training, Fine-tuning, Inference', framework:'CUDA, Triton', year:2020 },
    'H100 SXM': { vendor:'NVIDIA', vram:80, bw:3350, bf16_tflops:1979, fp8_tflops:3958, tdp:700, nvlink_bw:900, cloud_min:2.49, cloud_typ:3.50, arch:'Hopper', cuda_cores:16896, tensor_cores:528, process:'4nm', best_for:'Large-scale training, Inference', framework:'CUDA, Triton', year:2023 },
    'H100 PCIe': { vendor:'NVIDIA', vram:80, bw:2039, bf16_tflops:756, fp8_tflops:1513, tdp:350, nvlink_bw:600, cloud_min:2.00, cloud_typ:2.85, arch:'Hopper', cuda_cores:14592, tensor_cores:456, process:'4nm', best_for:'Inference, PCIe deployments', framework:'CUDA, Triton', year:2023 },
    'H200 SXM': { vendor:'NVIDIA', vram:141, bw:4800, bf16_tflops:1979, fp8_tflops:3958, tdp:700, nvlink_bw:900, cloud_min:3.50, cloud_typ:5.00, arch:'Hopper', cuda_cores:16896, tensor_cores:528, process:'4nm', best_for:'Large model inference, KV cache intensive', framework:'CUDA, Triton', year:2024 },
    'B200': { vendor:'NVIDIA', vram:192, bw:8000, bf16_tflops:2250, fp8_tflops:4500, tdp:1000, nvlink_bw:1800, cloud_min:5.29, cloud_typ:8.60, arch:'Blackwell', cuda_cores:21760, tensor_cores:680, process:'4nm', best_for:'Frontier training, Large inference', framework:'CUDA, Triton', year:2025 },
    'GB200 NVL72': { vendor:'NVIDIA', vram:192, bw:8000, bf16_tflops:2500, fp8_tflops:5000, tdp:1200, nvlink_bw:1800, cloud_min:10.58, cloud_typ:12.00, arch:'Blackwell NVL', cuda_cores:21760, tensor_cores:680, process:'4nm', best_for:'Trillion param training, Full-rack inference', framework:'CUDA, Triton', min_gpus:36, year:2025 },
    'MI250X': { vendor:'AMD', vram:128, bw:3277, bf16_tflops:383, fp8_tflops:0, tdp:560, nvlink_bw:800, cloud_min:1.50, cloud_typ:2.20, arch:'CDNA 2', cuda_cores:0, tensor_cores:0, process:'6nm', best_for:'HPC, Training (AMD ecosystem)', framework:'ROCm, Triton', year:2022 },
    'MI300X': { vendor:'AMD', vram:192, bw:5300, bf16_tflops:1307, fp8_tflops:2614, tdp:750, nvlink_bw:896, cloud_min:1.49, cloud_typ:2.50, arch:'CDNA 3', cuda_cores:0, tensor_cores:0, process:'5nm', best_for:'Large model inference (cost-effective)', framework:'ROCm, Triton', year:2024 },
    'MI300A': { vendor:'AMD', vram:128, bw:5300, bf16_tflops:981, fp8_tflops:1963, tdp:760, nvlink_bw:896, cloud_min:2.00, cloud_typ:3.00, arch:'CDNA 3 APU', cuda_cores:0, tensor_cores:0, process:'5nm', best_for:'HPC, Mixed CPU+GPU workloads', framework:'ROCm, Triton', year:2024 },
    'MI325X': { vendor:'AMD', vram:256, bw:6000, bf16_tflops:1307, fp8_tflops:2614, tdp:750, nvlink_bw:896, cloud_min:3.50, cloud_typ:5.00, arch:'CDNA 3+', cuda_cores:0, tensor_cores:0, process:'5nm', best_for:'Large model serving, VRAM-heavy workloads', framework:'ROCm, Triton', year:2025 },
    'MI350X': { vendor:'AMD', vram:288, bw:8000, bf16_tflops:4600, fp8_tflops:9200, tdp:750, nvlink_bw:896, cloud_min:5.00, cloud_typ:7.50, arch:'CDNA 4', cuda_cores:0, tensor_cores:0, process:'3nm', best_for:'Next-gen training & inference', framework:'ROCm, Triton', year:2025 },
    'GB300 NVL72': { vendor:'NVIDIA', vram:288, bw:8000, bf16_tflops:5000, fp8_tflops:10000, fp4_tflops:15000, tdp:1200, nvlink_bw:1800, cloud_min:14.00, cloud_typ:18.00, arch:'Blackwell Ultra NVL', cuda_cores:24576, tensor_cores:768, process:'3nm', best_for:'Frontier training, Trillion-param inference, NVL72 rack-scale', framework:'CUDA, Triton', min_gpus:36, year:2025 },
    'Gaudi 2': { vendor:'Intel', vram:96, bw:2460, bf16_tflops:432, fp8_tflops:865, tdp:600, nvlink_bw:0, cloud_min:1.95, cloud_typ:3.80, arch:'Gaudi 2', cuda_cores:0, tensor_cores:0, process:'7nm', best_for:'Cost-effective training & inference', framework:'Habana SynapseAI', year:2022 },
    'Gaudi 3': { vendor:'Intel', vram:128, bw:3700, bf16_tflops:1835, fp8_tflops:1835, tdp:900, nvlink_bw:0, cloud_min:3.70, cloud_typ:5.00, arch:'Gaudi 3', cuda_cores:0, tensor_cores:0, process:'5nm', best_for:'Competitive training, Price-perf', framework:'Habana SynapseAI, PyTorch', year:2024 },
    'TPU v5e': { vendor:'Google', vram:16, bw:820, bf16_tflops:197, fp8_tflops:394, tdp:150, nvlink_bw:0, cloud_min:0.32, cloud_typ:1.20, arch:'TPU v5e', cuda_cores:0, tensor_cores:0, process:'7nm', best_for:'Inference, Small model training', framework:'JAX, TensorFlow', year:2023 },
    'TPU v5p': { vendor:'Google', vram:95, bw:2765, bf16_tflops:459, fp8_tflops:918, tdp:250, nvlink_bw:0, cloud_min:2.20, cloud_typ:3.22, arch:'TPU v5p', cuda_cores:0, tensor_cores:0, process:'7nm', best_for:'Large-scale training (JAX)', framework:'JAX, TensorFlow', year:2023 },
    'TPU v6e': { vendor:'Google', vram:32, bw:1640, bf16_tflops:918, fp8_tflops:918, tdp:200, nvlink_bw:0, cloud_min:0.39, cloud_typ:2.70, arch:'Trillium', cuda_cores:0, tensor_cores:0, process:'5nm', best_for:'Efficient training & inference', framework:'JAX, TensorFlow, PyTorch XLA', year:2024 },
};

const CLOUD_PRICING = {
    'H100 SXM': {
        'AWS': { ondemand:12.29, reserved_1yr:7.37, reserved_3yr:4.91, spot:1.80, capacity_block:3.93 },
        'GCP': { ondemand:12.63, reserved_1yr:7.89, reserved_3yr:5.05, spot:2.25 },
        'Azure': { ondemand:11.47, reserved_1yr:7.37, reserved_3yr:4.76, spot:3.60 },
        'CoreWeave': { ondemand:2.49, reserved_1yr:2.06, reserved_3yr:null, spot:null },
        'Lambda Labs': { ondemand:1.99, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Together AI': { ondemand:3.36, reserved_1yr:2.20, reserved_3yr:null, spot:null },
        'RunPod': { ondemand:3.49, reserved_1yr:null, reserved_3yr:null, spot:2.39 },
        'Nebius': { ondemand:3.04, reserved_1yr:2.30, reserved_3yr:null, spot:null },
        'Voltage Park': { ondemand:2.50, reserved_1yr:null, reserved_3yr:null, spot:null },
    },
    'H200 SXM': {
        'AWS (p5e)': { ondemand:4.97, capacity_block:4.975, reserved_1yr:null, reserved_3yr:null, spot:null },
        'GCP (A3 Ultra)': { ondemand:12.47, reserved_1yr:null, reserved_3yr:null, spot:3.72 },
        'CoreWeave': { ondemand:4.25, reserved_1yr:3.50, reserved_3yr:null, spot:null },
        'Lambda Labs': { ondemand:3.49, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Together AI': { ondemand:4.99, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Nebius': { ondemand:3.50, reserved_1yr:2.30, reserved_3yr:null, spot:null },
    },
    'A100 80GB SXM': {
        'AWS': { ondemand:3.44, reserved_1yr:2.06, reserved_3yr:1.38, spot:1.03, capacity_block:1.845 },
        'GCP': { ondemand:4.52, reserved_1yr:3.16, reserved_3yr:2.03, spot:1.13 },
        'CoreWeave': { ondemand:2.06, reserved_1yr:1.64, reserved_3yr:null, spot:null },
        'Lambda Labs': { ondemand:1.29, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Together AI': { ondemand:2.56, reserved_1yr:null, reserved_3yr:null, spot:null },
    },
    'B200': {
        'AWS': { ondemand:null, capacity_block:9.36, reserved_1yr:null, reserved_3yr:null, spot:null },
        'GCP': { ondemand:18.53, reserved_1yr:null, reserved_3yr:null, spot:null },
        'CoreWeave': { ondemand:8.60, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Together AI': { ondemand:5.50, reserved_1yr:4.50, reserved_3yr:null, spot:null },
    },
    'MI300X': {
        'CoreWeave': { ondemand:3.49, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Lambda Labs': { ondemand:1.49, reserved_1yr:null, reserved_3yr:null, spot:null },
        'Voltage Park': { ondemand:1.84, reserved_1yr:null, reserved_3yr:null, spot:null },
        'RunPod': { ondemand:3.99, reserved_1yr:null, reserved_3yr:null, spot:null },
    },
    'GB200 NVL72': {
        'AWS': { ondemand: null, reserved_3yr: 3.00, reserved_1yr: null, spot: null, capacity_block: null },
        'CoreWeave': { ondemand: 10.58, reserved_1yr: null, reserved_3yr: null, spot: null },
    },
    'GB300 NVL72': {
        'AWS': { ondemand: null, reserved_3yr: 4.20, reserved_1yr: null, spot: null, capacity_block: null },
    },
};

// Perplexity's negotiated contract rates (per GPU per hour)
const NEGOTIATED_RATES = {
    'H100 SXM': {
        'AWS': { rate: 1.85, type: '3yr SageMaker RI', instance: 'ml.p5en.48xlarge', contract: 'PPA Jan 2026' },
        'Lambda Labs': { rate: 1.596, type: 'Negotiated', instance: 'On-Demand (Volume)', contract: '$410K/mo commit' },
    },
    'H200 SXM': {
        'AWS': { rate: 1.734, type: '3yr PPA Negotiated', instance: 'p5e.48xlarge', contract: 'PPA Jan 2026' },
    },
    'GB200 NVL72': {
        'AWS': { rate: 3.00, type: '3yr SageMaker RI', instance: 'ml.u-p6e-gb200x72', contract: 'PPA Jan 2026' },
        'CoreWeave': { rate: 3.147, type: 'Negotiated', instance: 'GB200 NVL72', contract: 'Contract rate' },
    },
    'GB300 NVL72': {
        'AWS': { rate: 4.20, type: '3yr SageMaker RI', instance: 'ml.u-p6e-gb300.x72', contract: 'PPA Jan 2026' },
    },
};

// Default fleet data — locked to Perplexity's actual providers: Lambda, CoreWeave, AWS
let fleetData = [
    { gpu_type:'H100 SXM', provider:'Lambda Labs', count:352, active:310, idle:32, maintenance:10, cost_per_gpu_hr:1.596, nodes:44, gpus_per_node:8 },
    { gpu_type:'H100 SXM', provider:'AWS', count:305, active:268, idle:27, maintenance:10, cost_per_gpu_hr:1.85, nodes:39, gpus_per_node:8, note:'US-East-1' },
    { gpu_type:'H200 SXM', provider:'AWS', count:1808, active:1620, idle:148, maintenance:40, cost_per_gpu_hr:1.734, nodes:226, gpus_per_node:8 },
    { gpu_type:'GB200 NVL72', provider:'CoreWeave', count:720, active:680, idle:40, maintenance:0, cost_per_gpu_hr:3.147, nodes:10, gpus_per_node:72, note:'10x NVL72 racks' },
];

const activeJobs = [];

const queuedJobs = [];

// GPU lifecycle/contracts
const contracts = [
    { provider:'Lambda Labs', gpu_type:'H100 SXM', count:352, start:'2025-01-01', end:'2026-06-01', type:'On-Demand (Volume)', monthly:410000 },
    { provider:'AWS', gpu_type:'H100 SXM', count:305, start:'2024-09-01', end:'2026-09-01', type:'3yr PPA', monthly:411902 },
    { provider:'AWS', gpu_type:'H200 SXM', count:1808, start:'2025-03-01', end:'2027-03-01', type:'3yr PPA', monthly:2288098 },
    { provider:'CoreWeave', gpu_type:'GB200 NVL72', count:720, start:'2025-06-01', end:'2027-06-01', type:'Contract', monthly:1654063 },
];

// Utility functions
function fmt(n, d=0) { return n.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d}); }
function fmtCurrency(n) { if(n>=1e6) return '$'+fmt(n/1e6,1)+'M'; if(n>=1e3) return '$'+fmt(n/1e3,1)+'K'; return '$'+fmt(n,0); }
function fmtPrecise(n) { return '$'+fmt(n,2); }
function pct(n,total) { return total===0?0:((n/total)*100); }
function el(tag, cls, html) { const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; }

// ============================================================
// NEW: Deployment Data (Inference Deployments)
// ============================================================
let deploymentData = [
    { id: 'dep-001', model_name: 'pplx-sonar-large', model_version: 'v2.4', gpu_type: 'H200 SXM', gpu_count: 16, replicas: 4, min_replicas: 2, max_replicas: 8, status: 'running', namespace: 'inference-prod', provider: 'AWS', endpoint_url: 'https://sonar-large.inference.perplexity.internal', created_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', created_at: '2026-01-15T10:00:00Z', qps: 2340, p50_latency: 42, p99_latency: 180, daily_tokens: 12.4e9 },
    { id: 'dep-002', model_name: 'pplx-sonar-small', model_version: 'v2.4', gpu_type: 'H100 SXM', gpu_count: 8, replicas: 6, min_replicas: 4, max_replicas: 12, status: 'running', namespace: 'inference-prod', provider: 'Lambda Labs', endpoint_url: 'https://sonar-small.inference.perplexity.internal', created_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', created_at: '2026-01-10T08:00:00Z', qps: 5120, p50_latency: 18, p99_latency: 85, daily_tokens: 28.7e9 },
    { id: 'dep-003', model_name: 'pplx-reasoning', model_version: 'v1.2', gpu_type: 'GB200 NVL72', gpu_count: 72, replicas: 2, min_replicas: 1, max_replicas: 4, status: 'running', namespace: 'inference-prod', provider: 'CoreWeave', endpoint_url: 'https://reasoning.inference.perplexity.internal', created_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', created_at: '2026-02-01T14:00:00Z', qps: 890, p50_latency: 120, p99_latency: 450, daily_tokens: 4.2e9 },
    { id: 'dep-004', model_name: 'pplx-code', model_version: 'v3.0', gpu_type: 'H200 SXM', gpu_count: 8, replicas: 3, min_replicas: 2, max_replicas: 6, status: 'running', namespace: 'inference-prod', provider: 'AWS', endpoint_url: 'https://code.inference.perplexity.internal', created_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', created_at: '2026-02-05T09:00:00Z', qps: 1560, p50_latency: 35, p99_latency: 150, daily_tokens: 8.1e9 },
    { id: 'dep-005', model_name: 'pplx-embeddings-v3', model_version: 'v3.1', gpu_type: 'H100 SXM', gpu_count: 4, replicas: 2, min_replicas: 2, max_replicas: 4, status: 'running', namespace: 'inference-prod', provider: 'AWS', endpoint_url: 'https://embeddings.inference.perplexity.internal', created_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', created_at: '2026-01-20T11:00:00Z', qps: 8900, p50_latency: 8, p99_latency: 25, daily_tokens: 52.3e9 },
    { id: 'dep-006', model_name: 'pplx-sonar-turbo', model_version: 'v1.0', gpu_type: 'H200 SXM', gpu_count: 8, replicas: 0, min_replicas: 1, max_replicas: 4, status: 'pending_approval', namespace: 'inference-prod', provider: 'AWS', endpoint_url: null, created_by: 'eng-team@perplexity.ai', approved_by: null, created_at: '2026-02-20T16:00:00Z', qps: 0, p50_latency: 0, p99_latency: 0, daily_tokens: 0 },
];

// ============================================================
// NEW: Job Data (Training Jobs) — replaces schedulerJobs
// ============================================================
let jobData = [
    { id: 'job-001', name: 'Sonar Large v2.5 Pre-training', type: 'training', model: 'pplx-sonar-large', gpu_type: 'GB200 NVL72', gpu_count: 144, priority: 'P0', status: 'running', submitted_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', submitted_at: '2026-02-10T08:00:00Z', started_at: '2026-02-10T10:00:00Z', completed_at: null, est_duration: '14d', cost_accrued: 892000, progress: 62, checkpoint: 'step-42000/68000' },
    { id: 'job-002', name: 'Code Model Fine-tune (Python focus)', type: 'training', model: 'pplx-code', gpu_type: 'H200 SXM', gpu_count: 64, priority: 'P1', status: 'running', submitted_by: 'eng-team@perplexity.ai', approved_by: 'kevin@perplexity.ai', submitted_at: '2026-02-15T09:00:00Z', started_at: '2026-02-15T14:00:00Z', completed_at: null, est_duration: '5d', cost_accrued: 48200, progress: 78, checkpoint: 'epoch-3/4' },
    { id: 'job-003', name: 'Reasoning v1.3 RLHF', type: 'training', model: 'pplx-reasoning', gpu_type: 'H200 SXM', gpu_count: 32, priority: 'P1', status: 'running', submitted_by: 'research@perplexity.ai', approved_by: 'kevin@perplexity.ai', submitted_at: '2026-02-18T10:00:00Z', started_at: '2026-02-18T12:00:00Z', completed_at: null, est_duration: '3d', cost_accrued: 12400, progress: 45, checkpoint: 'step-8500/19000' },
    { id: 'job-004', name: 'Embeddings v4 Contrastive Training', type: 'training', model: 'pplx-embeddings', gpu_type: 'H100 SXM', gpu_count: 16, priority: 'P2', status: 'queued', submitted_by: 'ml-infra@perplexity.ai', approved_by: 'kevin@perplexity.ai', submitted_at: '2026-02-19T11:00:00Z', started_at: null, completed_at: null, est_duration: '2d', cost_accrued: 0, progress: 0, checkpoint: null },
    { id: 'job-005', name: 'Safety Evaluation Suite', type: 'batch', model: 'pplx-sonar-large', gpu_type: 'H100 SXM', gpu_count: 8, priority: 'P2', status: 'queued', submitted_by: 'safety@perplexity.ai', approved_by: 'kevin@perplexity.ai', submitted_at: '2026-02-20T08:00:00Z', started_at: null, completed_at: null, est_duration: '8h', cost_accrued: 0, progress: 0, checkpoint: null },
    { id: 'job-006', name: 'Sonar Turbo Distillation', type: 'training', model: 'pplx-sonar-turbo', gpu_type: 'H200 SXM', gpu_count: 32, priority: 'P1', status: 'pending_approval', submitted_by: 'eng-team@perplexity.ai', approved_by: null, submitted_at: '2026-02-20T15:00:00Z', started_at: null, completed_at: null, est_duration: '7d', cost_accrued: 0, progress: 0, checkpoint: null },
    { id: 'job-007', name: 'Multilingual Alignment (Phase 2)', type: 'training', model: 'pplx-sonar-large', gpu_type: 'H200 SXM', gpu_count: 64, priority: 'P2', status: 'pending_approval', submitted_by: 'research@perplexity.ai', approved_by: null, submitted_at: '2026-02-21T09:00:00Z', started_at: null, completed_at: null, est_duration: '4d', cost_accrued: 0, progress: 0, checkpoint: null },
    { id: 'job-008', name: 'Sonar Small v2.3 SFT', type: 'training', model: 'pplx-sonar-small', gpu_type: 'H100 SXM', gpu_count: 32, priority: 'P1', status: 'completed', submitted_by: 'austin.hollan@perplexity.ai', approved_by: 'kevin@perplexity.ai', submitted_at: '2026-02-08T10:00:00Z', started_at: '2026-02-08T12:00:00Z', completed_at: '2026-02-12T18:00:00Z', est_duration: '4d', cost_accrued: 78500, progress: 100, checkpoint: 'final' },
];

// ============================================================
// NEW: Model Registry
// ============================================================
let modelRegistry = [
    { id: 'model-001', name: 'pplx-sonar-large', version: 'v2.4', framework: 'vLLM', params: '70B', gpu_requirements: { min_gpu_type: 'H200 SXM', min_vram: 141, min_count: 8 }, status: 'deployed', current_replicas: 4, endpoint_url: 'https://sonar-large.inference.perplexity.internal', created_at: '2026-01-15T10:00:00Z' },
    { id: 'model-002', name: 'pplx-sonar-small', version: 'v2.4', framework: 'vLLM', params: '8B', gpu_requirements: { min_gpu_type: 'H100 SXM', min_vram: 80, min_count: 2 }, status: 'deployed', current_replicas: 6, endpoint_url: 'https://sonar-small.inference.perplexity.internal', created_at: '2026-01-10T08:00:00Z' },
    { id: 'model-003', name: 'pplx-reasoning', version: 'v1.2', framework: 'vLLM + speculative', params: '405B', gpu_requirements: { min_gpu_type: 'GB200 NVL72', min_vram: 192, min_count: 36 }, status: 'deployed', current_replicas: 2, endpoint_url: 'https://reasoning.inference.perplexity.internal', created_at: '2026-02-01T14:00:00Z' },
    { id: 'model-004', name: 'pplx-code', version: 'v3.0', framework: 'TGI', params: '34B', gpu_requirements: { min_gpu_type: 'H200 SXM', min_vram: 80, min_count: 4 }, status: 'deployed', current_replicas: 3, endpoint_url: 'https://code.inference.perplexity.internal', created_at: '2026-02-05T09:00:00Z' },
    { id: 'model-005', name: 'pplx-embeddings-v3', version: 'v3.1', framework: 'ONNX Runtime', params: '1.2B', gpu_requirements: { min_gpu_type: 'H100 SXM', min_vram: 40, min_count: 2 }, status: 'deployed', current_replicas: 2, endpoint_url: 'https://embeddings.inference.perplexity.internal', created_at: '2026-01-20T11:00:00Z' },
    { id: 'model-006', name: 'pplx-sonar-turbo', version: 'v1.0', framework: 'vLLM', params: '22B', gpu_requirements: { min_gpu_type: 'H200 SXM', min_vram: 80, min_count: 4 }, status: 'registered', current_replicas: 0, endpoint_url: null, created_at: '2026-02-20T16:00:00Z' },
    { id: 'model-007', name: 'pplx-sonar-large', version: 'v2.5-beta', framework: 'vLLM', params: '70B', gpu_requirements: { min_gpu_type: 'H200 SXM', min_vram: 141, min_count: 8 }, status: 'training', current_replicas: 0, endpoint_url: null, created_at: '2026-02-10T08:00:00Z' },
];

// ============================================================
// NEW: Approval Queue
// ============================================================
let approvalQueue = [
    { id: 'apr-001', type: 'deployment', target_id: 'dep-006', status: 'pending', requester: 'eng-team@perplexity.ai', approver: null, created_at: '2026-02-20T16:00:00Z', resolved_at: null, payload: { model: 'pplx-sonar-turbo v1.0', gpu_type: 'H200 SXM', gpu_count: 8, replicas: 1, est_monthly_cost: 10140 } },
    { id: 'apr-002', type: 'job', target_id: 'job-006', status: 'pending', requester: 'eng-team@perplexity.ai', approver: null, created_at: '2026-02-20T15:00:00Z', resolved_at: null, payload: { name: 'Sonar Turbo Distillation', gpu_type: 'H200 SXM', gpu_count: 32, est_duration: '7d', est_cost: 95200 } },
    { id: 'apr-003', type: 'job', target_id: 'job-007', status: 'pending', requester: 'research@perplexity.ai', approver: null, created_at: '2026-02-21T09:00:00Z', resolved_at: null, payload: { name: 'Multilingual Alignment (Phase 2)', gpu_type: 'H200 SXM', gpu_count: 64, est_duration: '4d', est_cost: 68400 } },
    { id: 'apr-004', type: 'deployment', target_id: 'dep-003', status: 'approved', requester: 'austin.hollan@perplexity.ai', approver: 'kevin@perplexity.ai', created_at: '2026-02-01T13:00:00Z', resolved_at: '2026-02-01T13:45:00Z', payload: { model: 'pplx-reasoning v1.2', gpu_type: 'GB200 NVL72', gpu_count: 72, replicas: 2 } },
];

// ============================================================
// NEW: Cost Data (Accounting)
// ============================================================
const costData = {
    totalMonthly: 4764063,
    totalMTD: 3842000,
    budget: 5200000,
    byTeam: [
        { team: 'Inference Platform', monthly: 2890000, mtd: 2334000, budget: 3100000, gpus: 1940 },
        { team: 'Training / Research', monthly: 1520000, mtd: 1228000, budget: 1700000, gpus: 960 },
        { team: 'Evaluation / Safety', monthly: 124000, mtd: 100000, budget: 150000, gpus: 85 },
        { team: 'Embeddings', monthly: 230063, mtd: 180000, budget: 250000, gpus: 200 },
    ],
    byModel: [
        { model: 'pplx-sonar-large', monthly: 1420000, gpus: 64, provider: 'AWS' },
        { model: 'pplx-sonar-small', monthly: 560000, gpus: 48, provider: 'Lambda Labs' },
        { model: 'pplx-reasoning', monthly: 1654000, gpus: 144, provider: 'CoreWeave' },
        { model: 'pplx-code', monthly: 420000, gpus: 24, provider: 'AWS' },
        { model: 'pplx-embeddings-v3', monthly: 230000, gpus: 8, provider: 'AWS' },
        { model: 'Training jobs (active)', monthly: 480063, gpus: 240, provider: 'Mixed' },
    ],
    byProvider: [
        { provider: 'AWS', monthly: 2700000, gpus: 2113, pct: 56.7 },
        { provider: 'CoreWeave', monthly: 1654000, gpus: 720, pct: 34.7 },
        { provider: 'Lambda Labs', monthly: 410063, gpus: 352, pct: 8.6 },
    ],
    monthlyTrend: [
        { month: 'Sep 2025', cost: 2100000 },
        { month: 'Oct 2025', cost: 2450000 },
        { month: 'Nov 2025', cost: 2890000 },
        { month: 'Dec 2025', cost: 3200000 },
        { month: 'Jan 2026', cost: 4120000 },
        { month: 'Feb 2026', cost: 4764063 },
    ],
};

// ============================================================
// NEW: Audit Log
// ============================================================
let auditLog = [
    { action: 'approve', user: 'kevin@perplexity.ai', target: 'dep-003', details: 'Approved pplx-reasoning deployment (2x GB200 NVL72 racks)', timestamp: '2026-02-01T13:45:00Z' },
    { action: 'deploy', user: 'austin.hollan@perplexity.ai', target: 'dep-004', details: 'Deployed pplx-code v3.0', timestamp: '2026-02-05T09:30:00Z' },
    { action: 'scale', user: 'austin.hollan@perplexity.ai', target: 'dep-002', details: 'Scaled pplx-sonar-small from 4 to 6 replicas', timestamp: '2026-02-12T15:00:00Z' },
    { action: 'approve', user: 'kevin@perplexity.ai', target: 'job-001', details: 'Approved Sonar Large v2.5 Pre-training (144x GB200)', timestamp: '2026-02-10T09:30:00Z' },
    { action: 'submit_job', user: 'eng-team@perplexity.ai', target: 'job-006', details: 'Submitted Sonar Turbo Distillation for approval', timestamp: '2026-02-20T15:00:00Z' },
    { action: 'submit_deployment', user: 'eng-team@perplexity.ai', target: 'dep-006', details: 'Requested pplx-sonar-turbo deployment', timestamp: '2026-02-20T16:00:00Z' },
    { action: 'complete_job', user: 'system', target: 'job-008', details: 'Sonar Small v2.3 SFT completed successfully', timestamp: '2026-02-12T18:00:00Z' },
    { action: 'submit_job', user: 'research@perplexity.ai', target: 'job-007', details: 'Submitted Multilingual Alignment for approval', timestamp: '2026-02-21T09:00:00Z' },
];
