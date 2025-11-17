'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import NavBar from '../../components/NavBar';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis, Cell, LabelList } from 'recharts';

interface BenchmarkResult {
  id: string;
  model_name: string;
  timestamp: string;
  status?: string;
  source?: 'ollama' | 'openai' | 'lmstudio' | 'custom';
  notes?: string;
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
  quality_metrics?: {
    char_count: number;
    word_count: number;
    unique_words: number;
    unique_word_ratio: number;
    avg_word_length: number;
    sentence_count: number;
    quality_score: number;
    quality_method?: string;
  };
  response?: string;
  response_preview?: string;
}

export default function OptimizePage() {
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // Ollama state
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // LM Studio state
  const [lmStudioAvailable, setLmStudioAvailable] = useState(false);
  const [lmStudioModels, setLmStudioModels] = useState<string[]>([]);
  const [selectedLmStudioModels, setSelectedLmStudioModels] = useState<string[]>([]);

  // OpenAI state (for custom APIs)
  const [openaiUrl, setOpenaiUrl] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');

  // Unified modal state
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ollama' | 'lmstudio' | 'custom'>('ollama');

  // Custom prompt state
  const [customPrompt, setCustomPrompt] = useState('Explain quantum computing in simple terms.');
  const [benchmarkNotes, setBenchmarkNotes] = useState('');

  // Response preview
  const [selectedResult, setSelectedResult] = useState<BenchmarkResult | null>(null);

  // Comparison state
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparisonView, setShowComparisonView] = useState(false);

  // Grouped benchmarks state
  interface PromptGroup {
    prompt_hash: string;
    prompt: string;
    run_count: number;
    first_run: string;
    last_run: string;
    benchmarks: BenchmarkResult[];
  }
  const [groupedBenchmarks, setGroupedBenchmarks] = useState<PromptGroup[]>([]);

  // Visualization state
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);

  // Color mapping for prompts (keep consistent colors)
  const promptColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    // Load benchmarks from localStorage on mount
    const savedBenchmarks = localStorage.getItem('envirollm_benchmarks');
    let hasSavedBenchmarks = false;
    if (savedBenchmarks) {
      try {
        setBenchmarkResults(JSON.parse(savedBenchmarks));
        hasSavedBenchmarks = true;
      } catch {
        // Invalid data, ignore
      }
    }

    // Only fetch from backend if localStorage is empty
    if (!hasSavedBenchmarks) {
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

      fetchBenchmarks();
    }

    // Always check Ollama status
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

    // Always check LM Studio status
    const checkLmStudio = async () => {
      try {
        const response = await fetch('http://localhost:8001/lmstudio/status');
        if (response.ok) {
          const data = await response.json();
          setLmStudioAvailable(data.available);
          setLmStudioModels(data.models || []);
        }
      } catch {
        setLmStudioAvailable(false);
      }
    };
    checkLmStudio();

    // Fetch grouped benchmarks
    const fetchGroupedBenchmarks = async () => {
      try {
        const response = await fetch('http://localhost:8001/benchmarks/by-prompt');
        if (response.ok) {
          const data = await response.json();
          setGroupedBenchmarks(data.groups || []);
        }
      } catch {
        // Fallback to flat view if grouped endpoint fails
        console.log('Grouped endpoint not available');
      }
    };
    fetchGroupedBenchmarks();
  }, []);

  const clearBenchmarks = async () => {
    try {
      const response = await fetch('http://localhost:8001/benchmarks', {
        method: 'DELETE'
      });
      if (response.ok) {
        setBenchmarkResults([]);
        setGroupedBenchmarks([]);
        localStorage.removeItem('envirollm_benchmarks');
      }
    } catch {
      // Handle error silently
    }
  };

  const deleteBenchmark = async (id: string) => {
    try {
      // Delete from backend
      const response = await fetch(`http://localhost:8001/benchmarks/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Update local state
        const updatedResults = benchmarkResults.filter(result => result.id !== id);
        setBenchmarkResults(updatedResults);
        localStorage.setItem('envirollm_benchmarks', JSON.stringify(updatedResults));

        // Refresh grouped benchmarks
        const groupedRes = await fetch('http://localhost:8001/benchmarks/by-prompt');
        if (groupedRes.ok) {
          const groupedData = await groupedRes.json();
          setGroupedBenchmarks(groupedData.groups || []);
        }
      }
    } catch (err) {
      console.error('Failed to delete benchmark:', err);
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
          prompt: customPrompt,
          notes: benchmarkNotes || undefined
        })
      });

      if (response.ok) {
        await response.json();
        // Clear notes field after successful benchmark
        setBenchmarkNotes('');
        // Refresh benchmarks
        const benchmarksRes = await fetch('http://localhost:8001/benchmarks');
        if (benchmarksRes.ok) {
          const benchData = await benchmarksRes.json();
          const results = benchData.results || [];
          setBenchmarkResults(results);
          localStorage.setItem('envirollm_benchmarks', JSON.stringify(results));
        }
        // Refresh grouped benchmarks
        const groupedRes = await fetch('http://localhost:8001/benchmarks/by-prompt');
        if (groupedRes.ok) {
          const groupedData = await groupedRes.json();
          setGroupedBenchmarks(groupedData.groups || []);
        }
      }
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setIsRunningBenchmark(false);
      setShowBenchmarkModal(false);
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

  const toggleLmStudioModelSelection = (model: string) => {
    if (selectedLmStudioModels.includes(model)) {
      setSelectedLmStudioModels(selectedLmStudioModels.filter(m => m !== model));
    } else {
      setSelectedLmStudioModels([...selectedLmStudioModels, model]);
    }
  };

  const runLmStudioBenchmark = async () => {
    if (selectedLmStudioModels.length === 0) {
      alert('Please select at least one model');
      return;
    }

    setIsRunningBenchmark(true);
    try {
      // Run benchmarks for each selected model
      for (const model of selectedLmStudioModels) {
        const response = await fetch('http://localhost:8001/openai/benchmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_url: 'http://localhost:1234/v1',
            model: model,
            prompt: customPrompt,
            api_key: null,
            notes: benchmarkNotes || undefined
          })
        });

        if (!response.ok) {
          console.error(`Benchmark failed for ${model}`);
        }
      }

      // Clear notes field after successful benchmark
      setBenchmarkNotes('');
      // Refresh benchmarks
      const benchmarksRes = await fetch('http://localhost:8001/benchmarks');
      if (benchmarksRes.ok) {
        const benchData = await benchmarksRes.json();
        const results = benchData.results || [];
        setBenchmarkResults(results);
        localStorage.setItem('envirollm_benchmarks', JSON.stringify(results));
      }
      // Refresh grouped benchmarks
      const groupedRes = await fetch('http://localhost:8001/benchmarks/by-prompt');
      if (groupedRes.ok) {
        const groupedData = await groupedRes.json();
        setGroupedBenchmarks(groupedData.groups || []);
      }
    } catch (err) {
      console.error('Benchmark failed:', err);
      alert('Benchmark failed. Make sure LM Studio server is running.');
    } finally {
      setIsRunningBenchmark(false);
      setShowBenchmarkModal(false);
      setSelectedLmStudioModels([]);
    }
  };

  const runOpenAIBenchmark = async () => {
    if (!openaiUrl || !openaiModel) {
      alert('Please provide both API URL and model name');
      return;
    }

    setIsRunningBenchmark(true);
    try {
      const response = await fetch('http://localhost:8001/openai/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: openaiUrl,
          model: openaiModel,
          prompt: customPrompt,
          api_key: openaiApiKey || null,
          notes: benchmarkNotes || undefined
        })
      });

      if (response.ok) {
        // Clear notes field after successful benchmark
        setBenchmarkNotes('');
        // Refresh benchmarks
        const benchmarksRes = await fetch('http://localhost:8001/benchmarks');
        if (benchmarksRes.ok) {
          const benchData = await benchmarksRes.json();
          const results = benchData.results || [];
          setBenchmarkResults(results);
          localStorage.setItem('envirollm_benchmarks', JSON.stringify(results));
        }
        // Refresh grouped benchmarks
        const groupedRes = await fetch('http://localhost:8001/benchmarks/by-prompt');
        if (groupedRes.ok) {
          const groupedData = await groupedRes.json();
          setGroupedBenchmarks(groupedData.groups || []);
        }
      }
    } catch (err) {
      console.error('Benchmark failed:', err);
      alert('Benchmark failed. Make sure the API is running and accessible.');
    } finally {
      setIsRunningBenchmark(false);
      setShowBenchmarkModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 font-inter relative">
      {/* Background Image */}
      <div className="fixed inset-0 bg-cover bg-center opacity-70 pointer-events-none" style={{ backgroundImage: 'url(/enviro_background.jpg)' }}></div>
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/60 to-gray-900 pointer-events-none"></div>

      <div className="relative z-10">
        <NavBar />
        <div className="max-w-[1100px] mx-auto px-8 py-16">
          <header className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-6">
              Model Benchmarking
            </h1>
            <p className="text-gray-300">Compare energy consumption and performance across models</p>
          </header>

        {/* Unified Benchmark Launcher */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Run Benchmark</h2>
            <button
              onClick={() => {
                setShowBenchmarkModal(true);
                setActiveTab(ollamaAvailable ? 'ollama' : lmStudioAvailable ? 'lmstudio' : 'custom');
              }}
              disabled={isRunningBenchmark}
              className={`px-4 py-2 rounded font-medium ${
                isRunningBenchmark
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {isRunningBenchmark ? 'Running...' : 'New Benchmark'}
            </button>
          </div>
          <div className="bg-gray-800/90 border border-gray-700 rounded-lg p-6">

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-900 border border-gray-700 p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src="/ollama.jpg"
                    alt="Ollama"
                    width={24}
                    height={24}
                    className="rounded"
                  />
                  <span className="font-bold text-white">Ollama</span>
                </div>
                <p className="text-gray-400 text-xs">
                  {ollamaAvailable
                    ? `${ollamaModels.length} models available`
                    : 'Not installed'}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-700 p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src="/lm_studio.png"
                    alt="LM Studio"
                    width={24}
                    height={24}
                    className="rounded"
                  />
                  <span className="font-bold text-white">LM Studio</span>
                </div>
                <p className="text-gray-400 text-xs">
                  {lmStudioAvailable
                    ? `${lmStudioModels.length} models available`
                    : 'Not running'}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-700 p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src="/api.jpg"
                    alt="Custom API"
                    width={24}
                    height={24}
                    className="rounded"
                  />
                  <span className="font-bold text-white">Custom API</span>
                </div>
                <p className="text-gray-400 text-xs">
                  vLLM, text-gen-webui, etc.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Results */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Benchmark Results</h2>

              {benchmarkResults.length > 0 && (
                <button
                    onClick={async () => {
                      try {
                        const response = await fetch('http://localhost:8001/benchmarks/export');
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `envirollm_benchmarks_${new Date().toISOString().split('T')[0]}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        }
                      } catch (error) {
                        console.error('Failed to export benchmarks:', error);
                      }
                    }}
                    className="px-4 py-2 rounded font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                  >
                    Export CSV
                  </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (selectedForComparison.length >= 2) {
                    setShowComparisonView(true);
                  }
                }}
                disabled={selectedForComparison.length < 2}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  selectedForComparison.length >= 2
                    ? 'bg-lime-600 hover:bg-lime-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Compare Selected ({selectedForComparison.length})
              </button>
              <button
                onClick={() => {
                  setSelectedForComparison([]);
                }}
                disabled={selectedForComparison.length === 0}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  selectedForComparison.length > 0
                    ? 'bg-gray-600 hover:bg-gray-500 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Deselect All
              </button>
              {benchmarkResults.length > 0 && (
                <button
                  onClick={clearBenchmarks}
                  className="px-4 py-2 rounded font-medium bg-red-600 hover:bg-red-500 text-white"
                >
                  Delete All
                </button>
              )}
            </div>
          </div>

          {benchmarkResults.length > 0 ? (
            <div className="bg-gray-800/90 border border-gray-700 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr className="border-l-4 border-l-gray-700">
                    <th className="text-left p-3 text-gray-300 font-medium">Model</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Energy (Wh)</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Wh/Token</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Duration (s)</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Speed (tok/s)</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Quality</th>
                    <th className="text-right p-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedBenchmarks.length > 0 ? (
                    groupedBenchmarks.map((group) => (
                      <React.Fragment key={group.prompt_hash}>
                        {/* Prompt Divider Header */}
                        <tr className="bg-gray-900/80">
                          <td colSpan={7} className="p-3 border-t-2 border-lime-400/30">
                            <div className="flex items-center gap-3">
                              <span className="text-lime-400 font-semibold">Prompt:</span>
                              <span className="text-gray-300 italic">
                                &ldquo;{group.prompt.length > 100 ? group.prompt.substring(0, 100) + '...' : group.prompt}&rdquo;
                              </span>
                              <span className="text-gray-500 text-xs ml-auto">
                                {group.run_count} run{group.run_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Benchmark Results for this Prompt */}
                        {group.benchmarks.map((result) => {
                          if (!result.metrics) return null;

                          const whPerToken = result.metrics.tokens_generated
                            ? (result.metrics.total_energy_wh / result.metrics.tokens_generated).toFixed(6)
                            : 'N/A';

                          const getSourceInfo = (source?: string) => {
                            switch(source) {
                              case 'ollama':
                                return { image: '/ollama.jpg', label: 'Ollama' };
                              case 'lmstudio':
                                return { image: '/lm_studio.png', label: 'LM Studio' };
                              case 'custom':
                              case 'openai':
                                return { image: '/api.jpg', label: 'Custom API' };
                              default:
                                return { image: null, label: 'Manual' };
                            }
                          };

                          const sourceInfo = getSourceInfo(result.source);

                          const qualityScore = result.quality_metrics?.quality_score;
                          const qualityDisplay = qualityScore !== undefined ? qualityScore.toFixed(1) : 'N/A';
                          const qualityColor = qualityScore
                            ? qualityScore >= 70 ? 'text-green-400'
                              : qualityScore >= 50 ? 'text-yellow-400'
                              : 'text-orange-400'
                            : 'text-gray-400';

                          const isSelected = selectedForComparison.includes(result.id);

                          return (
                            <tr
                              key={result.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedForComparison(selectedForComparison.filter(id => id !== result.id));
                                } else {
                                  setSelectedForComparison([...selectedForComparison, result.id]);
                                }
                              }}
                              className={`border-t border-gray-700 border-l-4 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-lime-900/30 border-l-lime-600'
                                  : 'border-l-gray-800 hover:bg-gray-750'
                              }`}
                            >
                              <td className="py-4 px-3">
                                <div className="flex items-center gap-2">
                                  {sourceInfo.image ? (
                                    <Image
                                      src={sourceInfo.image}
                                      alt={sourceInfo.label}
                                      width={20}
                                      height={20}
                                      className="rounded"
                                    />
                                  ) : (
                                    <span>⚙️</span>
                                  )}
                                  <div className="text-white font-medium">
                                    {result.model_name}
                                    {result.notes && (
                                      <span className="text-xs text-gray-500 italic ml-2">({result.notes})</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-3 text-right text-green-400 font-mono">{result.metrics.total_energy_wh.toFixed(4)}</td>
                              <td className="py-4 px-3 text-right text-teal-400 font-mono text-xs">{whPerToken}</td>
                              <td className="py-4 px-3 text-right text-blue-400 font-mono">{result.metrics.duration_seconds.toFixed(1)}</td>
                              <td className="py-4 px-3 text-right text-purple-400 font-mono">{result.metrics.tokens_per_second?.toFixed(1) || 'N/A'}</td>
                              <td className={`py-4 px-3 text-right font-mono font-bold ${qualityColor}`}>
                                <div className="flex items-center justify-end gap-1">
                                  {result.quality_metrics?.quality_method === 'llm_judge' && (
                                    <span className="text-gray-400 text-xs" title="Evaluated by LLM Judge">[J]</span>
                                  )}
                                  <span>
                                    {qualityDisplay}
                                    {qualityScore !== undefined && (
                                      <span className="text-gray-500 text-xs ml-1">/100</span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-3 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {result.response && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedResult(result);
                                      }}
                                      className="text-lime-400 hover:text-lime-300 text-xs cursor-pointer"
                                    >
                                      View Response
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteBenchmark(result.id);
                                    }}
                                    className="text-red-400 hover:text-red-300 text-xl font-bold leading-none cursor-pointer"
                                    aria-label="Delete benchmark"
                                    title="Delete this benchmark"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    benchmarkResults.map((result) => {
                      if (!result.metrics) return null;

                      const whPerToken = result.metrics.tokens_generated
                        ? (result.metrics.total_energy_wh / result.metrics.tokens_generated).toFixed(6)
                        : 'N/A';

                      const getSourceInfo = (source?: string) => {
                        switch(source) {
                          case 'ollama':
                            return { image: '/ollama.jpg', label: 'Ollama' };
                          case 'lmstudio':
                            return { image: '/lm_studio.png', label: 'LM Studio' };
                          case 'custom':
                          case 'openai':
                            return { image: '/api.jpg', label: 'Custom API' };
                          default:
                            return { image: null, label: 'Manual' };
                        }
                      };

                      const sourceInfo = getSourceInfo(result.source);

                      const qualityScore = result.quality_metrics?.quality_score;
                      const qualityDisplay = qualityScore !== undefined ? qualityScore.toFixed(1) : 'N/A';
                      const qualityColor = qualityScore
                        ? qualityScore >= 70 ? 'text-green-400'
                          : qualityScore >= 50 ? 'text-yellow-400'
                          : 'text-orange-400'
                        : 'text-gray-400';

                      const isSelected = selectedForComparison.includes(result.id);

                      return (
                        <tr
                          key={result.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedForComparison(selectedForComparison.filter(id => id !== result.id));
                            } else {
                              setSelectedForComparison([...selectedForComparison, result.id]);
                            }
                          }}
                          className={`border-t border-gray-700 border-l-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-lime-900/30 border-l-lime-600'
                              : 'border-l-gray-800 hover:bg-gray-750'
                          }`}
                        >
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-2">
                              {sourceInfo.image ? (
                                <Image
                                  src={sourceInfo.image}
                                  alt={sourceInfo.label}
                                  width={20}
                                  height={20}
                                  className="rounded"
                                />
                              ) : (
                                <span>⚙️</span>
                              )}
                              <div className="text-white font-medium">{result.model_name}</div>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-right text-green-400 font-mono">{result.metrics.total_energy_wh.toFixed(4)}</td>
                          <td className="py-4 px-3 text-right text-teal-400 font-mono text-xs">{whPerToken}</td>
                          <td className="py-4 px-3 text-right text-blue-400 font-mono">{result.metrics.duration_seconds.toFixed(1)}</td>
                          <td className="py-4 px-3 text-right text-purple-400 font-mono">{result.metrics.tokens_per_second?.toFixed(1) || 'N/A'}</td>
                          <td className={`py-4 px-3 text-right font-mono font-bold ${qualityColor}`}>
                            <div className="flex items-center justify-end gap-1">
                              {result.quality_metrics?.quality_method === 'llm_judge' && (
                                <span className="text-gray-400 text-xs" title="Evaluated by LLM Judge">[J]</span>
                              )}
                              <span>
                                {qualityDisplay}
                                {qualityScore !== undefined && (
                                  <span className="text-gray-500 text-xs ml-1">/100</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {result.response && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedResult(result);
                                  }}
                                  className="text-lime-400 hover:text-lime-300 text-xs cursor-pointer"
                                >
                                  View Response
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBenchmark(result.id);
                                }}
                                className="text-red-400 hover:text-red-300 text-xl font-bold leading-none cursor-pointer"
                                aria-label="Delete benchmark"
                                title="Delete this benchmark"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-800/90 border border-gray-700 p-8 rounded text-center text-gray-400">
              <p className="mb-2">No benchmarks yet. Start a benchmark to compare model energy efficiency.</p>
              {!ollamaAvailable && (
                <p className="text-sm">Install Ollama to enable automated benchmarking.</p>
              )}
            </div>
          )}
        </div>

        {/* Energy Visualizations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Energy Comparison</h2>
          <div className="bg-gray-800/90 border border-gray-700 rounded-lg p-6">
            {groupedBenchmarks.length > 0 ? (
              <>
                {/* Prompt Toggles */}
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-3">Select prompts to compare:</p>
                  <div className="flex flex-wrap gap-2">
                    {groupedBenchmarks.map((group, idx) => {
                      const color = promptColors[idx % promptColors.length];
                      const isSelected = selectedPrompts.includes(group.prompt_hash);
                      return (
                        <button
                          key={group.prompt_hash}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPrompts(selectedPrompts.filter(h => h !== group.prompt_hash));
                            } else {
                              setSelectedPrompts([...selectedPrompts, group.prompt_hash]);
                            }
                          }}
                          className={`px-4 py-2 rounded text-sm transition-colors border-2 ${
                            isSelected
                              ? 'text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-700'
                          }`}
                          style={isSelected ? {
                            backgroundColor: color,
                            borderColor: color
                          } : {}}
                        >
                          {group.prompt.length > 50 ? group.prompt.substring(0, 50) + '...' : group.prompt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chart */}
                {selectedPrompts.length > 0 ? (
                <>
                  <div className="mb-4 text-center">
                    <p className="text-gray-300 text-sm">
                      <span className="text-lime-400 font-semibold">Best models</span> are in the bottom-right (fast + efficient)
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart
                      margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        type="number"
                        dataKey="speed"
                        name="Speed"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        label={{ value: 'Speed (tokens/sec)', position: 'insideBottom', dy: 30, fill: '#9CA3AF' }}
                      />
                      <YAxis
                        type="number"
                        dataKey="whPerToken"
                        name="Efficiency"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        label={{ value: 'Energy per Token (Wh)', angle: -90, position: 'insideLeft', dx: -30, fill: '#9CA3AF', style: { textAnchor: 'middle' } }}
                      />
                      <ZAxis range={[200, 600]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '6px',
                          color: '#F3F4F6'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-gray-800 border border-gray-700 rounded p-3">
                                <p className="text-white font-semibold mb-1">{data.fullModel}</p>
                                <p className="text-gray-300 text-xs mb-2">Prompt: {data.fullPrompt.substring(0, 60)}...</p>
                                <p className="text-purple-400">Speed: {data.speed.toFixed(2)} tok/s</p>
                                <p className="text-green-400">Efficiency: {data.whPerToken.toFixed(6)} Wh/tok</p>
                                <p className="text-yellow-400">Total Energy: {data.totalEnergy.toFixed(4)} Wh</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {(() => {
                        // Create a map of prompt_hash to original index for consistent coloring
                        const promptColorMap = new Map(
                          groupedBenchmarks.map((g, idx) => [g.prompt_hash, promptColors[idx % promptColors.length]])
                        );

                        const selectedGroups = groupedBenchmarks.filter(g => selectedPrompts.includes(g.prompt_hash));
                        const allData = selectedGroups.flatMap((g) =>
                          g.benchmarks
                            .filter(b => b.metrics.tokens_per_second && b.metrics.tokens_generated)
                            .map(b => ({
                              speed: b.metrics.tokens_per_second || 0,
                              whPerToken: b.metrics.tokens_generated
                                ? parseFloat((b.metrics.total_energy_wh / b.metrics.tokens_generated).toFixed(6))
                                : 0,
                              totalEnergy: b.metrics.total_energy_wh,
                              fullModel: b.model_name,
                              displayName: b.model_name.length > 15 ? b.model_name.substring(0, 15) + '...' : b.model_name,
                              fullPrompt: g.prompt,
                              color: promptColorMap.get(g.prompt_hash) || '#10B981'
                            }))
                        );
                        const totalBenchmarks = allData.length;

                        return (
                          <Scatter data={allData} fill="#10B981">
                            {allData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            {totalBenchmarks <= 8 && (
                              <LabelList
                                dataKey="displayName"
                                position="right"
                                style={{ fill: '#F3F4F6', fontSize: '11px' }}
                                offset={8}
                              />
                            )}
                          </Scatter>
                        );
                      })()}
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap gap-3 justify-center">
                    {groupedBenchmarks.map((g, idx) => {
                      const color = promptColors[idx % promptColors.length];
                      const isSelected = selectedPrompts.includes(g.prompt_hash);
                      return (
                        <div key={g.prompt_hash} className="flex items-center gap-2" style={{ opacity: isSelected ? 1 : 0.3 }}>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          ></div>
                          <span className="text-gray-300 text-xs">
                            {g.prompt.length > 40 ? g.prompt.substring(0, 40) + '...' : g.prompt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    Select at least one prompt to view the comparison
                  </div>
                )}
              </>
            ) : benchmarkResults.length === 0 ? (
              <div className="text-center py-32">
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      type="number"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      label={{ value: 'Speed (tokens/sec)', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
                    />
                    <YAxis
                      type="number"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      label={{ value: 'Wh per Token', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="text-gray-400 mt-4">
                  Run benchmarks to see energy efficiency comparisons
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                Select at least one prompt to view the comparison
              </div>
            )}
          </div>
        </div>

        {/* Model Recommendations */}
        {benchmarkResults.length > 0 && (() => {
          // Calculate recommendations
          const resultsWithMetrics = benchmarkResults.filter(r => r.metrics && r.quality_metrics?.quality_score);

          if (resultsWithMetrics.length === 0) return null;

          // Best overall (quality per Wh - higher is better)
          const bestOverall = [...resultsWithMetrics].sort((a, b) => {
            const efficiencyA = (a.quality_metrics?.quality_score || 0) / a.metrics.total_energy_wh;
            const efficiencyB = (b.quality_metrics?.quality_score || 0) / b.metrics.total_energy_wh;
            return efficiencyB - efficiencyA;
          })[0];

          // Most energy efficient (lowest Wh)
          const mostEfficient = [...resultsWithMetrics].sort((a, b) =>
            a.metrics.total_energy_wh - b.metrics.total_energy_wh
          )[0];

          // Best quality (highest quality score)
          const bestQuality = [...resultsWithMetrics].sort((a, b) =>
            (b.quality_metrics?.quality_score || 0) - (a.quality_metrics?.quality_score || 0)
          )[0];

          // Fastest (highest tokens/second)
          const fastest = [...resultsWithMetrics]
            .filter(r => r.metrics.tokens_per_second)
            .sort((a, b) => (b.metrics.tokens_per_second || 0) - (a.metrics.tokens_per_second || 0))[0];

          return (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Model Recommendations</h2>
              <div className="bg-gray-800/90 border border-gray-700 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Best Overall */}
                  <div className="bg-gray-900/50 border-2 border-yellow-600/50 rounded p-4">
                    <div className="text-yellow-400 text-sm mb-2 font-semibold">Best Overall</div>
                    <div className="text-white font-semibold">{bestOverall.model_name}</div>
                    <div className="text-yellow-400 text-sm mt-2 font-mono">
                      {((bestOverall.quality_metrics?.quality_score || 0) / bestOverall.metrics.total_energy_wh).toFixed(1)} quality/Wh
                    </div>
                  </div>

                  {/* Most Energy Efficient */}
                  <div className="bg-gray-900/50 border-2 border-green-600/50 rounded p-4">
                    <div className="text-green-400 text-sm mb-2 font-semibold">Most Energy Efficient</div>
                    <div className="text-white font-semibold">{mostEfficient.model_name}</div>
                    <div className="text-green-400 text-sm mt-2 font-mono">
                      {mostEfficient.metrics.total_energy_wh.toFixed(4)} Wh
                    </div>
                  </div>

                  {/* Fastest */}
                  {fastest && (
                    <div className="bg-gray-900/50 border-2 border-purple-600/50 rounded p-4">
                      <div className="text-purple-400 text-sm mb-2 font-semibold">Fastest</div>
                      <div className="text-white font-semibold">{fastest.model_name}</div>
                      <div className="text-purple-400 text-sm mt-2 font-mono">
                        {fastest.metrics.tokens_per_second?.toFixed(1)} tok/s
                      </div>
                    </div>
                  )}

                  {/* Best Quality */}
                  <div className="bg-gray-900/50 border-2 border-green-600/50 rounded p-4">
                    <div className="text-green-400 text-sm mb-2 font-semibold">Best Quality</div>
                    <div className="text-white font-semibold">{bestQuality.model_name}</div>
                    <div className="text-green-400 text-sm mt-2 font-mono">
                      {bestQuality.quality_metrics?.quality_score?.toFixed(1)}/100
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Comparison View Modal */}
        {showComparisonView && selectedForComparison.length >= 2 && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm p-4"
            onClick={() => {
              setShowComparisonView(false);
            }}
          >
            <div
              className="bg-gray-800/95 border border-gray-700 rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Model Comparison</h2>
                <button
                  onClick={() => {
                    setShowComparisonView(false);
                  }}
                  className="text-gray-400 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Comparison Grid */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedForComparison.length, 3)}, minmax(0, 1fr))` }}>
                {selectedForComparison.map((id) => {
                  const result = benchmarkResults.find(r => r.id === id);
                  if (!result) return null;

                  const whPerToken = result.metrics.tokens_generated
                    ? (result.metrics.total_energy_wh / result.metrics.tokens_generated).toFixed(6)
                    : 'N/A';

                  const qualityScore = result.quality_metrics?.quality_score;

                  const getSourceInfo = (source?: string) => {
                    switch(source) {
                      case 'ollama':
                        return { image: '/ollama.jpg', label: 'Ollama' };
                      case 'lmstudio':
                        return { image: '/lm_studio.png', label: 'LM Studio' };
                      case 'custom':
                      case 'openai':
                        return { image: '/api.jpg', label: 'Custom API' };
                      default:
                        return { image: null, label: 'Manual' };
                    }
                  };

                  const sourceInfo = getSourceInfo(result.source);

                  return (
                    <div key={id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      {/* Model Header */}
                      <div className="mb-4 pb-4 border-b border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          {sourceInfo.image ? (
                            <Image
                              src={sourceInfo.image}
                              alt={sourceInfo.label}
                              width={20}
                              height={20}
                              className="rounded"
                            />
                          ) : (
                            <span>⚙️</span>
                          )}
                          <span className="text-xs text-gray-400">{sourceInfo.label}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{result.model_name}</h3>
                        {result.notes && (
                          <p className="text-xs text-gray-400 mt-2 italic">
                            &ldquo;{result.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Energy Metrics */}
                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Total Energy</p>
                          <p className="text-xl font-bold text-green-400">{result.metrics.total_energy_wh.toFixed(4)} Wh</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Energy per Token</p>
                          <p className="text-lg font-mono text-teal-400">{whPerToken} Wh</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Speed</p>
                          <p className="text-lg font-mono text-purple-400">{result.metrics.tokens_per_second?.toFixed(1) || 'N/A'} tok/s</p>
                        </div>
                      </div>

                      {/* Quality Metrics */}
                      {result.quality_metrics && (
                        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-gray-400">Quality Score</p>
                            {result.quality_metrics.quality_method && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                result.quality_metrics.quality_method === 'llm_judge'
                                  ? 'bg-lime-900/40 text-lime-300'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {result.quality_metrics.quality_method === 'llm_judge' ? 'LLM Judge' : 'Heuristic'}
                              </span>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-lime-400 mb-3">
                            {qualityScore?.toFixed(1)} <span className="text-sm text-gray-500">/100</span>
                          </p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Words:</span>
                              <span className="text-white">{result.quality_metrics.word_count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Unique words:</span>
                              <span className="text-white">{result.quality_metrics.unique_words}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Vocabulary diversity:</span>
                              <span className="text-white">{(result.quality_metrics.unique_word_ratio * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Sentences:</span>
                              <span className="text-white">{result.quality_metrics.sentence_count}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Response Preview */}
                      {result.response && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-400 mb-2">Response</p>
                          <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 max-h-48 overflow-y-auto">
                            {result.response.substring(0, 300)}
                            {result.response.length > 300 && '...'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary Analysis */}
              <div className="mt-6 p-4 bg-lime-900/20 border border-lime-700/50 rounded-lg">
                <h3 className="text-lg font-bold text-lime-400 mb-3">Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {(() => {
                    const compared = selectedForComparison
                      .map(id => benchmarkResults.find(r => r.id === id))
                      .filter((r): r is BenchmarkResult => r !== undefined);

                    const energies = compared.map(r => r.metrics.total_energy_wh);
                    const speeds = compared.map(r => r.metrics.tokens_per_second).filter((s): s is number => s !== undefined);
                    const qualities = compared.map(r => r.quality_metrics?.quality_score).filter((q): q is number => q !== undefined);

                    const bestEnergy = Math.min(...energies);
                    const worstEnergy = Math.max(...energies);
                    const bestSpeed = speeds.length > 0 ? Math.max(...speeds) : null;
                    const bestQuality = qualities.length > 0 ? Math.max(...qualities) : null;

                    const bestEnergyModel = compared.find(r => r.metrics.total_energy_wh === bestEnergy);
                    const bestSpeedModel = compared.find(r => r.metrics.tokens_per_second === bestSpeed);
                    const bestQualityModel = compared.find(r => r.quality_metrics?.quality_score === bestQuality);

                    const energySavings = ((worstEnergy - bestEnergy) / worstEnergy * 100).toFixed(1);

                    return (
                      <>
                        <div>
                          <p className="text-gray-400">Most energy efficient:</p>
                          <p className="text-white font-medium">{bestEnergyModel?.model_name}</p>
                          <p className="text-lime-400 text-xs">Saves {energySavings}% energy</p>
                        </div>
                        {bestSpeedModel && (
                          <div>
                            <p className="text-gray-400">Fastest:</p>
                            <p className="text-white font-medium">{bestSpeedModel.model_name}</p>
                            <p className="text-purple-400 text-xs">{bestSpeed?.toFixed(1)} tok/s</p>
                          </div>
                        )}
                        {bestQualityModel && (
                          <div>
                            <p className="text-gray-400">Best quality:</p>
                            <p className="text-white font-medium">{bestQualityModel.model_name}</p>
                            <p className="text-lime-400 text-xs">Score: {bestQuality?.toFixed(1)}/100</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Response Preview Modal */}
        {selectedResult && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setSelectedResult(null)}
          >
            <div
              className="bg-gray-800/95 border border-gray-700 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
                  <span className="text-gray-400">Energy:</span>
                  <span className="text-green-400 ml-2 font-mono">{selectedResult.metrics.total_energy_wh.toFixed(4)} Wh</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-blue-400 ml-2 font-mono">{selectedResult.metrics.duration_seconds.toFixed(1)} s</span>
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

        {/* Unified Benchmark Modal */}
        {showBenchmarkModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setShowBenchmarkModal(false)}
          >
            <div
              className="bg-gray-800/95 border border-gray-700 rounded-lg p-6 w-[700px] h-[80vh] mx-4 overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white">Configure Benchmark</h3>
                <button
                  onClick={() => setShowBenchmarkModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('ollama')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'ollama'
                      ? 'text-teal-400 border-b-2 border-teal-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/ollama.jpg"
                      alt="Ollama"
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>Ollama</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('lmstudio')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'lmstudio'
                      ? 'text-teal-400 border-b-2 border-teal-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/lm_studio.png"
                      alt="LM Studio"
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>LM Studio</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'custom'
                      ? 'text-teal-400 border-b-2 border-teal-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Image
                      src="/api.jpg"
                      alt="Custom API"
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span>Custom API</span>
                  </span>
                </button>
              </div>

              {/* Ollama Tab */}
              {activeTab === 'ollama' && (
                <>
                  <p className="text-gray-300 mb-4">
                    Select models to benchmark and customize your prompt.
                  </p>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">Benchmark Prompt</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Enter the prompt to use for benchmarking..."
                      className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-200 resize-y min-h-[80px]"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      This prompt will be sent to each model during the benchmark. Identical prompts will be grouped together.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">
                      Notes <span className="text-gray-500 font-normal text-sm">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={benchmarkNotes}
                      onChange={(e) => setBenchmarkNotes(e.target.value)}
                      placeholder="e.g., Baseline test, Paper Figure 3, Q4 comparison..."
                      className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-200"
                    />
                  </div>

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

                      <div className="bg-teal-900/50 border border-teal-600 p-3 rounded mb-4">
                        <p className="text-teal-200 text-sm">
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
                          onClick={() => setShowBenchmarkModal(false)}
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
                              : 'bg-teal-600 hover:bg-teal-500 text-white'
                          }`}
                        >
                          {isRunningBenchmark ? 'Running Benchmark...' : 'Start Benchmark'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* LM Studio Tab */}
              {activeTab === 'lmstudio' && (
                <>
                  <p className="text-gray-300 mb-4">
                    Select models to benchmark and customize your prompt.
                  </p>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">Benchmark Prompt</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Enter the prompt to use for benchmarking..."
                      className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-200 resize-y min-h-[80px]"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      This prompt will be sent to each model during the benchmark. Identical prompts will be grouped together.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">
                      Notes <span className="text-gray-500 font-normal text-sm">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={benchmarkNotes}
                      onChange={(e) => setBenchmarkNotes(e.target.value)}
                      placeholder="e.g., Baseline test, Paper Figure 3, Q4 comparison..."
                      className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-200"
                    />
                  </div>

                  {!lmStudioAvailable ? (
                    <div className="bg-yellow-900 border border-yellow-700 p-4 rounded mb-4">
                      <p className="text-yellow-200 mb-2">
                        LM Studio server not detected. Make sure:
                      </p>
                      <ul className="text-yellow-200 text-sm list-disc list-inside space-y-1">
                        <li>LM Studio is open</li>
                        <li>A model is loaded</li>
                        <li>The server is started (check API Usage tab)</li>
                      </ul>
                    </div>
                  ) : lmStudioModels.length === 0 ? (
                    <div className="bg-yellow-900 border border-yellow-700 p-4 rounded mb-4">
                      <p className="text-yellow-200">
                        No models loaded in LM Studio. Load a model first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <h4 className="text-white font-semibold mb-2">Available Models ({lmStudioModels.length})</h4>
                        <div className="max-h-60 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-3">
                          {lmStudioModels.map(model => (
                            <label key={model} className="flex items-center gap-3 py-2 hover:bg-gray-800 px-2 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedLmStudioModels.includes(model)}
                                onChange={() => toggleLmStudioModelSelection(model)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-200">{model}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="bg-teal-900/50 border border-teal-600 p-3 rounded mb-4">
                        <p className="text-teal-200 text-sm">
                          <strong>Selected:</strong> {selectedLmStudioModels.length} model{selectedLmStudioModels.length !== 1 ? 's' : ''}
                          {selectedLmStudioModels.length > 0 && (
                            <span className="block mt-1">
                              {selectedLmStudioModels.join(', ')}
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowBenchmarkModal(false)}
                      className="px-4 py-2 rounded font-medium bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={runLmStudioBenchmark}
                      disabled={!lmStudioAvailable || selectedLmStudioModels.length === 0 || isRunningBenchmark}
                      className={`px-4 py-2 rounded font-medium ${
                        !lmStudioAvailable || selectedLmStudioModels.length === 0 || isRunningBenchmark
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-500 text-white'
                      }`}
                    >
                      {isRunningBenchmark ? 'Running Benchmark...' : 'Start Benchmark'}
                    </button>
                  </div>
                </>
              )}

              {/* Custom API Tab */}
              {activeTab === 'custom' && (
                <>
                  <p className="text-gray-300 mb-4">
                    Configure a custom OpenAI-compatible API endpoint (vLLM, text-generation-webui, etc.)
                  </p>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">Benchmark Prompt</label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Enter the prompt to use for benchmarking..."
                      className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-200 resize-y min-h-[80px]"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      This prompt will be sent to each model during the benchmark. Identical prompts will be grouped together.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">
                      Notes <span className="text-gray-500 font-normal text-sm">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={benchmarkNotes}
                      onChange={(e) => setBenchmarkNotes(e.target.value)}
                      placeholder="e.g., Baseline test, Paper Figure 3, Q4 comparison..."
                      className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-200"
                    />
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-white font-semibold mb-2">API Base URL *</label>
                      <input
                        type="text"
                        value={openaiUrl}
                        onChange={(e) => setOpenaiUrl(e.target.value)}
                        placeholder="http://localhost:5000/v1"
                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-teal-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        text-gen-webui: http://localhost:5000/v1 | vLLM: http://localhost:8000/v1
                      </p>
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-2">Model Name *</label>
                      <input
                        type="text"
                        value={openaiModel}
                        onChange={(e) => setOpenaiModel(e.target.value)}
                        placeholder="llama-3-8b"
                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-teal-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        The exact model identifier used by your API
                      </p>
                    </div>

                    <div>
                      <label className="block text-white font-semibold mb-2">
                        API Key <span className="text-gray-500 font-normal text-sm">(optional)</span>
                      </label>
                      <input
                        type="password"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-teal-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Leave blank if your API doesn&apos;t require authentication
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowBenchmarkModal(false)}
                      className="px-4 py-2 rounded font-medium bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={runOpenAIBenchmark}
                      disabled={!openaiUrl || !openaiModel || isRunningBenchmark}
                      className={`px-4 py-2 rounded font-medium ${
                        !openaiUrl || !openaiModel || isRunningBenchmark
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-500 text-white'
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
    </div>
  );
}