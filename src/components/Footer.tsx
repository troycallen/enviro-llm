import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 py-8 mt-16">
      <div className="max-w-[1100px] mx-auto px-8">
        <div className="grid md:grid-cols-2 gap-8 mb-6">
          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Monitoring
                </Link>
              </li>
              <li>
                <Link href="/optimize" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Benchmarks
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/troycallen/envirollm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/envirollm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors"
                >
                  NPM Package
                </a>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-6">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} EnviroLLM.
          </p>
        </div>
      </div>
    </footer>
  );
}
