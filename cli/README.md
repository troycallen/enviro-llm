# EnviroLLM CLI

A command-line tool for benchmarking energy consumption and performance of local LLMs across Ollama, LM Studio, vLLM, and other platforms.

## Installation

**Run with npx (no installation needed):**
```bash
npx envirollm start
```

**Or install globally:**
```bash
npm install -g envirollm
```

## Requirements

- Node.js 14+
- Python 3.7+
- pip (Python package manager)

## Quick Start

1. **Start the backend service:**
   ```bash
   npx envirollm start
   ```

2. **Run benchmarks:**
   ```bash
   # Ollama models
   npx envirollm benchmark --models llama3:8b,phi3:mini

   # LM Studio or other APIs
   npx envirollm benchmark-openai --url http://localhost:1234/v1 --model llama-3-8b
   ```

3. **View results:**
   - CLI: Results displayed in terminal after benchmark completes
   - Web: [envirollm.com/optimize](https://envirollm.com/optimize) for more detailed UI

## Commands

```bash
# Service Management
npx envirollm start              # Start backend service (required for benchmarks)
npx envirollm start --port 8002  # Start on custom port
npx envirollm status             # Check if service is running

# Benchmarking - Ollama
npx envirollm benchmark --models llama3:8b,phi3:mini
npx envirollm benchmark --models llama3:8b --prompt "Write a sorting function"
npx envirollm benchmark --models llama3:8b,llama3:8b-q8  # Compare quantizations

# Benchmarking - LM Studio, vLLM, Custom APIs
npx envirollm benchmark-openai --url http://localhost:1234/v1 --model llama-3-8b
npx envirollm benchmark-openai --url http://localhost:8000/v1 --model meta-llama/Llama-2-7b-hf
npx envirollm benchmark-openai --url http://localhost:1234/v1 --model phi-3 --prompt "Custom prompt"
npx envirollm benchmark-openai --url http://localhost:1234/v1 --model llama-3-8b --api-key your-key

# Data Management
npx envirollm clean              # Remove all stored benchmark data

# Process Monitoring
npx envirollm detect             # List detected LLM processes
npx envirollm track --auto       # Auto-detect and track LLM processes
npx envirollm track -p python    # Track specific process by name
```

### Benchmarking Details

**Requirements:**
- Ollama: Install Ollama and run `ollama serve`
- LM Studio/vLLM/Custom: API must be running on specified URL

**Metrics Collected:**
- Energy consumption (Wh)
- Tokens per second
- CPU/GPU/memory usage
- Quantization detection (Q4, Q8, FP16)
- Power draw (W)
- Response quality comparison

**Data Storage:**
All benchmark results are stored locally at `~/.envirollm/benchmarks.db`. Your data never leaves your machine.

## Web Interface Alternative

You can also run benchmarks using the web interface at **[envirollm.com/optimize](https://envirollm.com/optimize)** after starting the monitoring service with `npx envirollm start`. The web UI provides:

- Visual model selection for Ollama, LM Studio, and custom APIs
- CSV export functionality for benchmark data
- Response comparison view to evaluate output quality
- Custom prompt configuration
- Same backend - results sync between CLI and web

## Features

- **Real-time Monitoring**: CPU, GPU, memory, and power consumption
- **Multi-Platform Benchmarking**: Support for Ollama, LM Studio, vLLM, and OpenAI-compatible APIs
- **Optimization Recommendations**: System-specific suggestions for reducing energy usage
- **Process Detection**: Automatic identification of running LLM processes

## How It Works

The CLI starts a local Python backend service that collects system metrics using `psutil` and `pynvml`. The web dashboard at envirollm.com/dashboard automatically detects if you're running the local service and switches to display your real hardware metrics instead of demo data.

Benchmarking through the CLI or at envirollm.com/optimize runs inference requests against your local models while monitoring energy consumption, token generation speed, and resource usage in real-time.

## License

MIT