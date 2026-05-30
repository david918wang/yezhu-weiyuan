/* ==========================================================
   业委会小区小程序 - 主应用逻辑 (App)
   ========================================================== */

const App = {
  activeTab: 'home',
  currentDetail: null,

  init() {
    Store.init();
    Store.checkElectionStatus();
    FeishuNotifier.init();
    this.bindEvents();
    this.switchTab('home');
    this.updateAdminUI();
  },

  // ===== Tab Switching =====
  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + tab));
    this.renderPage(tab);
    this.closeDetail();
    document.querySelector('.app-content').scrollTop = 0;
  },

  renderPage(tab) {
    switch(tab) {
      case 'home': this.renderHome(); break;
      case 'vote': this.renderVote(); break;
      case 'fund': this.renderFund(); break;
      case 'info': this.renderInfo(); break;
      case 'board': this.renderBoard(); break;
    }
  },

  // ===== Toast =====
  toast(msg, duration = 2000) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration);
  },

  // ===== Modal =====
  showModal(title, html, wide) {
    let overlay = document.querySelector('.modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="App.hideModal()">✕</button>
        <div class="modal-title">${title}</div>
        <div class="modal-body">${html}</div>
      </div>`;
    overlay.classList.add('show');
  },

  hideModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.classList.remove('show');
  },

  // ===== Detail View =====
  showDetail(title, html) {
    let detail = document.querySelector('.detail-view');
    if (!detail) {
      detail = document.createElement('div');
      detail.className = 'detail-view';
      document.body.appendChild(detail);
    }
    detail.innerHTML = `
      <div class="detail-header">
        <button class="detail-back" onclick="App.closeDetail()">‹</button>
        <div class="detail-title">${title}</div>
      </div>
      <div class="detail-content">${html}</div>`;
    detail.classList.add('show');
  },

  closeDetail() {
    const detail = document.querySelector('.detail-view');
    if (detail) detail.classList.remove('show');
  },

  // ===== Admin =====
  updateAdminUI() {
    const isAdmin = Store.isAdmin();
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
    const btn = document.getElementById('adminToggle');
    if (btn) btn.textContent = isAdmin ? '退出管理' : '管理';
    const badge = document.querySelector('.admin-badge');
    if (badge) badge.style.display = isAdmin ? '' : 'none';
    // 管理按钮组
    let pwdBtn = document.getElementById('changePwdBtn');
    let feishuBtn = document.getElementById('feishuSettingsBtn');
    if (isAdmin) {
      const container = document.querySelector('.header-actions');
      if (container) {
        if (!feishuBtn) {
          const el = document.createElement('button');
          el.id = 'feishuSettingsBtn'; el.textContent = '📨飞书';
          el.style.fontSize = '11px'; el.onclick = () => App.showFeishuSettings();
          container.appendChild(el);
        }
        if (!pwdBtn) {
          const el = document.createElement('button');
          el.id = 'changePwdBtn'; el.textContent = '🔐改密';
          el.style.fontSize = '11px'; el.onclick = () => App.showChangePassword();
          container.appendChild(el);
        }
        // 云存储按钮
        if (!document.getElementById('cloudSettingsBtn')) {
          const el = document.createElement('button');
          el.id = 'cloudSettingsBtn'; el.textContent = '☁️云';
          el.style.fontSize = '11px'; el.onclick = () => App.showCloudSettings();
          container.appendChild(el);
        }
      }
    } else {
      if (pwdBtn) pwdBtn.remove();
      if (feishuBtn) feishuBtn.remove();
      const cloudBtn = document.getElementById('cloudSettingsBtn');
      if (cloudBtn) cloudBtn.remove();
    }
  },

  toggleAdminMode() {
    if (Store.isAdmin()) {
      // 已登录 -> 退出
      Store.logoutAdmin();
      this.updateAdminUI();
      this.renderPage(this.activeTab);
      this.toast('已退出管理模式');
    } else {
      // 未登录 -> 弹出登录框
      this.showAdminLogin();
    }
  },

  showAdminLogin() {
    this.showModal('🔐 管理员登录', `
      <div style="text-align:center;margin-bottom:12px;color:#6b7280;font-size:13px">请输入管理密码以进入后台管理</div>
      <div class="form-group">
        <label class="form-label">管理密码</label>
        <input class="form-input" id="adminPwdInput" type="password" placeholder="请输入密码" autocomplete="off" style="-webkit-text-security:disc">
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitAdminLogin()">确认登录</button>
      <div style="text-align:center;margin-top:8px;font-size:12px;color:#9ca3af">默认密码：123456（登录后可修改）</div>
    `);
    // 自动聚焦
    setTimeout(() => {
      const inp = document.getElementById('adminPwdInput');
      if (inp) inp.focus();
    }, 300);
    // 回车提交
    setTimeout(() => {
      const inp = document.getElementById('adminPwdInput');
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') App.submitAdminLogin(); });
    }, 300);
  },

  submitAdminLogin() {
    const pwd = document.getElementById('adminPwdInput').value;
    if (!pwd) return this.toast('请输入密码');
    if (Store.loginAdmin(pwd)) {
      this.hideModal();
      this.updateAdminUI();
      this.renderPage(this.activeTab);
      this.toast('✅ 登录成功，欢迎进入管理后台');
    } else {
      this.toast('❌ 密码错误，请重试');
    }
  },

  showChangePassword() {
    this.showModal('🔑 修改管理密码', `
      <div class="form-group">
        <label class="form-label">当前密码</label>
        <input class="form-input" id="oldPwd" type="password" placeholder="输入当前密码">
      </div>
      <div class="form-group">
        <label class="form-label">新密码</label>
        <input class="form-input" id="newPwd" type="password" placeholder="输入新密码（至少6位）">
      </div>
      <div class="form-group">
        <label class="form-label">确认新密码</label>
        <input class="form-input" id="newPwd2" type="password" placeholder="再次输入新密码">
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitChangePassword()">确认修改</button>
    `);
  },

  submitChangePassword() {
    const oldPwd = document.getElementById('oldPwd').value;
    const newPwd = document.getElementById('newPwd').value;
    const newPwd2 = document.getElementById('newPwd2').value;
    if (!oldPwd) return this.toast('请输入当前密码');
    if (!newPwd || newPwd.length < 6) return this.toast('新密码至少6位');
    if (newPwd !== newPwd2) return this.toast('两次输入的新密码不一致');
    if (Store.changeAdminPassword(oldPwd, newPwd)) {
      this.hideModal();
      this.toast('✅ 密码修改成功');
    } else {
      this.toast('❌ 当前密码错误');
    }
  },

  // ==========================================
  // 飞书通知设置
  // ==========================================
  showFeishuSettings() {
    const cfg = FeishuNotifier.getConfig();
    const configured = FeishuNotifier.isConfigured();
    this.showModal('📨 飞书通知设置', `
      ${configured ? '<div style="background:#d1fae5;border:1px solid #10b981;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-weight:600;font-size:13px;color:#065f46;">✅ 已连接飞书机器人</div>' : '<div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-weight:600;font-size:13px;color:#991b1b;">⚠️ 未配置飞书，通知无法发送</div>'}

      <div class="form-group">
        <label class="form-label">飞书群机器人 Webhook URL</label>
        <input class="form-input" id="feishuWebhook" value="${cfg.webhookUrl}" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx">
        <div class="form-hint">在飞书群设置中添加机器人 → Webhook，复制URL粘贴到这里</div>
      </div>

      <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#374151">通知开关</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="notifyAnn" ${cfg.notifyNewAnnouncement ? 'checked' : ''}> 新公告发布时通知</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="notifyVote" ${cfg.notifyNewVote ? 'checked' : ''}> 新投票发起时通知</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="notifyFund" ${cfg.notifyNewFund ? 'checked' : ''}> 新集资项目时通知</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="notifyDonation" ${cfg.notifyLargeDonation ? 'checked' : ''}> 大额捐款时通知</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="notifyMsg" ${cfg.notifyNewMessage ? 'checked' : ''}> 新留言时通知</label>
        <div style="padding-left:24px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px">大额门槛：<input class="form-input" id="donationThreshold" type="number" value="${cfg.largeDonationThreshold}" style="width:80px;padding:4px 8px;font-size:13px"> 元</label>
        </div>
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="App.saveFeishuSettings()">💾 保存设置</button>
        <button class="btn btn-success" style="flex:1" onclick="App.testFeishu()">📨 测试发送</button>
      </div>
    `);
  },

  saveFeishuSettings() {
    FeishuNotifier.updateConfig({
      webhookUrl: document.getElementById('feishuWebhook').value.trim(),
      notifyNewAnnouncement: document.getElementById('notifyAnn').checked,
      notifyNewVote: document.getElementById('notifyVote').checked,
      notifyNewFund: document.getElementById('notifyFund').checked,
      notifyLargeDonation: document.getElementById('notifyDonation').checked,
      notifyNewMessage: document.getElementById('notifyMsg').checked,
      largeDonationThreshold: Number(document.getElementById('donationThreshold').value) || 500
    });
    this.hideModal();
    this.toast('✅ 飞书设置已保存');
    this.renderHome();
  },

  async testFeishu() {
    // 先保存当前设置的URL
    const url = document.getElementById('feishuWebhook').value.trim();
    if (!url) return this.toast('请先输入 Webhook URL');
    FeishuNotifier.updateConfig({ webhookUrl: url });
    
    this.toast('📨 正在发送测试消息…', 5000);
    const result = await FeishuNotifier.testWebhook();
    if (result.success) {
      this.toast('✅ 测试消息发送成功！请检查飞书群');
    } else {
      this.toast('❌ 发送失败：' + (result.error || '请检查URL是否正确'));
    }
  },

  // ==========================================
  // 云存储设置 (Supabase)
  // ==========================================
  showCloudSettings() {
    const cfg = CloudDB.getConfig();
    this.showModal('☁️ 云存储设置', `
      <div style="margin-bottom:12px;font-size:13px;color:#6b7280">配置云存储后，所有业主看到的数据将保持同步。推荐使用 Supabase（免费）。</div>
      ${cfg.enabled ? '<div style="background:#d1fae5;border:1px solid #10b981;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-weight:600;font-size:13px;color:#065f46;">✅ 云存储已启用</div>' : '<div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-weight:600;font-size:13px;color:#991b1b;">⚠️ 未启用云存储，数据仅保存在本地浏览器</div>'}
      <div class="form-group">
        <label class="form-label">启用云存储</label>
        <label><input type="checkbox" id="cloudEnabled" ${cfg.enabled ? 'checked' : ''}> 开启云同步</label>
      </div>
      <div class="form-group">
        <label class="form-label">Supabase URL</label>
        <input class="form-input" id="cloudUrl" value="${cfg.supabaseUrl}" placeholder="https://xxxxx.supabase.co">
        <div class="form-hint">在 Supabase 项目设置 → API 中获取</div>
      </div>
      <div class="form-group">
        <label class="form-label">Supabase anon key</label>
        <input class="form-input" id="cloudKey" value="${cfg.supabaseKey}" placeholder="eyJhbGciOiJIUzI1NiIs..." type="password">
        <div class="form-hint">在 Supabase 项目设置 → API 中复制 anon/public key</div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-primary" style="flex:1" onclick="App.saveCloudSettings()">💾 保存</button>
        <button class="btn btn-outline" style="flex:1" onclick="App.syncNow()">🔄 立即同步</button>
      </div>
    `);
  },

  saveCloudSettings() {
    const enabled = document.getElementById('cloudEnabled').checked;
    const url = document.getElementById('cloudUrl').value.trim();
    const key = document.getElementById('cloudKey').value.trim();
    CloudDB.updateConfig({ enabled, supabaseUrl: url, supabaseKey: key });
    this.hideModal();
    this.toast(enabled ? '✅ 云存储已启用' : '云存储已关闭');
    this.renderHome();
  },

  async syncNow() {
    const cfg = CloudDB.getConfig();
    if (!cfg.supabaseUrl || !cfg.supabaseKey) {
      return this.toast('请先配置 Supabase URL 和 Key');
    }
    this.toast('🔄 正在同步数据到云端…', 10000);
    const ok = await CloudDB.syncToCloud();
    if (ok) {
      this.toast('✅ 数据同步成功！');
    } else {
      this.toast('❌ 同步失败，请检查配置是否正确');
    }
  },

  // ==========================================
  // 首页 / 公告
  // ==========================================
  renderHome() {
    const container = document.getElementById('page-home');
    const items = Store.getAnnouncements();
    const isAdmin = Store.isAdmin();

    let html = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-weight:700;font-size:13px;color:#92400e;">⚠️ 当前为模拟演示版本，数据均为示例内容，实际使用时请替换为真实数据</div>`;
    html += `<div class="page-title">📢 小区公告 ${isAdmin ? '<span class="admin-badge">管理</span>' : ''}</div>`;

    // Admin: add button
    if (isAdmin) {
      html += `<button class="btn btn-primary btn-block" style="margin-bottom:12px" onclick="App.showAddAnnouncement()">＋ 发布新公告</button>`;
    }

    if (items.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">📋</div><p>暂无公告</p></div>`;
    } else {
      items.forEach(a => {
        const time = this.fmtTime(a.createdAt);
        html += `<div class="card announcement-item ${a.pinned ? 'pinned' : ''}">
          <div class="card-meta">
            ${a.important ? '<span class="badge badge-red">重要</span>' : ''}
            ${a.pinned ? '<span class="pin-tag">📌 置顶</span>' : ''}
            <span>${time}</span>
          </div>
          <div class="card-title">${a.title}</div>
          <div class="card-body">${this.nl2br(a.content)}</div>
          ${isAdmin ? `
          <div class="card-actions">
            <button class="btn btn-sm btn-outline" onclick="App.togglePinAnnouncement('${a.id}')">${a.pinned ? '取消置顶' : '置顶'}</button>
            <button class="btn btn-sm btn-danger" onclick="App.deleteAnnouncement('${a.id}')">删除</button>
          </div>` : ''}
        </div>`;
      });
    }

    // Quick links
    const feishuOk = FeishuNotifier.isConfigured();
    html += `<div class="page-title" style="margin-top:16px">🔗 快速入口</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="card" style="text-align:center;cursor:pointer" onclick="App.switchTab('vote')">
        <div style="font-size:28px;margin-bottom:4px">🗳️</div><div style="font-size:13px;font-weight:500">选举投票</div>
      </div>
      <div class="card" style="text-align:center;cursor:pointer" onclick="App.switchTab('fund')">
        <div style="font-size:28px;margin-bottom:4px">💰</div><div style="font-size:13px;font-weight:500">集资诉讼</div>
      </div>
      <div class="card" style="text-align:center;cursor:pointer" onclick="App.switchTab('info')">
        <div style="font-size:28px;margin-bottom:4px">📰</div><div style="font-size:13px;font-weight:500">信息发布</div>
      </div>
      <div class="card" style="text-align:center;cursor:pointer" onclick="App.switchTab('board')">
        <div style="font-size:28px;margin-bottom:4px">💬</div><div style="font-size:13px;font-weight:500">业主留言</div>
      </div>
    </div>
    <div style="margin-top:10px;padding:10px 12px;background:${feishuOk ? '#d1fae5' : '#fef3c7'};border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:13px;font-weight:500;color:${feishuOk ? '#065f46' : '#92400e'}">📨 飞书通知：${feishuOk ? '已连接 ✅' : '未配置'}</div>
      ${isAdmin ? `<button class="btn btn-sm ${feishuOk ? 'btn-outline' : 'btn-primary'}" onclick="App.showFeishuSettings()">${feishuOk ? '设置' : '立即配置'}</button>` : ''}
    </div>`;

    container.innerHTML = html;
  },

  showAddAnnouncement() {
    this.showModal('发布公告', `
      <div class="form-group">
        <label class="form-label">公告标题</label>
        <input class="form-input" id="annTitle" placeholder="请输入标题">
      </div>
      <div class="form-group">
        <label class="form-label">公告内容</label>
        <textarea class="form-textarea" id="annContent" rows="4" placeholder="请输入内容"></textarea>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="annImportant"> 标记为重要公告</label>
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitAnnouncement()">确认发布</button>
    `);
  },

  submitAnnouncement() {
    const title = document.getElementById('annTitle').value.trim();
    const content = document.getElementById('annContent').value.trim();
    const important = document.getElementById('annImportant').checked;
    if (!title) return this.toast('请输入标题');
    if (!content) return this.toast('请输入内容');
    Store.addAnnouncement(title, content, important);
    this.hideModal();
    this.renderHome();
    this.toast('公告已发布');
    // 飞书通知
    FeishuNotifier.notifyNewAnnouncement(title, '业委会管理员');
  },

  togglePinAnnouncement(id) { Store.togglePin(id); this.renderHome(); },
  deleteAnnouncement(id) { Store.deleteAnnouncement(id); this.renderHome(); },

  // ==========================================
  // 选举投票
  // ==========================================
  renderVote() {
    const container = document.getElementById('page-vote');
    const isAdmin = Store.isAdmin();
    const items = Store.getElections();

    let html = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-weight:700;font-size:13px;color:#92400e;">⚠️ 当前为模拟演示版本，投票数据仅供参考，实际使用时请替换为真实数据</div>`;
    html += `<div class="page-title">🗳️ 选举投票 ${isAdmin ? '<span class="admin-badge">管理</span>' : ''}</div>`;

    if (isAdmin) {
      html += `<button class="btn btn-primary btn-block" style="margin-bottom:12px" onclick="App.showAddElection()">＋ 发起新投票</button>`;
    }

    if (items.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">🗳️</div><p>暂无投票活动</p></div>`;
    } else {
      items.forEach(e => {
        const total = e.candidates.reduce((s, c) => s + c.votes, 0);
        const isClosed = e.status === 'closed';
        const statusBadge = isClosed ? '<span class="badge badge-gray">已结束</span>' : '<span class="badge badge-green">进行中</span>';
        html += `<div class="card">
          <div class="card-meta">
            ${statusBadge}
            <span>${this.fmtDate(e.startDate)} ~ ${this.fmtDate(e.endDate)}</span>
          </div>
          <div class="card-title">${e.title}</div>
          <div class="card-body" style="margin-bottom:8px">${this.nl2br(e.desc)}</div>
          <div style="margin-bottom:8px">`;
        e.candidates.forEach((c, i) => {
          const pct = total > 0 ? Math.round(c.votes/total*100) : 0;
          html += `<div class="vote-option ${isClosed ? '' : ''}" onclick="${isClosed ? '' : `App.castVote('${e.id}',${i})`}">
            <div class="radio"></div>
            <div class="vote-text">
              <strong>${c.name}</strong>
              ${c.desc ? '<br><span style="font-size:12px;color:#6b7280">' + c.desc + '</span>' : ''}
            </div>
            <div class="vote-count">${c.votes}票 (${pct}%)</div>
          </div>`;
        });
        html += `</div>`;
        if (total > 0) {
          html += `<div style="font-size:12px;color:#9ca3af">总投票数：${total} 票</div>`;
        }
        html += `</div>`;
      });
    }

    container.innerHTML = html;
  },

  showAddElection() {
    this.showModal('发起新投票', `
      <div class="form-group">
        <label class="form-label">投票名称</label>
        <input class="form-input" id="eleTitle" placeholder="例如：第三届业委会选举">
      </div>
      <div class="form-group">
        <label class="form-label">投票说明</label>
        <textarea class="form-textarea" id="eleDesc" rows="3" placeholder="投票规则、时间说明等"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">候选人（每行一个姓名）</label>
        <textarea class="form-textarea" id="eleCandidates" rows="4" placeholder="张三&#10;李四&#10;王五"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">投票持续天数</label>
        <input class="form-input" id="eleDays" type="number" value="14" min="1">
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitElection()">发起投票</button>
    `);
  },

  submitElection() {
    const title = document.getElementById('eleTitle').value.trim();
    const desc = document.getElementById('eleDesc').value.trim();
    const candidatesRaw = document.getElementById('eleCandidates').value.trim();
    const days = Number(document.getElementById('eleDays').value) || 14;
    if (!title) return this.toast('请输入投票名称');
    const candidates = candidatesRaw.split('\n').map(s => s.trim()).filter(s => s);
    if (candidates.length < 2) return this.toast('至少需要2位候选人');
    Store.addElection(title, desc, candidates, days);
    this.hideModal();
    this.renderVote();
    this.toast('投票已发起');
    // 飞书通知
    FeishuNotifier.notifyNewVote(title, Date.now() + days * 86400000, candidates.length);
  },

  castVote(electionId, candidateIndex) {
    const result = Store.voteElection(electionId, candidateIndex);
    if (!result) return this.toast('该投票已结束');
    this.renderVote();
    this.toast('投票成功！感谢您的参与 🎉');
  },

  // ==========================================
  // 集资打官司
  // ==========================================
  renderFund() {
    const container = document.getElementById('page-fund');
    const isAdmin = Store.isAdmin();
    const items = Store.getFundraisings();

    let html = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-weight:700;font-size:13px;color:#92400e;">⚠️ 当前为模拟演示版本，集资数据均为示例，实际使用时请替换为真实数据</div>`;
    html += `<div class="page-title">💰 集资诉讼 ${isAdmin ? '<span class="admin-badge">管理</span>' : ''}</div>`;

    if (isAdmin) {
      html += `<button class="btn btn-primary btn-block" style="margin-bottom:12px" onclick="App.showAddFundraising()">＋ 发起新集资</button>`;
    }

    if (items.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">💰</div><p>暂无集资项目</p></div>`;
    } else {
      items.forEach(f => {
        const pct = f.target > 0 ? Math.min(100, Math.round(f.current/f.target*100)) : 0;
        const statusBadge = f.status === 'completed' ? '<span class="badge badge-green">已完成 ✅</span>' :
                            f.status === 'cancelled' ? '<span class="badge badge-red">已取消</span>' :
                            '<span class="badge badge-yellow">筹集中</span>';
        html += `<div class="card">
          <div class="card-meta">${statusBadge} <span>${this.fmtTime(f.createdAt)}</span></div>
          <div class="card-title">${f.title}</div>
          <div class="card-body">${this.nl2br(f.desc)}</div>
          <div class="fund-header" style="padding:8px 0">
            <div class="fund-amount">¥${f.current.toLocaleString()}</div>
            <div class="fund-target">目标 ¥${f.target.toLocaleString()} · ${pct}%</div>
          </div>
          <div class="progress-bar"><div class="progress-fill green" style="width:${pct}%"></div></div>
          <div style="font-size:12px;color:#9ca3af;margin:4px 0">${f.donors.length} 位业主已捐款</div>
          ${f.status === 'active' ? `<button class="btn btn-success btn-block" onclick="App.showDonate('${f.id}')">💛 我要捐款</button>` : ''}
          ${f.donors.length > 0 ? `<div style="margin-top:8px"><div style="font-size:13px;font-weight:500;margin-bottom:4px">捐款记录</div>${
            [...f.donors].reverse().slice(0, 10).map(d => 
              `<div class="donor-item"><span class="donor-name">${d.name}</span><span class="donor-amount">¥${d.amount.toLocaleString()}</span></div>
              ${d.msg ? `<div class="donor-message" style="padding-bottom:4px">"${d.msg}"</div>` : ''}`
            ).join('')
          }</div>` : ''}
          ${isAdmin && f.status === 'active' ? `<div class="card-actions"><button class="btn btn-sm btn-outline" onclick="App.closeFundraising('${f.id}')">结束集资</button></div>` : ''}
        </div>`;
      });
    }

    container.innerHTML = html;
  },

  showAddFundraising() {
    this.showModal('发起新集资', `
      <div class="form-group">
        <label class="form-label">集资名称</label>
        <input class="form-input" id="fundTitle" placeholder="例如：外墙维修诉讼集资">
      </div>
      <div class="form-group">
        <label class="form-label">集资说明</label>
        <textarea class="form-textarea" id="fundDesc" rows="3" placeholder="阐述集资目的、预期效果等"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">目标金额（元）</label>
        <input class="form-input" id="fundTarget" type="number" placeholder="80000">
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitFundraising()">发起集资</button>
    `);
  },

  submitFundraising() {
    const title = document.getElementById('fundTitle').value.trim();
    const desc = document.getElementById('fundDesc').value.trim();
    const target = Number(document.getElementById('fundTarget').value);
    if (!title) return this.toast('请输入集资名称');
    if (!desc) return this.toast('请输入集资说明');
    if (!target || target < 1) return this.toast('请输入有效的目标金额');
    Store.addFundraising(title, desc, target);
    this.hideModal();
    this.renderFund();
    this.toast('集资已发起');
    // 飞书通知
    FeishuNotifier.notifyNewFund(title, target, desc);
  },

  showDonate(fundId) {
    this.showModal('我要捐款', `
      <div class="form-group">
        <label class="form-label">您的称呼（可匿名）</label>
        <input class="form-input" id="donateName" placeholder="例：3栋-张先生" value="匿名业主">
      </div>
      <div class="form-group">
        <label class="form-label">捐款金额（元）</label>
        <input class="form-input" id="donateAmount" type="number" placeholder="100" min="1">
      </div>
      <div class="form-group">
        <label class="form-label">留言（可选）</label>
        <textarea class="form-textarea" id="donateMsg" rows="2" placeholder="说点什么…"></textarea>
      </div>
      <button class="btn btn-success btn-block" onclick="App.submitDonate('${fundId}')">确认捐款</button>
    `);
  },

  submitDonate(fundId) {
    const name = document.getElementById('donateName').value.trim() || '匿名业主';
    const amount = document.getElementById('donateAmount').value;
    const msg = document.getElementById('donateMsg').value.trim();
    if (!amount || Number(amount) < 1) return this.toast('请输入有效金额');
    const result = Store.donate(fundId, name, amount, msg);
    if (!result) return this.toast('捐款失败，该项目已结束');
    this.hideModal();
    this.renderFund();
    this.toast(`感谢您的捐款！已收到 ¥${Number(amount).toLocaleString()} 🎉`);
    // 飞书通知 - 通知大额捐款
    const fund = Store.getFundraisings().find(f => f.id === fundId);
    if (fund) FeishuNotifier.notifyLargeDonation(fund.title, name, amount, msg);
  },

  closeFundraising(fundId) { Store.closeFundraising(fundId); this.renderFund(); this.toast('该集资已结束'); },

  // ==========================================
  // 信息发布
  // ==========================================
  renderInfo() {
    const container = document.getElementById('page-info');
    const isAdmin = Store.isAdmin();
    const items = Store.getInfos();

    let html = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-weight:700;font-size:13px;color:#92400e;">⚠️ 当前为模拟演示版本，信息数据均为示例，实际使用时请替换为真实数据</div>`;
    html += `<div class="page-title">📰 信息发布 ${isAdmin ? '<span class="admin-badge">管理</span>' : ''}</div>`;

    if (isAdmin) {
      html += `<button class="btn btn-primary btn-block" style="margin-bottom:12px" onclick="App.showAddInfo()">＋ 发布新信息</button>`;
    }

    if (items.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">📰</div><p>暂无信息</p></div>`;
    } else {
      items.forEach(i => {
        html += `<div class="card" onclick="App.viewInfoDetail('${i.id}')" style="cursor:pointer">
          <div class="card-meta">
            <span class="badge badge-blue">${i.category}</span>
            <span>${this.fmtTime(i.createdAt)}</span>
            <span>👁️ ${i.views}</span>
          </div>
          <div class="card-title">${i.title}</div>
          <div class="card-body">${this.nl2br(this.truncate(i.content, 100))}</div>
        </div>`;
      });
    }

    container.innerHTML = html;
  },

  showAddInfo() {
    this.showModal('发布信息', `
      <div class="form-group">
        <label class="form-label">信息标题</label>
        <input class="form-input" id="infoTitle" placeholder="请输入标题">
      </div>
      <div class="form-group">
        <label class="form-label">信息分类</label>
        <select class="form-select" id="infoCategory">
          <option>通知公告</option>
          <option>生活服务</option>
          <option>社区活动</option>
          <option>便民信息</option>
          <option>其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">信息内容</label>
        <textarea class="form-textarea" id="infoContent" rows="5" placeholder="请输入内容"></textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitInfo()">确认发布</button>
    `);
  },

  submitInfo() {
    const title = document.getElementById('infoTitle').value.trim();
    const category = document.getElementById('infoCategory').value;
    const content = document.getElementById('infoContent').value.trim();
    if (!title) return this.toast('请输入标题');
    if (!content) return this.toast('请输入内容');
    Store.addInfo(title, content, category);
    this.hideModal();
    this.renderInfo();
    this.toast('信息已发布');
  },

  viewInfoDetail(id) {
    Store.viewInfo(id);
    const i = Store.getInfos().find(x => x.id === id);
    if (!i) return;
    this.showDetail(i.title, `
      <div class="card-meta">
        <span class="badge badge-blue">${i.category}</span>
        <span>${this.fmtTime(i.createdAt)}</span>
        <span>👁️ ${i.views}</span>
      </div>
      <div style="line-height:1.8;font-size:14px;margin-top:8px">${this.nl2br(i.content)}</div>
    `);
  },

  // ==========================================
  // 留言板
  // ==========================================
  renderBoard() {
    const container = document.getElementById('page-board');
    const isAdmin = Store.isAdmin();
    const items = Store.getMessages();

    let html = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-weight:700;font-size:13px;color:#92400e;">⚠️ 当前为模拟演示版本，留言数据均为示例，实际使用时请替换为真实数据</div>`;
    html += `<div class="page-title">💬 业主留言板 ${isAdmin ? '<span class="admin-badge">管理</span>' : ''}</div>`;

    html += `<button class="btn btn-outline btn-block" style="margin-bottom:12px" onclick="App.showAddMessage()">✏️ 发布留言</button>`;

    if (items.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">💬</div><p>暂无留言，快来第一条吧</p></div>`;
    } else {
      items.forEach((m, idx) => {
        const floor = items.length - idx;
        html += `<div class="card message-item">
          <div class="message-header">
            <span class="message-author">${m.author}</span>
            <span class="message-floor">#${floor} · ${this.fmtTime(m.createdAt)}</span>
          </div>
          <div class="message-content">${this.nl2br(m.content)}</div>
          <div class="message-actions">
            <button onclick="App.showReply('${m.id}')">💬 回复 (${m.replies.length})</button>
          </div>
          ${m.replies.length > 0 ? `<div style="margin-top:6px;padding-left:12px;border-left:2px solid #e5e7eb">${
            m.replies.map(r => `<div style="margin-bottom:4px;font-size:13px"><strong>${r.author}</strong> <span style="color:#9ca3af;font-size:11px">${this.fmtTime(r.date)}</span><br>${this.nl2br(r.content)}</div>`).join('')
          }</div>` : ''}
        </div>`;
      });
    }

    container.innerHTML = html;
  },

  showAddMessage() {
    this.showModal('发布留言', `
      <div class="form-group">
        <label class="form-label">您的称呼</label>
        <input class="form-input" id="msgAuthor" placeholder="例：3栋-张先生" value="匿名业主">
      </div>
      <div class="form-group">
        <label class="form-label">留言内容</label>
        <textarea class="form-textarea" id="msgContent" rows="4" placeholder="请输入您的留言…"></textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitMessage()">发布留言</button>
    `);
  },

  submitMessage() {
    const author = document.getElementById('msgAuthor').value.trim() || '匿名业主';
    const content = document.getElementById('msgContent').value.trim();
    if (!content) return this.toast('请输入留言内容');
    Store.addMessage(author, content);
    this.hideModal();
    this.renderBoard();
    this.toast('留言已发布');
    // 飞书通知
    FeishuNotifier.notifyNewMessage(author, content);
  },

  showReply(msgId) {
    this.showModal('回复', `
      <div class="form-group">
        <label class="form-label">您的称呼</label>
        <input class="form-input" id="replyAuthor" value="业委会" placeholder="称呼">
      </div>
      <div class="form-group">
        <label class="form-label">回复内容</label>
        <textarea class="form-textarea" id="replyContent" rows="3" placeholder="请输入回复…"></textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="App.submitReply('${msgId}')">确认回复</button>
    `);
  },

  submitReply(msgId) {
    const author = document.getElementById('replyAuthor').value.trim() || '匿名';
    const content = document.getElementById('replyContent').value.trim();
    if (!content) return this.toast('请输入回复内容');
    Store.replyMessage(msgId, author, content);
    this.hideModal();
    this.renderBoard();
    this.toast('回复已发布');
  },

  // ==========================================
  // Utility
  // ==========================================
  fmtTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff/60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff/3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff/86400000) + '天前';
    return `${d.getMonth()+1}月${d.getDate()}日`;
  },

  fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth()+1}月${d.getDate()}日`;
  },

  nl2br(text) {
    return (text || '').replace(/\n/g, '<br>');
  },

  truncate(text, len) {
    if (!text || text.length <= len) return text || '';
    return text.substring(0, len) + '…';
  },

  // ===== Data Management =====
  resetData() {
    if (confirm('确定要清空所有数据？此操作不可恢复！')) {
      localStorage.removeItem('yezhuwei_data');
      Store.init();
      this.renderPage(this.activeTab);
      this.toast('数据已重置');
    }
  },

  exportData() {
    const data = localStorage.getItem('yezhuwei_data');
    if (!data) return this.toast('暂无数据');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '业委会数据备份_' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toast('数据已导出');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.announcements && data.elections && data.fundraisings && data.infos && data.messages) {
            if (confirm('导入将覆盖现有数据，确定继续？')) {
              localStorage.setItem('yezhuwei_data', JSON.stringify(data));
              Store._db = data;
              this.renderPage(this.activeTab);
              this.toast('数据已导入');
            }
          } else {
            this.toast('无效的数据格式');
          }
        } catch(e) { this.toast('文件解析失败'); }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  // ===== Binding =====
  bindEvents() {
    document.querySelectorAll('.tab-item').forEach(el => {
      el.addEventListener('click', () => this.switchTab(el.dataset.tab));
    });
  }
};

// ===== Auto-init =====
document.addEventListener('DOMContentLoaded', () => App.init());
