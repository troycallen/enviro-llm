# EnviroLLM CLI

A command-line tool for monitoring, benchmarking, and optimizing local LLM resource usage.

## Installation

You can use this CLI in two ways:

**Option 1: Run with npx (no installation needed):**
```bash
npx envirollm start
```

**Option 2: Install globally:**
```bash
npm install -g envirollm
envirollm start
```

## Requirements

- Node.js 14+
- Python 3.7+
- pip (Python package manager)

## Quick Start

1. **Start the monitoring service:**
   ```bash
   npx envirollm start
   ```

2. **View your metrics:**
   Open [envirollm.com](https://envirollm.com) in your browser

## Commands

### Web Monitoring Service

```bash
npx envirollm start              # Start monitoring service (default port 8001)
npx envirollm start --port 8002  # Start on custom port
npx envirollm status             # Check if service is running
```

### Process Tracking

```bash
npx envirollm detect             # List all detected LLM processes
npx envirollm track --auto       # Auto-detect and track LLM processes
npx envirollm track -p python    # Track specific process by name
```

### Ollama Benchmarking

Automatically measure energy consumption and performance of Ollama models:

```bash
# Benchmark specific models
npx envirollm benchmark --models llama3:8b,phi3:mini

# Custom prompt
npx envirollm benchmark --models llama3:8b --prompt "Write a sorting function"

# Compare quantizations
npx envirollm benchmark --models llama3:8b,llama3:8b-q8
```

**Requirements:** Ollama installed and running (`ollama serve`)

**Metrics collected:**
- Energy consumption (Wh)
- Tokens per second
- CPU/GPU/memory usage
- Quantization detection (Q4, Q8, FP16)
- Power draw (W)
- Response quality comparison

### OpenAI-Compatible API Benchmarking

Benchmark LM Studio, vLLM, text-generation-webui, and other OpenAI-compatible APIs:

```bash
# LM Studio (default: http://localhost:1234/v1)
npx envirollm benchmark-openai --url http://localhost:1234/v1 --model llama-3-8b

# vLLM
npx envirollm benchmark-openai --url http://localhost:8000/v1 --model meta-llama/Llama-2-7b-hf

# Custom prompt
npx envirollm benchmark-openai --url http://localhost:1234/v1 --model phi-3-mini --prompt "Write a sorting function"

# With API key
npx envirollm benchmark-openai --url http://localhost:1234/v1 --model llama-3-8b --api-key your-key-here
```

## Web Interface Alternative

You can also run benchmarks using the web interface at **[envirollm.com/optimize](https://envirollm.com/optimize)** after starting the monitoring service with `npx envirollm start`. The web UI provides:

- Visual model selection for Ollama, LM Studio, and custom APIs
- Interactive results table with filtering and sorting
- Response comparison view to evaluate output quality
- Custom prompt configuration
- Same backend - results sync between CLI and web

## Features

- **Real-time Monitoring**: CPU, GPU, memory, and power consumption
- **Multi-Platform Benchmarking**: Support for Ollama, LM Studio, vLLM, and OpenAI-compatible APIs
- **Energy Tracking**: Accurate energy consumption measurements
- **Hardware Analysis**: Detailed system specifications and GPU detection
- **Optimization Recommendations**: System-specific suggestions for reducing energy usage
- **Process Detection**: Automatic identification of running LLM processes
- **Web Dashboard**: Clean interface at [envirollm.com](https://envirollm.com) for viewing metrics

## How It Works

The CLI starts a local Python backend service that collects system metrics using `psutil` and `pynvml`. The web dashboard at envirollm.com automatically detects if you're running the local service and switches to display your real hardware metrics instead of demo data.

Benchmarking runs inference requests against your local models while monitoring energy consumption, token generation speed, and resource usage in real-time.

## Project

This CLI is part of the [EnviroLLM project](https://envirollm.com) - an open-source toolkit for tracking and optimizing energy usage when running LLMs locally.

## License

MIT