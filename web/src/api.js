import axios from 'axios'

// 创建 axios 实例，基础路径为 /api，携带 cookie 凭证
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

/* ========== 认证相关 API ========== */

// 获取当前登录用户信息
export const fetchMe = () => api.get('/auth/me')

// 退出登录
export const logout = () => api.post('/auth/logout')

/* ========== 物品相关 API ========== */

// 获取物品列表（支持按类型、关键词、分页筛选）
export const fetchItems = (params) => api.get('/items', { params })

// 获取当前用户发布的物品列表（包含所有状态）
export const fetchMyItems = (params) => api.get('/items/my', { params })

// 获取单个物品详情
export const fetchItemById = (id) => api.get(`/items/${id}`)

// 发布新物品（multipart 表单，含图片上传）
export const createItem = (formData) =>
  api.post('/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// 编辑物品信息（JSON 格式）
export const updateItem = (id, data) => api.put(`/items/${id}`, data)

// 删除物品
export const deleteItem = (id) => api.delete(`/items/${id}`)

// 标记物品为已解决
export const resolveItem = (id) => api.post(`/items/${id}/resolve`)

/* ========== 审核相关 API ========== */

// 获取待审核物品列表
export const fetchPendingItems = (params) => api.get('/review/pending', { params })

// 审核通过
export const approveItem = (itemId) => api.post(`/review/${itemId}/approve`)

// 审核拒绝（需提供拒绝理由）
export const rejectItem = (itemId, reason) =>
  api.post(`/review/${itemId}/reject`, { reason })

/* ========== 管理员 API ========== */

// 获取用户列表
export const fetchUsers = (params) => api.get('/admin/users', { params })

// 修改用户角色
export const updateUserRole = (id, role) =>
  api.put(`/admin/users/${id}/role`, { role })

// 封禁/解封用户
export const updateUserBan = (id, isBanned) =>
  api.put(`/admin/users/${id}/ban`, { isBanned })

// 获取系统设置
export const fetchSettings = () => api.get('/admin/settings')

// 更新系统设置
export const updateSettings = (data) => api.put('/admin/settings', data)

// 上传主页顶部背景图
export const uploadHeroBackground = (file) =>
  api.post('/admin/settings/hero-bg', file, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// 清除主页顶部背景图
export const clearHeroBackground = () => api.delete('/admin/settings/hero-bg')

// 获取统计数据
export const fetchStats = () => api.get('/admin/stats')

// 获取 NapCat 连接状态
export const fetchNapCatStatus = () => api.get('/admin/napcat-status')

export default api
