'use client';

import { useState, useEffect } from 'react';
import NavBar from '../../components/NavBar';
interface GPU {
  id: number;
  name: string;
  usage_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  memory_percent: number;
  power_watts: number;
  temperature_c: number;
}

interface Metrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  power_estimate: number;
  gpu_info: {
    available: boolean;
    gpus: GPU[];
    error?: string;
  };
}

interface SystemSpecs {
  memory_gb: number;
  cpu_cores: number;
  gpu_available: boolean;
  gpus: Array<{
    name: string;
    memory_total_gb: number;
  }>;
}

interface CostSavings {
  potential_power_savings_watts: number;
  monthly_savings_usd: number;
  yearly_savings_usd: number;
  kwh_rate: number;
}

interface Recommendation {
  type: string;
  priority: string;
  title: string;
  description: string;
  implementation: string;
  power_savings_watts?: number;
}

interface OptimizationData {
  system_specs: SystemSpecs;
  recommendations: Recommendation[];
  cost_savings: CostSavings;
}

const GPU_POWER_REFERENCE_WATTS = 450;
const GPU_TEMPERATURE_REFERENCE_C = 110;

const clampPercent = (value: number, maxValue: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) {
    return 0;
  }
  return Math.min(Math.max((value / maxValue) * 100, 0), 100);
};

const getPowerColor = (powerWatts: number) => {
  if (powerWatts < 180) {
    return 'bg-emerald-500';
  }
  if (powerWatts < 300) {
    return 'bg-lime-500';
  }
  return 'bg-amber-500';
};

