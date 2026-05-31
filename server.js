/* ==========================================================
   智慧家园 · 小区业委会小程序 - 后端服务
   功能：静态文件服务 + REST API + 数据持久化 + 飞书通知
   ========================================================== */

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;

// ===== 数据目录 =====
const DATA_DIR = path.join(__dirname, 'data');
const LOG_DIR = path.join(__dirname, 'logs');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CHANGES_FILE = path.join(DATA_DIR, 'changes.jsonl');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ===== 中间件 =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`;
    fs.appendFileSync(path.join(LOG_DIR, 'access.log'), log + '\n');
  });
  next();
});

// ===== 数据持久化 =====

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('读取数据文件失败:', e.message);
  }
  return null;
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function logChange(type, action, detail) {
  const entry = JSON.stringify({
    time: Date.now(),
    timeStr: new Date().toLocaleString('zh-CN', { hour12: false }),
    type,
    action,
    detail
  }) + '\n';
  fs.appendFileSync(CHANGES_FILE, entry);
}

// 初始化种子数据
function seedDB() {
  const now = Date.now();
  const db = {
    announcements: [
      { id: 'a1', title: '📢 关于小区停车位改造的通知', content: '各位业主：经业委会研究决定，将于本月启动地下车库停车位智能化改造工程。改造期间部分车位暂停使用，请您配合。\n\n改造工期预计15天。如有疑问可联系业委会王主任：138****5678。', important: true, pinned: true, createdAt: now - 3600000 },
      { id: 'a2', title: '物业费缴纳提醒', content: '2026年第二季度物业费已开始收缴，请各位业主在6月30日前完成缴纳。支持线上支付和物业中心现场缴纳。', important: false, pinned: false, createdAt: now - 86400000 * 2 }
    ],
    elections: [
      { id: 'e1', title: '第三届业委会委员选举', desc: '本次选举将产生7名业委会委员，任期3年。请各位业主积极行使投票权。\n\n投票时间：2026年6月1日-6月15日', candidates: [
        { name: '张建国', desc: '退休干部，热心社区事务', votes: 128 },
        { name: '李明华', desc: '律师，擅长物业管理法规', votes: 95 },
        { name: '王芳', desc: '企业高管，财务管理经验', votes: 142 }
      ], startDate: now, endDate: now + 86400000 * 14, status: 'active', createdAt: now - 86400000 * 2 },
      { id: 'e2', title: '业主代表推选', desc: '每栋楼推选1名业主代表，参与小区重大事项决策。', candidates: [
        { name: '刘伟', desc: '1号楼业主', votes: 45 },
        { name: '陈静', desc: '3号楼业主', votes: 38 }
      ], startDate: now - 86400000 * 30, endDate: now - 86400000 * 16, status: 'closed', createdAt: now - 86400000 * 35 }
    ],
    fundraisings: [
      { id: 'f1', title: '小区外墙维修诉讼集资', desc: '开发商交付的外墙存在严重质量问题，多处渗水脱落。业委会决定通过法律途径维权，诉讼费用预算约8万元。\n\n已聘请专业律师团队，胜诉后可追偿。', target: 80000, current: 32500, donors: [
        { name: '3栋-张先生', amount: 2000, msg: '支持维权！', date: now - 86400000 * 3 },
        { name: '5栋-李女士', amount: 5000, msg: '我家也漏水，坚决支持', date: now - 86400000 * 5 },
        { name: '1栋-匿名业主', amount: 1000, msg: '加油！', date: now - 86400000 * 7 }
      ], status: 'active', createdAt: now - 86400000 * 10 }
    ],
    infos: [
      { id: 'i1', title: '小区周边便民服务指南', content: '一、社区卫生服务站：东门出口左转100米，电话：025-****2345\n二、菜鸟驿站：北门旁，营业时间8:00-21:00\n三、附近超市：华联超市（南门对面）', category: '生活服务', author: '业委会', createdAt: now - 86400000 * 5, views: 156 },
      { id: 'i2', title: '垃圾分类新规解读', content: '自7月1日起，小区将实行垃圾分类新标准：\n1. 厨余垃圾请破袋投放\n2. 有害垃圾请投放至红色垃圾桶\n3. 可回收物请分类打包', category: '通知', author: '物业中心', createdAt: now - 86400000 * 3, views: 89 }
    ],
    messages: [
      { id: 'm1', author: '3栋-刘姐', content: '楼下广场舞声音太大，建议业委会协调一下时间', replies: [
        { author: '业委会小王', content: '已和舞蹈队沟通，结束时间调整到20:30', date: now - 86400000 * 2 }
      ], createdAt: now - 86400000 * 3 },
      { id: 'm2', author: '5栋-老孙', content: '建议小区增加电动车充电桩，现在太少了', replies: [], createdAt: now - 86400000 }
    ],
    adminPassword: '123456'
  };
  saveDB(db);
  return db;
}

// 启动时加载或初始化数据
let db = loadDB() || seedDB();
console.log(`📦 数据已加载 (公告:${db.announcements.length}, 投票:${db.elections.length}, 集资:${db.fundraisings.length}, 信息:${db.infos.length}, 留言:${db.messages.length})`);

// ===== 飞书通知配置 =====
const FEISHU_CONFIG_FILE = path.join(DATA_DIR, 'feishu_config.json');
function getFeishuConfig() {
  try {
    if (fs.existsSync(FEISHU_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(FEISHU_CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return { webhookUrl: '', enabled: true, largeDonationThreshold: 500 };
}

function saveFeishuConfig(config) {
  fs.writeFileSync(FEISHU_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// 发送飞书通知（消息卡片）
async function sendFeishuNotification(title, content, options = {}) {
  const config = getFeishuConfig();
  if (!config.enabled || !config.webhookUrl) {
    return { success: false, reason: 'webhook未配置' };
  }

  const color = options.color || 'blue';
  const ts = new Date().toLocaleString('zh-CN', { hour12: false });

  const payload = {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: title },
        template: color
      },
      elements: [
        { tag: 'markdown', content },
        { tag: 'note', elements: [{ tag: 'plain_text', content: `🏠 智慧家园 · ${ts}` }] }
      ]
    }
  };

  try {
    const axios = require('axios');
    const resp = await axios.post(config.webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    if (resp.data && resp.data.code === 0) {
      console.log(`✅ 飞书通知发送成功: ${title}`);
      return { success: true };
    } else {
      console.error(`❌ 飞书通知发送失败:`, resp.data);
      return { success: false, error: resp.data?.msg || '未知错误' };
    }
  } catch (e) {
    console.error(`❌ 飞书通知网络错误:`, e.message);
    return { success: false, error: e.message };
  }
}

// ===== API 路由 =====

// ---- 健康检查 ----
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- 全量数据同步 ----
app.get('/api/data', (req, res) => {
  res.json(db);
});

app.post('/api/data/sync', (req, res) => {
  const clientData = req.body;
  if (!clientData) return res.status(400).json({ error: '无效数据' });

  // 合并数据 - 优先取服务端已有数据，补充客户端新增数据
  ['announcements', 'elections', 'fundraisings', 'infos', 'messages'].forEach(key => {
    if (clientData[key] && Array.isArray(clientData[key])) {
      const serverIds = new Set(db[key].map(i => i.id));
      const newItems = clientData[key].filter(i => !serverIds.has(i.id));
      if (newItems.length > 0) {
        // 合并去重
        const merged = [...db[key]];
        newItems.forEach(item => {
          merged.push(item);
        });
        db[key] = merged;
        // 记录变化
        newItems.forEach(item => logChange(key, 'sync', item.title || item.name || item.id));
      }
    }
  });

  saveDB(db);
  res.json({ success: true, synced: true });
});

// ---- 公告 ----
app.get('/api/announcements', (req, res) => {
  const list = [...db.announcements].sort((a, b) => b.pinned - a.pinned || b.createdAt - a.createdAt);
  res.json(list);
});

app.post('/api/announcements', async (req, res) => {
  const { title, content, important } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const item = { id: 'a' + Date.now(), title, content, important: !!important, pinned: false, createdAt: Date.now() };
  db.announcements.unshift(item);
  saveDB(db);
  logChange('announcement', 'create', title);

  // 发飞书通知
  const notifyResult = await sendFeishuNotification(
    '📢 新公告发布',
    `**${title}**\n\n👉 http://localhost:${PORT}`,
    { color: 'blue' }
  );

  res.json({ success: true, item, notifyResult });
});

