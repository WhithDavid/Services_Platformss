const USER_STORAGE_KEY = 'campusUserInfo';
const USER_CACHE_KEY = 'user';

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
    // this.restoreLoginState();
    // 读取缓存，判断有没有⽤⼾数据
    var userInfo = wx.getStorageSync('user')
    if (userInfo) {
    // 将⽤⼾信息渲染到界⾯上
    this.setData({
    userInfo: userInfo
    })
    }
  },

  restoreLoginState() {
    const userInfo = wx.getStorageSync(USER_CACHE_KEY) || wx.getStorageSync(USER_STORAGE_KEY);
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  saveUserCache(userInfo) {
    wx.setStorageSync(USER_CACHE_KEY, userInfo);
    wx.setStorageSync(USER_STORAGE_KEY, userInfo);
    this.setData({ userInfo });
  },

  wxLogin() {
    // const userInfo = {
    //   Name: '微信用户',
    //   studentTag: '校园用户',
    //   imgHand: '/pages/images/User_select.png'
    // };

    // wx.setStorageSync(USER_STORAGE_KEY, userInfo);
    // this.setData({ userInfo });
    // wx.showToast({
    //   title: '登录成功',
    //   icon: 'success'
    // });

    wx.showLoading({
       title: '登录中...',
       })
       // 调⽤userLogin云函数,让云函数（openID）帮我们完成⽤⼾数据的录⼊
       wx.cloud.callFunction({
       name: 'userLogin',
       success: res => {
       console.log(res)
       if (res.result.code == 0) {
       wx.showToast({
       title: '登录成功',
       icon: 'success',
       duration: 1500
       })
       // 将⽤⼾的数据存储到缓存中
       wx.setStorageSync('user', res.result.data)
       this.setData({
       userInfo: res.result.data
       })
       }
       },
       fail: err => {
       console.log(err)
       }
       })
  },

  outLogin() {
    // wx.showModal({
    //   title: '退出登录',
    //   content: '退出后将无法查看个人内容和任务进度。',
    //   confirmText: '确认退出',
    //   confirmColor: '#d85c5c',
    //   success: res => {
    //     if (!res.confirm) return;
    //     wx.removeStorageSync(USER_STORAGE_KEY);
    //     this.setData({ userInfo: null });
    //     wx.showToast({
    //       title: '已退出',
    //       icon: 'success'
    //     });
    //   }
    // });
    // 清理登录状态
 wx.clearStorage()
 this.setData({
 userInfo: null
 })
 wx.showToast({
 title: '退出成功',
 icon: 'success',
 duration: 1500
})
},
toUserInfo() {
  if (wx.getStorageSync('userInfo')) {
  wx.navigateTo({
  url: '/pages/userInfo/userInfo',
  })
  } else {
  wx.showToast({
  title: '请先登录',
  icon: 'none',
  duration: 1500,
  mask: true
  })
  }
},
  requireLogin() {//判断登录
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

  editBio() {
    if (!this.requireLogin()) return;

    wx.showModal({
      title: '编辑简介',
      editable: true,
      placeholderText: this.data.userInfo.user_bio || '介绍一下自己吧',
      success: async res => {
        if (!res.confirm) return;

        const user_bio = (res.content || '').trim();
        const nextUserInfo = {
          ...this.data.userInfo,
          user_bio
        };

        wx.showLoading({
          title: '保存中...'
        });

        try {
          const saveRes = await wx.cloud.callFunction({
            name: 'updateUserProfile',
            data: {
              profile: nextUserInfo
            }
          });

          if (!saveRes.result || saveRes.result.code !== 0) {
            throw new Error((saveRes.result && saveRes.result.message) || '保存失败');
          }

          this.saveUserCache(saveRes.result.data);
          wx.showToast({
            title: '简介已更新',
            icon: 'success'
          });
        } catch (error) {
          console.log('editBio error:', error);
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  toDetail() {
    if (!this.requireLogin()) return;
    wx.navigateTo({
      url: '/pages/user_detail/user_detail'
    });
  }
});