const getTemperatureColor = (temperatureC: number) => {
  if (temperatureC < 65) {
    return 'bg-teal-500';
  }
  if (temperatureC < 80) {
    return 'bg-lime-500';
  }
  return 'bg-amber-500';
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPowerInfo, setShowPowerInfo] = useState(false);
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);
  const [costSavings, setCostSavings] = useState<CostSavings | null>(null);
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);

  const currentPowerEstimate = metrics?.power_estimate ?? 0;
  const systemPowerPercent = clampPercent(currentPowerEstimate, GPU_POWER_REFERENCE_WATTS);
  const systemPowerColor = getPowerColor(currentPowerEstimate);

  useEffect(() => {
    localStorage.setItem('hasVisitedDashboard', 'true');

    // Check if monitoring is active
    const hasVisitedDashboard = localStorage.getItem('hasVisitedDashboard');

    if (hasVisitedDashboard) {
      const fetchMetrics = async () => {
        try {
          // Try local CLI first
          const response = await fetch('http://localhost:8001/metrics');
          if (response.ok) {
            const data = await response.json();
            setMetrics(data);
            setIsConnected(true);
            setError(null);
          } else {
            throw new Error('Local backend not responding');
          }
        } catch {
          // Fall back to Railway demo server
          try {
            const response = await fetch('https://enviro-llm-production.up.railway.app/metrics');
            if (response.ok) {
              const data = await response.json();
              setMetrics(data);
              setIsConnected(true);
              setError('Showing demo metrics. Start local CLI to see your system.');
            } else {
              throw new Error('Demo backend not responding');
            }
          } catch {
            setIsConnected(false);
            setError('Unable to connect to EnviroLLM backend. The monitoring service may be temporarily unavailable.');
          }
        }
      };

      fetchMetrics();
      const interval = setInterval(fetchMetrics, 2000);

      // Fetch system specs, cost savings, and optimization data 
      const fetchSpecs = async () => {
        try {
          const response = await fetch('http://localhost:8001/optimize');
          if (response.ok) {
            const data = await response.json();
            setSystemSpecs(data.system_specs);
            setCostSavings(data.cost_savings);
            setOptimizationData(data);
          }
        } catch {
          try {
            const response = await fetch('https://enviro-llm-production.up.railway.app/optimize');
            if (response.ok) {
              const data = await response.json();
              setSystemSpecs(data.system_specs);
              setCostSavings(data.cost_savings);
              setOptimizationData(data);
            }
          } catch {}
        }
      };
      fetchSpecs();

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 font-inter relative">
      {/* Background Image */}
      <div className="fixed inset-0 bg-cover bg-center opacity-70 pointer-events-none" style={{ backgroundImage: 'url(/enviro_background.jpg)' }}></div>
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/60 to-gray-900 pointer-events-none"></div>

      <div className="relative z-10">
        <NavBar />
        <div className="max-w-6xl mx-auto px-8 py-16">
          <header className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-6">
             Monitoring Dashboard
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <span className="text-gray-300">
                {isConnected ? 'Connected to monitoring service' : 'Disconnected'}
              </span>
            </div>
          </header>


        <div className="mb-12 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-semibold text-white">System Metrics</h2>
            <a
              href="/optimize"
              className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-md transition-all font-medium"
            >
              Benchmark Models
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
          <div className="bg-gray-800/90 border border-gray-700 p-6 rounded-lg">
            <h3 className="text-emerald-400 font-semibold text-lg mb-2">CPU Usage</h3>
            <div className="text-3xl font-mono text-white">
              {metrics ? metrics.cpu_usage.toFixed(1) : '0.0'}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics ? Math.min(metrics.cpu_usage, 100) : 0}%` }}
              ></div>
            </div>
            {systemSpecs && (
              <div className="text-xs text-gray-400 mt-2">{systemSpecs.cpu_cores} cores</div>
            )}
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-6 rounded-lg">
            <h3 className="text-teal-400 font-semibold text-lg mb-2">Memory Usage</h3>
            <div className="text-3xl font-mono text-white">
              {metrics ? metrics.memory_usage.toFixed(1) : '0.0'}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics ? Math.min(metrics.memory_usage, 100) : 0}%` }}
              ></div>
            </div>
            {systemSpecs && (
              <div className="text-xs text-gray-400 mt-2">{systemSpecs.memory_gb}GB total</div>
            )}
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-6 rounded-lg relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lime-400 font-semibold text-lg">Power Estimate</h3>
              <button
                onClick={() => setShowPowerInfo(!showPowerInfo)}
                className="text-lime-400 hover:text-lime-300 text-sm font-semibold w-6 h-6 rounded-full border border-lime-400 flex items-center justify-center cursor-pointer"
                aria-label="Power calculation info"
              >
                ?
              </button>
            </div>
            <div className="text-3xl font-mono text-white">
              {metrics ? metrics.power_estimate.toFixed(1) : '0.0'}
              <span className="ml-1 text-lg text-gray-400">W</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div
                className={`${systemPowerColor} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${systemPowerPercent}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-2">Estimated system power draw</div>
            {showPowerInfo && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50"
                  onClick={() => setShowPowerInfo(false)}
                ></div>
                <div className="absolute z-50 left-50 top-15 w-80 bg-gray-800/95 border border-gray-600 rounded-lg p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Power Calculation Formula</h4>
                    <button
                      onClick={() => setShowPowerInfo(false)}
                      className="text-gray-400 hover:text-white text-2xl font-semibold cursor-pointer"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p><strong>Base Power:</strong> 50W (system idle)</p>
                    <p><strong>CPU Power:</strong> CPU Usage % × 2W</p>
                    <p><strong>GPU Power:</strong> Measured GPU power</p>
                    <p className="pt-2 border-t border-gray-700"><strong>Total:</strong> Base + CPU + GPU</p>
                    <p className="text-xs text-gray-400 mt-2">Note: This is an estimate. Numbers may vary.</p>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>

        {metrics && metrics.gpu_info.available && metrics.gpu_info.gpus.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-semibold text-white mb-6">GPU Metrics</h2>
            <div className="grid gap-4">
              {metrics.gpu_info.gpus.map((gpu) => {
                const powerPercent = clampPercent(gpu.power_watts, GPU_POWER_REFERENCE_WATTS);
                const temperaturePercent = clampPercent(
                  gpu.temperature_c,
                  GPU_TEMPERATURE_REFERENCE_C
                );
                const temperatureColor = getTemperatureColor(gpu.temperature_c);

                return (
                  <div key={gpu.id} className="bg-gray-800/90 border border-gray-700 p-6 rounded-lg">
                    <h3 className="text-emerald-400 font-semibold text-lg mb-4">{gpu.name}</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">GPU Usage</div>
                        <div className="text-2xl font-mono text-white">{gpu.usage_percent}%</div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(gpu.usage_percent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">VRAM</div>
                        <div className="text-2xl font-mono text-white">{gpu.memory_percent.toFixed(1)}%</div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(gpu.memory_percent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Power</div>
                        <div className="text-2xl font-mono text-white">{gpu.power_watts}W</div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-lime-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${powerPercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Temperature</div>
                        <div className="text-2xl font-mono text-white">
                          {gpu.temperature_c}
                          <span className="ml-1 text-sm text-gray-400">&deg;C</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div
                            className={`${temperatureColor} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${temperaturePercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isConnected && !error && optimizationData && optimizationData.recommendations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-semibold text-white mb-6">System Optimization</h2>

            <div className="space-y-4">
              {optimizationData.recommendations.map((rec, idx) => {
                const priorityColors = {
                  high: 'border-amber-500/50',
                  medium: 'border-lime-500/50',
                  low: 'border-emerald-500/50',
                };
                const priorityTextColors = {
                  high: 'text-amber-400',
                  medium: 'text-lime-400',
                  low: 'text-emerald-400',
                };

                return (
                  <div
                    key={idx}
                    className={`bg-gray-800/90 border ${priorityColors[rec.priority as keyof typeof priorityColors] || 'border-gray-700'} p-6 rounded-lg`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${priorityTextColors[rec.priority as keyof typeof priorityTextColors]}`}>{rec.title}</h3>
                      <span className={`text-xs font-semibold ${priorityTextColors[rec.priority as keyof typeof priorityTextColors]}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{rec.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {metrics && error && error.includes('demo') && (
          <div className="bg-blue-900 border border-blue-700 p-4 mb-8 rounded">
            <p className="text-blue-300 text-sm">
              <strong>Demo Mode:</strong> Currently showing Railway server metrics.
              To monitor your local machine, run the CLI tool below.
            </p>
          </div>
        )}

        {(!isConnected || (error && error.includes('demo'))) && (
          <div className="bg-gray-800 border border-gray-700 p-8 rounded mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Run CLI (no installation needed)</h3>
                <code className="bg-gray-900 px-4 py-2 rounded block">
                  npx envirollm start
                </code>
                <p className="text-sm text-gray-400 mt-2">Requirements: Node.js and Python 3.7+</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">2. View Your Real Metrics</h3>
                <p>Return to this dashboard to see your local system metrics in real-time.</p>
              </div>
            </div>
          </div>
        )}

        {metrics && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            Last updated: {new Date().toLocaleString()}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
