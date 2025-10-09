import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className ="flex items-center space-x-6">
        <Link 
          href="/" 
          className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
          EnviroLLM
        </Link>

        <Link
            href="/"
            className="text-gray-300 hover:text-white transition-colors font-medium">
            Home
        </Link>
        </div>
        
        <div className="flex items-center space-x-6">
          <Link
            href="/faq"
            className="text-gray-300 hover:text-white transition-colors font-medium">
            FAQ
          </Link>

          <a
            href="https://github.com/troycallen/envirollm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition-colors font-medium">
            GitHub
          </a>

        </div>
      </div>
    </nav>
  );
}