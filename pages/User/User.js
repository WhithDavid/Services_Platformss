const USER_STORAGE_KEY = 'campusUserInfo';

Page({
  data: {
    statusBarHeight: 20,
    userInfo: null,
    unLoginUrl: '/pages/images/User.png',
    contentEntries: [
      { key: 'posts', icon: '帖', label: '我的帖子', count: 3, tone: 'orange' },
      { key: 'favorites', icon: '藏', label: '我的收藏', count: 8, tone: 'pink' },
      { key: 'history', icon: '历', label: '浏览历史', count: 16, tone: 'blue' }
    ],
    taskEntries: [
      { key: 'published', icon: '发', label: '我发布的', count: 2 },
      { key: 'accepted', icon: '接', label: '我接取的', count: 1 },
      { key: 'processing', icon: '进', label: '进行中', count: 1 },
      { key: 'completed', icon: '完', label: '已完成', count: 6 }
    ]
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20
    });
    this.restoreLoginState();
  },

  onShow() {
    this.restoreLoginState();
  },

  restoreLoginState() {
    const userInfo = wx.getStorageSync(USER_STORAGE_KEY);
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  wxLogin() {
    const userInfo = {
      Name: '微信用户',
      studentTag: '校园用户',
      imgHand: '/pages/images/User_select.png'
    };

    wx.setStorageSync(USER_STORAGE_KEY, userInfo);
    this.setData({ userInfo });
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
  },

  outLogin() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将无法查看个人内容和任务进度。',
      confirmText: '确认退出',
      confirmColor: '#d85c5c',
      success: res => {
        if (!res.confirm) return;
        wx.removeStorageSync(USER_STORAGE_KEY);
        this.setData({ userInfo: null });
        wx.showToast({
          title: '已退出',
          icon: 'success'
        });
      }
    });
  },

  requireLogin() {
    if (this.data.userInfo) return true;

    wx.showModal({
      title: '请先登录',
      content: '登录后即可查看个人内容和悬赏任务。',
      confirmText: '立即登录',
      confirmColor: '#222222',
      success: res => {
        if (res.confirm) this.wxLogin();
      }
    });
    return false;
  },

  onEntryTap(e) {
    if (!this.requireLogin()) return;

    const labels = {
      posts: '我的帖子',
      favorites: '我的收藏',
      history: '浏览历史',
      published: '我发布的悬赏',
      accepted: '我接取的任务',
      processing: '进行中的任务',
      completed: '已完成的任务'
    };
    const key = e.currentTarget.dataset.key;

    wx.showToast({
      title: `${labels[key]}待接入`,
      icon: 'none'
    });
  },

  onProfileTap() {
    if (!this.data.userInfo) {
      this.wxLogin();
      return;
    }
    this.toDetail();
  },

  toDetail() {
    if (!this.requireLogin()) return;
    wx.showToast({
      title: '个人资料待接入',
      icon: 'none'
    });
  }
});
