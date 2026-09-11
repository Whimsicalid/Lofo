import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchItems } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import ItemCard from '../components/ItemCard'
import Pagination from '../components/Pagination'

// 首页：Hero + 物品列表（筛选 / 搜索 / 分页）
export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { settings } = useSettings()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [type, setType] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 12
  const keywordRef = useRef(keyword)
  keywordRef.current = keyword

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, pageSize }
      if (type) params.type = type
      if (keywordRef.current.trim()) params.keyword = keywordRef.current.trim()
      const res = await fetchItems(params)
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [page, type])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // 输入防抖搜索（跳过首次挂载，避免与列表初始化重复请求）
  const keywordMountRef = useRef(false)
  useEffect(() => {
    if (!keywordMountRef.current) {
      keywordMountRef.current = true
      return undefined
    }
    const t = setTimeout(() => {
      if (page !== 1) setPage(1)
      else loadItems()
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  const handleTypeChange = (newType) => {
    setType(newType)
    setPage(1)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadItems()
  }

  const tabs = [
    { label: '全部', value: '' },
    { label: '寻物启事', value: 'lost' },
    { label: '失物招领', value: 'found' },
  ]

  const heroImage = settings.hero_bg_image

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {heroImage ? (
            <>
              <img
                src={heroImage}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ink/80 via-ink/60 to-coral/40" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(224,90,57,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(61,122,90,0.12),transparent_50%),linear-gradient(180deg,#FAF7F2_0%,#F5EDE3_100%)]" />
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-coral/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-moss/10 blur-3xl" />
            </>
          )}
        </div>

        <div
          className={`relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24 ${
            heroImage ? 'text-white' : 'text-ink'
          }`}
        >
          <div className="max-w-2xl fade-up">
            <p
              className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase mb-5 ${
                heroImage ? 'text-white/70' : 'text-coral'
              }`}
            >
              <span className={`w-8 h-px ${heroImage ? 'bg-white/50' : 'bg-coral'}`} />
              Campus Lost &amp; Found
            </p>
            <h1 className="font-display text-[2.4rem] sm:text-[3.2rem] leading-[1.15] font-semibold mb-5 tracking-tight">
              {heroImage ? (
                <>
                  让每一件物品
                  <br />
                  都找到回家的路
                </>
              ) : (
                <>
                  丢东西、捡到东西，
                  <br />
                  <span className="text-coral italic">都在这里说一声</span>
                </>
              )}
            </h1>
            <p
              className={`text-base sm:text-lg leading-relaxed max-w-lg mb-8 ${
                heroImage ? 'text-white/80' : 'text-ink-muted'
              }`}
            >
              发布一条寻物或招领信息，让校园里的温暖继续流转。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <button onClick={() => navigate('/post')} className="btn-primary !px-6 !py-3">
                  发布信息
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ) : null}
              <a
                href="#list"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[15px] transition-colors ${
                  heroImage
                    ? 'border border-white/30 text-white hover:bg-white/10 backdrop-blur-sm'
                    : 'btn-ghost'
                }`}
              >
                浏览信息
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 列表区 */}
      <div id="list" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* 筛选栏 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-line bg-white shadow-soft">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTypeChange(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  type === tab.value
                    ? 'bg-coral text-white shadow-soft'
                    : 'text-ink-muted hover:text-ink hover:bg-cream'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="w-full sm:w-auto">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题或描述…"
                className="input-base !pl-10 sm:w-72 !rounded-full"
              />
            </div>
          </form>
        </div>

        {/* 内容 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-cream-deep" />
                <div className="p-5">
                  <div className="h-4 bg-cream-deep rounded-md mb-3 w-3/4" />
                  <div className="h-3 bg-cream-deep rounded-md mb-2 w-full" />
                  <div className="h-3 bg-cream-deep rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-10 text-center border-coral/30 bg-coral-soft/40">
            <p className="text-coral font-medium mb-4">{error}</p>
            <button onClick={loadItems} className="btn-primary !py-2">
              重新加载
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cream-deep flex items-center justify-center">
              <svg className="w-8 h-8 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0h-2M4 13h2m10-4h.01M14 9h.01M10 9h.01M6 9h.01" />
              </svg>
            </div>
            <p className="font-display text-xl text-ink-muted mb-1">这里还空着</p>
            <p className="text-sm text-ink-faint">暂时没有符合条件的信息，来发布第一条吧</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* 浮动发布按钮（桌面端） */}
      {isAuthenticated && (
        <button
          onClick={() => navigate('/post')}
          className="hidden md:flex fixed bottom-8 right-8 h-14 px-6 items-center gap-2 rounded-full bg-coral text-white font-semibold shadow-lift hover:bg-coral-dark hover:scale-105 z-40 transition-all duration-300 ease-soft"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          发布
        </button>
      )}

      {/* 移动端浮动发布（避开底栏） */}
      {isAuthenticated && (
        <button
          onClick={() => navigate('/post')}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-coral text-white flex items-center justify-center shadow-lift z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  )
}
