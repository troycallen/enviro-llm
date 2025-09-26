# EnviroLLM CLI

A command-line tool for monitoring and optimizing local LLM resource usage.

## Installation

```bash
npm install -g envirollm-cli
```

## Requirements

- Node.js 14+
- Python 3.7+
- pip (Python package manager)

## Quick Start

1. **Install the CLI tool:**
   ```bash
   npm install -g envirollm-cli
   ```

2. **Start monitoring service:**
   ```bash
   envirollm start
   ```

3. **View your metrics:**
   Open [envirollm.com](https://envirollm.com) in your browser

## Commands

### Web Monitoring Service

- `envirollm start` - Start monitoring web service (default port 8000)
- `envirollm start --port 8001` - Start service on custom port
- `envirollm status` - Check if service is running

### Process Tracking (Terminal)

- `envirollm track --auto` - Auto-detect and track LLM processes
- `envirollm track -p python` - Track specific process by name
- `envirollm detect` - List all detected LLM processes

## Features

- **Real-time Monitoring**: CPU, GPU, memory, and power consumption
- **Hardware Analysis**: Detailed system specifications and GPU detection
- **Optimization Recommendations**: System-specific suggestions for better performance
- **Process Detection**: Automatic identification of running LLM processes
- **Web Dashboard**: Clean interface at envirollm.com for viewing metrics

## How It Works

The CLI starts a local Python backend service that collects system metrics using `psutil` and `pynvml`. The web dashboard at envirollm.com automatically detects if you're running the local service and switches to display your real hardware metrics instead of demo data.

## License

MIT