// app.js
App({
  globalData: {
    statusBarHeight: 20,
    circleFeedCache: {
      allPosts: [],
      tasks: [],
      postOffset: 0,
      hasMorePosts: true,
      hasLoadedOnce: false
    }
  },

  onLaunch() {
    wx.cloud.init()

    const systemInfo = wx.getSystemInfoSync()// 获取系统信息
    this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20// 顶部状态栏高度
  },
})