app.delete('/api/announcements/:id', (req, res) => {
  const item = db.announcements.find(a => a.id === req.params.id);
  db.announcements = db.announcements.filter(a => a.id !== req.params.id);
  saveDB(db);
  if (item) logChange('announcement', 'delete', item.title);
  res.json({ success: true });
});

app.post('/api/announcements/:id/toggle-pin', (req, res) => {
  const item = db.announcements.find(a => a.id === req.params.id);
  if (item) { item.pinned = !item.pinned; saveDB(db); }
  res.json({ success: true, pinned: item?.pinned });
});

// ---- 投票 ----
app.get('/api/elections', (req, res) => {
  const now = Date.now();
  db.elections.forEach(e => {
    if (e.status === 'active' && now > e.endDate) e.status = 'closed';
  });
  res.json([...db.elections].sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/elections', async (req, res) => {
  const { title, desc, candidates, endDays } = req.body;
  if (!title || !candidates || !candidates.length) return res.status(400).json({ error: '参数不完整' });
  const now = Date.now();
  const item = {
    id: 'e' + Date.now(), title, desc: desc || '',
    candidates: candidates.map(c => typeof c === 'string' ? { name: c, desc: '', votes: 0 } : c),
    startDate: now, endDate: now + (endDays || 14) * 86400000,
    status: 'active', createdAt: now
  };
  db.elections.push(item);
  saveDB(db);
  logChange('election', 'create', title);

  const notifyResult = await sendFeishuNotification(
    '🗳️ 新投票活动',
    `**${title}**\n\n候选人：${item.candidates.length}位\n截止日期：${new Date(item.endDate).toLocaleDateString('zh-CN')}\n\n👉 请各位业主积极投票`,
    { color: 'indigo' }
  );

  res.json({ success: true, item, notifyResult });
});

app.post('/api/elections/:id/vote', (req, res) => {
  const { candidateIndex } = req.body;
  const election = db.elections.find(e => e.id === req.params.id);
  if (!election || election.status !== 'active') return res.status(400).json({ error: '投票不可用' });
  election.candidates[candidateIndex].votes++;
  saveDB(db);
  logChange('election', 'vote', `${election.title} - ${election.candidates[candidateIndex].name}`);
  res.json({ success: true });
});

// ---- 集资 ----
app.get('/api/fundraisings', (req, res) => {
  res.json([...db.fundraisings].sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/fundraisings', async (req, res) => {
  const { title, desc, target } = req.body;
  if (!title || !target) return res.status(400).json({ error: '参数不完整' });
  const item = {
    id: 'f' + Date.now(), title, desc: desc || '',
    target: Number(target), current: 0,
    donors: [], status: 'active', createdAt: Date.now()
  };
  db.fundraisings.push(item);
  saveDB(db);
  logChange('fundraising', 'create', title);

  const notifyResult = await sendFeishuNotification(
    '💰 新集资项目',
    `**${title}**\n\n目标金额：¥${Number(target).toLocaleString()}\n\n说明：${(desc || '无').substring(0, 100)}`,
    { color: 'green' }
  );

  res.json({ success: true, item, notifyResult });
});

app.post('/api/fundraisings/:id/donate', async (req, res) => {
  const { name, amount, msg } = req.body;
  const fund = db.fundraisings.find(f => f.id === req.params.id);
  if (!fund || fund.status !== 'active') return res.status(400).json({ error: '集资不可用' });
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: '金额无效' });
  fund.current += amt;
  fund.donors.push({ name, amount: amt, msg: msg || '', date: Date.now() });
  if (fund.current >= fund.target) fund.status = 'completed';
  saveDB(db);
  logChange('fundraising', 'donate', `${fund.title} - ${name} ¥${amt}`);

  // 大额捐款通知
  const config = getFeishuConfig();
  let notifyResult = null;
  if (amt >= config.largeDonationThreshold) {
    notifyResult = await sendFeishuNotification(
      '💛 大额捐款提醒',
      `项目：**${fund.title}**\n\n捐款人：${name}\n金额：¥${amt.toLocaleString()}\n${msg ? `留言：${msg}` : ''}`,
      { color: 'green' }
    );
  }

  res.json({ success: true, fund, notifyResult });
});

