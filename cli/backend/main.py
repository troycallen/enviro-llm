from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psutil
import uvicorn
import os
from datetime import datetime
import time
import uuid
try:
    import pynvml
    NVIDIA_AVAILABLE = True
except ImportError:
    NVIDIA_AVAILABLE = False

app = FastAPI(title="EnviroLLM API", version="1.0.0")

# In-memory storage for benchmarks
benchmark_results = []

class BenchmarkRequest(BaseModel):
    prompt: str
    model_name: str = "Unknown Model"
    quantization: str = "Unknown"

def get_gpu_info():
    gpu_info = {"available": False, "gpus": []}

    if NVIDIA_AVAILABLE:
        try:
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()

            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(name, bytes):
                    name = name.decode('utf-8')

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

def get_system_info():
    memory_gb = psutil.virtual_memory().total / (1024**3)
    cpu_cores = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    gpu_info = get_gpu_info()

    # Get detailed system info
    import platform
    system_info = {
        "cpu_brand": platform.processor() or "Unknown CPU",
        "cpu_cores_physical": psutil.cpu_count(logical=False),
        "cpu_cores_logical": psutil.cpu_count(logical=True),
        "cpu_frequency_max": cpu_freq.max if cpu_freq else None,
        "memory_total_gb": round(memory_gb, 1),
        "platform": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine()
    }

    return {
        "system_specs": {
            "memory_gb": round(memory_gb, 1),
            "cpu_cores": cpu_cores,
            "gpu_available": gpu_info["available"],
            "gpus": gpu_info["gpus"] if gpu_info["available"] else []
        },
        "detailed_system_info": system_info
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

@app.get("/system")
async def get_system():
    return get_system_info()

@app.get("/benchmarks")
async def get_benchmarks():
    """Get all stored benchmark results"""
    return {"results": benchmark_results}

@app.delete("/benchmarks")
async def clear_benchmarks():
    """Clear all benchmark results"""
    benchmark_results.clear()
    return {"status": "success", "message": "All benchmarks cleared"}

@app.post("/benchmark/start")
async def start_benchmark(request: BenchmarkRequest):
    """
    Run a benchmark by monitoring system metrics for 30 seconds.
    Captures real metrics while an LLM is running.
    """
    cpu_readings = []
    memory_readings = []
    power_readings = []
    start_time = time.time()

    # Monitor for 30 seconds
    duration = 30
    samples = 30

    for i in range(samples):
        cpu_percent = psutil.cpu_percent(interval=0.5)
        memory_percent = psutil.virtual_memory().percent
        gpu_info = get_gpu_info()

        # Calculate power
        base_power = 50
        cpu_power = cpu_percent * 2
        gpu_power = 0
        if gpu_info["available"] and gpu_info["gpus"]:
            gpu_power = sum(gpu["power_watts"] for gpu in gpu_info["gpus"])
        total_power = base_power + cpu_power + gpu_power

        cpu_readings.append(cpu_percent)
        memory_readings.append(memory_percent)
        power_readings.append(total_power)

        time.sleep(duration / samples)

    end_time = time.time()
    actual_duration = end_time - start_time

    # Calculate metrics
    avg_cpu = sum(cpu_readings) / len(cpu_readings)
    avg_memory = sum(memory_readings) / len(memory_readings)
    avg_power = sum(power_readings) / len(power_readings)

    # Calculate energy (Power * Time / 3600 to get Wh)
    total_energy_wh = (avg_power * actual_duration) / 3600

    # Get peak memory
    memory_info = psutil.virtual_memory()
    peak_memory_gb = (memory_info.total * (max(memory_readings) / 100)) / (1024**3)

    # Create benchmark result
    result = {
        "id": str(uuid.uuid4()),
        "model_name": request.model_name,
        "quantization": request.quantization,
        "timestamp": datetime.now().isoformat(),
        "metrics": {
            "avg_cpu_usage": round(avg_cpu, 1),
            "avg_memory_usage": round(avg_memory, 1),
            "avg_power_watts": round(avg_power, 1),
            "peak_memory_gb": round(peak_memory_gb, 2),
            "total_energy_wh": round(total_energy_wh, 2),
            "duration_seconds": round(actual_duration, 1),
            "tokens_generated": None,
            "tokens_per_second": None
        },
        "prompt": request.prompt
    }

    # Store result
    benchmark_results.append(result)

    return {
        "status": "completed",
        "result": result
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)