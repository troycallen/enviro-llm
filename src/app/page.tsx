export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 font-inter p-8">
      <div className="max-w-6xl mx-auto">
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
          <div className="bg-gray-800 border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 font-jetbrains-mono">
              REAL-TIME MONITORING
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Track resource usage of your local LLMs with visual dashboards. 
              Monitor CPU, GPU, and memory usage in real-time.
            </p>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 border border-blue-500 transition-colors font-medium">
              Start Monitoring
            </button>
          </div>

          <div className="bg-gray-800 border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-green-400 mb-4 font-jetbrains-mono">
              MODEL OPTIMIZATION
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Optimize performance of your local deploymentswith our toolkit. 
              Compare trade-offs between model size, speed, and resource usage.
            </p>
            <button className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 border border-green-500 transition-colors font-medium">
              Optimize Models
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
