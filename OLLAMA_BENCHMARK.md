# Ollama Automated Benchmarking

Automated benchmarking for Ollama models with energy measurement and token counting.

## Prerequisites

- Ollama installed and running (`ollama serve`)
- At least one model pulled (`ollama pull llama3:8b`)
- EnviroLLM backend running (`npx envirollm start`)

## Usage

### CLI

```bash
# Compare models
envirollm benchmark --models llama3:8b,phi3:mini

# Custom prompt
envirollm benchmark --models llama3:8b --prompt "Write a sorting function"

# List available models
envirollm benchmark
```

### Web UI

1. Go to envirollm.com/optimize
2. Click "Ollama Benchmark"
3. Select models
4. View results in table

## Metrics Collected

- Energy consumption (Wh)
- Power draw (W)
- Tokens per second
- Token counts (prompt + response)
- CPU/GPU/memory usage
- Inference duration
- Actual response text (first 200 chars)

## Comparing Quantizations

```bash
ollama pull llama3:8b        # Q4 default
ollama pull llama3:8b-q8     # 8-bit

envirollm benchmark --models llama3:8b,llama3:8b-q8
```

The system auto-detects quantization levels (Q4, Q8, FP16).

## API

**Check Ollama status:**
```
GET http://localhost:8001/ollama/status
```

**Run benchmark:**
```
POST http://localhost:8001/ollama/benchmark
{
  "models": ["llama3:8b"],
  "prompt": "Explain quantum computing"
}
```

