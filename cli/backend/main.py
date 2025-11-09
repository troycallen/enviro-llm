from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import psutil
import uvicorn
import os
from datetime import datetime
import time
import uuid
import httpx
from typing import List, Optional
import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
import io
import csv

try:
    import pynvml
    NVIDIA_AVAILABLE = True
except ImportError:
    NVIDIA_AVAILABLE = False

app = FastAPI(title="EnviroLLM API", version="1.0.0")

# Database configuration
HOME = Path.home()
ENVIROLLM_DIR = HOME / ".envirollm"
DB_PATH = ENVIROLLM_DIR / "benchmarks.db"

class BenchmarkDB:
    """SQLite database for persistent benchmark storage"""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._ensure_directory()
        self._init_db()
        self._log_startup()

    def _ensure_directory(self):
        """Create ~/.envirollm directory if it doesn't exist"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _log_startup(self):
        """Log database location on startup"""
        if not hasattr(self, '_logged'):
            print(f"\n{'='*60}")
            print(f"EnviroLLM Database Initialized")
            print(f"Location: {self.db_path}")
            print(f"{'='*60}\n")
            self._logged = True

    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_db(self):
        """Initialize database schema"""
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS benchmarks (
                    id TEXT PRIMARY KEY,
                    model_name TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT,
                    source TEXT,
                    prompt TEXT,
                    response TEXT,
                    response_preview TEXT,

                    -- Performance metrics
                    avg_cpu_usage REAL,
                    avg_memory_usage REAL,
                    avg_power_watts REAL,
                    peak_memory_gb REAL,
                    total_energy_wh REAL,
                    duration_seconds REAL,
                    tokens_generated INTEGER,
                    tokens_per_second REAL,
                    prompt_tokens INTEGER,
                    total_tokens INTEGER,

                    -- Quality metrics
                    char_count INTEGER,
                    word_count INTEGER,
                    unique_words INTEGER,
                    unique_word_ratio REAL,
                    avg_word_length REAL,
                    sentence_count INTEGER,
                    quality_score REAL,

                    -- Error info
                    error TEXT,

                    -- Full JSON for compatibility
                    full_data TEXT
                )
            """)

            # Create index for faster queries
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp
                ON benchmarks(timestamp DESC)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_model
                ON benchmarks(model_name)
            """)

    def save(self, benchmark: dict):
        """Save a benchmark result"""
        metrics = benchmark.get("metrics", {})
        quality = benchmark.get("quality_metrics", {})

        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO benchmarks (
                    id, model_name, timestamp, status, source, prompt, response, response_preview,
                    avg_cpu_usage, avg_memory_usage, avg_power_watts, peak_memory_gb,
                    total_energy_wh, duration_seconds, tokens_generated, tokens_per_second,
                    prompt_tokens, total_tokens,
                    char_count, word_count, unique_words, unique_word_ratio,
                    avg_word_length, sentence_count, quality_score,
                    error, full_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                benchmark.get("id"),
                benchmark.get("model_name"),
                benchmark.get("timestamp"),
                benchmark.get("status"),
                benchmark.get("source"),
                benchmark.get("prompt"),
                benchmark.get("response"),
                benchmark.get("response_preview"),
                metrics.get("avg_cpu_usage"),
                metrics.get("avg_memory_usage"),
                metrics.get("avg_power_watts"),
                metrics.get("peak_memory_gb"),
                metrics.get("total_energy_wh"),
                metrics.get("duration_seconds"),
                metrics.get("tokens_generated"),
                metrics.get("tokens_per_second"),
                metrics.get("prompt_tokens"),
                metrics.get("total_tokens"),
                quality.get("char_count"),
                quality.get("word_count"),
                quality.get("unique_words"),
                quality.get("unique_word_ratio"),
                quality.get("avg_word_length"),
                quality.get("sentence_count"),
                quality.get("quality_score"),
                benchmark.get("error"),
                json.dumps(benchmark)
            ))

    def get_all(self) -> List[dict]:
        """Get all benchmarks, newest first"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT full_data FROM benchmarks
                ORDER BY timestamp DESC
            """).fetchall()
            return [json.loads(row["full_data"]) for row in rows]

    def get_by_id(self, benchmark_id: str) -> Optional[dict]:
        """Get a specific benchmark by ID"""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT full_data FROM benchmarks WHERE id = ?
            """, (benchmark_id,)).fetchone()
            return json.loads(row["full_data"]) if row else None

    def get_by_ids(self, benchmark_ids: List[str]) -> List[dict]:
        """Get multiple benchmarks by IDs"""
        placeholders = ",".join("?" * len(benchmark_ids))
        with self.get_connection() as conn:
            rows = conn.execute(f"""
                SELECT full_data FROM benchmarks
                WHERE id IN ({placeholders})
            """, benchmark_ids).fetchall()
            return [json.loads(row["full_data"]) for row in rows]

    def delete(self, benchmark_id: str) -> bool:
        """Delete a specific benchmark"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM benchmarks WHERE id = ?
            """, (benchmark_id,))
            return cursor.rowcount > 0

    def delete_all(self):
        """Delete all benchmarks"""
        with self.get_connection() as conn:
            conn.execute("DELETE FROM benchmarks")

    def export_csv(self) -> str:
        """Export all benchmarks to CSV format"""
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "ID", "Model", "Timestamp", "Status", "Source",
            "Energy (Wh)", "Energy/Token (Wh)", "Duration (s)", "Speed (tok/s)",
            "Quality Score", "CPU %", "Memory %", "Power (W)",
            "Prompt", "Response Preview"
        ])

        # Data
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT
                    id, model_name, timestamp, status, source,
                    total_energy_wh, duration_seconds, tokens_per_second, tokens_generated,
                    quality_score, avg_cpu_usage, avg_memory_usage, avg_power_watts,
                    prompt, response_preview
                FROM benchmarks
                ORDER BY timestamp DESC
            """).fetchall()

            for row in rows:
                energy_per_token = None
                if row["total_energy_wh"] and row["tokens_generated"]:
                    energy_per_token = row["total_energy_wh"] / row["tokens_generated"]

                writer.writerow([
                    row["id"],
                    row["model_name"],
                    row["timestamp"],
                    row["status"],
                    row["source"],
                    row["total_energy_wh"],
                    f"{energy_per_token:.6f}" if energy_per_token else "",
                    row["duration_seconds"],
                    row["tokens_per_second"],
                    row["quality_score"],
                    row["avg_cpu_usage"],
                    row["avg_memory_usage"],
                    row["avg_power_watts"],
                    row["prompt"],
                    row["response_preview"]
                ])

        return output.getvalue()

# Initialize database
db = BenchmarkDB(DB_PATH)

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

def calculate_quality_metrics(response_text: str) -> dict:
    """
    Calculate quality metrics for an LLM response.
    Returns metrics for evaluating response quality.
    """
    if not response_text or len(response_text.strip()) == 0:
        return {
            "char_count": 0,
            "word_count": 0,
            "unique_words": 0,
            "unique_word_ratio": 0.0,
            "avg_word_length": 0.0,
            "sentence_count": 0,
            "quality_score": 0.0
        }

    # Clean and tokenize
    text = response_text.strip()
    words = text.split()
    word_count = len(words)

    # Character metrics
    char_count = len(text)

    # Vocabulary diversity
    unique_words = len(set(word.lower().strip('.,!?;:()[]{}"\'-') for word in words))
    unique_word_ratio = unique_words / word_count if word_count > 0 else 0.0

    # Average word length
    avg_word_length = sum(len(word) for word in words) / word_count if word_count > 0 else 0.0

    # Sentence count (rough estimate)
    sentence_terminators = text.count('.') + text.count('!') + text.count('?')
    sentence_count = max(1, sentence_terminators)

    # Efficiency score: Penalize excessively long responses
    if char_count <= 300:
        efficiency_score = 40 
    else:
        # Gradually penalize longer responses
        penalty = ((char_count - 300) / 1000) * 40  
        efficiency_score = max(20, 40 - penalty)  

    diversity_score = min(30, unique_word_ratio * 60)  
    structure_score = min(30, (sentence_count / 3) * 30)  

    quality_score = round(efficiency_score + diversity_score + structure_score, 1)

    return {
        "char_count": char_count,
        "word_count": word_count,
        "unique_words": unique_words,
        "unique_word_ratio": round(unique_word_ratio, 3),
        "avg_word_length": round(avg_word_length, 2),
        "sentence_count": sentence_count,
        "quality_score": quality_score
    }

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
    return {"results": db.get_all()}

@app.delete("/benchmarks")
async def clear_benchmarks():
    """Clears all benchmarked results"""
    db.delete_all()
    return {"status":"success", "message":"All benchmarks cleared"}

@app.delete("/benchmarks/{benchmark_id}")
async def delete_benchmark(benchmark_id: str):
    """Delete a specific benchmark by ID"""
    deleted = db.delete(benchmark_id)
    if deleted:
        return {"status": "success", "message": f"Benchmark {benchmark_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail="Benchmark not found")

@app.get("/benchmarks/export")
async def export_benchmarks():
    """Export all benchmarks to CSV format for analysis"""
    csv_data = db.export_csv()

    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=envirollm_benchmarks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )

@app.get("/benchmarks/compare")
async def compare_benchmarks(ids: str):
    """
    Compare multiple benchmarks side-by-side.
    Query param: ids (comma-separated benchmark IDs)
    Example: /benchmarks/compare?ids=abc123,def456,ghi789
    """
    if not ids:
        raise HTTPException(status_code=400, detail="No benchmark IDs provided")

    benchmark_ids = [id.strip() for id in ids.split(",")]

    # Find requested benchmarks from database
    found_benchmarks = db.get_by_ids(benchmark_ids)

    if not found_benchmarks:
        raise HTTPException(status_code=404, detail="No benchmarks found with provided IDs")

    # Calculate comparison metrics
    comparison = {
        "benchmarks": found_benchmarks,
        "count": len(found_benchmarks),
        "analysis": {}
    }

    # Find best/worst performers
    completed_benchmarks = [b for b in found_benchmarks if b.get("status") == "completed"]

    if completed_benchmarks:
        # Energy efficiency
        energy_values = [(b["id"], b["metrics"]["total_energy_wh"]) for b in completed_benchmarks]
        if energy_values:
            best_energy = min(energy_values, key=lambda x: x[1])
            worst_energy = max(energy_values, key=lambda x: x[1])
            comparison["analysis"]["best_energy"] = best_energy[0]
            comparison["analysis"]["worst_energy"] = worst_energy[0]

        # Speed
        speed_values = [(b["id"], b["metrics"].get("tokens_per_second", 0)) for b in completed_benchmarks if b["metrics"].get("tokens_per_second")]
        if speed_values:
            best_speed = max(speed_values, key=lambda x: x[1])
            worst_speed = min(speed_values, key=lambda x: x[1])
            comparison["analysis"]["fastest"] = best_speed[0]
            comparison["analysis"]["slowest"] = worst_speed[0]

        # Quality
        quality_values = [(b["id"], b.get("quality_metrics", {}).get("quality_score", 0)) for b in completed_benchmarks if b.get("quality_metrics")]
        if quality_values:
            best_quality = max(quality_values, key=lambda x: x[1])
            worst_quality = min(quality_values, key=lambda x: x[1])
            comparison["analysis"]["best_quality"] = best_quality[0]
            comparison["analysis"]["worst_quality"] = worst_quality[0]

        # Efficiency (quality per Wh)
        efficiency_values = []
        for b in completed_benchmarks:
            if b.get("quality_metrics") and b["metrics"]["total_energy_wh"] > 0:
                quality_score = b["quality_metrics"].get("quality_score", 0)
                energy = b["metrics"]["total_energy_wh"]
                efficiency = quality_score / energy
                efficiency_values.append((b["id"], efficiency))

        if efficiency_values:
            most_efficient = max(efficiency_values, key=lambda x: x[1])
            least_efficient = min(efficiency_values, key=lambda x: x[1])
            comparison["analysis"]["most_efficient"] = most_efficient[0]
            comparison["analysis"]["least_efficient"] = least_efficient[0]

    return comparison

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
                # Filter out embedding models
                models = [
                    model["id"] for model in data.get("data", [])
                    if not any(x in model["id"].lower() for x in ["embedding", "embed"])
                ]
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

            # Calculate quality metrics from full response
            full_response = inference_result["response"]
            quality_metrics = calculate_quality_metrics(full_response)

            result = {
                "id": str(uuid.uuid4()),
                "model_name": model,
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
                "quality_metrics": quality_metrics,
                "prompt": request.prompt,
                "response": full_response,  # Store full response
                "response_preview": full_response[:200] + "..." if len(full_response) > 200 else full_response
            }

        # Store result in database
        db.save(result)
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

    # Determine source based on base_url
    source = "lmstudio" if "localhost:1234" in request.base_url else "custom"

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
            "model_name": request.model,
            "timestamp": datetime.now().isoformat(),
            "status": "failed",
            "source": source,
            "error": inference_result.get("error", "Unknown error"),
            "prompt": request.prompt
        }
    else:
        # Calculate tokens per second
        tokens_per_second = None
        if inference_result["response_tokens"] > 0 and inference_duration > 0:
            tokens_per_second = inference_result["response_tokens"] / inference_duration

        # Calculate quality metrics from full response
        full_response = inference_result["response"]
        quality_metrics = calculate_quality_metrics(full_response)

        result = {
            "id": str(uuid.uuid4()),
            "model_name": request.model,
            "timestamp": datetime.now().isoformat(),
            "status": "completed",
            "source": source,
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
            "quality_metrics": quality_metrics,
            "prompt": request.prompt,
            "response": full_response,
            "response_preview": full_response[:200] + "..." if len(full_response) > 200 else full_response
        }

    # Store result in database
    db.save(result)

    return {
        "status": "completed",
        "result": result
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)