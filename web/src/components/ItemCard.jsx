import { useNavigate } from 'react-router-dom'

// 物品卡片
export default function ItemCard({ item }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/items/${item.id}`)
  }

  // 类型标签：寻物=琥珀，招领=苔绿
  const typeStyles = {
    lost: {
      label: '寻物',
      badge: 'bg-amber-soft text-[#B45309] border-[#F5E0A8]',
      bar: 'bg-amber-400',
    },
    found: {
      label: '招领',
      badge: 'bg-moss-soft text-moss border-[#C8E0D4]',
      bar: 'bg-moss',
    },
  }
  const typeStyle = typeStyles[item.type] || typeStyles.lost

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <article
      onClick={handleClick}
      className="card overflow-hidden cursor-pointer group hover:shadow-lift hover:-translate-y-1 hover:border-coral/25 transition-all duration-300 ease-soft"
    >
      {/* 顶部色条 */}
      <div className={`h-1 ${typeStyle.bar}`} />

      {/* 图片 */}
      <div className="aspect-[4/3] bg-cream-deep overflow-hidden relative">
        {item.image_path ? (
          <img
            src={item.image_path}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-soft"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-ink-faint gap-2">
            <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-ink-faint/70">暂无图片</span>
          </div>
        )}
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full border backdrop-blur-sm ${typeStyle.badge}`}
        >
          {typeStyle.label}
        </span>
      </div>

      {/* 内容 */}
      <div className="p-4 sm:p-5">
        <h3 className="font-semibold text-[16px] text-ink line-clamp-1 mb-1.5 group-hover:text-coral transition-colors">
          {item.title}
        </h3>
        <p className="text-sm text-ink-muted line-clamp-2 mb-4 leading-relaxed min-h-[2.5rem]">
          {item.description || '暂无描述'}
        </p>
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span className="flex items-center gap-1 line-clamp-1 min-w-0">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{item.location || '未知地点'}</span>
          </span>
          <span className="flex-shrink-0 ml-2">{formatDate(item.created_at)}</span>
        </div>
      </div>
    </article>
  )
}
