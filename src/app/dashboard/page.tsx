'use client';

import { useState, useEffect } from 'react';

interface Metrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  power_estimate: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('https://enviro-llm-production.up.railway.app/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
          setIsConnected(true);
          setError(null);
        } else {
          throw new Error('Backend not responding');
        }
      } catch (err) {
        setIsConnected(false);
        setError('Unable to connect to EnviroLLM backend. The monitoring service may be temporarily unavailable.');
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 font-inter p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            EnviroLLM Dashboard
          </h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-300">
              {isConnected ? 'Connected to monitoring service' : 'Disconnected'}
            </span>
          </div>
        </header>

        {error && (
          <div className="bg-red-900 border border-red-700 p-6 mb-8 rounded">
            <h3 className="text-red-400 font-bold mb-2">Connection Error</h3>
            <p className="text-red-300">{error}</p>
            <div className="mt-4 text-sm text-red-200">
              <p>To start monitoring:</p>
              <code className="bg-red-800 px-2 py-1 rounded mt-1 block">
                cd backend && python main.py
              </code>
            </div>
          </div>
        )}

        {metrics && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 p-6 rounded">
              <h3 className="text-blue-400 font-bold text-lg mb-2">CPU Usage</h3>
              <div className="text-3xl font-mono text-white">
                {metrics.cpu_usage.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(metrics.cpu_usage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 p-6 rounded">
              <h3 className="text-green-400 font-bold text-lg mb-2">Memory Usage</h3>
              <div className="text-3xl font-mono text-white">
                {metrics.memory_usage.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(metrics.memory_usage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 p-6 rounded">
              <h3 className="text-yellow-400 font-bold text-lg mb-2">Power Estimate</h3>
              <div className="text-3xl font-mono text-white">
                {metrics.power_estimate.toFixed(1)}W
              </div>
              <div className="text-sm text-gray-400 mt-2">
                Estimated system power draw
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 p-8 rounded">
          <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Start the Backend</h3>
              <code className="bg-gray-900 px-4 py-2 rounded block">
                cd backend && python main.py
              </code>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">2. Use the CLI for Advanced Monitoring</h3>
              <code className="bg-gray-900 px-4 py-2 rounded block">
                cd cli && npm run dev track --auto
              </code>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">3. Monitor Your LLM Processes</h3>
              <p>The dashboard will automatically detect and track resource usage of your local LLM deployments.</p>
            </div>
          </div>
        </div>

        {metrics && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}