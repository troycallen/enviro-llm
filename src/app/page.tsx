export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 font-inter p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
            EnviroLLM: Practical Resource Tracking and Optimization for Local AI
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Open-source toolkit for tracking, benchmarking, and optimizing energy/resource use when running LLMs on laptops and desktops
          </p>
        </header>

        <section className="bg-gray-800 border border-gray-700 p-8 mb-12">
          <h2 className="text-2xl font-bold text-red-400 mb-4">The Problem</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Users lack tools to measure the energy impact of local LLMs. Without visibility into resource consumption, 
            it&apos;s impossible to make informed decisions about model selection, optimization, or sustainable AI practices.
          </p>
        </section>

        <main className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800 border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 font-jetbrains-mono">
              Real-time Monitoring
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Track energy consumption and resource usage of local LLMs with visual dashboards. 
              Monitor CPU, GPU, memory usage and correlate with power draw in real-time.
            </p>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 border border-blue-500 transition-colors font-medium">
              Start Monitoring
            </button>
          </div>

          <div className="bg-gray-800 border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-green-400 mb-4 font-jetbrains-mono">
              Model Optimization
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Reduce energy usage through quantization, pruning, and compression techniques. 
              Compare performance vs efficiency trade-offs across different optimization strategies.
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
