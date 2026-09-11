// NapCat（OneBot 11）QQ 群消息通知模块
// 连接方式：Lofo 作为 WebSocket 服务器，NapCat 通过「WebSocket 客户端」模式主动连接
// 仅支持此一种连接方式（无 HTTP 回退）
import { WebSocketServer, WebSocket as WS } from 'ws';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import {
  getAllSettings,
  getUserByQq,
  getItemById,
  setItemStatus,
  createReviewLog,
  saveReviewNotifyMessage,
  getItemIdByReviewMessageId,
} from './db.js';

// WebSocket 服务器实例（进程内单例）
let wss = null;
let currentPort = null;
const pendingCalls = new Map(); // echo -> { resolve, reject, timer }

// 根据配置启动（或重建）WebSocket 服务器
function ensureServer() {
  const settings = getAllSettings();
  const port = parseInt(settings.napcat_ws_port, 10) || 3002;

  // 端口未变化且服务器正常，直接复用
  if (wss && currentPort === port) return;

  // 关闭旧服务器（并断开已有客户端）
  if (wss) {
    for (const client of wss.clients) {
      try { client.terminate(); } catch { /* ignore */ }
    }
    try { wss.close(); } catch { /* ignore */ }
    wss = null;
  }
  currentPort = null;

  const server = new WebSocketServer({ port, host: '0.0.0.0' });
  wss = server;
  currentPort = port;
  console.log(`[NapCat] WebSocket 服务器启动中: ws://0.0.0.0:${port}`);

  server.on('connection', (socket, request) => {
    // 鉴权：校验 Authorization: Bearer <token>（未配置 Token 则不校验）
    const token = getAllSettings().napcat_token;
    if (token) {
      const auth = request.headers.authorization || '';
      if (auth !== `Bearer ${token}`) {
        console.log('[NapCat] 拒绝未授权的 WebSocket 连接');
        socket.close(4001, 'unauthorized');
        return;
      }
    }

    console.log('[NapCat] WebSocket 客户端已连接');
    socket.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      // OneBot 事件主动推送（如群消息），交给事件处理器
      if (msg && msg.post_type) {
        handleOneBotEvent(msg);
        return;
      }

      // 匹配 API 调用响应（根据 echo 定位）
      if (msg && msg.echo && pendingCalls.has(msg.echo)) {
        const call = pendingCalls.get(msg.echo);
        pendingCalls.delete(msg.echo);
        clearTimeout(call.timer);
        if (msg.status === 'ok' || msg.retcode === 0) {
          call.resolve(msg.data);
        } else {
          call.reject(new Error(msg.message || msg.wording || `错误码 ${msg.retcode}`));
        }
      }
    });

    socket.on('close', () => {
      console.log('[NapCat] WebSocket 客户端已断开');
    });

    socket.on('error', (err) => {
      console.error('[NapCat] WebSocket 客户端错误:', err.message);
    });
  });

  server.on('listening', () => {
    console.log(`[NapCat] WebSocket 服务器已监听端口 ${port}`);
  });

  server.on('error', (err) => {
    console.error('[NapCat] WebSocket 服务器错误:', err.message);
  });
}

