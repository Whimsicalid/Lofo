import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import Header from './components/Header'
import Home from './pages/Home'
import ItemDetail from './pages/ItemDetail'
import PostItem from './pages/PostItem'
import Admin from './pages/Admin'
import Review from './pages/Review'
import MyItems from './pages/MyItems'
import NotFound from './pages/NotFound'

// 全站加载指示器
function FullSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-coral/15" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-coral animate-spin" />
      </div>
    </div>
  )
}

// 受保护路由：需登录才能访问
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullSpinner />
  if (!isAuthenticated) return <Navigate to="/" replace />

  return children
}

// 角色受保护路由：需特定角色才能访问
function RoleRoute({ children, check }) {
  const { loading } = useAuth()

  if (loading) return <FullSpinner />

  const allowed = check()
  if (!allowed) return <Navigate to="/" replace />

  return children
}

// 应用主体内容
function AppContent() {
  const { isAdmin, isReviewer } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink pb-16 md:pb-0">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route
            path="/post"
            element={
              <ProtectedRoute>
                <PostItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <PostItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-items"
            element={
              <ProtectedRoute>
                <MyItems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <RoleRoute check={() => isReviewer}>
                <Review />
              </RoleRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute check={() => isAdmin}>
                <Admin />
              </RoleRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* 页脚 */}
      <footer className="mt-auto border-t border-line bg-cream-deep">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-faint">
          <p className="font-display text-base text-ink-muted">
            Lofo <span className="italic font-medium">校园寻物</span>
          </p>
          <p>© {new Date().getFullYear()} · 让每一件物品都找到回家的路</p>
        </div>
      </footer>
    </div>
  )
}

// 根组件：包裹认证 + 站点设置上下文
export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SettingsProvider>
  )
}
