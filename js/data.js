// ============================================================
// PERPLEXITY COMPUTE COMMAND CENTER — app.js
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
