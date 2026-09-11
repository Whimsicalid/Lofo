import { useNavigate } from 'react-router-dom'

// 404 页面
export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="max-w-3xl mx-auto px-4 py-28 text-center">
      <p className="font-display text-[6rem] leading-none font-semibold text-line select-none">404</p>
      <h1 className="font-display text-2xl font-semibold text-ink mt-2 mb-3">页面未找到</h1>
      <p className="text-ink-muted mb-10">您访问的页面不存在或已被移除</p>
      <button onClick={() => navigate('/')} className="btn-primary !px-8 !py-3">
        返回首页
      </button>
    </div>
  )
}
