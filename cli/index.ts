#!/usr/bin/env node

import { Command } from 'commander';
import * as si from 'systeminformation';
import chalk from 'chalk';

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
    console.log(chalk.green('🚀 EnviroLLM Process Tracker\n'));

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
        console.log(chalk.green('🚀 EnviroLLM Process Tracker\n'));

        if (targetProcesses.length === 0) {
          console.log(chalk.yellow('⚠️  No LLM processes detected'));
          console.log(chalk.gray('Common LLM processes: ollama, python (transformers), llamacpp\n'));
          return;
        }

        for (const proc of targetProcesses.slice(0, 5)) { // Show top 5
          console.log(chalk.blue(`📊 ${proc.name} (PID: ${proc.pid})`));
          console.log(`   CPU: ${proc.cpu?.toFixed(1) || 0}%`);
          console.log(`   Memory: ${(proc.memRss / 1024**2)?.toFixed(0) || 0}MB`);

          // Estimate power for this process
          const processPower = (proc.cpu || 0) * 2; // Rough estimate
          console.log(`   Power Est: ${processPower.toFixed(1)}W`);
          console.log('');
        }

        const totalCpu = targetProcesses.reduce((sum, proc) => sum + (proc.cpu || 0), 0);
        const totalMem = targetProcesses.reduce((sum, proc) => sum + (proc.memRss || 0), 0);

        console.log(chalk.cyan('=== Total LLM Usage ==='));
        console.log(`CPU: ${totalCpu.toFixed(1)}%`);
        console.log(`Memory: ${(totalMem / 1024**2).toFixed(0)}MB`);
        console.log(`Estimated Power: ${(totalCpu * 2).toFixed(1)}W`);

        console.log(chalk.gray(`\nLast update: ${new Date().toLocaleTimeString()}`));
        console.log(chalk.gray('Press Ctrl+C to stop'));

      } catch (error) {
        console.error(chalk.red('Error tracking processes:'), error);
      }
    };

    await trackProcesses();
    setInterval(trackProcesses, interval);
  });

program
  .command('detect')
  .description('Detect running LLM processes')
  .action(async () => {
    console.log(chalk.green('🔍 Scanning for LLM processes...\n'));

    try {
      const llmProcesses = await findLLMProcesses();

      if (llmProcesses.length === 0) {
        console.log(chalk.yellow('No LLM processes found'));
        console.log(chalk.gray('Try running: ollama serve, python your_model.py, etc.'));
        return;
      }

      console.log(chalk.blue(`Found ${llmProcesses.length} potential LLM process(es):\n`));

      llmProcesses.forEach(proc => {
        console.log(`${chalk.green('●')} ${proc.name} (PID: ${proc.pid})`);
        console.log(`   Command: ${proc.command?.substring(0, 60)}...`);
        console.log(`   CPU: ${proc.cpu?.toFixed(1) || 0}%, Memory: ${(proc.memRss / 1024**2)?.toFixed(0) || 0}MB\n`);
      });

    } catch (error) {
      console.error(chalk.red('Error detecting processes:'), error);
    }
  });

program.parse();