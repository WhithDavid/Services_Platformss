// app.js
App({
  globalData: {
    statusBarHeight: 20
  },

  onLaunch() {
    wx.cloud.init()

    const systemInfo = wx.getSystemInfoSync()// 获取系统信息
    this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20// 顶部状态栏高度
  },
})
