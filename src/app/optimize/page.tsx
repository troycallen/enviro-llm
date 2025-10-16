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
  status?: string;
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
  response?: string;
}

export default function OptimizePage() {
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ollama state
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showOllamaBenchmark, setShowOllamaBenchmark] = useState(false);

  // Response preview
  const [selectedResult, setSelectedResult] = useState<BenchmarkResult | null>(null);

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

    // Check Ollama status
    const checkOllama = async () => {
      try {
        const response = await fetch('http://localhost:8001/ollama/status');
        if (response.ok) {
          const data = await response.json();
          setOllamaAvailable(data.available);
          setOllamaModels(data.models || []);
        }
      } catch {
        setOllamaAvailable(false);
      }
    };
    checkOllama();
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

  const runOllamaBenchmark = async () => {
    if (selectedModels.length === 0) {
      alert('Please select at least one model');
      return;
    }

    setIsRunningBenchmark(true);
    try {
      const response = await fetch('http://localhost:8001/ollama/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: selectedModels,
          prompt: "Explain quantum computing in simple terms."
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh benchmarks
        const benchmarksRes = await fetch('http://localhost:8001/benchmarks');
        if (benchmarksRes.ok) {
          const benchData = await benchmarksRes.json();
          const results = benchData.results || [];
          setBenchmarkResults(results);
          localStorage.setItem('envirollm_benchmarks', JSON.stringify(results));
        }
      }
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setIsRunningBenchmark(false);
      setShowOllamaBenchmark(false);
      setSelectedModels([]);
    }
  };

  const toggleModelSelection = (model: string) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter(m => m !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
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
            Model Benchmarking
          </h1>
          <p className="text-gray-400">Compare energy consumption and performance across models</p>
        </header>

        {/* Ollama Benchmarking Hero Section */}
        <div className="mb-8">
          {ollamaAvailable ? (
            <div className="bg-green-900 border border-green-700 p-6 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-green-400 mb-1">Ollama Detected</h2>
                  <p className="text-green-200">{ollamaModels.length} models available for automated testing</p>
                </div>
                <button
                  onClick={() => setShowOllamaBenchmark(true)}
                  disabled={isRunningBenchmark}
                  className={`px-6 py-3 rounded font-bold text-lg ${
                    isRunningBenchmark ? 'bg-gray-600 text-gray-400' : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                >
                  {isRunningBenchmark ? 'Running...' : 'Start Benchmark'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 p-6 rounded">
              <h2 className="text-xl font-bold text-white mb-2">Install Ollama for Automated Benchmarking</h2>
              <p className="text-gray-300 mb-3">Ollama enables automated energy and performance comparison across models.</p>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Get Ollama →
              </a>
            </div>
          )}
        </div>

        {/* Benchmark Results */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Benchmark Results</h2>
            <div className="flex gap-3">
              <button
                onClick={startBenchmark}
                disabled={isRunningBenchmark}
                className={`px-4 py-2 rounded font-medium ${
                  isRunningBenchmark ? 'bg-gray-600 text-gray-400' : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {isRunningBenchmark ? 'Running...' : 'Manual Benchmark'}
              </button>
              {benchmarkResults.length > 0 && (
                <button
                  onClick={clearBenchmarks}
                  className="px-4 py-2 rounded font-medium bg-red-600 hover:bg-red-500 text-white"
                >
                  Clear All
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
                    <th className="text-right p-3 text-gray-300 font-medium">Wh/Token</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Speed (tok/s)</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkResults.map((result) => {
                    const whPerToken = result.metrics.tokens_generated
                      ? (result.metrics.total_energy_wh / result.metrics.tokens_generated).toFixed(6)
                      : 'N/A';

                    return (
                      <tr key={result.id} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="p-3 text-white">{result.model_name}</td>
                        <td className="p-3 text-gray-400">{result.quantization}</td>
                        <td className="p-3 text-right text-green-400 font-mono">{result.metrics.total_energy_wh.toFixed(4)}</td>
                        <td className="p-3 text-right text-blue-400 font-mono text-xs">{whPerToken}</td>
                        <td className="p-3 text-right text-purple-400 font-mono">{result.metrics.tokens_per_second?.toFixed(1) || 'N/A'}</td>
                        <td className="p-3 text-right">
                          {result.response && (
                            <button
                              onClick={() => setSelectedResult(result)}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              View Response
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 p-8 rounded text-center text-gray-400">
              <p className="mb-2">No benchmarks yet. Start a benchmark to compare model energy efficiency.</p>
              {!ollamaAvailable && (
                <p className="text-sm">Install Ollama to enable automated benchmarking.</p>
              )}
            </div>
          )}
        </div>

        {/* System Optimization - Collapsible */}
        {optimizationData && (
          <details className="mb-8">
            <summary className="cursor-pointer bg-gray-800 border border-gray-700 p-4 rounded font-bold text-xl text-white hover:bg-gray-750">
              System Optimization Recommendations
            </summary>
            <div className="mt-4">
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
          </div>
          </details>
        )}

        {/* Response Preview Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white">{selectedResult.model_name}</h3>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-400">Quantization:</span>
                  <span className="text-white ml-2">{selectedResult.quantization}</span>
                </div>
                <div>
                  <span className="text-gray-400">Energy:</span>
                  <span className="text-green-400 ml-2 font-mono">{selectedResult.metrics.total_energy_wh.toFixed(4)} Wh</span>
                </div>
                <div>
                  <span className="text-gray-400">Speed:</span>
                  <span className="text-purple-400 ml-2 font-mono">{selectedResult.metrics.tokens_per_second?.toFixed(1) || 'N/A'} tok/s</span>
                </div>
                <div>
                  <span className="text-gray-400">Tokens:</span>
                  <span className="text-white ml-2">{selectedResult.metrics.tokens_generated || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 p-4 rounded">
                <h4 className="text-white font-semibold mb-2">Response:</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedResult.response || 'No response captured'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ollama Benchmark Modal */}
        {showOllamaBenchmark && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white">Ollama Automated Benchmark</h3>
                <button
                  onClick={() => setShowOllamaBenchmark(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-300 mb-4">
                Select models to benchmark. The system will automatically run inference and measure energy consumption.
              </p>

              {ollamaModels.length === 0 ? (
                <div className="bg-yellow-900 border border-yellow-700 p-4 rounded mb-4">
                  <p className="text-yellow-200">
                    No Ollama models found. Pull a model first:
                  </p>
                  <code className="block bg-gray-900 text-white p-2 mt-2 rounded">
                    ollama pull llama3:8b
                  </code>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-white font-semibold mb-2">Available Models ({ollamaModels.length})</h4>
                    <div className="max-h-60 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-3">
                      {ollamaModels.map(model => (
                        <label key={model} className="flex items-center gap-3 py-2 hover:bg-gray-800 px-2 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedModels.includes(model)}
                            onChange={() => toggleModelSelection(model)}
                            className="w-4 h-4"
                          />
                          <span className="text-gray-200">{model}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-900 border border-blue-700 p-3 rounded mb-4">
                    <p className="text-blue-200 text-sm">
                      <strong>Selected:</strong> {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}
                      {selectedModels.length > 0 && (
                        <span className="block mt-1">
                          {selectedModels.join(', ')}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowOllamaBenchmark(false)}
                      className="px-4 py-2 rounded font-medium bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={runOllamaBenchmark}
                      disabled={selectedModels.length === 0 || isRunningBenchmark}
                      className={`px-4 py-2 rounded font-medium ${
                        selectedModels.length === 0 || isRunningBenchmark
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {isRunningBenchmark ? 'Running Benchmark...' : 'Start Benchmark'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}