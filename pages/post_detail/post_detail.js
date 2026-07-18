const mock = require('../../utils/mock.js');

Page({
  data: {
    statusBarHeight: 30,
    post: null,
    comments: [
      {
        id: 'comment-001',
        author: '路过同学',
        content: '这个信息有用，先收藏了。',
        createdAt: '2026-07-14 12:30'
      },
      {
        id: 'comment-002',
        author: '热心室友',
        content: '建议后面加上校区筛选，会更方便。',
        createdAt: '2026-07-14 12:42'
      }
    ]
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    const localPosts = wx.getStorageSync('campusPublishedPosts') || [];
    const localTasks = wx.getStorageSync('campusPublishedTasks') || [];
    const allContent = localPosts.concat(mock.posts, localTasks, mock.tasks || []);
    const post = allContent.find(item => item.id === options.id) || mock.posts[0];

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 30,
      post
    });
  },

  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  likePost() {
    wx.showToast({
      title: '已点赞',
      icon: 'success'
    });
  },

  favoritePost() {
    wx.showToast({
      title: '已收藏',
      icon: 'success'
    });
  }
});
