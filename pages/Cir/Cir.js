Page({
  data: {
    statusBarHeight: 20,
    handle_navigation_index: 0,
    handle_navigation: ['推荐', '校园动态', '二手市场', '失物招领', '校园评分'],
    notice_text: ['欢迎来到校园服务平台', '二手交易请线下验货', '代拿任务请确认地点和时间'],
    searchKeyword: '',
    tasks: [],
    allPosts: [],
    posts: []
  },

  onLoad() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight || 20
    });
  },

  onShow() {
    this.loadPublishedContent();
  },

  formatDateTime(value) {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  getPostType(category) {
    const typeMap = {
      '校园动态': 'normal',
      '二手市场': 'goods',
      '失物招领': 'lost',
      '校园评分': 'rating'
    };
    return typeMap[category] || 'normal';
  },

  getPostStatus(item) {
    const statusMap = {
      '校园动态': '正常',
      '二手市场': '在售',
      '失物招领': '寻找中',
      '校园评分': '已发布'
    };
    return statusMap[item.post_sub_type] || (item.post_status === 1 ? '正常' : '已下线');
  },

  isVideoFile(url) {
    return /\.(mp4|mov|m4v|avi|wmv|webm)$/i.test(url || '');
  },

  normalizeMediaList(mediaList) {
    const list = Array.isArray(mediaList) ? mediaList : [];
    return list
      .map((item) => {
        if (typeof item === 'string') {
          return {
            url: item,
            type: this.isVideoFile(item) ? 'video' : 'image',
            poster: ''
          };
        }

        if (item && item.url) {
          return {
            url: item.url,
            type: item.type || (this.isVideoFile(item.url) ? 'video' : 'image'),
            poster: item.poster || ''
          };
        }

        return null;
      })
      .filter(Boolean);
  },

  normalizePostItem(item) {
    const mediaList = this.normalizeMediaList(item.post_img || item.images || []);
    return {
      id: item._id || item.id,
      type: this.getPostType(item.post_sub_type || item.category),
      category: item.post_sub_type || item.category || '校园动态',
      title: item.post_title || item.title || '',
      content: item.post_content || item.content || '',
      author: item.user_name || item.author || '校园用户',
      avatar: item.user_icon || item.avatar || '/pages/images/User.png',
      createdAt: this.formatDateTime(item.post_time || item.createdAt),
      price: item.post_price ?? item.price ?? '',
      score: item.post_score ?? item.score ?? '',
      mediaFiles: mediaList,
      images: mediaList.filter(media => media.type === 'image').map(media => media.url),
      videos: mediaList.filter(media => media.type === 'video').map(media => media.url),
      views: item.views ?? 0,
      comments: item.post_comment_num ?? item.comments ?? 0,
      likes: item.post_like_num ?? item.likes ?? 0,
      status: this.getPostStatus(item)
    };
  },

  normalizeTaskItem(item) {
    return {
      id: item._id || item.id,
      category: item.post_sub_type || item.category || '悬赏任务',
      title: item.post_title || item.title || '',
      content: item.post_content || item.content || '',
      location: item.location || `${item.post_pickup_location || ''} → ${item.post_delivery_location || ''}`,
      deadline: item.deadline || (item.post_deadline ? `${item.post_deadline} 前` : ''),
      reward: item.post_reward ?? item.reward ?? 0,
      author: item.user_name || item.author || '校园用户',
      avatar: item.user_icon || item.avatar || '/pages/images/User.png',
      createdAt: this.formatDateTime(item.post_time || item.createdAt),
      views: item.views ?? 0,
      comments: item.post_comment_num ?? item.comments ?? 0,
      likes: item.post_like_num ?? item.likes ?? 0,
      status: item.post_status === 1 ? '待接单' : '已结束'
    };
  },

  async loadPublishedContent() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('post').orderBy('post_time', 'desc').limit(100).get();
      const list = res.data || [];
      const allPosts = list
        .filter(item => item.post_parent_type !== '悬赏')
        .map(item => this.normalizePostItem(item));
      const tasks = list
        .filter(item => item.post_parent_type === '悬赏')
        .map(item => this.normalizeTaskItem(item));

      this.setData({
        allPosts,
        tasks
      }, () => this.applyFilters());
    } catch (error) {
      console.log('loadPublishedContent error:', error);
      this.setData({
        allPosts: [],
        posts: [],
        tasks: []
      });
      wx.showToast({
        title: '加载帖子失败',
        icon: 'none'
      });
    }
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

  previewPostImage(e) {
    const current = e.currentTarget.dataset.src;
    const images = e.currentTarget.dataset.images || [];

    wx.previewImage({
      current,
      urls: images
    });
  },

  noop() {},

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
