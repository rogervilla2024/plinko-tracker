import { Outlet, Link } from 'react-router-dom'
import { Footer } from '../../../../shared-core/components/footer/Footer'
import { Helmet } from 'react-helmet-async'
import { Circle, BarChart3, BookOpen, Info, Mail, Shield, FileText } from 'lucide-react'
import { GAME_CONFIG } from '../config/gameConfig'
import { SchemaMarkup } from '../../../../shared-core/components/SchemaMarkup'

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-stone-950/90 backdrop-blur-md border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
                <Circle className="w-6 h-6 text-stone-900" fill="currentColor" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Plinko Tracker</h1>
              <p className="text-[10px] text-stone-500 -mt-0.5">by BGaming | 99% RTP</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className="btn-ghost">
              <BarChart3 className="w-4 h-4" />
              <span>Statistics</span>
            </Link>
            <Link to="/calculator/" className="btn-ghost">
              <Circle className="w-4 h-4" />
              <span>Calculator</span>
            </Link>
            <Link to="/articles/" className="btn-ghost">
              <BookOpen className="w-4 h-4" />
              <span>Articles</span>
            </Link>
            <Link to="/about/" className="btn-ghost">
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <a
              href={GAME_CONFIG.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary hidden sm:flex"
            >
              <Circle className="w-4 h-4" />
              <span>Play Demo</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

const Footer = () => {
  const currentYear = 2026

  const footerLinks = {
    legal: [
      { name: 'Terms of Service', href: '/terms/' },
      { name: 'Privacy Policy', href: '/privacy/' },
      { name: 'Cookie Policy', href: '/cookies/' },
      { name: 'Disclaimer', href: '/disclaimer/' },
    ],
    resources: [
      { name: 'How to Play', href: '/how-to-play/' },
      { name: 'Plinko Strategy', href: '/strategy/' },
      { name: 'Probability Guide', href: '/probability/' },
      { name: 'FAQ', href: '/faq/' },
    ],
    company: [
      { name: 'About Us', href: '/about/' },
      { name: 'Contact', href: '/contact/' },
      { name: 'Responsible Gambling', href: '/responsible-gambling/' },
    ],
  }

  return (
    <footer className="bg-stone-900/50 border-t border-stone-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Circle className="w-5 h-5 text-stone-900" fill="currentColor" />
              </div>
              <span className="font-bold text-lg">Plinko Tracker</span>
            </Link>
            <p className="mt-4 text-sm text-stone-400">
              Independent Plinko game statistics and probability calculator.
              Not affiliated with BGaming.
            </p>
            <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-amber-400">
                <strong>99% RTP</strong> - One of the highest returns in online gaming!
              </p>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-stone-200 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Legal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-stone-200 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Resources
            </h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-stone-200 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              Company
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <a
                href={`mailto:${GAME_CONFIG.emails.contact}`}
                className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {GAME_CONFIG.emails.contact}
              </a>
            </div>
          </div>
        </div>

        {/* Responsible Gambling Notice */}
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-stone-300 text-center">
            <strong className="text-red-400">Responsible Gambling:</strong> Gambling can be addictive.
            Please play responsibly and within your limits. If you have a gambling problem, seek help at{' '}
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
              BeGambleAware.org
            </a>
            {' '}or call <strong>1-800-522-4700</strong> (US).
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-stone-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-stone-500">
              &copy; {currentYear} Plinko Tracker. All rights reserved.
            </p>
            <p className="text-xs text-stone-600">
              {GAME_CONFIG.trademark} We are not affiliated with or endorsed by BGaming.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

const Layout = () => {
  return (
    <>
      <Helmet>
        <title>{GAME_CONFIG.seo.title}</title>
        <meta name="description" content={GAME_CONFIG.seo.description} />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-noise">
        <Header />
        <main className="flex-grow">
          <Outlet />
        </main>
        <Footer
        gameName="Plinko"
        gameEmoji="🔵"
        domain="plinkotracker.com"
        primaryColor="#f59e0b"
        botUsername="PlinkoTrackerBot"
        rtp={99}
        provider="BGaming"
      />
      </div>
    </>
  )
}

export default Layout
