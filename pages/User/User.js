const USER_STORAGE_KEY = 'campusUserInfo';
const USER_CACHE_KEY = 'user';
const app = getApp();

const CONTENT_TAB_CONFIG = [
  { key: 'posts', label: '我的帖子', mark: '帖', field: 'user_post' },
  { key: 'favorites', label: '我的点赞', mark: '赞', field: 'user_like' },
  { key: 'history', label: '浏览历史', mark: '历', field: 'browsing_history' }
];

const POST_STATUS_MAP = {
  1: { label: '公开', className: 'public' },
  2: { label: '仅自己可见', className: 'private' }
};

function normalizeArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value === '' || value === null || value === undefined) return [];
  return [value];
}

function normalizeUserInfo(userInfo) {
  if (!userInfo) return null;
  return {
    ...userInfo,
    user_like: normalizeArrayField(userInfo.user_like),
    user_post: normalizeArrayField(userInfo.user_post),
    browsing_history: normalizeArrayField(userInfo.browsing_history),
    user_collect: normalizeArrayField(userInfo.user_collect)
  };
}

function buildContentTabs(userInfo) {
  const normalizedUser = normalizeUserInfo(userInfo);
  return CONTENT_TAB_CONFIG.map((item) => ({
    ...item,
    count: normalizedUser ? normalizeArrayField(normalizedUser[item.field]).length : 0
  }));
}

