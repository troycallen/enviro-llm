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

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 font-inter">
      <NavBar />
      <div className="max-w-6xl mx-auto p-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
           Monitoring Dashboard
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-300">
              {isConnected ? 'Connected to monitoring service' : 'Disconnected'}
            </span>
          </div>
        </header>


        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">System Metrics</h2>
            <a
              href="/optimize"
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded border border-green-500 transition-colors font-medium"
            >
              Get Recommendations
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded">
            <h3 className="text-blue-400 font-bold text-lg mb-2">CPU Usage</h3>
            <div className="text-3xl font-mono text-white">
              {metrics ? metrics.cpu_usage.toFixed(1) : '0.0'}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics ? Math.min(metrics.cpu_usage, 100) : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 p-6 rounded">
            <h3 className="text-green-400 font-bold text-lg mb-2">Memory Usage</h3>
            <div className="text-3xl font-mono text-white">
              {metrics ? metrics.memory_usage.toFixed(1) : '0.0'}%
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics ? Math.min(metrics.memory_usage, 100) : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 p-6 rounded">
            <h3 className="text-yellow-400 font-bold text-lg mb-2">Power Estimate</h3>
            <div className="text-3xl font-mono text-white">
              {metrics ? metrics.power_estimate.toFixed(1) : '0.0'}W
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Estimated system power draw
            </div>
          </div>
          </div>
        </div>

        {metrics && metrics.gpu_info.available && metrics.gpu_info.gpus.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">GPU Metrics</h2>
            <div className="grid gap-4">
              {metrics.gpu_info.gpus.map((gpu) => (
                <div key={gpu.id} className="bg-gray-800 border border-gray-700 p-6 rounded">
                  <h3 className="text-purple-400 font-bold text-lg mb-4">{gpu.name}</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">GPU Usage</div>
                      <div className="text-2xl font-mono text-white">{gpu.usage_percent}%</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(gpu.usage_percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">VRAM</div>
                      <div className="text-2xl font-mono text-white">{gpu.memory_percent.toFixed(1)}%</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(gpu.memory_percent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Power</div>
                      <div className="text-2xl font-mono text-white">{gpu.power_watts}W</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Temperature</div>
                      <div className="text-2xl font-mono text-white">{gpu.temperature_c}°C</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics && error && error.includes('demo') && (
          <div className="bg-blue-900 border border-blue-700 p-4 mb-8 rounded">
            <p className="text-blue-300 text-sm">
              <strong>Demo Mode:</strong> Currently showing Railway server metrics.
              To monitor your local machine, install the CLI tool below or clone the repo and run the backend locally.
            </p>
          </div>
        )}

        {isConnected && !error ? (
          <div className="bg-green-900 border border-green-700 p-8 rounded">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-green-400">Successfully Connected</h2>
            </div>
            <p className="text-green-200 mt-4">
              Your local monitoring service is running and sending metrics from your system.
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 p-8 rounded">
            <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Clone the Repository</h3>
                <code className="bg-gray-900 px-4 py-2 rounded block">
                  git clone https://github.com/troycallen/enviro-llm.git
                </code>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">2. Start Monitoring Service</h3>
                <code className="bg-gray-900 px-4 py-2 rounded block">
                  cd enviro-llm/cli && npx tsx index.ts start
                </code>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">3. View Your Real Metrics</h3>
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
  );
}