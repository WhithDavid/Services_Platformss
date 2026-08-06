const PAGE_SIZE = 15;
const TASK_LIMIT = 8;

Page({
  data: {
    statusBarHeight: 20,
    currentUserLikeIds: [],
    handle_navigation_index: 0,
    handle_navigation: ['推荐', '校园动态', '二手市场', '失物招领', '校园评分'],
    notice_text: ['欢迎来到校园服务平台', '二手交易请线下验货', '代拿任务请确认地点和时间'],
    searchKeyword: '',
    tasks: [],
    allPosts: [],
    posts: [],
    postOffset: 0,
    hasMorePosts: true,
    hasLoadedOnce: false,
    initialLoading: false,
    loadingMore: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight || 20
    });
    this.restoreCircleCache();
  },

  onShow() {
    this.syncUserLikeState(() => {
      if (this.data.hasLoadedOnce) {
        this.refreshLikeState();
        return;
      }
      this.loadPublishedContent({ reset: true });
    });
  },

  onPullDownRefresh() {
    this.loadPublishedContent({ reset: true }).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    this.loadPublishedContent();
  },

  getCurrentUser() {
    return wx.getStorageSync('user') || wx.getStorageSync('campusUserInfo');
  },

  getCircleCache() {
    const app = getApp();
    return (app.globalData && app.globalData.circleFeedCache) || null;
  },

  saveCircleCache(extra = {}) {
    const app = getApp();
    if (!app.globalData) return;

    app.globalData.circleFeedCache = {
      allPosts: this.data.allPosts,
      tasks: this.data.tasks,
      postOffset: this.data.postOffset,
      hasMorePosts: this.data.hasMorePosts,
      hasLoadedOnce: this.data.hasLoadedOnce,
      ...extra
    };
  },

  restoreCircleCache() {
    const cache = this.getCircleCache();
    if (!cache || !cache.hasLoadedOnce) return;

    this.setData({
      allPosts: cache.allPosts || [],
      tasks: cache.tasks || [],
      postOffset: Number(cache.postOffset) || 0,
      hasMorePosts: cache.hasMorePosts !== false,
      hasLoadedOnce: true
    }, () => this.applyFilters());
  },

  canShowInCircle(item) {
    return Number(item.post_status) === 1;
  },

  normalizeArrayField(value) {
    if (Array.isArray(value)) return value;
    if (value === '' || value === null || value === undefined) return [];
    return [value];
  },

  saveCurrentUserCache(nextUser) {
    wx.setStorageSync('user', nextUser);
    wx.setStorageSync('campusUserInfo', nextUser);
  },

  syncUserLikeState(callback) {
    const currentUser = this.getCurrentUser();
    const currentUserLikeIds = currentUser ? this.normalizeArrayField(currentUser.user_like) : [];
    this.setData({ currentUserLikeIds }, callback);
  },

  refreshLikeState() {
    const currentUserLikeIds = this.data.currentUserLikeIds || [];
    this.setData({
      allPosts: this.data.allPosts.map((item) => ({
        ...item,
        isLiked: currentUserLikeIds.includes(item.id)
      })),
      tasks: this.data.tasks.map((item) => ({
        ...item,
        isLiked: currentUserLikeIds.includes(item.id)
      }))
    }, () => {
      this.applyFilters();
      this.saveCircleCache();
    });
  },

  mergePosts(existingList, incomingList) {
    const postMap = new Map();
    (existingList || []).forEach((item) => {
      postMap.set(item.id, item);
    });
    (incomingList || []).forEach((item) => {
      postMap.set(item.id, item);
    });
    return Array.from(postMap.values());
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
    const currentUserLikeIds = this.data.currentUserLikeIds || [];
    return {
      id: item._id || item.id,
      userOpenid: item.user_openid || '',
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
      isLiked: currentUserLikeIds.includes(item._id || item.id),
      status: this.getPostStatus(item)
    };
  },

  normalizeTaskItem(item) {
    const currentUserLikeIds = this.data.currentUserLikeIds || [];
    return {
      id: item._id || item.id,
      userOpenid: item.user_openid || '',
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
      isLiked: currentUserLikeIds.includes(item._id || item.id),
      status: item.post_status === 1 ? '待接单' : '已结束'
    };
  },

  async loadPublishedContent(options = {}) {
    const { reset = false } = options;
    if (reset) {
      if (this.data.initialLoading) return;
    } else {
      if (this.data.loadingMore || !this.data.hasMorePosts) return;
    }

    const shouldLoadTasks = reset || !this.data.tasks.length;
    try {
      this.setData({
        initialLoading: reset,
        loadingMore: !reset
      });

      const res = await wx.cloud.callFunction({
        name: 'getCirclePosts',
        data: {
          postLimit: PAGE_SIZE,
          postSkip: reset ? 0 : this.data.postOffset,
          taskLimit: TASK_LIMIT,
          includeTasks: shouldLoadTasks
        }
      });

      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.message) || '加载帖子失败');
      }

      const resultData = res.result.data || {};
      const incomingPosts = ((resultData.posts || [])
        .filter(item => this.canShowInCircle(item))
        .map(item => this.normalizePostItem(item)));
      const incomingTasks = ((resultData.tasks || [])
        .filter(item => this.canShowInCircle(item))
        .map(item => this.normalizeTaskItem(item)));
      const allPosts = reset
        ? incomingPosts
        : this.mergePosts(this.data.allPosts, incomingPosts);
      const tasks = shouldLoadTasks ? incomingTasks : this.data.tasks;

      this.setData({
        allPosts,
        tasks,
        postOffset: Number(resultData.nextPostSkip) || allPosts.length,
        hasMorePosts: resultData.hasMorePosts !== false,
        hasLoadedOnce: true,
        initialLoading: false,
        loadingMore: false
      }, () => {
        this.applyFilters();
        this.saveCircleCache();
      });
    } catch (error) {
      console.log('loadPublishedContent error:', error);
      this.setData(reset ? {
        initialLoading: false,
        loadingMore: false,
        allPosts: this.data.hasLoadedOnce ? this.data.allPosts : [],
        posts: this.data.hasLoadedOnce ? this.data.posts : [],
        tasks: this.data.hasLoadedOnce ? this.data.tasks : []
      } : {
        loadingMore: false
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
  },

  toUserProfile(e) {
    const openid = e.currentTarget.dataset.openid;
    if (!openid) return;
    const currentUser = this.getCurrentUser();
    const currentUserOpenid = currentUser ? (currentUser.user_openid || '') : '';
    if (openid === currentUserOpenid) return;

    wx.navigateTo({
      url: `/pages/user_profile/user_profile?openid=${openid}`
    });
  },

  async togglePostLike(e) {
    const postId = e.currentTarget.dataset.id;
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能点赞帖子。',
        confirmText: '前往登录',
        confirmColor: '#222222',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/User/User'
            });
          }
        }
      });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'togglePostLike',
        data: {
          post_id: postId
        }
      });

      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.message) || '点赞失败');
      }

      const resultData = res.result.data || {};
      const nextUser = {
        ...currentUser,
        user_like: this.normalizeArrayField(resultData.user_like)
      };

      this.saveCurrentUserCache(nextUser);
      this.setData({
        currentUserLikeIds: nextUser.user_like,
        allPosts: this.data.allPosts.map((item) => {
          if (item.id !== postId) return item;
          return {
            ...item,
            isLiked: !!resultData.liked,
            likes: resultData.post_like_num
          };
        }),
        tasks: this.data.tasks.map((item) => {
          if (item.id !== postId) return item;
          return {
            ...item,
            isLiked: !!resultData.liked,
            likes: resultData.post_like_num
          };
        })
      }, () => {
        this.applyFilters();
        this.saveCircleCache();
      });
    } catch (error) {
      console.log('toggle post like error:', error);
      wx.showToast({
        title: '点赞失败，请稍后再试',
        icon: 'none'
      });
    }
  }
});