function parseStatNumber(...values) {
  for (const value of values) {
    if (value === '' || value === null || value === undefined) continue;
    if (Array.isArray(value)) return value.length;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function buildFollowStats(userInfo) {
  return {
    following: parseStatNumber(
      userInfo && userInfo.following_count,
      userInfo && userInfo.follow_count,
      userInfo && userInfo.user_follow_count,
      userInfo && userInfo.following,
      userInfo && userInfo.user_follow,
      userInfo && userInfo.user_attention_count,
      userInfo && userInfo.following_list,
      userInfo && userInfo.user_follow_list
    ),
    fans: parseStatNumber(
      userInfo && userInfo.fans_count,
      userInfo && userInfo.fansCount,
      userInfo && userInfo.followers_count,
      userInfo && userInfo.user_fans_count,
      userInfo && userInfo.user_follower_count,
      userInfo && userInfo.fans,
      userInfo && userInfo.followers,
      userInfo && userInfo.fans_list,
      userInfo && userInfo.followers_list
    )
  };
}

Page({
  data: {
    statusBarHeight: 20,
    userInfo: null,
    followStats: buildFollowStats(null),
    unLoginUrl: '/pages/images/User.png',
    activeContentTab: 'posts',
    activeContentMark: '帖',
    contentTabs: buildContentTabs(null),
    displayContentList: [],
    contentLoading: false,
    activeManagePostId: '',
    pendingDeletePostId: '',
    showDeleteConfirm: false,
    taskEntries: [
      { key: 'published', icon: '发', label: '我发布的', count: 2 },
      { key: 'accepted', icon: '接', label: '我接取的', count: 1 },
      { key: 'processing', icon: '进', label: '进行中', count: 1 },
      { key: 'completed', icon: '完', label: '已完成', count: 6 }
    ]
  },

  onLoad() {
    this.contentCache = {
      posts: [],
      favorites: [],
      history: []
    };
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || systemInfo.statusBarHeight || 20
    });
    this.restoreLoginState();
  },

  onShow() {
    this.restoreLoginState();
  },

  restoreLoginState() {
    const storedUser = wx.getStorageSync(USER_CACHE_KEY) || wx.getStorageSync(USER_STORAGE_KEY);
    const userInfo = normalizeUserInfo(storedUser);

    this.setData({
      userInfo,
      followStats: buildFollowStats(userInfo),
      contentTabs: buildContentTabs(userInfo),
      activeManagePostId: '',
      showDeleteConfirm: false,
      pendingDeletePostId: ''
    });

    if (userInfo) {
      this.restoreContentCache(userInfo);
      this.setActiveContentList(this.data.activeContentTab);
      this.refreshUserContent(userInfo);
      return;
    }

    this.contentCache = {
      posts: [],
      favorites: [],
      history: []
    };
    this.setData({
      displayContentList: []
    });
  },

  saveUserCache(userInfo) {
    const normalizedUser = normalizeUserInfo(userInfo);
    wx.setStorageSync(USER_CACHE_KEY, normalizedUser);
    wx.setStorageSync(USER_STORAGE_KEY, normalizedUser);
    this.setData({
      userInfo: normalizedUser,
      followStats: buildFollowStats(normalizedUser),
      contentTabs: buildContentTabs(normalizedUser)
    });
  },

  getContentCacheStorageKey(userInfo) {
    const userOpenid = userInfo && userInfo.user_openid ? userInfo.user_openid : 'guest';
    return `userContentCache:${userOpenid}`;
  },

  restoreContentCache(userInfo) {
    const cacheKey = this.getContentCacheStorageKey(userInfo);
    const cache = wx.getStorageSync(cacheKey);
    this.contentCache = {
      posts: Array.isArray(cache.posts) ? cache.posts : [],
      favorites: Array.isArray(cache.favorites) ? cache.favorites : [],
      history: Array.isArray(cache.history) ? cache.history : []
    };
  },

  persistContentCache(userInfo) {
    if (!userInfo) return;
    wx.setStorageSync(this.getContentCacheStorageKey(userInfo), this.contentCache);
  },

  setActiveContentList(tabKey) {
    this.setData({
      displayContentList: Array.isArray(this.contentCache[tabKey]) ? this.contentCache[tabKey] : []
    });
  },

  async syncUserInfoFromCloud() {
    const storedUser = this.data.userInfo || normalizeUserInfo(wx.getStorageSync(USER_CACHE_KEY));
    if (!storedUser || !storedUser.user_openid) return storedUser;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('user').where({
        user_openid: storedUser.user_openid
      }).limit(1).get();

      if (res.data && res.data.length) {
        const nextUser = normalizeUserInfo(res.data[0]);
        this.saveUserCache(nextUser);
        return nextUser;
      }
    } catch (error) {
      console.log('sync user info error:', error);
    }

    return storedUser;
  },

  wxLogin() {
    wx.showLoading({
      title: '登录中...'
    });

    wx.cloud.callFunction({
      name: 'userLogin',
      success: async (res) => {
        if (res.result && res.result.code === 0) {
          const userInfo = normalizeUserInfo(res.result.data);
          this.saveUserCache(userInfo);
          await this.refreshUserContent(userInfo);
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          });
          return;
        }

        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      },
      fail: (err) => {
        console.log('userLogin error:', err);
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
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
      success: (res) => {
        if (res.confirm) this.wxLogin();
      }
    });
    return false;
  },

  onTaskTap(e) {
    if (!this.requireLogin()) return;

    const labels = {
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

  getFieldByTabKey(tabKey) {
    const targetTab = CONTENT_TAB_CONFIG.find((item) => item.key === tabKey);
    return targetTab ? targetTab.field : 'user_post';
  },

  getMarkByTabKey(tabKey) {
    const targetTab = CONTENT_TAB_CONFIG.find((item) => item.key === tabKey);
    return targetTab ? targetTab.mark : '帖';
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

  getPostStatusMeta(postStatus) {
    return POST_STATUS_MAP[Number(postStatus)] || POST_STATUS_MAP[1];
  },

  canViewPostForTab(post, field, userInfo) {
    const postStatus = Number(post.post_status);
    const isOwner = userInfo && userInfo.user_openid && post.user_openid === userInfo.user_openid;

    if (field === 'user_post') {
      return postStatus !== 0;
    }

    if (postStatus === 1) return true;
    return !!isOwner && postStatus === 2;
  },

  async fetchPostsByIds(postIds) {
    if (!postIds.length) return [];

    const db = wx.cloud.database();
    const _ = db.command;
    const uniqueIds = postIds.filter((id, index) => id && postIds.indexOf(id) === index);
    const batches = [];

    for (let index = 0; index < uniqueIds.length; index += 100) {
      batches.push(uniqueIds.slice(index, index + 100));
    }

    const results = [];
    for (const batch of batches) {
      const res = await db.collection('post').where({
        _id: _.in(batch)
      }).get();
      results.push(...(res.data || []));
    }

    const postMap = new Map();
    results.forEach((item) => {
      postMap.set(item._id, item);
    });

    return postIds
      .map((id) => postMap.get(id))
      .filter(Boolean);
  },

  mapPostToContentItem(post) {
    const statusMeta = this.getPostStatusMeta(post.post_status);
    return {
      id: post._id,
      title: post.post_title || '未命名帖子',
      desc: `${post.post_sub_type || '校园动态'} · ${this.formatDateTime(post.post_time) || '刚刚更新'}`,
      likes: Number(post.post_like_num) || 0,
      comments: Number(post.post_comment_num) || 0,
      views: Number(post.views) || 0,
      postStatus: Number(post.post_status) || 1,
      statusLabel: statusMeta.label,
      statusClassName: statusMeta.className
    };
  },

  buildContentListByTab(posts, userInfo, tabKey) {
    const field = this.getFieldByTabKey(tabKey);
    const targetIds = normalizeArrayField(userInfo[field]);
    const postMap = new Map();

    posts.forEach((item) => {
      postMap.set(item._id, item);
    });

    return targetIds
      .map((id) => postMap.get(id))
      .filter((item) => item && this.canViewPostForTab(item, field, userInfo))
      .map((item) => this.mapPostToContentItem(item));
  },

  async refreshUserContent(currentUser) {
    const userInfo = currentUser || this.data.userInfo;
    if (!userInfo) {
      this.setData({
        displayContentList: [],
        contentTabs: buildContentTabs(null)
      });
      return;
    }

    const cachedActiveList = Array.isArray(this.contentCache[this.data.activeContentTab])
      ? this.contentCache[this.data.activeContentTab]
      : [];
    this.setData({ contentLoading: !cachedActiveList.length });

    try {
      const latestUser = await this.syncUserInfoFromCloud();
      const targetUser = latestUser || userInfo;
      const allPostIds = Array.from(new Set([
        ...normalizeArrayField(targetUser.user_post),
        ...normalizeArrayField(targetUser.user_like),
        ...normalizeArrayField(targetUser.browsing_history)
      ].filter(Boolean)));
      const posts = await this.fetchPostsByIds(allPostIds);

      this.contentCache = {
        posts: this.buildContentListByTab(posts, targetUser, 'posts'),
        favorites: this.buildContentListByTab(posts, targetUser, 'favorites'),
        history: this.buildContentListByTab(posts, targetUser, 'history')
      };
      this.persistContentCache(targetUser);

      this.setData({
        displayContentList: this.contentCache[this.data.activeContentTab] || [],
        contentTabs: buildContentTabs(targetUser),
        activeManagePostId: '',
        showDeleteConfirm: false,
        pendingDeletePostId: ''
      });
    } catch (error) {
      console.log('refresh user content error:', error);
      this.setData({
        displayContentList: [],
        activeManagePostId: '',
        showDeleteConfirm: false,
        pendingDeletePostId: ''
      });
      wx.showToast({
        title: '加载个人内容失败',
        icon: 'none'
      });
    } finally {
      this.setData({ contentLoading: false });
    }
  },

  async onContentTabChange(e) {
    const key = e.currentTarget.dataset.key;
    if (!key || key === this.data.activeContentTab) return;

    this.setData({
      activeContentTab: key,
      activeContentMark: this.getMarkByTabKey(key),
      displayContentList: Array.isArray(this.contentCache[key]) ? this.contentCache[key] : [],
      activeManagePostId: '',
      showDeleteConfirm: false,
      pendingDeletePostId: ''
    });
  },

  onContentItemTap(e) {
    if (!this.requireLogin()) return;

    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/post_detail/post_detail?id=${id}`
    });
  },

  togglePostMenu(e) {
    const postId = e.currentTarget.dataset.id;
    if (!postId) return;

    this.setData({
      activeManagePostId: this.data.activeManagePostId === postId ? '' : postId
    });
  },

  closePostMenu() {
    if (!this.data.activeManagePostId) return;
    this.setData({
      activeManagePostId: ''
    });
  },

  async updateManagedPostStatus(postId, postStatus) {
    wx.showLoading({
      title: '处理中...'
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'updatePostStatus',
        data: {
          post_id: postId,
          post_status: postStatus
        }
      });

      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.message) || '更新失败');
      }

      const resultData = res.result.data || {};
      if (resultData.user_info) {
        this.saveUserCache(resultData.user_info);
      }

      await this.refreshUserContent(resultData.user_info || this.data.userInfo);
      wx.showToast({
        title: postStatus === 0 ? '帖子已删除' : '状态已更新',
        icon: 'success'
      });
    } catch (error) {
      console.log('update managed post status error:', error);
      wx.showToast({
        title: '操作失败，请稍后再试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  onManagePostAction(e) {
    const postId = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
    if (!postId || !action) return;

    if (action === 'delete') {
      this.setData({
        pendingDeletePostId: postId,
        showDeleteConfirm: true,
        activeManagePostId: ''
      });
      return;
    }

    const nextStatus = action === 'public' ? 1 : 2;
    this.setData({
      activeManagePostId: ''
    });
    this.updateManagedPostStatus(postId, nextStatus);
  },

  cancelDeletePost() {
    this.setData({
      showDeleteConfirm: false,
      pendingDeletePostId: ''
    });
  },

  confirmDeletePost() {
    const postId = this.data.pendingDeletePostId;
    if (!postId) return;

    this.setData({
      showDeleteConfirm: false,
      pendingDeletePostId: ''
    });
    this.updateManagedPostStatus(postId, 0);
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
      success: async (res) => {
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
