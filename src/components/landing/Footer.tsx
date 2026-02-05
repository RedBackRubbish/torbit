'use client'

import { memo } from 'react'
import Link from 'next/link'
import { TorbitLogo } from '@/components/ui/TorbitLogo'

/**
 * Footer - Matrix-themed footer
 */
const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear()

  const links = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'How it Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
    resources: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api' },
      { label: 'Examples', href: '/examples' },
      { label: 'Blog', href: '/blog' },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Press', href: '/press' },
    ],
    legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Security', href: '/security' },
    ],
  }

  return (
    <footer
      data-testid="footer"
      className="border-t border-matrix-800/50 bg-void-900/80 py-16 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <TorbitLogo size="sm" />
              <span className="text-lg font-bold text-white tracking-tight">
                TORBIT
              </span>
            </Link>
            <p className="text-sm text-matrix-600 font-mono">
              The agentic engineering platform for the next generation of
              developers.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-mono text-matrix-400 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-matrix-600 hover:text-matrix-400 transition-colors font-mono"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-xs font-mono text-matrix-400 uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              {links.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-matrix-600 hover:text-matrix-400 transition-colors font-mono"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs font-mono text-matrix-400 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-matrix-600 hover:text-matrix-400 transition-colors font-mono"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-mono text-matrix-400 uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-matrix-600 hover:text-matrix-400 transition-colors font-mono"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-matrix-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-matrix-700 font-mono">
            © {currentYear} TORBIT. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-matrix-700 font-mono">
              System Status:{' '}
              <span className="text-matrix-400">● Operational</span>
            </span>
          </div>
        </div>

        {/* ASCII Art */}
        <div className="mt-12 text-center">
          <pre className="text-[8px] md:text-xs text-matrix-800 font-mono leading-tight inline-block">
{`
 ████████╗ ██████╗ ██████╗ ██████╗ ██╗████████╗
 ╚══██╔══╝██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝
    ██║   ██║   ██║██████╔╝██████╔╝██║   ██║   
    ██║   ██║   ██║██╔══██╗██╔══██╗██║   ██║   
    ██║   ╚██████╔╝██║  ██║██████╔╝██║   ██║   
    ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝   
`}
          </pre>
        </div>
      </div>
    </footer>
  )
})

export default Footer
