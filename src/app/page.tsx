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
    <div className="min-h-screen bg-gray-900 font-inter relative">
      {/* Background Image */}
      <div className="fixed inset-0 bg-cover bg-center opacity-70 pointer-events-none" style={{ backgroundImage: 'url(/enviro_background.jpg)' }}></div>
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/60 to-gray-900 pointer-events-none"></div>

      <div className="relative z-10">
        <NavBar />

        {/* Hero Section */}
        <div className="max-w-[1100px] mx-auto px-8 pt-16 pb-4">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-6">
              EnviroLLM
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Your toolkit for tracking, benchmarking, and optimizing resource usage of local LLMs.
            </p>
          </header>
        </div>

        {/* Main Content */}
        <div className="max-w-[1100px] mx-auto px-8 pb-16">

        <section className="bg-gray-800/90 border border-gray-700 p-10 mb-16 rounded-lg">
          <h2 className="text-3xl font-semibold text-emerald-400 mb-4">The Problem</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Users lack the tools to measure the resource usage and energy impact of local LLMs. Without visibility into resource consumption,
            it&apos;s difficult to make informed decisions about model selection, optimization, and sustainable AI practices.
          </p>
        </section>

        <section className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-2xl font-semibold text-lime-400 mb-4">The Solution</h2>
          <p className="text-gray-300 mb-4">Get started with one command:</p>
          <div className="bg-gray-800/90 border border-gray-700 p-6 rounded-lg inline-block">
            <code className="text-teal-400 text-xl">npx envirollm start</code>
          </div>
        </section>

        <div className="text-center mb-6">
          <p className="text-gray-300 text-lg">Use the CLI directly or explore the dashboards:</p>
        </div>

        <main className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800/90 border border-gray-700 p-10 flex flex-col rounded-lg hover:border-emerald-500/50 transition-colors">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-3">
              System Monitoring
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed flex-grow text-lg">
              Track your system performance across setups.
              Monitor CPU, GPU, and memory usage in real-time and get optimization recommendations.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                onClick={handleStartMonitoring}
                className={`inline-block px-6 py-3 rounded-md transition-all font-medium w-fit ${
                  isMonitoring
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isMonitoring ? 'View Monitoring' : 'Start Monitoring'}
              </a>
              <button
                onClick={handleStopMonitoring}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-all font-medium w-fit"
              >
                Stop Monitoring
              </button>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-10 flex flex-col rounded-lg hover:border-lime-500/50 transition-colors">
            <h2 className="text-2xl font-semibold text-lime-400 mb-3">
              Model Benchmarking
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed flex-grow text-lg">
              Benchmark local LLMs and compare performance.
              Test inference speed, resource usage, and energy efficiency across different models.
            </p>
            <a
              href="/optimize"
              className="inline-block bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-md transition-all font-medium w-fit"
            >
              Benchmark Models
            </a>
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
