import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'

// 用户头像：优先 Campux 对应的 QQ 公开头像，失败回退首字母
function UserAvatar({ user, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-sm' : 'w-8 h-8 text-base'
  const [imgErr, setImgErr] = useState(false)

  if (user?.avatar && !imgErr) {
    return (
      <img
        src={user.avatar}
        alt={user.username || 'avatar'}
        onError={() => setImgErr(true)}
        className={`${sizeClass} rounded-full object-cover bg-cream-deep block`}
      />
    )
  }
  return (
    <span
      className={`${sizeClass} bg-coral-soft text-coral rounded-full flex items-center justify-center font-semibold`}
    >
      {user?.username?.charAt(0).toUpperCase() || 'U'}
    </span>
  )
}

// 顶部导航栏
export default function Header() {
  const { user, isAuthenticated, isAdmin, isReviewer, login, logout } = useAuth()
  const { settings } = useSettings()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-full text-[15px] font-medium transition-colors ${
      isActive
        ? 'bg-coral-soft text-coral'
        : 'text-ink-muted hover:text-ink hover:bg-cream-deep'
    }`

  const bottomLinkClass = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-none h-full ${
      isActive ? 'text-coral' : 'text-ink-faint'
    }`

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-coral to-[#F09A4B] text-white flex items-center justify-center font-display text-lg font-semibold shadow-soft group-hover:scale-105 transition-transform duration-300">
                L
              </span>
              <span className="font-display text-[1.35rem] font-semibold text-ink tracking-tight truncate">
                {settings.site_name || 'Lofo 寻物'}
              </span>
            </Link>

            {/* 右侧：导航（桌面）+ 登录/用户 */}
            <div className="flex items-center gap-2 shrink-0">
              <nav className="hidden md:flex items-center gap-1 mr-2">
                <NavLink to="/" end className={navLinkClass}>
                  首页
                </NavLink>
                {isAuthenticated && (
                  <NavLink to="/my-items" className={navLinkClass}>
                    我的发布
                  </NavLink>
                )}
                {isReviewer && (
                  <NavLink to="/review" className={navLinkClass}>
                    审核
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink to="/admin" className={navLinkClass}>
                    管理后台
                  </NavLink>
                )}
              </nav>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full bg-white hover:bg-cream p-1 text-ink-soft cursor-pointer"
                    aria-label="用户菜单"
                  >
                    {/* 头像外圈：等距圆形描边 */}
                    <span className="inline-flex items-center justify-center rounded-full border border-line p-[3px] shrink-0">
                      <UserAvatar user={user} size="sm" />
                    </span>
                    {/* 空间足够时显示用户名（sm 及以上） */}
                    <span className="hidden sm:inline text-sm font-medium max-w-[8rem] truncate pr-1">
                      {user?.username}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-line bg-white shadow-lift z-20 py-1.5 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-line-soft">
                          <p className="text-sm font-semibold text-ink truncate">{user?.username}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2.5 text-sm text-coral hover:bg-coral-soft"
                        >
                          退出登录
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={login}
                  className="btn-primary !py-2 !px-3 sm:!px-4 !text-sm"
                >
                  Campux 登录
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-white/90 backdrop-blur-xl md:hidden">
        <div className="flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
          <NavLink to="/" end className={bottomLinkClass}>
            {({ isActive }) => (
              <>
                <svg className={`w-5 h-5 ${isActive ? 'text-coral' : 'text-ink-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-10.5z" />
                </svg>
                <span>首页</span>
              </>
            )}
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/my-items" className={bottomLinkClass}>
              {({ isActive }) => (
                <>
                  <svg className={`w-5 h-5 ${isActive ? 'text-coral' : 'text-ink-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>我的发布</span>
                </>
              )}
            </NavLink>
          )}
          {isReviewer && (
            <NavLink to="/review" className={bottomLinkClass}>
              {({ isActive }) => (
                <>
                  <svg className={`w-5 h-5 ${isActive ? 'text-coral' : 'text-ink-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>审核</span>
                </>
              )}
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={bottomLinkClass}>
              {({ isActive }) => (
                <>
                  <svg className={`w-5 h-5 ${isActive ? 'text-coral' : 'text-ink-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>管理</span>
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
