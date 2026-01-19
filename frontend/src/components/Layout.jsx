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
