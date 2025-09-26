from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil
import uvicorn
import os
from datetime import datetime
try:
    import pynvml
    NVIDIA_AVAILABLE = True
except ImportError:
    NVIDIA_AVAILABLE = False

app = FastAPI(title="EnviroLLM API", version="1.0.0")

def get_gpu_info():
    gpu_info = {"available": False, "gpus": []}

    if NVIDIA_AVAILABLE:
        try:
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()

            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')

                memory_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                memory_used = memory_info.used / 1024**3
                memory_total = memory_info.total / 1024**3
                memory_percent = (memory_used / memory_total) * 100

                utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                gpu_usage = utilization.gpu

                try:
                    power_usage = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000
                except:
                    power_usage = 0

                try:
                    temperature = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                except:
                    temperature = 0

                gpu_info["gpus"].append({
                    "id": i,
                    "name": name,
                    "usage_percent": gpu_usage,
                    "memory_used_gb": round(memory_used, 2),
                    "memory_total_gb": round(memory_total, 2),
                    "memory_percent": round(memory_percent, 1),
                    "power_watts": round(power_usage, 1),
                    "temperature_c": temperature
                })

            gpu_info["available"] = True

        except Exception as e:
            gpu_info["error"] = str(e)

    return gpu_info

def get_optimization_recommendations():
    recommendations = []

    memory_gb = psutil.virtual_memory().total / (1024**3)
    cpu_cores = psutil.cpu_count()
    gpu_info = get_gpu_info()
    if memory_gb < 8:
        recommendations.append({
            "type": "quantization",
            "priority": "high",
            "title": "Use 4-bit quantization",
            "description": "Your system has limited RAM. Use 4-bit quantized models to reduce memory usage by ~75%",
            "implementation": "Use GPTQ or AWQ quantized models"
        })
    elif memory_gb < 16:
        recommendations.append({
            "type": "quantization",
            "priority": "medium",
            "title": "Consider 8-bit quantization",
            "description": "8-bit quantization can reduce memory usage by ~50% with minimal quality loss",
            "implementation": "Load models with load_in_8bit=True"
        })

    if gpu_info["available"] and gpu_info["gpus"]:
        for gpu in gpu_info["gpus"]:
            if gpu["memory_total_gb"] < 8:
                recommendations.append({
                    "type": "gpu_optimization",
                    "priority": "high",
                    "title": f"Optimize for {gpu['name']}",
                    "description": f"GPU VRAM ({gpu['memory_total_gb']:.1f}GB) is limited. Use smaller models or CPU offloading",
                    "implementation": "Try 7B parameter models or use device_map='auto'"
                })
    else:
        recommendations.append({
            "type": "hardware",
            "priority": "medium",
            "title": "CPU-only optimization",
            "description": "No GPU detected. Focus on CPU-optimized models and threading",
            "implementation": "Use CPU-optimized formats like GGML/GGUF"
        })

    if cpu_cores >= 8:
        recommendations.append({
            "type": "performance",
            "priority": "low",
            "title": "Parallel processing",
            "description": "Your CPU has multiple cores. Enable parallel processing for better throughput",
            "implementation": "Set torch.set_num_threads() or use batch processing"
        })

    return {
        "system_specs": {
            "memory_gb": round(memory_gb, 1),
            "cpu_cores": cpu_cores,
            "gpu_available": gpu_info["available"],
            "gpus": gpu_info["gpus"] if gpu_info["available"] else []
        },
        "recommendations": recommendations
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://envirollm.com", "https://www.envirollm.com", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "EnviroLLM API is running"}

@app.get("/metrics")
async def get_metrics():
    cpu_percent = psutil.cpu_percent(interval=1)
    memory_percent = psutil.virtual_memory().percent
    gpu_info = get_gpu_info()

    base_power = 50
    cpu_power = cpu_percent * 2

    gpu_power = 0
    if gpu_info["available"] and gpu_info["gpus"]:
        gpu_power = sum(gpu["power_watts"] for gpu in gpu_info["gpus"])

    total_power = base_power + cpu_power + gpu_power

    return {
        "timestamp": datetime.now().isoformat(),
        "cpu_usage": cpu_percent,
        "memory_usage": memory_percent,
        "power_estimate": round(total_power, 1),
        "gpu_info": gpu_info
    }

@app.get("/optimize")
async def get_optimization():
    return get_optimization_recommendations()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)