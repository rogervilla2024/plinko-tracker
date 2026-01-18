import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'

// Article slug to file mapping
const ARTICLE_MAP = {
  'what-is-plinko': '01-what-is-plinko.html',
  'plinko-rtp-house-edge': '02-plinko-rtp-house-edge.html',
  'plinko-statistics-distribution': '03-plinko-statistics-distribution.html',
  'how-to-play-plinko': '04-how-to-play-plinko.html',
  'plinko-strategies': '05-plinko-strategies.html',
  'plinko-vs-other-games': '06-plinko-vs-other-games.html',
  'plinko-multiplier-analysis': '07-plinko-multiplier-analysis.html',
  'plinko-tips-beginners': '08-plinko-tips-beginners.html',
  'history-of-plinko': '09-history-of-plinko.html',
  'plinko-responsible-gambling': '10-plinko-responsible-gambling.html',
  'plinko-demo': '11-plinko-demo.html',
  'plinko-casinos': '12-plinko-casinos.html',
  'plinko-predictor-scam': '13-plinko-predictor-scam.html'
}

export default function ArticlePage() {
  const { slug } = useParams()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      setError(null)

      const cleanSlug = slug?.replace(/\/$/, '')
      const filename = ARTICLE_MAP[cleanSlug]

      if (!filename) {
        setError('Article not found')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/articles/${filename}`)
        if (!res.ok) throw new Error('Failed to load article')
        const html = await res.text()
        setContent(html)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug])

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-800 rounded-xl text-center py-12">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Article Not Found</h1>
          <p className="text-slate-400">The requested article could not be found.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <article
        className="prose prose-invert prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </main>
  )
}
