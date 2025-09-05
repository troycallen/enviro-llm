export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            EnviroLLM
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered environmental insights and solutions
          </p>
        </header>

        <main className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Environmental Analysis
            </h2>
            <p className="text-gray-600 mb-4">
              Get AI-powered insights on environmental data, sustainability metrics, and eco-friendly solutions.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
              Start Analysis
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Climate Solutions
            </h2>
            <p className="text-gray-600 mb-4">
              Discover innovative climate solutions and environmental best practices powered by AI.
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors">
              Explore Solutions
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
