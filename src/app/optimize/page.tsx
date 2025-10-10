'use client';

import { useState, useEffect } from 'react';
import NavBar from '../../components/NavBar';

interface Recommendation {
  type: string;
  priority: string;
  title: string;
  description: string;
  implementation: string;
}

interface OptimizationData {
  system_specs: {
    memory_gb: number;
    cpu_cores: number;
    gpu_available: boolean;
    gpus: Array<{
      id: number;
      name: string;
      memory_total_gb: number;
    }>;
  };
  recommendations: Recommendation[];
  cost_savings: {
    potential_power_savings_watts: number;
    monthly_savings_usd: number;
    yearly_savings_usd: number;
    kwh_rate: number;
  };
}

interface BenchmarkResult {
  id: string;
  model_name: string;
  quantization: string;
  timestamp: string;
  metrics: {
    avg_cpu_usage: number;
    avg_memory_usage: number;
    avg_power_watts: number;
    peak_memory_gb: number;
    total_energy_wh: number;
    duration_seconds: number;
    tokens_generated?: number;
    tokens_per_second?: number;
  };
}

export default function OptimizePage() {
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load benchmarks from localStorage on mount
    const savedBenchmarks = localStorage.getItem('envirollm_benchmarks');
    if (savedBenchmarks) {
      try {
        setBenchmarkResults(JSON.parse(savedBenchmarks));
      } catch {
        // Invalid data, ignore
      }
    }

    const fetchOptimizationData = async () => {
      try {
        // Try local CLI backend first
        const response = await fetch('http://localhost:8001/optimize');

        if (response.ok) {
          const data = await response.json();
          setOptimizationData(data);
        } else {
          throw new Error('Local CLI not responding');
        }
      } catch (err) {
        // Fall back to Railway demo server
        try {
          const response = await fetch('https://enviro-llm-production.up.railway.app/optimize');
          if (response.ok) {
            const data = await response.json();
            setOptimizationData(data);
          } else {
            throw new Error('Demo backend not responding');
          }
        } catch {
          setError('Unable to connect to backend. Make sure the CLI is running.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    const fetchBenchmarks = async () => {
      try {
        const response = await fetch('http://localhost:8001/benchmarks');
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          setBenchmarkResults(results);
          localStorage.setItem('envirollm_benchmarks', JSON.stringify(results));
        }
      } catch {
        // No fallback - benchmarks require local CLI
      }
    };

    fetchOptimizationData();
    fetchBenchmarks();
  }, []);

  const startBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      await fetch('http://localhost:8001/benchmark/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "Explain quantum computing.",
          model_name: "Current LLM",
          quantization: "Unknown"
        })
      });
      setTimeout(async () => {
        const response = await fetch('http://localhost:8001/benchmarks');
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          setBenchmarkResults(results);
          localStorage.setItem('envirollm_benchmarks', JSON.stringify(results));
        }
        setIsRunningBenchmark(false);
      }, 32000); // 30 seconds + 2 second buffer
    } catch {
      setIsRunningBenchmark(false);
    }
  };

  const clearBenchmarks = async () => {
    try {
      const response = await fetch('http://localhost:8001/benchmarks', {
        method: 'DELETE'
      });
      if (response.ok) {
        setBenchmarkResults([]);
        localStorage.removeItem('envirollm_benchmarks');
      }
    } catch {
      // Handle error silently
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 font-inter">
        <NavBar />
        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center">
            <div className="text-2xl text-white">Analyzing your system...</div>
            <div className="text-gray-400 mt-2">Generating optimization recommendations</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 font-inter">
        <NavBar />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-red-900 border border-red-700 p-6 rounded">
            <h2 className="text-red-400 font-bold mb-2">Connection Error</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 font-inter">
      <NavBar />
      <div className="max-w-6xl mx-auto p-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            System Optimization
          </h1>
        </header>

        {optimizationData && (
          <>
            {/* Potential Savings */}
            {optimizationData.cost_savings && optimizationData.cost_savings.potential_power_savings_watts > 0 && (
              <div className="bg-gray-800 border-l-4 border-green-500 p-6 mb-8 rounded">
                <h2 className="text-xl font-bold text-green-400 mb-4">Potential Savings</h2>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{optimizationData.cost_savings.potential_power_savings_watts}W</div>
                    <div className="text-sm text-gray-400">Power Reduction</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">${optimizationData.cost_savings.monthly_savings_usd}/mo</div>
                    <div className="text-sm text-gray-400">Monthly</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">${optimizationData.cost_savings.yearly_savings_usd}/yr</div>
                    <div className="text-sm text-gray-400">Yearly</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-4">Optimization Recommendations</h2>

              <div className="space-y-3">
                {optimizationData.recommendations.map((rec, index) => (
                  <div key={index} className={`bg-gray-800 border-l-4 p-4 rounded ${
                    rec.priority === 'high' ? 'border-red-500' :
                    rec.priority === 'medium' ? 'border-yellow-500' :
                    'border-blue-500'
                  }`}>
                    <div className={`font-bold mb-1 ${
                      rec.priority === 'high' ? 'text-red-400' :
                      rec.priority === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>{rec.title}</div>
                    <div className="text-sm text-gray-300 mb-2">{rec.description}</div>
                    <div className="text-xs text-gray-400">
                      <strong>How:</strong> {rec.implementation}
                    </div>
                  </div>
                ))}

                {optimizationData.recommendations.length === 0 && (
                  <div className="bg-green-900 border border-green-700 p-6 rounded">
                    <h3 className="text-green-400 font-bold mb-2">✅ System Optimized</h3>
                    <p className="text-green-200">
                      Your system appears well-configured for LLM deployment. No critical optimizations needed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Benchmark Comparison */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Benchmark Comparison</h2>
                <div className="flex gap-3">
                  <button
                    onClick={startBenchmark}
                    disabled={isRunningBenchmark}
                    className={`px-4 py-2 rounded font-medium ${
                      isRunningBenchmark ? 'bg-gray-600 text-gray-400' : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {isRunningBenchmark ? 'Running...' : 'Run Benchmark'}
                  </button>
                  {benchmarkResults.length > 0 && (
                    <button
                      onClick={clearBenchmarks}
                      className="px-4 py-2 rounded font-medium bg-red-600 hover:bg-red-500 text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {benchmarkResults.length > 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-3 text-gray-300 font-medium">Model</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Quantization</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Energy (Wh)</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Avg Power (W)</th>
                        <th className="text-right p-3 text-gray-300 font-medium">Speed (tok/s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkResults.map((result) => (
                        <tr key={result.id} className="border-t border-gray-700">
                          <td className="p-3 text-white">{result.model_name}</td>
                          <td className="p-3 text-gray-400">{result.quantization}</td>
                          <td className="p-3 text-right text-green-400 font-mono">{result.metrics.total_energy_wh.toFixed(2)}</td>
                          <td className="p-3 text-right text-yellow-400 font-mono">{result.metrics.avg_power_watts.toFixed(1)}</td>
                          <td className="p-3 text-right text-purple-400 font-mono">{result.metrics.tokens_per_second?.toFixed(1) || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 p-8 rounded text-center text-gray-400">
                  No benchmarks yet. Run a benchmark to compare model energy efficiency.
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}