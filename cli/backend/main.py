from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psutil
import uvicorn
import os
from datetime import datetime
import time
import uuid
import httpx
from typing import List, Optional
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

class OllamaBenchmarkRequest(BaseModel):
    models: List[str]  # e.g., ["llama3:8b", "phi3:mini"]
    prompt: str = "Explain quantum computing in simple terms."

class OpenAIBenchmarkRequest(BaseModel):
    base_url: str  # e.g., "http://localhost:1234/v1" for LM Studio
    model: str  # e.g., "llama-3-8b"
    prompt: str = "Explain quantum computing in simple terms."
    api_key: Optional[str] = None  

# Ollama API base URL
OLLAMA_API_URL = "http://localhost:11434"

async def check_ollama_available():
    """Check if Ollama is running"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_API_URL}/api/tags", timeout=2.0)
            return response.status_code == 200
    except:
        return False

async def get_ollama_models():
    """Get list of available Ollama models"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_API_URL}/api/tags", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
    except:
        pass
    return []

async def run_ollama_inference(model: str, prompt: str):
    """Run inference with Ollama and return response with token counts"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            start_time = time.time()

            response = await client.post(
                f"{OLLAMA_API_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )

            end_time = time.time()

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "response_tokens": data.get("eval_count", 0),
                    "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
                    "duration_seconds": end_time - start_time,
                    "model": data.get("model", model)
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

async def run_openai_inference(base_url: str, model: str, prompt: str, api_key: Optional[str] = None):
    """Run inference with OpenAI-compatible API and return response with token counts"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            start_time = time.time()

            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                }
            )

            end_time = time.time()

            if response.status_code == 200:
                data = response.json()
                usage = data.get("usage", {})
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                return {
                    "success": True,
                    "response": content,
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "response_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                    "duration_seconds": end_time - start_time,
                    "model": model
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def extract_quantization_from_model(model_name: str) -> str:
    """Extract quantization level from Ollama model name"""
    model_lower = model_name.lower()

    if "q4" in model_lower or ":4" in model_lower:
        return "Q4 (4-bit)"
    elif "q8" in model_lower or ":8" in model_lower:
        return "Q8 (8-bit)"
    elif "fp16" in model_lower or "16bit" in model_lower:
        return "FP16 (16-bit)"
    elif "q5" in model_lower:
        return "Q5 (5-bit)"
    elif "q6" in model_lower:
        return "Q6 (6-bit)"
    else:
        return "Q4 (4-bit default)"

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

@app.get("/optimize")
async def get_optimization():
    """Get optimization recommendations based on system specs"""
    recommendations = []
    potential_power_savings = 0

    memory_gb = psutil.virtual_memory().total / (1024**3)
    cpu_cores = psutil.cpu_count()
    gpu_info = get_gpu_info()

    if memory_gb < 8:
        recommendations.append({
            "type": "quantization",
            "priority": "high",
            "title": "Use 4-bit quantization",
            "description": "Your system has limited RAM. Use 4-bit quantized models to reduce memory usage by ~75%",
            "implementation": "Use GPTQ or AWQ quantized models",
            "power_savings_watts": 20
        })
        potential_power_savings += 20
    elif memory_gb < 16:
        recommendations.append({
            "type": "quantization",
            "priority": "medium",
            "title": "Consider 8-bit quantization",
            "description": "8-bit quantization can reduce memory usage by ~50% with minimal quality loss",
            "implementation": "Load models with load_in_8bit=True",
            "power_savings_watts": 10
        })
        potential_power_savings += 10

    if gpu_info["available"] and gpu_info["gpus"]:
        for gpu in gpu_info["gpus"]:
            if gpu["memory_total_gb"] < 8:
                recommendations.append({
                    "type": "gpu_optimization",
                    "priority": "high",
                    "title": f"Optimize for {gpu['name']}",
                    "description": f"GPU VRAM ({gpu['memory_total_gb']:.1f}GB) is limited. Use smaller models or CPU offloading",
                    "implementation": "Try 7B parameter models or use device_map='auto'",
                    "power_savings_watts": 30
                })
                potential_power_savings += 30
    else:
        recommendations.append({
            "type": "hardware",
            "priority": "medium",
            "title": "CPU-only optimization",
            "description": "No GPU detected. Focus on CPU-optimized models and threading",
            "implementation": "Use CPU-optimized formats like GGML/GGUF",
            "power_savings_watts": 15
        })
        potential_power_savings += 15

    if cpu_cores >= 8:
        recommendations.append({
            "type": "performance",
            "priority": "low",
            "title": "Parallel processing",
            "description": "Your CPU has multiple cores. Enable parallel processing for better throughput",
            "implementation": "Set torch.set_num_threads() or use batch processing",
            "power_savings_watts": 5
        })
        potential_power_savings += 5

    # Calculate cost savings (using US average of $0.15/kWh)
    kwh_rate = 0.15
    hours_per_month = 730

    # Convert watts to kilowatts and calculate monthly savings
    monthly_kwh_saved = (potential_power_savings / 1000) * hours_per_month
    monthly_cost_savings = monthly_kwh_saved * kwh_rate
    yearly_cost_savings = monthly_cost_savings * 12

    return {
        "system_specs": {
            "memory_gb": round(memory_gb, 1),
            "cpu_cores": cpu_cores,
            "gpu_available": gpu_info["available"],
            "gpus": gpu_info["gpus"] if gpu_info["available"] else []
        },
        "recommendations": recommendations,
        "cost_savings": {
            "potential_power_savings_watts": round(potential_power_savings, 1),
            "monthly_savings_usd": round(monthly_cost_savings, 2),
            "yearly_savings_usd": round(yearly_cost_savings, 2),
            "kwh_rate": kwh_rate
        }
    }

@app.get("/benchmarks")
async def get_benchmarks():
    """Get all stored benchmark results"""
    return {"results": benchmark_results}

@app.delete("/benchmarks")
async def clear_benchmarks():
    """Clears all benchmarked results"""
    benchmark_results.clear()
    return {"status":"success", "message":"All benchmarks cleared"}


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
        "source": "manual",
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

@app.get("/ollama/status")
async def ollama_status():
    """Check if Ollama is available"""
    is_available = await check_ollama_available()
    models = []

    if is_available:
        models = await get_ollama_models()

    return {
        "available": is_available,
        "models": models,
        "model_count": len(models)
    }

@app.get("/lmstudio/status")
async def lmstudio_status():
    """Check if LM Studio is available and get models"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:1234/v1/models")
            if response.status_code == 200:
                data = response.json()
                models = [model["id"] for model in data.get("data", [])]
                return {
                    "available": True,
                    "models": models,
                    "model_count": len(models),
                    "base_url": "http://localhost:1234/v1"
                }
    except Exception:
        pass

    return {
        "available": False,
        "models": [],
        "model_count": 0,
        "base_url": "http://localhost:1234/v1"
    }

@app.post("/ollama/benchmark")
async def ollama_benchmark(request: OllamaBenchmarkRequest):
    """
    Automated benchmarking with Ollama.
    Runs inference with specified models and measures energy/performance.
    """
    # Check if Ollama is running
    if not await check_ollama_available():
        raise HTTPException(status_code=503, error="Ollama is not running. Start Ollama first.")

    results = []

    for model in request.models:
        print(f"Benchmarking {model}...")

        # Initialize monitoring
        cpu_readings = []
        memory_readings = []
        power_readings = []

        # Start inference in background and monitor
        inference_start = time.time()

        # Run Ollama inference
        inference_result = await run_ollama_inference(model, request.prompt)

        inference_end = time.time()
        inference_duration = inference_end - inference_start

        # Might swap to full implementation parallel with inference in future
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent
        gpu_info = get_gpu_info()

        # Calculate power
        base_power = 50
        cpu_power = cpu_percent * 2
        gpu_power = 0
        if gpu_info["available"] and gpu_info["gpus"]:
            gpu_power = sum(gpu["power_watts"] for gpu in gpu_info["gpus"])
        avg_power = base_power + cpu_power + gpu_power

        # Calculate energy (Power * Time / 3600 to get Wh)
        total_energy_wh = (avg_power * inference_duration) / 3600

        # Get memory info
        memory_info = psutil.virtual_memory()
        peak_memory_gb = (memory_info.used) / (1024**3)

        if not inference_result["success"]:
            # Model failed to run
            result = {
                "id": str(uuid.uuid4()),
                "model_name": model,
                "quantization": extract_quantization_from_model(model),
                "timestamp": datetime.now().isoformat(),
                "status": "failed",
                "source": "ollama",
                "error": inference_result.get("error", "Unknown error"),
                "prompt": request.prompt
            }
        else:
            # Calculate tokens per second
            tokens_per_second = None
            if inference_result["response_tokens"] > 0 and inference_duration > 0:
                tokens_per_second = inference_result["response_tokens"] / inference_duration

            result = {
                "id": str(uuid.uuid4()),
                "model_name": model,
                "quantization": extract_quantization_from_model(model),
                "timestamp": datetime.now().isoformat(),
                "status": "completed",
                "source": "ollama",
                "metrics": {
                    "avg_cpu_usage": round(cpu_percent, 1),
                    "avg_memory_usage": round(memory_percent, 1),
                    "avg_power_watts": round(avg_power, 1),
                    "peak_memory_gb": round(peak_memory_gb, 2),
                    "total_energy_wh": round(total_energy_wh, 4),
                    "duration_seconds": round(inference_duration, 2),
                    "tokens_generated": inference_result["response_tokens"],
                    "tokens_per_second": round(tokens_per_second, 1) if tokens_per_second else None,
                    "prompt_tokens": inference_result["prompt_tokens"],
                    "total_tokens": inference_result["total_tokens"]
                },
                "prompt": request.prompt,
                "response": inference_result["response"][:200] + "..." if len(inference_result["response"]) > 200 else inference_result["response"]
            }

        # Store result
        benchmark_results.append(result)
        results.append(result)

    return {
        "status": "completed",
        "benchmarks_run": len(results),
        "results": results
    }

@app.post("/openai/benchmark")
async def openai_benchmark(request: OpenAIBenchmarkRequest):
    """
    Automated benchmarking with OpenAI-compatible APIs.
    Works with LM Studio, text-generation-webui, vLLM, and other OpenAI-compatible endpoints.
    """
    print(f"Benchmarking {request.model} at {request.base_url}...")

    # Run inference
    inference_start = time.time()
    inference_result = await run_openai_inference(request.base_url, request.model, request.prompt, request.api_key)
    inference_end = time.time()
    inference_duration = inference_end - inference_start

    # Get system metrics snapshot
    cpu_percent = psutil.cpu_percent(interval=1)
    memory_percent = psutil.virtual_memory().percent
    gpu_info = get_gpu_info()

    # Calculate power
    base_power = 50
    cpu_power = cpu_percent * 2
    gpu_power = 0
    if gpu_info["available"] and gpu_info["gpus"]:
        gpu_power = sum(gpu["power_watts"] for gpu in gpu_info["gpus"])
    avg_power = base_power + cpu_power + gpu_power

    total_energy_wh = (avg_power * inference_duration) / 3600
    memory_info = psutil.virtual_memory()
    peak_memory_gb = (memory_info.used) / (1024**3)

    if not inference_result["success"]:
        # Model failed to run
        result = {
            "id": str(uuid.uuid4()),
            "model_name": f"{request.model} (OpenAI API)",
            "quantization": extract_quantization_from_model(request.model),
            "timestamp": datetime.now().isoformat(),
            "status": "failed",
            "source": "openai",
            "error": inference_result.get("error", "Unknown error"),
            "prompt": request.prompt
        }
    else:
        # Calculate tokens per second
        tokens_per_second = None
        if inference_result["response_tokens"] > 0 and inference_duration > 0:
            tokens_per_second = inference_result["response_tokens"] / inference_duration

        result = {
            "id": str(uuid.uuid4()),
            "model_name": f"{request.model} (OpenAI API)",
            "quantization": extract_quantization_from_model(request.model),
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "source": "openai",
            "metrics": {
                "avg_cpu_usage": round(cpu_percent, 1),
                "avg_memory_usage": round(memory_percent, 1),
                "avg_power_watts": round(avg_power, 1),
                "peak_memory_gb": round(peak_memory_gb, 2),
                "total_energy_wh": round(total_energy_wh, 4),
                "duration_seconds": round(inference_duration, 2),
                "tokens_generated": inference_result["response_tokens"],
                "tokens_per_second": round(tokens_per_second, 1) if tokens_per_second else None,
                "prompt_tokens": inference_result["prompt_tokens"],
                "total_tokens": inference_result["total_tokens"]
            },
            "prompt": request.prompt,
            "response": inference_result["response"][:200] + "..." if len(inference_result["response"]) > 200 else inference_result["response"]
        }

    benchmark_results.append(result)

    return {
        "status": "completed",
        "result": result
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)