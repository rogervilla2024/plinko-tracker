import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import CalculatorsPage from './pages/CalculatorsPage'
import { TelegramBotPage } from './pages/TelegramBotPage'
import { WidgetPage } from './pages/WidgetPage'
import ArticlePage from './pages/ArticlePage'
import {
  AboutPage,
  PrivacyPage,
  TermsPage,
  ResponsibleGamblingPage,
  ContactPage
} from './pages/FooterPages'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/calculators" element={<CalculatorsPage />} />
        {/* Telegram Bot Page */}
        <Route path="/telegram-bot" element={<TelegramBotPage />} />
        {/* Widget Page */}
        <Route path="/widget" element={<WidgetPage />} />
        {/* Footer Pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/responsible-gambling" element={<ResponsibleGamblingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        {/* Article Pages */}
        <Route path="/:slug" element={<ArticlePage />} />


        {/* Add more routes as needed */}
      </Route>
    </Routes>
  )
}

export default App
