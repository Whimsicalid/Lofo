// 分页组件
export default function Pagination({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize) || 1
  const currentPage = page || 1

  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  const pageNumbers = getPageNumbers()
  const btnBase = 'min-w-[2.25rem] h-9 px-2 flex items-center justify-center rounded-full text-sm font-medium'
  const btnNormal = 'text-ink-muted hover:bg-cream-deep hover:text-ink'
  const btnActive = 'bg-coral text-white shadow-soft'
  const btnDisabled = 'text-ink-faint/50 cursor-not-allowed'

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${btnBase} ${currentPage <= 1 ? btnDisabled : btnNormal}`}
        aria-label="上一页"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {currentPage > 3 && (
        <>
          <button onClick={() => onPageChange(1)} className={`${btnBase} ${btnNormal}`}>1</button>
          {currentPage > 4 && <span className="px-1 text-ink-faint">…</span>}
        </>
      )}

      {pageNumbers.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`${btnBase} ${p === currentPage ? btnActive : btnNormal}`}
        >
          {p}
        </button>
      ))}

      {currentPage < totalPages - 2 && (
        <>
          {currentPage < totalPages - 3 && <span className="px-1 text-ink-faint">…</span>}
          <button onClick={() => onPageChange(totalPages)} className={`${btnBase} ${btnNormal}`}>
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${btnBase} ${currentPage >= totalPages ? btnDisabled : btnNormal}`}
        aria-label="下一页"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
