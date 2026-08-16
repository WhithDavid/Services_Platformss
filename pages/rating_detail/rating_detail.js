const USER_KEYS = ['user', 'campusUserInfo'];

Page({
  data: {
    statusBarHeight: 20,
    subjectId: '',
    subject: null,
    records: [],
    loading: true,
    score: 8,
    scoreDisplay: '8.0',
    comment: '',
    submitting: false,
    hasRated: false
  },

  onLoad(options) {
    const app = getApp();
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20, subjectId: options.id || '' });
    this.loadDetail();
  },

  getCurrentUser() {
    return USER_KEYS.map(key => wx.getStorageSync(key)).find(Boolean) || null;
  },

  loadDetail() {
    if (!this.data.subjectId) return;
    wx.cloud.callFunction({
      name: 'getRatingDetail',
      data: { subject_id: this.data.subjectId },
      success: res => {
        const result = res.result || {};
        if (result.code !== 0) return wx.showToast({ title: result.message || '加载失败', icon: 'none' });
        const records = result.data.records || [];
        const user = this.getCurrentUser();
        this.setData({
          subject: result.data.subject,
          records,
          hasRated: Boolean(user && records.some(item => item.user_openid === user.user_openid))
        });
      },
      fail: () => wx.showToast({ title: '评分加载失败', icon: 'none' }),
      complete: () => this.setData({ loading: false })
    });
  },

  onScoreChange(e) {
    const score = Number(e.detail.value);
    this.setData({ score, scoreDisplay: score.toFixed(1) });
  },

  onCommentInput(e) {
    this.setData({ comment: e.detail.value });
  },

  submitRating() {
    const user = this.getCurrentUser();
    if (!user) {
      wx.showModal({
        title: '请先登录',
        content: '登录校园账号后才能参与评分。',
        confirmText: '前往登录',
        success: res => { if (res.confirm) wx.switchTab({ url: '/pages/User/User' }); }
      });
      return;
    }
    if (this.data.hasRated) return wx.showToast({ title: '你已经评价过这个对象', icon: 'none' });
    if (!this.data.comment.trim()) return wx.showToast({ title: '请填写评价内容', icon: 'none' });
    this.setData({ submitting: true });
    wx.cloud.callFunction({
      name: 'submitRating',
      data: { subject_id: this.data.subjectId, score: this.data.score, comment: this.data.comment.trim() },
      success: res => {
        const result = res.result || {};
        if (result.code !== 0) return wx.showToast({ title: result.message || '评分失败', icon: 'none' });
        wx.showToast({ title: '评分成功', icon: 'success' });
        this.setData({ comment: '', hasRated: true });
        this.loadDetail();
      },
      fail: () => wx.showToast({ title: '评分失败，请稍后重试', icon: 'none' }),
      complete: () => this.setData({ submitting: false })
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  }
});
