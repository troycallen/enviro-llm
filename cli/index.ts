#!/usr/bin/env node

import { Command } from 'commander';
import * as si from 'systeminformation';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import * as http from 'http';

const program = new Command();

program
  .name('envirollm')
  .description('Track resource usage of local LLM deployments')
  .version('1.0.0');

// LLM process names keywords to look for
const LLM_PROCESSES = [
  'ollama', 'llama', 'python', 'node', 'llamacpp', 'text-generation-webui',
  'koboldcpp', 'oobabooga', 'lmstudio', 'gpt4all'
];

async function findLLMProcesses() {
  try {
    const processes = await si.processes();
    return processes.list.filter(proc =>
      LLM_PROCESSES.some(name =>
        proc.name?.toLowerCase().includes(name) ||
        proc.command?.toLowerCase().includes(name)
      )
    );
  } catch (error) {
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
      try {
        let targetProcesses = [];

        if (options.auto) {
          targetProcesses = await findLLMProcesses();
        } else if (options.process) {
          const processes = await si.processes();
          targetProcesses = processes.list.filter(proc =>
            proc.name?.toLowerCase().includes(options.process.toLowerCase()) ||
            proc.command?.toLowerCase().includes(options.process.toLowerCase())
          );
        } else {
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
          console.log(`  CPU: ${proc.cpu?.toFixed(1) || 0}%`);
          console.log(`  Memory: ${(proc.memRss / 1024**2)?.toFixed(0) || 0}MB`);
          console.log(`  Power: ${((proc.cpu || 0) * 2).toFixed(1)}W`);
          console.log('');
        }

        const totalCpu = targetProcesses.reduce((sum, proc) => sum + (proc.cpu || 0), 0);
        const totalMem = targetProcesses.reduce((sum, proc) => sum + (proc.memRss || 0), 0);

        console.log('Total Usage:');
        console.log(`CPU: ${totalCpu.toFixed(1)}%`);
        console.log(`Memory: ${(totalMem / 1024**2).toFixed(0)}MB`);
        console.log(`Power: ${(totalCpu * 2).toFixed(1)}W`);

        console.log(`\nUpdated: ${new Date().toLocaleTimeString()}`);
        console.log('Press Ctrl+C to stop');

      } catch (error) {
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
        console.log(`${proc.name} (PID: ${proc.pid})`);
        console.log(`  Command: ${proc.command?.substring(0, 60)}...`);
        console.log(`  CPU: ${proc.cpu?.toFixed(1) || 0}%, Memory: ${(proc.memRss / 1024**2)?.toFixed(0) || 0}MB\n`);
      });

    } catch (error) {
      console.error('Error detecting processes:', error);
    }
  });

program
  .command('start')
  .description('Start the EnviroLLM web monitoring service')
  .option('-p, --port <port>', 'Port to run the service on', '8000')
  .action(async (options) => {
    console.log('Starting EnviroLLM monitoring service...');
    console.log(`Local endpoint: http://localhost:${options.port}`);
    console.log(`Dashboard: https://envirollm.com`);
    console.log('Requires Python 3.7+\n');

    const backendPath = join(__dirname, 'backend');
    const mainPy = join(backendPath, 'main.py');

    // Check if Python backend exists
    if (!existsSync(mainPy)) {
      console.error('Backend files not found. Please reinstall the package.');
      process.exit(1);
    }

    // Install Python dependencies
    console.log('Installing Python dependencies...');
    const pipInstall = spawn('pip', ['install', '-r', join(backendPath, 'requirements.txt')], {
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
      const pythonProcess = spawn('python', [mainPy], {
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
    const req = http.get('http://localhost:8000/', (res) => {
      console.log('EnviroLLM service is running');
      console.log('Visit: https://envirollm.com');
    });

    req.on('error', () => {
      console.log('EnviroLLM service is not running');
      console.log('Run: envirollm start');
    });
  });

program.parse();