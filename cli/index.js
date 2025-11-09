#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const si = __importStar(require("systeminformation"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
const http = __importStar(require("http"));
const program = new commander_1.Command();
program
    .name('envirollm')
    .description('Track resource usage of local LLM deployments')
    .version('1.0.0');
// LLM process names keywords to look for
const LLM_PROCESSES = [
    'ollama', 'llama.cpp', 'llama-server', 'llamacpp', 'text-generation-webui',
    'koboldcpp', 'oobabooga', 'lmstudio', 'gpt4all', 'localai', 'vllm',
    'llama-cpp-python', 'transformers', 'inference'
];
async function findLLMProcesses() {
    try {
        const processes = await si.processes();
        return processes.list.filter(proc => {
            var _a, _b;
            const procName = ((_a = proc.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
            const procCommand = ((_b = proc.command) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
            // Exclude common false positives
            const excludePatterns = [
                'code.exe', 'vscode', 'electron', 'chrome', 'node_modules',
                'npm', 'npx', 'esbuild', 'webpack', 'typescript', 'tsx',
                'postcss', 'nvidia web helper', 'discord'
            ];
            if (excludePatterns.some(pattern => procName.includes(pattern) || procCommand.includes(pattern))) {
                return false;
            }
            // Match LLM processes
            return LLM_PROCESSES.some(name => procName.includes(name) || procCommand.includes(name));
        });
    }
    catch (error) {
        return [];
    }
}
program
    .command('track')
    .description('Track specific LLM processes')
    .option('-p, --process <name>', 'Specific process name to track')
    .option('-a, --auto', 'Auto-detect LLM processes')
    .option('-i, --interval <seconds>', 'Update interval in seconds', '2')
    .action(async (options) => {
    console.log('EnviroLLM Process Tracker\n');
    const interval = parseInt(options.interval) * 1000;
    const trackProcesses = async () => {
        var _a, _b;
        try {
            let targetProcesses = [];
            if (options.auto) {
                targetProcesses = await findLLMProcesses();
            }
            else if (options.process) {
                const processes = await si.processes();
                targetProcesses = processes.list.filter(proc => {
                    var _a, _b;
                    return ((_a = proc.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(options.process.toLowerCase())) ||
                        ((_b = proc.command) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(options.process.toLowerCase()));
                });
            }
            else {
                targetProcesses = await findLLMProcesses();
            }
            console.clear();
            console.log('EnviroLLM Process Tracker\n');
            if (targetProcesses.length === 0) {
                console.log('No LLM processes detected');
                console.log('Common processes: ollama, python, llamacpp\n');
                return;
            }
            for (const proc of targetProcesses.slice(0, 5)) { // Show top 5
                console.log(`${proc.name} (PID: ${proc.pid})`);
                console.log(`  CPU: ${((_a = proc.cpu) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || 0}%`);
                console.log(`  Memory: ${((_b = (proc.memRss / 1024 ** 2)) === null || _b === void 0 ? void 0 : _b.toFixed(0)) || 0}MB`);
                console.log(`  Power: ${((proc.cpu || 0) * 2).toFixed(1)}W`);
                console.log('');
            }
            const totalCpu = targetProcesses.reduce((sum, proc) => sum + (proc.cpu || 0), 0);
            const totalMem = targetProcesses.reduce((sum, proc) => sum + (proc.memRss || 0), 0);
            console.log('Total Usage:');
            console.log(`CPU: ${totalCpu.toFixed(1)}%`);
            console.log(`Memory: ${(totalMem / 1024 ** 2).toFixed(0)}MB`);
            console.log(`Power: ${(totalCpu * 2).toFixed(1)}W`);
            console.log(`\nUpdated: ${new Date().toLocaleTimeString()}`);
            console.log('Press Ctrl+C to stop');
        }
        catch (error) {
            console.error('Error tracking processes:', error);
        }
    };
    await trackProcesses();
    setInterval(trackProcesses, interval);
});
program
    .command('detect')
    .description('Detect running LLM processes')
    .action(async () => {
    console.log('Scanning for LLM processes...\n');
    try {
        const llmProcesses = await findLLMProcesses();
        if (llmProcesses.length === 0) {
            console.log('No LLM processes found');
            console.log('Try: ollama serve, python model.py, etc.');
            return;
        }
        console.log(`Found ${llmProcesses.length} LLM process(es):\n`);
        llmProcesses.forEach(proc => {
            var _a, _b, _c;
            console.log(`${proc.name} (PID: ${proc.pid})`);
            console.log(`  Command: ${(_a = proc.command) === null || _a === void 0 ? void 0 : _a.substring(0, 60)}...`);
            console.log(`  CPU: ${((_b = proc.cpu) === null || _b === void 0 ? void 0 : _b.toFixed(1)) || 0}%, Memory: ${((_c = (proc.memRss / 1024 ** 2)) === null || _c === void 0 ? void 0 : _c.toFixed(0)) || 0}MB\n`);
        });
    }
    catch (error) {
        console.error('Error detecting processes:', error);
    }
});
program
    .command('start')
    .description('Start the EnviroLLM web monitoring service')
    .option('-p, --port <port>', 'Port to run the service on', '8001')
    .action(async (options) => {
    console.log('Starting EnviroLLM monitoring service...');
    console.log(`Local endpoint: http://localhost:${options.port}`);
    console.log(`Dashboard: https://envirollm.com`);
    console.log('Requires Python 3.7+\n');
    const backendPath = (0, path_1.join)(__dirname, 'backend');
    const mainPy = (0, path_1.join)(backendPath, 'main.py');
    // Check if Python backend exists
    if (!(0, fs_1.existsSync)(mainPy)) {
        console.error('Backend files not found. Please reinstall the package.');
        process.exit(1);
    }
    // Install Python dependencies
    console.log('Installing Python dependencies...');
    const pipInstall = (0, child_process_1.spawn)('pip', ['install', '-r', (0, path_1.join)(backendPath, 'requirements.txt')], {
        stdio: 'inherit',
        cwd: backendPath
    });
    pipInstall.on('close', (code) => {
        if (code !== 0) {
            console.error('Failed to install Python dependencies');
            console.log('Try: pip3 install -r requirements.txt');
            process.exit(1);
        }
        console.log('Dependencies installed');
        // Start the Python backend
        console.log('Starting monitoring backend...');
        const pythonProcess = (0, child_process_1.spawn)('python', [mainPy], {
            stdio: 'inherit',
            cwd: backendPath,
            env: { ...process.env, PORT: options.port }
        });
        pythonProcess.on('close', (code) => {
            console.log(`\nEnviroLLM monitoring stopped (code: ${code})`);
        });
        process.on('SIGINT', () => {
            console.log('\nStopping EnviroLLM monitoring...');
            pythonProcess.kill('SIGINT');
            process.exit(0);
        });
    });
});
program
    .command('status')
    .description('Check if EnviroLLM web service is running')
    .action(() => {
    const req = http.get('http://localhost:8001/', (res) => {
        console.log('EnviroLLM service is running');
        console.log('Visit: https://envirollm.com');
    });
    req.on('error', () => {
        console.log('EnviroLLM service is not running');
        console.log('Run: envirollm start');
    });
});
program
    .command('clean')
    .description('Remove all stored benchmark data')
    .action(async () => {
    const { homedir } = await Promise.resolve().then(() => __importStar(require('os')));
    const { unlink, access } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
    const { constants } = await Promise.resolve().then(() => __importStar(require('fs')));
    const { createInterface } = await Promise.resolve().then(() => __importStar(require('readline')));
    const dbPath = (0, path_1.join)(homedir(), '.envirollm', 'benchmarks.db');
    console.log(chalk_1.default.bold.yellow('\nEnviroLLM Data Cleanup\n'));
    console.log(`Database location: ${dbPath}\n`);
    // Check if db exists
    try {
        await access(dbPath, constants.F_OK);
    }
    catch (_a) {
        console.log(chalk_1.default.gray('No database found. Nothing to clean.'));
        return;
    }
    // confirmation
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const answer = await new Promise((resolve) => {
        rl.question(chalk_1.default.red('This will permanently delete all benchmark data.\nAre you sure? (y/N): '), resolve);
    });
    rl.close();
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log(chalk_1.default.gray('\nCancelled. No data was deleted.\n'));
        return;
    }
    try {
        await unlink(dbPath);
        console.log(chalk_1.default.green('\n✓ Database deleted successfully'));
        console.log(chalk_1.default.gray('All benchmark data has been removed.\n'));
    }
    catch (error) {
        console.error(chalk_1.default.red('\nError deleting database:'), error.message);
        process.exit(1);
    }
});
program
    .command('benchmark')
    .description('Run automated Ollama benchmarks')
    .option('-m, --models <models>', 'Comma-separated list of models (e.g., llama3:8b,phi3:mini)')
    .option('-p, --prompt <prompt>', 'Custom prompt for benchmarking', 'Explain quantum computing in simple terms.')
    .action(async (options) => {
    console.log(chalk_1.default.bold.cyan('\nEnviroLLM Ollama Benchmark\n'));
    // Check if backend is running
    try {
        await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:8001/', (res) => resolve());
            req.on('error', () => reject());
        });
    }
    catch (_a) {
        console.error(chalk_1.default.red('Error: EnviroLLM backend is not running'));
        console.log('Run: envirollm start');
        process.exit(1);
    }
    // Check if Ollama is available
    const ollamaStatusReq = http.request({
        hostname: 'localhost',
        port: 8001,
        path: '/ollama/status',
        method: 'GET'
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            const status = JSON.parse(data);
            if (!status.available) {
                console.error(chalk_1.default.red('Error: Ollama is not running'));
                console.log('Start Ollama first: ollama serve');
                process.exit(1);
            }
            console.log(chalk_1.default.green(`✓ Ollama detected with ${status.model_count} models available\n`));
            let modelsToTest = [];
            if (options.models) {
                modelsToTest = options.models.split(',').map((m) => m.trim());
            }
            else {
                // Show available models
                console.log('Available models:');
                status.models.forEach((model, i) => {
                    console.log(`  ${i + 1}. ${model}`);
                });
                if (status.models.length === 0) {
                    console.error(chalk_1.default.red('\nNo models found. Pull a model first:'));
                    console.log('  ollama pull llama3:8b');
                    process.exit(1);
                }
                console.log(chalk_1.default.yellow('\nNo models specified. Use --models flag:'));
                console.log('  envirollm benchmark --models llama3:8b,phi3:mini');
                process.exit(0);
            }
            console.log(chalk_1.default.bold('Models to benchmark:'));
            modelsToTest.forEach(model => console.log(`  • ${model}`));
            console.log(`\nPrompt: "${options.prompt}"\n`);
            // Run benchmark
            const postData = JSON.stringify({
                models: modelsToTest,
                prompt: options.prompt
            });
            const benchmarkReq = http.request({
                hostname: 'localhost',
                port: 8001,
                path: '/ollama/benchmark',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    const result = JSON.parse(responseData);
                    console.log(chalk_1.default.bold.green('\n✓ Benchmark Complete!\n'));
                    console.log(chalk_1.default.bold('Results:\n'));
                    result.results.forEach((r) => {
                        if (r.status === 'failed') {
                            console.log(chalk_1.default.red(`✗ ${r.model_name} - FAILED`));
                            console.log(`  Error: ${r.error}\n`);
                        }
                        else {
                            console.log(chalk_1.default.cyan(`${r.model_name} (${r.quantization})`));
                            console.log(`  Energy: ${chalk_1.default.yellow(r.metrics.total_energy_wh.toFixed(4))} Wh`);
                            console.log(`  Power: ${r.metrics.avg_power_watts}W`);
                            console.log(`  Speed: ${r.metrics.tokens_per_second || 'N/A'} tok/s`);
                            console.log(`  Tokens: ${r.metrics.tokens_generated} generated`);
                            console.log(`  Duration: ${r.metrics.duration_seconds}s\n`);
                        }
                    });
                    console.log(chalk_1.default.gray('View detailed results at: https://envirollm.com/optimize'));
                });
            });
            benchmarkReq.on('error', (err) => {
                console.error(chalk_1.default.red('Benchmark failed:', err.message));
                process.exit(1);
            });
            benchmarkReq.write(postData);
            benchmarkReq.end();
        });
    });
    ollamaStatusReq.on('error', (err) => {
        console.error(chalk_1.default.red('Failed to connect to backend:', err.message));
        process.exit(1);
    });
    ollamaStatusReq.end();
});
program
    .command('benchmark-openai')
    .description('Benchmark OpenAI-compatible API (LM Studio, text-gen-webui, vLLM, etc.)')
    .requiredOption('-u, --url <url>', 'Base URL of the API (e.g., http://localhost:1234/v1)')
    .requiredOption('-m, --model <model>', 'Model name (e.g., llama-3-8b)')
    .option('-p, --prompt <prompt>', 'Custom prompt for benchmarking', 'Explain quantum computing in simple terms.')
    .option('-k, --api-key <key>', 'API key (optional)')
    .action(async (options) => {
    console.log(chalk_1.default.bold.cyan('\nEnviroLLM OpenAI API Benchmark\n'));
    // Check if backend is running
    try {
        await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:8001/', (res) => resolve());
            req.on('error', () => reject());
        });
    }
    catch (_a) {
        console.error(chalk_1.default.red('Error: EnviroLLM backend is not running'));
        console.log('Run: envirollm start');
        process.exit(1);
    }
    console.log(chalk_1.default.bold('Configuration:'));
    console.log(`  API URL: ${options.url}`);
    console.log(`  Model: ${options.model}`);
    console.log(`  Prompt: "${options.prompt}"\n`);
    // Run benchmark
    const postData = JSON.stringify({
        base_url: options.url,
        model: options.model,
        prompt: options.prompt,
        api_key: options.apiKey || null
    });
    const benchmarkReq = http.request({
        hostname: 'localhost',
        port: 8001,
        path: '/openai/benchmark',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(responseData);
                if (result.status === 'completed') {
                    const r = result.result;
                    if (r.status === 'failed') {
                        console.log(chalk_1.default.red(`✗ ${r.model_name} - FAILED`));
                        console.log(`  Error: ${r.error}\n`);
                    }
                    else {
                        console.log(chalk_1.default.bold.green('\n✓ Benchmark Complete!\n'));
                        console.log(chalk_1.default.bold('Results:\n'));
                        console.log(chalk_1.default.cyan(`${r.model_name} (${r.quantization})`));
                        console.log(`  Energy: ${chalk_1.default.yellow(r.metrics.total_energy_wh.toFixed(4))} Wh`);
                        console.log(`  Power: ${r.metrics.avg_power_watts}W`);
                        console.log(`  Speed: ${r.metrics.tokens_per_second || 'N/A'} tok/s`);
                        console.log(`  Tokens: ${r.metrics.tokens_generated} generated`);
                        console.log(`  Duration: ${r.metrics.duration_seconds}s\n`);
                    }
                    console.log(chalk_1.default.gray('View detailed results at: https://envirollm.com/optimize'));
                }
            }
            catch (err) {
                console.error(chalk_1.default.red('Failed to parse response'));
                console.error(responseData);
            }
        });
    });
    benchmarkReq.on('error', (err) => {
        console.error(chalk_1.default.red('Benchmark failed:', err.message));
        process.exit(1);
    });
    benchmarkReq.write(postData);
    benchmarkReq.end();
});
program.parse();
