/* ==========================================================
   智慧家园 - Supabase 云存储支持
   免费套餐：无限API请求，500MB数据库，1GB带宽
   ========================================================== */

const CloudDB = {
  _config: null,
  CONFIG_KEY: 'yezhuwei_cloud_config',
  _db: null,
  _initialized: false,
  _pendingChanges: [],
  _syncTimer: null,

  getDefaultConfig() {
    return {
      enabled: false,
      supabaseUrl: '',
      supabaseKey: '',
      lastSync: 0
    };
  },

  init() {
    try {
      const raw = localStorage.getItem(this.CONFIG_KEY);
      if (raw) this._config = JSON.parse(raw);
    } catch(e) {}
    if (!this._config) {
      this._config = this.getDefaultConfig();
      this.save();
    }
    // 如果已配置，3秒后开始同步
    if (this._config.enabled && this._config.supabaseUrl) {
      setTimeout(() => this.syncFromCloud(), 3000);
    }
  },

  save() {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this._config));
  },

  getConfig() { return { ...this._config }; },

  updateConfig(updates) {
    Object.assign(this._config, updates);
    this.save();
    if (this._config.enabled && this._config.supabaseUrl) {
      this.syncFromCloud();
    }
  },

  isConfigured() {
    return this._config.enabled && this._config.supabaseUrl && this._config.supabaseKey;
  },

  // ===== Supabase REST API 调用 =====
  _headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this._config.supabaseKey,
      'Authorization': `Bearer ${this._config.supabaseKey}`
    };
  },

  _url(table) {
    return `${this._config.supabaseUrl}/rest/v1/${table}`;
  },

  // 获取所有数据
  async fetchAll(table) {
    if (!this.isConfigured()) return null;
    try {
      const resp = await fetch(this._url(table), {
        headers: this._headers()
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.warn('Supabase 读取失败:', e.message);
      return null;
    }
  },

  // 插入数据
  async insert(table, data) {
    if (!this.isConfigured()) return null;
    try {
      const resp = await fetch(this._url(table), {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(data)
      });
      return resp.ok;
    } catch (e) {
      console.warn('Supabase 写入失败:', e.message);
      return false;
    }
  },

  // 清空并重新插入
  async replaceAll(table, data) {
    if (!this.isConfigured()) return false;
    try {
      // 先清空
      await fetch(this._url(table) + '?id=neq.0', {
        method: 'DELETE',
        headers: this._headers()
      });
      // 再批量插入
      if (data.length > 0) {
        const resp = await fetch(this._url(table), {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify(data)
        });
        return resp.ok;
      }
      return true;
    } catch (e) {
      console.warn('Supabase 替换失败:', e.message);
      return false;
    }
  },

  // ===== 同步逻辑 =====

  // 从云端拉取数据到本地
  async syncFromCloud() {
    if (!this.isConfigured()) return;
    
    let changed = false;
    const tables = ['announcements', 'elections', 'fundraisings', 'infos', 'messages'];
    
    for (const table of tables) {
      const cloudData = await this.fetchAll(table);
      if (!cloudData || !Array.isArray(cloudData)) continue;
      
      if (cloudData.length > 0 && window.Store && window.Store._db) {
        const localIds = new Set((window.Store._db[table] || []).map(i => i.id));
        let tableChanged = false;
        
        cloudData.forEach(item => {
          if (!localIds.has(item.id)) {
            window.Store._db[table].push(item);
            tableChanged = true;
            changed = true;
          }
        });
        
        if (tableChanged) {
          console.log(`☁️ 从云端同步了 ${table}: ${cloudData.length} 条`);
        }
      }
    }
    
    if (changed) {
      window.Store.save();
    }
    
    this._config.lastSync = Date.now();
    this.save();
  },

  // 推送本地数据到云端
  async syncToCloud() {
    if (!this.isConfigured()) return false;
    
    const tables = ['announcements', 'elections', 'fundraisings', 'infos', 'messages'];
    let allOk = true;
    
    if (!window.Store || !window.Store._db) return false;
    
    for (const table of tables) {
      const data = window.Store._db[table] || [];
      if (data.length > 0) {
        const ok = await this.replaceAll(table, data.map(item => ({
          ...item,
          id: String(item.id)
        })));
        if (!ok) allOk = false;
      }
    }
    
    if (allOk) {
      this._config.lastSync = Date.now();
      this.save();
      console.log('☁️ 数据已同步到云端');
    }
    
    return allOk;
  },

  // 标记数据有变更（延迟同步，避免频繁请求）
  markDirty() {
    if (!this.isConfigured()) return;
    
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => {
      this.syncToCloud();
    }, 2000); // 2秒后同步
  }
};

// 初始化
CloudDB.init();
