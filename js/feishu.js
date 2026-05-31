/* ==========================================================
   业委会 - 飞书通知服务（v2 - 支持后端代理发送）
   ========================================================== */

const FeishuNotifier = {
  _config: null,
  CONFIG_KEY: 'yezhuwei_feishu_config',

  getDefaultConfig() {
    return {
      webhookUrl: '',
      notifyNewAnnouncement: true,
      notifyNewVote: true,
      notifyNewFund: true,
      notifyLargeDonation: true,
      notifyNewMessage: true,
      largeDonationThreshold: 500,
      backendMode: true  // 默认优先走后端API
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
    // 加载服务端配置
    this.loadServerConfig();
  },

  async loadServerConfig() {
    try {
      const resp = await fetch('/api/feishu/config');
      if (resp.ok) {
        const serverConfig = await resp.json();
        if (serverConfig.webhookUrl) {
          this._config.webhookUrl = serverConfig.webhookUrl;
          this._config.largeDonationThreshold = serverConfig.largeDonationThreshold || 500;
          this.save();
        }
      }
    } catch (e) { /* 静默 */ }
  },

  save() {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this._config));
  },

  getConfig() { return { ...this._config }; },

  updateConfig(updates) {
    Object.assign(this._config, updates);
    this.save();
    // 同步到服务端
    fetch('/api/feishu/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: this._config.webhookUrl,
        enabled: this._config.notifyNewAnnouncement,
        largeDonationThreshold: this._config.largeDonationThreshold
      })
    }).catch(() => {});
  },

  isConfigured() {
    return this._config && this._config.webhookUrl && this._config.webhookUrl.startsWith('http');
  },

  // 发送通知 - 优先走后端API，降级到浏览器直发
  async sendNotification(title, content, options = {}) {
    if (!this.isConfigured()) {
      console.warn('飞书通知未配置，跳过');
      return { success: false, error: '未配置 Webhook URL' };
    }

    // 优先通过后端API发送（服务器端会记录日志）
    if (this._config.backendMode) {
      try {
        const resp = await fetch('/api/feishu/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await resp.json();
        if (result.success) return result;
      } catch (e) {
        // 后端不可用，降级到浏览器直发
      }
    }

    // 浏览器直发（降级方案）
    if (this._config.testMode) {
      console.log(`[测试模式] 飞书通知: ${title} - ${content}`);
      return { success: true, testMode: true };
    }

    const payload = this.buildPayload(title, content, options);
    try {
      const resp = await fetch(this._config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();
      if (result.code === 0) {
        console.log('飞书通知发送成功:', title);
        return { success: true };
      } else {
        console.error('飞书通知发送失败:', result);
        return { success: false, error: result.msg || '未知错误' };
      }
    } catch (e) {
      console.error('飞书通知网络错误:', e);
      return { success: false, error: e.message };
    }
  },

  buildPayload(title, content, options = {}) {
    const color = options.color || 'blue';
    const ts = new Date().toLocaleString('zh-CN', { hour12: false });
    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: title },
          template: color
        },
        elements: [
          { tag: 'markdown', content },
          {
            tag: 'note',
            elements: [
              { tag: 'plain_text', content: `🏠 智慧家园 · ${ts}` }
            ]
          }
        ]
      }
    };
  },

  // ===== 各类事件通知 =====
  async notifyNewAnnouncement(title, author) {
    if (!this._config.notifyNewAnnouncement) return;
    return this.sendNotification(
      '📢 新公告发布',
      `**${title}**\n\n发布人：${author || '业委会'}\n\n👉 点击查看详情`,
      { color: 'blue' }
    );
  },

  async notifyNewVote(title, endDate, candidateCount) {
    if (!this._config.notifyNewVote) return;
    const endStr = new Date(endDate).toLocaleDateString('zh-CN');
    return this.sendNotification(
      '🗳️ 新投票活动',
      `**${title}**\n\n候选人：${candidateCount}位\n截止日期：${endStr}\n\n👉 请各位业主积极投票`,
      { color: 'indigo' }
    );
  },

  async notifyNewFund(title, target, desc) {
    if (!this._config.notifyNewFund) return;
    return this.sendNotification(
      '💰 新集资项目',
      `**${title}**\n\n目标金额：¥${Number(target).toLocaleString()}\n\n说明：${desc?.substring(0, 100) || '无'}`,
      { color: 'green' }
    );
  },

  async notifyLargeDonation(fundTitle, donorName, amount, msg) {
    if (!this._config.notifyLargeDonation) return;
    if (amount < this._config.largeDonationThreshold) return;
    return this.sendNotification(
      '💛 大额捐款提醒',
      `项目：**${fundTitle}**\n\n捐款人：${donorName}\n金额：¥${Number(amount).toLocaleString()}\n${msg ? `留言：${msg}` : ''}`,
      { color: 'green' }
    );
  },

  async notifyNewMessage(author, content) {
    if (!this._config.notifyNewMessage) return;
    const snippet = content?.substring(0, 80) || '';
    return this.sendNotification(
      '💬 新业主留言',
      `留言人：**${author}**\n\n${snippet}${content?.length > 80 ? '…' : ''}`,
      { color: 'purple' }
    );
  },

  async testWebhook() {
    if (!this.isConfigured()) {
      return { success: false, error: '请先配置 Webhook URL' };
    }
    return this.sendNotification(
      '✅ 飞书通知连接测试',
      `通知服务已成功接入！🎉\n\n系统版本：智慧家园 v2.0\n时间：${new Date().toLocaleString('zh-CN', { hour12: false })}\n\n💡 后续有新公告、投票、集资、留言时，会自动推送到此群`,
      { color: 'green' }
    );
  }
};
