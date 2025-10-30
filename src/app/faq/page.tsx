import NavBar from '../../components/NavBar';

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gray-900 font-inter relative">
      {/* Background Image */}
      <div className="fixed inset-0 bg-cover bg-center opacity-70 pointer-events-none" style={{ backgroundImage: 'url(/enviro_background.jpg)' }}></div>
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/60 to-gray-900 pointer-events-none"></div>

      <div className="relative z-10">
        <NavBar />
        <div className="max-w-4xl mx-auto px-8 py-16">
          <header className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-4">
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
            <ul className="text-gray-300 leading-relaxed space-y-2 text-lg">
              <li>• Monitor CPU, memory, and power usage in real-time</li>
              <li>• See which models are actually efficient vs. resource hogs</li>
              <li>• Compare running models locally vs. using cloud APIs</li>
              <li>• View how you can optimize performance of your model</li>
            </ul>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-lime-400 mb-4">How do I start?</h2>
            <div className="text-gray-300 leading-relaxed space-y-4 text-lg">
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
            <ul className="text-gray-300 leading-relaxed space-y-2 text-lg">
              <li>• <strong>Frontend:</strong> Next.js, React, TypeScript, Tailwind CSS</li>
              <li>• <strong>Backend:</strong> Python, FastAPI, PyTorch/TensorFlow</li>
              <li>• <strong>CLI:</strong> Node.js, TypeScript</li>
              <li>• <strong>Deployment:</strong> Vercel (Frontend), Railway (Backend)</li>
            </ul>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-teal-400 mb-4">Which LLM tools does it work with?</h2>
            <p className="text-gray-300 leading-relaxed mb-3 text-lg">
              The CLI automatically finds most popular LLM setups:
            </p>
            <div className="grid md:grid-cols-2 gap-2 text-gray-300 text-lg">
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

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Can I contribute?</h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              Absolutely! Everything&apos;s available on <a href="https://github.com/troycallen/envirollm" className="text-teal-400 hover:text-teal-300 underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
            </p>
          </div>

          <div className="bg-gray-800/90 border border-gray-700 p-8 rounded-lg">
            <h2 className="text-2xl font-semibold text-lime-400 mb-4">Why build this?</h2>
            <p className="text-gray-300 leading-relaxed text-lg">
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