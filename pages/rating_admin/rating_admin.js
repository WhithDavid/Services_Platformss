Page({
  data: { statusBarHeight: 20, subjects: [], loading: true },

  onLoad() {
    const app = getApp();
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.loadPending();
  },

  loadPending() {
    wx.cloud.callFunction({
      name: 'getRatingPending',
      success: res => {
        const result = res.result || {};
        if (result.code !== 0) return wx.showToast({ title: result.message || '无法加载审核列表', icon: 'none' });
        this.setData({ subjects: result.data.subjects || [] });
      },
      fail: () => wx.showToast({ title: '审核列表加载失败', icon: 'none' }),
      complete: () => this.setData({ loading: false })
    });
  },

  review(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    wx.cloud.callFunction({
      name: 'reviewRatingSubject',
      data: { subject_id: id, status },
      success: res => {
        const result = res.result || {};
        if (result.code !== 0) return wx.showToast({ title: result.message || '审核失败', icon: 'none' });
        wx.showToast({ title: status === 'approved' ? '已通过' : '已驳回', icon: 'success' });
        this.setData({ subjects: this.data.subjects.filter(item => item._id !== id) });
      },
      fail: () => wx.showToast({ title: '审核失败，请稍后重试', icon: 'none' })
    });
  },

  onBack() { wx.navigateBack({ delta: 1 }); }
});
