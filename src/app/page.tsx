'use client';

import { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';

export default function Home() {
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const hasVisitedDashboard = localStorage.getItem('hasVisitedDashboard');
    if (hasVisitedDashboard) {
      setIsMonitoring(true);
    }
  }, []);

  useEffect(() => {
    // Listen for storage changes to update monitoring state
    const handleStorageChange = () => {
      const hasVisitedDashboard = localStorage.getItem('hasVisitedDashboard');
      setIsMonitoring(!!hasVisitedDashboard);
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check for changes when the window gains focus
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const handleStartMonitoring = () => {
    localStorage.setItem('hasVisitedDashboard', 'true');
    setIsMonitoring(true);
  };

  const handleStopMonitoring = () => {
    localStorage.removeItem('hasVisitedDashboard');
    setIsMonitoring(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 font-inter">
      <NavBar />
      <div className="max-w-6xl mx-auto p-8">
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
            EnviroLLM
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Open-source toolkit for tracking, benchmarking, and optimizing resource usage of local LLMs
          </p>
        </header>

        <section className="bg-gray-800 border border-gray-700 p-8 mb-12">
          <h2 className="text-2xl font-bold text-red-400 mb-4">THE PROBLEM</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Users lack the tools to measure the resource usage and energy impact of local LLMs. Without visibility into resource consumption, 
            it&apos;s impossible to make informed decisions about model selection, optimization, or sustainable AI practices.
          </p>
        </section>

        <main className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800 border border-gray-700 p-8 flex flex-col">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 font-jetbrains-mono">
              LLM MONITORING
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed flex-grow">
              Track resource usage of your local LLMs with visual dashboards.
              Monitor CPU, GPU, and memory usage in real-time.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                onClick={handleStartMonitoring}
                className={`inline-block px-8 py-3 transition-colors font-medium w-fit ${
                  isMonitoring
                    ? 'bg-green-600 hover:bg-green-500 text-white border border-green-500'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500'
                }`}
              >
                {isMonitoring ? 'View Monitoring' : 'Start Monitoring'}
              </a>
              <button
                onClick={handleStopMonitoring}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white border border-red-500 transition-colors font-medium w-fit"
              >
                Stop Monitoring
              </button>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 p-8 flex flex-col">
            <h2 className="text-2xl font-bold text-green-400 mb-4 font-jetbrains-mono">
              MODEL OPTIMIZATION
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed flex-grow">
              Analyze your system and get optimization suggestions.
              Reduce memory usage and improve performance for your hardware.
            </p>
            <button className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 border border-green-500 transition-colors font-medium w-fit">
              Get Recommendations
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
