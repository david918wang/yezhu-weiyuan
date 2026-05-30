/* ==========================================================
   业委会小区小程序 - 数据层 (Data Store)
   ========================================================== */

const Store = {
  _db: null,
  _syncUrl: '/api/data/sync',
  _changesSinceInit: [],

  init() {
    try {
      const raw = localStorage.getItem('yezhuwei_data');
      if (raw) { this._db = JSON.parse(raw); /* 兼容旧数据没有adminPassword */ if (!this._db.adminPassword) this._db.adminPassword = '123456'; }
    } catch(e) {}
    if (!this._db) {
      this._db = {
        announcements: [],
        elections: [],
        fundraisings: [],
        infos: [],
        messages: [],
        adminMode: false,
        adminPassword: '123456'
      };
      this.save();
      this.seed();
    }
    // 启动时尝试从服务端同步数据
    this.syncFromServer();
  },

  // 从服务端拉取最新数据
  async syncFromServer() {
    try {
      const resp = await fetch('/api/data');
      if (!resp.ok) return;
      const serverData = await resp.json();
      // 只合并服务端有但本地没有的数据
      let changed = false;
      ['announcements', 'elections', 'fundraisings', 'infos', 'messages'].forEach(key => {
        if (serverData[key] && Array.isArray(serverData[key])) {
          const localIds = new Set((this._db[key] || []).map(i => i.id));
          serverData[key].forEach(item => {
            if (!localIds.has(item.id)) {
              this._db[key].push(item);
              changed = true;
            }
          });
        }
      });
      if (changed) this.save();
    } catch (e) {
      // 服务端可能还没启动，静默忽略
    }
  },

  // 同步本地变更到服务端
  async syncToServer() {
    try {
      await fetch(this._syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._db)
      });
    } catch (e) {
      // 静默
    }
  },

  save() {
    localStorage.setItem('yezhuwei_data', JSON.stringify(this._db));
    // 后台同步到服务端（不等待）
    this.syncToServer();
    // 通知云存储有变更
    if (typeof CloudDB !== 'undefined' && CloudDB.markDirty) {
      CloudDB.markDirty();
    }
  },

  // ---- Seed sample data ----
  seed() {
    const now = Date.now();
    this._db.announcements = [
      { id: 'a1', title: '🔥 关于小区停车位改造的通知', content: '各位业主：经业委会研究决定，将于本月启动地下车库停车位智能化改造工程。改造期间部分车位暂停使用，请您配合。\n\n改造工期预计15天。如有疑问可联系业委会王主任：138****5678。', important: true, pinned: true, createdAt: now - 3600000 },
      { id: 'a2', title: '物业费缴纳提醒', content: '2026年第二季度物业费已开始收缴，请各位业主在6月30日前完成缴纳。支持线上支付和物业中心现场缴纳。', important: false, pinned: false, createdAt: now - 86400000 * 2 }
    ];
    this._db.elections = [
      { id: 'e1', title: '第三届业委会委员选举', desc: '本次选举将产生7名业委会委员，任期3年。请各位业主积极行使投票权。\n\n投票时间：2026年6月1日-6月15日', candidates: [
        { name: '张建国', desc: '退休干部，热心社区事务', votes: 128 },
        { name: '李明华', desc: '律师，擅长物业管理法规', votes: 95 },
        { name: '王芳', desc: '企业高管，财务管理经验', votes: 142 }
      ], startDate: now, endDate: now + 86400000 * 14, status: 'active', createdAt: now - 86400000 * 2 },
      { id: 'e2', title: '业主代表推选', desc: '每栋楼推选1名业主代表，参与小区重大事项决策。', candidates: [
        { name: '刘伟', desc: '1号楼业主', votes: 45 },
        { name: '陈静', desc: '3号楼业主', votes: 38 }
      ], startDate: now - 86400000 * 30, endDate: now - 86400000 * 16, status: 'closed', createdAt: now - 86400000 * 35 }
    ];
    this._db.fundraisings = [
      { id: 'f1', title: '小区外墙维修诉讼集资', desc: '开发商交付的外墙存在严重质量问题，多处渗水脱落。业委会决定通过法律途径维权，诉讼费用预算约8万元。\n\n已聘请专业律师团队，胜诉后可追偿。', target: 80000, current: 32500, donors: [
        { name: '3栋-张先生', amount: 2000, msg: '支持维权！', date: now - 86400000 * 3 },
        { name: '5栋-李女士', amount: 5000, msg: '我家也漏水，坚决支持', date: now - 86400000 * 5 },
        { name: '1栋-匿名业主', amount: 1000, msg: '加油！', date: now - 86400000 * 7 }
      ], status: 'active', createdAt: now - 86400000 * 10 }
    ];
    this._db.infos = [
      { id: 'i1', title: '小区周边便民服务指南', content: '一、社区卫生服务站：东门出口左转100米，电话：025-****2345\n二、菜鸟驿站：北门旁，营业时间8:00-21:00\n三、附近超市：华联超市（南门对面）', category: '生活服务', author: '业委会', createdAt: now - 86400000 * 5, views: 156 },
      { id: 'i2', title: '垃圾分类新规解读', content: '自7月1日起，小区将实行垃圾分类新标准：\n1. 厨余垃圾请破袋投放\n2. 有害垃圾请投放至红色垃圾桶\n3. 可回收物请分类打包\n\n请各位业主配合！', category: '通知', author: '物业中心', createdAt: now - 86400000 * 3, views: 89 }
    ];
    this._db.messages = [
      { id: 'm1', author: '3栋-刘姐', content: '楼下广场舞声音太大，建议业委会协调一下时间', replies: [
        { author: '业委会小王', content: '已和舞蹈队沟通，结束时间调整到20:30', date: now - 86400000 * 2 }
      ], createdAt: now - 86400000 * 3 },
      { id: 'm2', author: '5栋-老孙', content: '建议小区增加电动车充电桩，现在太少了', replies: [], createdAt: now - 86400000 }
    ];
    this.save();
  },

  // ---- Announcements ----
  getAnnouncements() { return [...this._db.announcements].sort((a,b) => b.pinned - a.pinned || b.createdAt - a.createdAt); },
  addAnnouncement(title, content, important) {
    this._db.announcements.unshift({ id: 'a' + Date.now(), title, content, important: !!important, pinned: false, createdAt: Date.now() });
    this.save();
  },
  togglePin(id) {
    const item = this._db.announcements.find(a => a.id === id);
    if (item) { item.pinned = !item.pinned; this.save(); }
  },
  deleteAnnouncement(id) {
    this._db.announcements = this._db.announcements.filter(a => a.id !== id);
    this.save();
  },

  // ---- Elections ----
  getElections() { return [...this._db.elections].sort((a,b) => b.createdAt - a.createdAt); },
  addElection(title, desc, candidates, endDays) {
    const now = Date.now();
    this._db.elections.push({
      id: 'e' + Date.now(), title, desc,
      candidates: candidates.map(c => ({ name: c, desc: '', votes: 0 })),
      startDate: now, endDate: now + endDays * 86400000,
      status: 'active', createdAt: now
    });
    this.save();
  },
  voteElection(electionId, candidateIndex) {
    const election = this._db.elections.find(e => e.id === electionId);
    if (!election || election.status !== 'active') return false;
    election.candidates[candidateIndex].votes++;
    this.save();
    return true;
  },
  checkElectionStatus() {
    const now = Date.now();
    this._db.elections.forEach(e => {
      if (e.status === 'active' && now > e.endDate) e.status = 'closed';
    });
    this.save();
  },

  // ---- Fundraisings ----
  getFundraisings() { return [...this._db.fundraisings].sort((a,b) => b.createdAt - a.createdAt); },
  addFundraising(title, desc, target) {
    this._db.fundraisings.push({
      id: 'f' + Date.now(), title, desc, target: Number(target), current: 0,
      donors: [], status: 'active', createdAt: Date.now()
    });
    this.save();
  },
  donate(fundId, name, amount, msg) {
    const fund = this._db.fundraisings.find(f => f.id === fundId);
    if (!fund || fund.status !== 'active') return false;
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) return false;
    fund.current += amount;
    fund.donors.push({ name, amount, msg: msg || '', date: Date.now() });
    if (fund.current >= fund.target) fund.status = 'completed';
    this.save();
    return true;
  },
  closeFundraising(fundId) {
    const fund = this._db.fundraisings.find(f => f.id === fundId);
    if (fund) { fund.status = 'cancelled'; this.save(); }
  },

  // ---- Infos ----
  getInfos() { return [...this._db.infos].sort((a,b) => b.createdAt - a.createdAt); },
  addInfo(title, content, category) {
    this._db.infos.unshift({ id: 'i' + Date.now(), title, content, category: category || '其他', author: '业委会', createdAt: Date.now(), views: 0 });
    this.save();
  },
  viewInfo(id) {
    const info = this._db.infos.find(i => i.id === id);
    if (info) { info.views++; this.save(); }
  },

  // ---- Messages ----
  getMessages() { return [...this._db.messages].sort((a,b) => b.createdAt - a.createdAt); },
  addMessage(author, content) {
    this._db.messages.unshift({ id: 'm' + Date.now(), author, content, replies: [], createdAt: Date.now() });
    this.save();
  },
  replyMessage(msgId, author, content) {
    const msg = this._db.messages.find(m => m.id === msgId);
    if (msg) { msg.replies.push({ author, content, date: Date.now() }); this.save(); }
  },

  // ---- Admin ----
  isAdmin() { return this._db.adminMode; },
  loginAdmin(password) {
    if (password !== this._db.adminPassword) return false;
    this._db.adminMode = true;
    this.save();
    return true;
  },
  logoutAdmin() {
    this._db.adminMode = false;
    this.save();
  },
  changeAdminPassword(oldPwd, newPwd) {
    if (oldPwd !== this._db.adminPassword) return false;
    this._db.adminPassword = newPwd;
    this.save();
    return true;
  }
};
