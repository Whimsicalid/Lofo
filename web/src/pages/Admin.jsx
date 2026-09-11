import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import {
  fetchUsers,
  updateUserRole,
  updateUserBan,
  fetchSettings,
  updateSettings,
  fetchStats,
  fetchNapCatStatus,
  uploadHeroBackground,
  clearHeroBackground,
} from '../api'
import Pagination from '../components/Pagination'

// 管理后台
export default function Admin() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('users')

  const tabs = [
    { key: 'users', label: '用户管理' },
    { key: 'settings', label: '系统设置' },
    { key: 'stats', label: '统计概览' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-coral mb-2">Admin</p>
        <h1 className="font-display text-[2rem] font-semibold text-ink leading-tight">管理后台</h1>
        <p className="text-ink-muted mt-1.5 text-sm">用户、站点与运行状态的统一管理</p>
      </div>

      {/* 标签页 */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-line bg-white shadow-soft mb-8 overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-coral text-white shadow-soft'
                : 'text-ink-muted hover:text-ink hover:bg-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UserManagement currentUser={currentUser} />}
      {activeTab === 'settings' && <SystemSettings />}
      {activeTab === 'stats' && <StatsOverview />}
    </div>
  )
}

// 用户管理
function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pageSize = 20

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchUsers({ page, pageSize })
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
    } catch {
      setError('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleRoleChange = async (id, role) => {
    try {
      const res = await updateUserRole(id, role)
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data.user : u)))
    } catch {
      alert('修改角色失败')
    }
  }

  const handleBanToggle = async (u) => {
    try {
      const res = await updateUserBan(u.id, !u.is_banned)
      setUsers((prev) => prev.map((user) => (user.id === u.id ? res.data.user : user)))
    } catch {
      alert('操作失败')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-coral/15" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-coral animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3.5 text-coral">{error}</div>
    )
  }

  return (
    <div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-cream border-b border-line">
              <tr>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">ID</th>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">用户名</th>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">QQ</th>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">角色</th>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">状态</th>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">注册时间</th>
                <th className="px-4 py-3.5 text-left font-semibold text-ink-muted text-xs tracking-wide">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {users.map((u) => {
                const isSelf = currentUser && u.id === currentUser.id
                return (
                  <tr key={u.id} className="hover:bg-cream/60">
                    <td className="px-4 py-3 text-ink-faint">{u.id}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {u.username}
                      {isSelf && <span className="ml-2 text-xs text-coral">(我)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{u.qq}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={isSelf}
                        className="border border-line rounded-xl px-2.5 py-1.5 text-sm bg-white disabled:opacity-40 focus:border-coral/40"
                      >
                        <option value="user">普通用户</option>
                        <option value="reviewer">审核员</option>
                        <option value="admin">管理员</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          u.is_banned ? 'bg-coral-soft text-coral' : 'bg-moss-soft text-moss'
                        }`}
                      >
                        {u.is_banned ? '已封禁' : '正常'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleBanToggle(u)}
                        disabled={isSelf}
                        className={`text-sm font-medium px-3 py-1.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed ${
                          u.is_banned
                            ? 'text-moss hover:bg-moss-soft'
                            : 'text-coral hover:bg-coral-soft'
                        }`}
                      >
                        {u.is_banned ? '解封' : '封禁'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />

      {users.length === 0 && !loading && (
        <div className="text-center py-14 text-ink-faint">暂无用户</div>
      )}
    </div>
  )
}

// 系统设置
function SystemSettings() {
  const { refreshSettings } = useSettings()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [napCatStatus, setNapCatStatus] = useState({ connected: false, clients: 0, port: null })
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroMsg, setHeroMsg] = useState(null) // { type: 'ok'|'err', text }
  const heroInputRef = useRef(null)

  useEffect(() => {
    fetchSettings()
      .then((res) => {
        setSettings(res.data.settings)
      })
      .catch(() => {
        setError('加载设置失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const loadStatus = () => {
      fetchNapCatStatus()
        .then((res) => setNapCatStatus(res.data || { connected: false, clients: 0, port: null }))
        .catch(() => setNapCatStatus({ connected: false, clients: 0, port: null }))
    }
    loadStatus()
    const timer = setInterval(loadStatus, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await updateSettings(settings)
      setSettings(res.data.settings)
      setSuccess(true)
      await refreshSettings()
    } catch {
      setError('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 上传主页背景图
  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroUploading(true)
    setHeroMsg(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await uploadHeroBackground(fd)
      setSettings((prev) => ({ ...prev, ...res.data.settings }))
      setHeroMsg({ type: 'ok', text: '背景图已更新' })
      await refreshSettings()
    } catch (err) {
      setHeroMsg({ type: 'err', text: err.response?.data?.error || '上传失败，请重试' })
    } finally {
      setHeroUploading(false)
      if (heroInputRef.current) heroInputRef.current.value = ''
    }
  }

  // 清除背景图
  const handleHeroClear = async () => {
    if (!confirm('确定清除主页背景图吗？将回退为默认渐变背景。')) return
    setHeroUploading(true)
    setHeroMsg(null)
    try {
      const res = await clearHeroBackground()
      setSettings((prev) => ({ ...prev, ...res.data.settings }))
      setHeroMsg({ type: 'ok', text: '已清除，正在使用默认背景' })
      await refreshSettings()
    } catch (err) {
      setHeroMsg({ type: 'err', text: err.response?.data?.error || '操作失败' })
    } finally {
      setHeroUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-coral/15" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-coral animate-spin" />
        </div>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3.5 text-coral">{error}</div>
    )
  }

  const heroImage = settings?.hero_bg_image || ''

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3.5 text-coral text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-[#C8E0D4] bg-moss-soft px-4 py-3.5 text-moss text-sm">
          设置已保存
        </div>
      )}

      {/* 主页顶部背景图 */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">主页顶部背景图</h3>
          <p className="text-xs text-ink-faint mt-1">
            展示在首页 Hero 区域。建议尺寸 ≥ 1600×600，横图效果最佳，不超过 10MB。
          </p>
        </div>

        {/* 预览 */}
        <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-line mb-4 bg-cream-deep">
          {heroImage ? (
            <img src={heroImage} alt="主页背景预览" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(224,90,57,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(61,122,90,0.1),transparent_50%),linear-gradient(180deg,#FAF7F2,#F5EDE3)] flex items-center justify-center">
              <span className="text-xs text-ink-faint">当前使用默认渐变背景</span>
            </div>
          )}
          {heroImage && (
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent flex items-end p-4">
              <span className="text-white/80 text-xs backdrop-blur-sm bg-ink/20 rounded-full px-2.5 py-1">
                已设置自定义背景
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => heroInputRef.current?.click()}
            disabled={heroUploading}
            className="btn-primary !py-2 !px-4 !text-sm"
          >
            {heroUploading ? '处理中…' : heroImage ? '更换背景图' : '上传背景图'}
          </button>
          {heroImage && (
            <button
              type="button"
              onClick={handleHeroClear}
              disabled={heroUploading}
              className="btn-ghost !py-2 !px-4 !text-sm !border-coral/30 !text-coral hover:!bg-coral-soft"
            >
              清除并使用默认
            </button>
          )}
          <input
            ref={heroInputRef}
            type="file"
            accept="image/*"
            onChange={handleHeroUpload}
            className="hidden"
          />
        </div>

        {heroMsg && (
          <p
            className={`mt-3 text-sm ${
              heroMsg.type === 'ok' ? 'text-moss' : 'text-coral'
            }`}
          >
            {heroMsg.text}
          </p>
        )}
      </section>

      {/* NapCat 状态 */}
      <section className="rounded-2xl border border-line bg-cream p-5">
        <div className="flex items-center gap-3">
          <span className="relative flex w-3 h-3">
            {napCatStatus.connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-moss opacity-60"></span>
            )}
            <span
              className={`relative inline-flex rounded-full w-3 h-3 ${
                napCatStatus.connected ? 'bg-moss' : 'bg-coral'
              }`}
            ></span>
          </span>
          <span className="text-sm font-semibold text-ink">
            NapCat 连接状态：
            {napCatStatus.connected
              ? `已连接（${napCatStatus.clients} 个客户端）`
              : '未连接'}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-faint leading-relaxed">
          {napCatStatus.connected
            ? `NapCat 已通过 WebSocket 客户端方式连接到本服务端口 ${napCatStatus.port}，新提交审核通知将实时推送到 QQ 群。`
            : `NapCat 尚未连接。请在 NapCat 网络配置中新建「WebSocket 客户端」，地址填写 ${window.location.hostname}:${settings?.napcat_ws_port || 3002}（后端启动端口）。`}
        </p>
      </section>

      {/* NapCat 端口 */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">NapCat 连接端口</label>
        <input
          type="number"
          min="1"
          max="65535"
          placeholder="3002"
          value={settings?.napcat_ws_port || ''}
          onChange={(e) => handleChange('napcat_ws_port', e.target.value)}
          className="input-base"
        />
        <p className="mt-1.5 text-xs text-ink-faint leading-relaxed">
          本服务监听该端口，等待 NapCat 以「WebSocket 客户端」方式主动连接。修改端口并保存后需重启后端生效。仅此一种连接方式。
        </p>
      </div>

      {/* Token */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">NapCat Token</label>
        <input
          type="text"
          value={settings?.napcat_token || ''}
          onChange={(e) => handleChange('napcat_token', e.target.value)}
          className="input-base"
        />
      </div>

      {/* 群号 */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">通知 QQ 群号</label>
        <input
          type="text"
          value={settings?.napcat_qq_group || ''}
          onChange={(e) => handleChange('napcat_qq_group', e.target.value)}
          className="input-base"
        />
      </div>

      {/* 站点名称 */}
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">站点名称</label>
        <input
          type="text"
          value={settings?.site_name || ''}
          onChange={(e) => handleChange('site_name', e.target.value)}
          className="input-base"
        />
        <p className="mt-1.5 text-xs text-ink-faint">显示在导航栏左侧 Logo 旁，保存后立即生效。</p>
      </div>

      {/* 审核开关 */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">发布需要审核</p>
          <p className="text-xs text-ink-faint mt-0.5">开启后，新发布内容需审核通过才会展示</p>
        </div>
        <button
          type="button"
          onClick={() => handleChange('require_review', settings?.require_review === 'true' ? 'false' : 'true')}
          className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
            settings?.require_review === 'true' ? 'bg-coral' : 'bg-line'
          }`}
          aria-pressed={settings?.require_review === 'true'}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
              settings?.require_review === 'true' ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <button type="submit" disabled={saving} className="btn-primary !px-8 !py-3">
        {saving ? '保存中…' : '保存设置'}
      </button>
    </form>
  )
}

// 统计概览
function StatsOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
      .then((res) => {
        setStats(res.data)
      })
      .catch(() => {
        setError('加载统计数据失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-coral/15" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-coral animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3.5 text-coral">{error}</div>
    )
  }

  const cards = [
    {
      label: '总用户数',
      value: stats?.totalUsers ?? 0,
      hint: '注册成员',
      accent: 'text-coral',
      bg: 'bg-coral-soft',
    },
    {
      label: '总物品数',
      value: stats?.totalItems ?? 0,
      hint: '全部记录',
      accent: 'text-ink',
      bg: 'bg-cream',
    },
    {
      label: '待审核',
      value: stats?.pendingItems ?? 0,
      hint: '等待处理',
      accent: 'text-[#B45309]',
      bg: 'bg-amber-soft',
    },
    {
      label: '已通过',
      value: stats?.approvedItems ?? 0,
      hint: '展示中',
      accent: 'text-moss',
      bg: 'bg-moss-soft',
    },
    {
      label: '已解决',
      value: stats?.resolvedItems ?? 0,
      hint: '已结案',
      accent: 'text-[#0369A1]',
      bg: 'bg-[#E0F2FE]',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl p-6 border border-line/60 ${card.bg}`}>
          <p className={`font-display text-4xl font-semibold ${card.accent} leading-none mb-2`}>
            {card.value}
          </p>
          <p className="text-sm font-semibold text-ink">{card.label}</p>
          <p className="text-xs text-ink-faint mt-0.5">{card.hint}</p>
        </div>
      ))}
    </div>
  )
}
