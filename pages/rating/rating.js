const USER_KEYS = ['user', 'campusUserInfo'];

Page({
  data: {
    statusBarHeight: 20,
    categories: ['全部', '食堂美食', '校园商铺', '宿舍设施', '流浪猫狗', '校园人物', '其他校园'],
    activeCategory: '全部',
    keyword: '',
    subjects: [],
    loading: false,
    isAdmin: false,
    showCreate: false,
    submitting: false,
    form: {
      name: '',
      category: '食堂美食',
      location: '',
      description: ''
    }
  },

  onLoad() {
    const app = getApp();
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.syncAdminState();
    this.loadSubjects();
  },

  onShow() {
    this.syncAdminState();
    if (this.data.subjects.length) this.loadSubjects();
  },

  syncAdminState() {
    const user = this.getCurrentUser();
    this.setData({ isAdmin: Boolean(user && user.is_admin) });
  },

  getCurrentUser() {
    return USER_KEYS.map(key => wx.getStorageSync(key)).find(Boolean) || null;
  },

  loadSubjects() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'getRatingHome',
      data: {
        category: this.data.activeCategory === '全部' ? '' : this.data.activeCategory,
        keyword: this.data.keyword
      },
      success: res => {
        const result = res.result || {};
        if (result.code !== 0) throw new Error(result.message || '加载失败');
        this.setData({ subjects: result.data.subjects || [] });
      },
      fail: () => wx.showToast({ title: '评分加载失败', icon: 'none' }),
      complete: () => this.setData({ loading: false })
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadSubjects();
  },

  selectCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category }, () => this.loadSubjects());
  },

  openDetail(e) {
    wx.navigateTo({ url: `/pages/rating_detail/rating_detail?id=${e.currentTarget.dataset.id}` });
  },

  openCreate() {
    if (!this.getCurrentUser()) {
      wx.showModal({
        title: '请先登录',
        content: '登录校园账号后才能创建评分对象。',
        confirmText: '前往登录',
        success: res => { if (res.confirm) wx.switchTab({ url: '/pages/User/User' }); }
      });
      return;
    }
    this.setData({ showCreate: true });
  },

  openAdmin() {
    wx.navigateTo({ url: '/pages/rating_admin/rating_admin' });
  },

  closeCreate() {
    if (!this.data.submitting) this.setData({ showCreate: false });
  },

  onFormInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  selectFormCategory(e) {
    this.setData({ 'form.category': e.currentTarget.dataset.category });
  },

  submitCreate() {
    if (this.data.submitting) return;
    const form = this.data.form;
    if (!form.name.trim()) return wx.showToast({ title: '请填写对象名称', icon: 'none' });
    this.setData({ submitting: true });
    wx.cloud.callFunction({
      name: 'createRatingSubject',
      data: { payload: { ...form, name: form.name.trim(), location: form.location.trim(), description: form.description.trim() } },
      success: res => {
        const result = res.result || {};
        if (result.code !== 0) return wx.showToast({ title: result.message || '提交失败', icon: 'none' });
        this.setData({ showCreate: false, 'form.name': '', 'form.location': '', 'form.description': '' });
        wx.showModal({ title: '已提交审核', content: '评分对象通过管理员审核后才会公开显示。', showCancel: false });
      },
      fail: () => wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' }),
      complete: () => this.setData({ submitting: false })
    });
  },

  noop() {},

  onBack() {
    wx.navigateBack({ delta: 1 });
  }
});
