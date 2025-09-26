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
    gpus: any[];
  };
  recommendations: Recommendation[];
}

export default function OptimizePage() {
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptimizationData = async () => {
      try {
        const response = await fetch(process.env.NODE_ENV === 'development'
          ? 'http://localhost:8000/optimize'
          : 'https://enviro-llm-production.up.railway.app/optimize');

        if (response.ok) {
          const data = await response.json();
          setOptimizationData(data);
        } else {
          throw new Error('Failed to fetch optimization data');
        }
      } catch (err) {
        setError('Unable to connect to backend. Make sure the backend is running.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptimizationData();
  }, []);

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
            <div className="bg-gray-800 border border-gray-700 p-8 mb-8 rounded">
              <h2 className="text-2xl font-bold text-blue-400 mb-6">System Analysis</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {optimizationData.system_specs.memory_gb}GB
                  </div>
                  <div className="text-gray-400">System Memory</div>
                  <div className="mt-2 text-sm text-gray-500">
                    {optimizationData.system_specs.memory_gb >= 32 ? 'Excellent for large models' :
                     optimizationData.system_specs.memory_gb >= 16 ? 'Good for most models' :
                     optimizationData.system_specs.memory_gb >= 8 ? 'Limited - use quantization' :
                     'Very limited - 4-bit models only'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {optimizationData.system_specs.cpu_cores}
                  </div>
                  <div className="text-gray-400">CPU Cores</div>
                  <div className="mt-2 text-sm text-gray-500">
                    {optimizationData.system_specs.cpu_cores >= 8 ? 'Great for parallel processing' :
                     optimizationData.system_specs.cpu_cores >= 4 ? 'Good for CPU inference' :
                     'Limited processing power'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {optimizationData.system_specs.gpu_available
                      ? optimizationData.system_specs.gpus.length
                      : 0}
                  </div>
                  <div className="text-gray-400">GPU(s) Available</div>
                  <div className="mt-2 text-sm text-gray-500">
                    {optimizationData.system_specs.gpu_available
                      ? 'Hardware acceleration ready'
                      : 'CPU-only inference'}
                  </div>
                </div>
              </div>
            </div>

            {/* Backend Recommendations */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Optimization Suggestions</h2>

              <div className="space-y-4">
                {optimizationData.recommendations.map((rec, index) => (
                  <div key={index} className={`border p-6 rounded ${
                    rec.priority === 'high' ? 'bg-red-900 border-red-700' :
                    rec.priority === 'medium' ? 'bg-yellow-900 border-yellow-700' :
                    'bg-blue-900 border-blue-700'
                  }`}>
                    <h3 className={`text-xl font-bold mb-3 ${
                      rec.priority === 'high' ? 'text-red-400' :
                      rec.priority === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
{rec.title}
                    </h3>
                    <p className={`mb-4 ${
                      rec.priority === 'high' ? 'text-red-200' :
                      rec.priority === 'medium' ? 'text-yellow-200' :
                      'text-blue-200'
                    }`}>
                      {rec.description}
                    </p>
                    <div className="bg-gray-800 p-3 rounded">
                      <p className="text-gray-300 text-sm">
                        <strong>Implementation:</strong> {rec.implementation}
                      </p>
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


          </>
        )}
      </div>
    </div>
  );
}