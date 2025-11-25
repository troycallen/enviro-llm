import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 py-5">
      <div className="max-w-[1100px] mx-auto px-8 flex items-center justify-between">
        <div className="flex items-center space-x-8">
        <Link
          href="/"
          className="text-2xl font-semibold text-white hover:text-emerald-400 transition-colors">
          EnviroLLM
        </Link>

        <Link
            href="/"
            className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">
            Home
        </Link>
        </div>

        <div className="flex items-center space-x-8">
          <Link
            href="/faq"
            className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">
            FAQ
          </Link>

          <a
            href="https://github.com/troycallen/envirollm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">
            GitHub
          </a>

        </div>
      </div>
    </nav>
  );
}