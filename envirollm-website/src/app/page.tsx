export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-8 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-4">
            EnviroLLM
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Energy Tracking Toolkit for Local AI Models
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6">
              About EnviroLLM
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              EnviroLLM is a comprehensive energy tracking toolkit designed to monitor and analyze 
              the environmental impact of local AI model deployments. Our solution provides 
              real-time insights into power consumption, carbon footprint, and resource utilization.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Perfect for researchers, developers, and organizations looking to build more 
              sustainable AI systems while maintaining performance and accuracy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-green-500 text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                Energy Monitoring
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track real-time power consumption and energy usage patterns of your AI models.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-blue-500 text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                Performance Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Analyze the relationship between model performance and energy efficiency.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-emerald-500 text-3xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                Carbon Footprint
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Calculate and optimize the carbon impact of your AI infrastructure.
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                Coming Soon
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                EnviroLLM is currently in development. The backend API will be built with FastAPI 
                to provide comprehensive energy tracking capabilities for your local AI models.
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Backend: Python + FastAPI | Frontend: Next.js + TypeScript
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