app.post('/api/fundraisings/:id/close', (req, res) => {
  const fund = db.fundraisings.find(f => f.id === req.params.id);
  if (fund) { fund.status = 'cancelled'; saveDB(db); }
  res.json({ success: true });
});

// ---- 信息发布 ----
app.get('/api/infos', (req, res) => {
  res.json([...db.infos].sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/infos', (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: '参数不完整' });
  const item = { id: 'i' + Date.now(), title, content, category: category || '其他', author: '业委会', createdAt: Date.now(), views: 0 };
  db.infos.unshift(item);
  saveDB(db);
  logChange('info', 'create', title);
  res.json({ success: true, item });
});

app.post('/api/infos/:id/view', (req, res) => {
  const info = db.infos.find(i => i.id === req.params.id);
  if (info) { info.views++; saveDB(db); }
  res.json({ success: true });
});

// ---- 留言板 ----
app.get('/api/messages', (req, res) => {
  res.json([...db.messages].sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/messages', async (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) return res.status(400).json({ error: '参数不完整' });
  const item = { id: 'm' + Date.now(), author, content, replies: [], createdAt: Date.now() };
  db.messages.unshift(item);
  saveDB(db);
  logChange('message', 'create', `${author}: ${content.substring(0, 50)}`);

  const notifyResult = await sendFeishuNotification(
    '💬 新业主留言',
    `留言人：**${author}**\n\n${content.substring(0, 80)}`,
    { color: 'purple' }
  );

  res.json({ success: true, item, notifyResult });
});

app.post('/api/messages/:id/reply', (req, res) => {
  const { author, content } = req.body;
  const msg = db.messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(400).json({ error: '留言不存在' });
  msg.replies.push({ author, content, date: Date.now() });
  saveDB(db);
  res.json({ success: true });
});

// ---- 飞书通知配置 ----
app.get('/api/feishu/config', (req, res) => {
  const config = getFeishuConfig();
  res.json(config);
});

app.post('/api/feishu/config', (req, res) => {
  const { webhookUrl, enabled, largeDonationThreshold } = req.body;
  const config = getFeishuConfig();
  if (webhookUrl !== undefined) config.webhookUrl = webhookUrl;
  if (enabled !== undefined) config.enabled = enabled;
  if (largeDonationThreshold !== undefined) config.largeDonationThreshold = largeDonationThreshold;
  saveFeishuConfig(config);
  res.json({ success: true, config });
});

app.post('/api/feishu/test', async (req, res) => {
  const result = await sendFeishuNotification(
    '✅ 飞书通知连接测试',
    `通知服务已成功接入！🎉\n\n系统版本：智慧家园 v2.0\n时间：${new Date().toLocaleString('zh-CN', { hour12: false })}\n\n💡 后续有新公告、投票、集资、留言时，会自动推送到此群`,
    { color: 'green' }
  );
  res.json(result);
});

// ---- 变化日志（供AI监控使用） ----
app.get('/api/changes', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since) : 0;
  try {
    if (!fs.existsSync(CHANGES_FILE)) return res.json([]);
    const content = fs.readFileSync(CHANGES_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const changes = lines.map(l => JSON.parse(l)).filter(c => c.time > since);
    res.json(changes);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/changes/clear', (req, res) => {
  fs.writeFileSync(CHANGES_FILE, '');
  res.json({ success: true });
});

// ---- 密码管理 ----
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === db.adminPassword) {
    res.json({ success: true });
  } else {
    res.json({ success: false, error: '密码错误' });
  }
});

app.post('/api/admin/password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (oldPassword !== db.adminPassword) return res.json({ success: false, error: '当前密码错误' });
  db.adminPassword = newPassword;
  saveDB(db);
  res.json({ success: true });
});

// ===== 静态文件服务 =====
app.use(express.static(path.join(__dirname)));

// ===== 启动服务 =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  🏠 智慧家园 · 小区业委会小程序`);
  console.log(`  📍 http://localhost:${PORT}`);
  console.log(`  📡 API:  http://localhost:${PORT}/api`);
  console.log(`  🔑 管理密码: 123456`);
  console.log(`========================================\n`);
});
