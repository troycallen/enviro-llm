import NavBar from '../../components/NavBar';

export default function FAQ() {
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
              Frequently Asked Questions
            </h1>
          </header>

        <div className="space-y-6">
          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-4">What is EnviroLLM?</h2>
            <p className="text-gray-300 leading-relaxed">
              EnviroLLM gives you the tools to track and optimize resource usage when running models on your own hardware.
            </p>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-teal-400 mb-4">What can I do with it?</h2>
            <ul className="text-gray-300 leading-relaxed space-y-2">
              <li>• Monitor CPU, memory, GPU, and power usage in real-time</li>
              <li>• Benchmark inference speed and measure tokens per second</li>
              <li>• Compare energy consumption across different models and quantizations</li>
              <li>• Test models with task-specific prompts (code generation, analysis, creative writing, etc.)</li>
              <li>• Get automatic model recommendations based on quality, speed, and efficiency</li>
              <li>• View interactive visualizations comparing energy vs. speed tradeoffs</li>
              <li>• Export benchmark data to CSV for further analysis</li>
            </ul>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-lime-400 mb-4">How do I start?</h2>
            <div className="text-gray-300 leading-relaxed space-y-4 ">
              <p>Run one command (no installation needed):</p>
              <div className="bg-gray-900/80 p-4 rounded-lg mt-2">
                <code className="text-emerald-400">
                  npx envirollm start
                </code>
              </div>
              <p>Then visit the dashboard to see your metrics in real-time!</p>
              <p className="text-sm text-gray-400">Requirements: Node.js and Python 3.7+</p>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-4">What technology stack does EnviroLLM use?</h2>
            <div className="text-gray-300 leading-relaxed ">
              <ul className="space-y-2">
                <li>• <strong>Frontend:</strong> Next.js, React, TypeScript, Tailwind CSS</li>
                <li>• <strong>Backend:</strong> Python, FastAPI, PyTorch/TensorFlow</li>
                <li>• <strong>CLI:</strong> Node.js, TypeScript</li>
                <li>• <strong>Deployment:</strong> Vercel (Frontend), Railway (Backend)</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-teal-400 mb-4">Which LLM tools does it work with?</h2>
            <div className="text-gray-300 leading-relaxed ">
              <p className="mb-3">
                The CLI automatically finds most popular LLM setups:
              </p>
              <div className="grid md:grid-cols-2 gap-2">
                <ul className="space-y-1">
                  <li>• Ollama</li>
                  <li>• LLaMA/LlamaCPP</li>
                  <li>• Python scripts</li>
                  <li>• Text Generation WebUI</li>
                </ul>
                <ul className="space-y-1">
                  <li>• KoboldCPP</li>
                  <li>• Oobabooga</li>
                  <li>• LM Studio</li>
                  <li>• GPT4All</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Can I contribute?</h2>
            <p className="text-gray-300 leading-relaxed ">
              Absolutely! Everything&apos;s available on <a href="https://github.com/troycallen/envirollm" className="text-teal-400 hover:text-teal-300 underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </p>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-teal-400 mb-4">How do I benchmark models?</h2>
            <div className="text-gray-300 leading-relaxed space-y-4 ">
              <p><strong>Via Web Interface:</strong></p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Start the backend: <code className="bg-gray-900 px-2 py-1 rounded text-emerald-400">npx envirollm start</code></li>
                <li>Visit <a href="/optimize" className="text-teal-400 hover:text-teal-300 underline">envirollm.com/optimize</a></li>
                <li>Click &quot;Run Benchmark&quot;</li>
                <li>Choose a task preset or write a custom prompt</li>
                <li>Select models to compare</li>
                <li>View results with energy/speed charts and quality scores</li>
              </ol>
              <p className="mt-4"><strong>Via CLI:</strong></p>
              <div className="bg-gray-900/80 p-4 rounded-lg">
                <code className="text-emerald-400 block">npx envirollm benchmark --models llama3:8b,phi3:mini</code>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-4">What are task presets?</h2>
            <div className="text-gray-300 leading-relaxed space-y-3 ">
              <p>Task presets are pre-written prompts designed to test different workload types. We provide 7 presets:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Explanation:</strong> General knowledge and concept explanation</li>
                <li>• <strong>Code Generation:</strong> Programming tasks with documentation</li>
                <li>• <strong>Summarization:</strong> Concise information synthesis</li>
                <li>• <strong>Long-form Writing:</strong> Extended content (travel guides, articles)</li>
                <li>• <strong>Analytical Writing:</strong> Critical analysis and comparison</li>
                <li>• <strong>Data Analysis:</strong> SQL queries and technical problems</li>
                <li>• <strong>Creative Writing:</strong> Fiction and narrative generation</li>
              </ul>
              <p className="mt-3">These help you test how models perform across different use cases and enable reproducible comparisons.</p>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-lime-400 mb-4">Where is my data stored?</h2>
            <div className="text-gray-300 leading-relaxed space-y-3 ">
              <p>All benchmark results are stored <strong>locally on your machine</strong> at:</p>
              <div className="bg-gray-900/80 p-4 rounded-lg">
                <code className="text-emerald-400">~/.envirollm/benchmarks.db</code>
              </div>
              <p>Your data never leaves your machine. You can:</p>
              <ul className="space-y-2 ml-4">
                <li>• Export to CSV via the web interface</li>
                <li>• Clean all data with: <code className="bg-gray-900 px-2 py-1 rounded text-emerald-400">npx envirollm clean</code></li>
                <li>• View the SQLite database directly with any SQLite viewer</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-teal-400 mb-4">How accurate are the energy measurements?</h2>
            <div className="text-gray-300 leading-relaxed space-y-3 ">
              <p>EnviroLLM uses a simplified power estimation model:</p>
              <ul className="space-y-2 ml-4">
                <li>• <strong>Base power:</strong> 50W (system idle)</li>
                <li>• <strong>CPU contribution:</strong> CPU usage × 2W</li>
                <li>• <strong>GPU power:</strong> Direct measurement via NVIDIA APIs (when available)</li>
              </ul>
              <p className="mt-3">This provides <strong>relative comparisons</strong> between models rather than absolute values. The measurements are consistent enough to identify which models are more efficient and track trends over time.</p>
              <p>For research-grade accuracy, consider using specialized hardware power meters.</p>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-4">What&apos;s LLM-as-a-Judge?</h2>
            <div className="text-gray-300 leading-relaxed space-y-3 ">
              <p>LLM-as-a-Judge uses another LLM (by default, gemma3:1b running locally) to evaluate response quality on a 0-100 scale.</p>
              <p>This helps you assess quality-efficiency tradeoffs: a faster, more energy-efficient model might produce lower-quality responses.</p>
              <p><strong>When it&apos;s used:</strong></p>
              <ul className="space-y-2 ml-4">
                <li>• Automatically enabled when gemma3:1b is available</li>
                <li>• Falls back to heuristic scoring (word count, diversity, structure) if not available</li>
                <li>• Results marked with [J] badge in the UI</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-lime-400 mb-4">Can I benchmark quantization differences?</h2>
            <div className="text-gray-300 leading-relaxed space-y-3 ">
              <p>Yes! This is one of the most useful features. Compare Q4, Q8, and FP16 quantizations of the same model:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Pull the quantization variants you want to test:
                  <div className="bg-gray-900/80 p-3 rounded-lg mt-2 space-y-1">
                    <code className="text-emerald-400 block">ollama pull llama3:8b</code>
                    <code className="text-emerald-400 block">ollama pull llama3:8b-q8</code>
                    <code className="text-emerald-400 block">ollama pull llama3:8b-fp16</code>
                  </div>
                </li>
                <li>Select all variants in the benchmark interface</li>
                <li>Run the same prompt on all of them</li>
                <li>Compare energy consumption, speed, and quality scores</li>
              </ol>
              <p className="mt-3">Research shows quantization can reduce energy by up to 45% while maintaining acceptable quality for many tasks.</p>
            </div>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-lime-400 mb-4">Why build this?</h2>
            <p className="text-gray-300 leading-relaxed ">
              LLMs are a fascinating technology to me, but running them locally can be a black box. I wanted to create a tool that gives users visibility and control over the environmental impact of their AI experiments.
              Since I&apos;m not able to impact cloud-based inference, I thought this would be a good way to contribute to more sustainable AI practices.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}