// 通过 WebSocket 调用 OneBot 11 API
function callApi(action, params) {
  return new Promise((resolve, reject) => {
    ensureServer();
    const clients = wss
      ? [...wss.clients].filter((c) => c.readyState === WS.OPEN)
      : [];
    if (clients.length === 0) {
      reject(new Error('NapCat 未连接'));
      return;
    }

    const echo = `lofo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timer = setTimeout(() => {
      pendingCalls.delete(echo);
      reject(new Error(`调用 ${action} 超时`));
    }, 15000);

    pendingCalls.set(echo, { resolve, reject, timer });
    clients[0].send(JSON.stringify({ action, params, echo }));
  });
}

// 发送 QQ 群消息
// groupId: 群号; message: 消息内容（字符串或 OneBot 消息段数组）
// 返回 send_group_msg 的响应数据（含 message_id）
export async function sendGroupMessage(groupId, message) {
  const settings = getAllSettings();
  const napcatQqGroup = settings.napcat_qq_group;

  // 未配置群号则跳过
  if (!napcatQqGroup) {
    console.log('[NapCat] 未配置通知群号，跳过消息发送');
    return null;
  }

  ensureServer();
  const clients = wss
    ? [...wss.clients].filter((c) => c.readyState === WS.OPEN)
    : [];
  if (clients.length === 0) {
    console.log('[NapCat] NapCat 未连接，跳过消息发送');
    return null;
  }

  const targetGroup = groupId || napcatQqGroup;
  const data = await callApi('send_group_msg', {
    group_id: Number(targetGroup),
    message,
  });
  console.log('[NapCat] 已通过 WebSocket 发送群消息');
  return data;
}

// 查询 NapCat 连接状态（供管理后台展示）
export function getNapCatStatus() {
  ensureServer();
  const clients = wss
    ? [...wss.clients].filter((c) => c.readyState === WS.OPEN)
    : [];
  return {
    connected: clients.length > 0,
    clients: clients.length,
    port: currentPort,
  };
}

// 启动 NapCat WebSocket 服务器（服务启动时调用）
export function startNapCatServer() {
  ensureServer();
}

// ==================== 事件处理（群内引用审核） ====================

// OneBot 事件统一入口
function handleOneBotEvent(msg) {
  // 群消息事件（可能为审核指令）
  if (msg.post_type === 'message' && msg.message_type === 'group') {
    // 异步处理，不影响 WebSocket 消息循环
    handleGroupReviewCommand(msg).catch((err) => {
      console.error('[NapCat] 群消息处理失败:', err.message);
    });
    return;
  }
  // 其他事件忽略（好友消息、通知、请求等）
}

// 群消息审核指令处理
// 规则：审核员引用通知消息并 @机器人，发送「过/通过」通过稿件，「拒/拒绝」打回稿件
async function handleGroupReviewCommand(msg) {
  const groupId = msg.group_id != null ? String(msg.group_id) : null;
  const senderId = msg.user_id != null ? String(msg.user_id) : null;
  if (!groupId || !senderId) return;

  // 提取文本内容（排除回复/at 段的附加信息）
  const segments = Array.isArray(msg.message) ? msg.message : [];
  const text = segments
    .filter((s) => s && s.type === 'text')
    .map((s) => (s.data && s.data.text) || '')
    .join('')
    .replace(/[\s\u3000]+/g, '');
  if (!/^(过|通过|拒|拒绝)$/.test(text)) return;

  // 必须引用了一条消息
  const replySeg = segments.find((s) => s && s.type === 'reply');
  if (!replySeg || !replySeg.data || !replySeg.data.id) return;

  // 必须 @ 了机器人（self_id 不可用时宽松为存在 @ 段）
  const ats = segments.filter((s) => s && s.type === 'at');
  const selfId = msg.self_id != null ? String(msg.self_id) : null;
  const atBot = selfId
    ? ats.some((s) => s.data && String(s.data.qq) === selfId)
    : ats.length > 0;
  if (!atBot) return;

  // 通过被引用的消息 id 找到稿件
  const messageId = String(replySeg.data.id);
  const itemId = getItemIdByReviewMessageId(messageId);
  if (!itemId) {
    await sendGroupMessage(groupId, replyText(senderId, '未找到对应的审核通知，请直接引用审核通知消息'));
    return;
  }

  const item = getItemById(itemId);
  if (!item || item.status !== 'pending') {
    await sendGroupMessage(groupId, replyText(senderId, '该稿件不存在或已被处理'));
    return;
  }

  // 校验审核人身份（QQ 需在 Lofo 中注册且为审核员/管理员）
  const reviewer = getUserByQq(senderId);
  if (!reviewer || !['admin', 'reviewer'].includes(reviewer.role)) {
    await sendGroupMessage(groupId, replyText(senderId, '你不在 Lofo 审核员名单中，无审核权限'));
    return;
  }

  // 执行审核
  const approve = /^(过|通过)$/.test(text);
  const action = approve ? 'approved' : 'rejected';
  setItemStatus(itemId, action);
  createReviewLog({
    item_id: itemId,
    reviewer_id: reviewer.id,
    action,
    reason: approve ? null : 'QQ 群内打回',
  });

  const resultText = approve
    ? `已通过稿件 #${itemId}《${item.title}》`
    : `已打回稿件 #${itemId}《${item.title}》`;
  await sendGroupMessage(groupId, replyText(senderId, resultText));
}

// 构造 @某人 的回复消息段
function replyText(qq, text) {
  return [
    { type: 'at', data: { qq } },
    { type: 'text', data: { text: ` ${text}` } },
  ];
}

// ==================== 通知群内新提交 ====================

// 将本地图片转为 OneBot base64 消息段（Docker 内 NapCat 无法读宿主机路径）
function imageSegment(item) {
  if (!item.image_path) return null;
  const localFile = path.join(config.uploadDir, path.basename(item.image_path));
  try {
    if (fs.existsSync(localFile)) {
      const buf = fs.readFileSync(localFile);
      return {
        type: 'image',
        data: { file: `base64://${buf.toString('base64')}` },
      };
    }
  } catch { /* 读文件失败则回退 URL */ }
  return {
    type: 'image',
    data: { file: `${config.frontendUrl}${item.image_path}` },
  };
}

// 通知群内有新提交的物品
// item: 物品信息; user: 提交用户信息
export async function notifyNewSubmission(item, user) {
  try {
    if (!item) return;

    const typeLabel = item.type === 'lost' ? '【寻物启事】' : '【失物招领】';

    const text =
      `${typeLabel} 有新的待审核提交\n` +
      `━━━━━━━━━━━━━━━\n` +
      `编号：#${item.id}\n` +
      `标题：${item.title}\n` +
      `地点：${item.location || '未填写'}\n` +
      `描述：${item.description || '未填写'}\n` +
      `提交人：${user.username || '未知'}${user.qq ? `（${user.qq}）` : ''}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `审核员请在本条消息下回复并 @我：\n` +
      `「通过」= 通过稿件　「拒绝」= 打回稿件`;

    const message = [{ type: 'text', data: { text } }];
    const img = imageSegment(item);
    if (img) message.push(img);

    const data = await sendGroupMessage(null, message);

    // 记录群消息 id -> 稿件 id 映射，供群内引用审核
    if (data && data.message_id) {
      const groupId = getAllSettings().napcat_qq_group;
      saveReviewNotifyMessage({
        message_id: String(data.message_id),
        item_id: item.id,
        group_id: groupId || null,
      });
    }
    console.log('[NapCat] 新提交通知已发送');
  } catch (error) {
    // 捕获错误但不会中断请求流程
    console.error('[NapCat] 发送通知失败:', error.message);
  }
}

export default { sendGroupMessage, notifyNewSubmission };