const mock = require('../../utils/mock.js');

Page({
  data: {
    statusBarHeight: 20,
    handle_navigation_index: 0,
    handle_navigation: mock.categories,
    notice_text: mock.notices,
    searchKeyword: '',
    tasks: mock.tasks,
    allPosts: mock.posts,
    posts: mock.posts
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20
    });
  },

  onShow() {
    this.loadPublishedContent();
  },

  loadPublishedContent() {
    const localPosts = wx.getStorageSync('campusPublishedPosts') || [];
    const localTasks = wx.getStorageSync('campusPublishedTasks') || [];
    const allPosts = localPosts.concat(mock.posts);

    this.setData({
      allPosts,
      tasks: localTasks.concat(mock.tasks)
    }, () => this.applyFilters());
  },

  clic(e) {
    const index = Number(e.currentTarget.dataset.nid);
    this.setData({
      handle_navigation_index: index
    }, () => this.applyFilters());
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value.trim()
    });
  },

  onSearch() {
    this.applyFilters();
  },

  applyFilters() {
    const keyword = this.data.searchKeyword;
    const category = this.data.handle_navigation[this.data.handle_navigation_index];
    let posts = category === '推荐'
      ? this.data.allPosts
      : this.data.allPosts.filter(item => item.category === category);

    if (keyword) {
      posts = posts.filter(item => {
        return item.title.indexOf(keyword) !== -1 ||
          item.content.indexOf(keyword) !== -1 ||
          item.category.indexOf(keyword) !== -1;
      });
    }

    this.setData({ posts });
  },

  toPostDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post_detail/post_detail?id=${id}`
    });
  },

  toTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post_detail/post_detail?id=${id}`
    });
  }
});
