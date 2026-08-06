const DEFAULT_AVATAR = '/pages/images/User.png';
const USER_STORAGE_KEY = 'user';
const LEGACY_USER_STORAGE_KEY = 'campusUserInfo';

function normalizeArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value === '' || value === null || value === undefined) return [];
  return [value];
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

function buildPrivacySettings(userInfo) {
  return {
    post_public: userInfo ? userInfo.post_public !== false : true,
    like_public: userInfo ? userInfo.like_public !== false : true,
    history_public: userInfo ? userInfo.history_public !== false : true
  };
}

Page({
  data: {
    statusBarHeight: 20,
    targetOpenid: '',
    currentUserOpenid: '',
    loading: true,
    profileUser: null,
    followStats: buildFollowStats(null),
    privacySettings: buildPrivacySettings(null),
    summaryStats: {
      postCount: 0,
      likeReceived: 0,
      historyCount: 0
    },
    postList: [],
    likeList: [],
    historyList: [],
    tabs: [
      { key: 'posts', label: 'TA的帖子', mark: '帖' },
      { key: 'likes', label: 'TA的点赞', mark: '赞' },
      { key: 'history', label: '浏览历史', mark: '历' }
    ],
    activeTab: 'posts',
    activeMark: '帖',
    displayList: [],
    contentLocked: false,
    isSelf: false,
    isFollowing: false,
    followLoading: false
  },

  onLoad(options) {
    const app = getApp();
    const currentUser = this.getCurrentUser();
    const targetOpenid = options.openid || '';
    const currentUserOpenid = currentUser ? (currentUser.user_openid || '') : '';

    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      targetOpenid,
      currentUserOpenid,
      isSelf: !!targetOpenid && targetOpenid === currentUserOpenid
    });

    this.loadProfilePage();
  },

  onShow() {
    const currentUser = this.getCurrentUser();
    const currentUserOpenid = currentUser ? (currentUser.user_openid || '') : '';
    const followingList = currentUser ? normalizeArrayField(currentUser.user_follow) : [];

    this.setData({
      currentUserOpenid,
      isSelf: !!this.data.targetOpenid && this.data.targetOpenid === currentUserOpenid,
      isFollowing: followingList.includes(this.data.targetOpenid)
    });
  },

  onPullDownRefresh() {
    this.loadProfilePage().finally(() => wx.stopPullDownRefresh());
  },

  getCurrentUser() {
    return wx.getStorageSync(USER_STORAGE_KEY) || wx.getStorageSync(LEGACY_USER_STORAGE_KEY);
  },

  saveCurrentUserCache(nextUser) {
    wx.setStorageSync(USER_STORAGE_KEY, nextUser);
    wx.setStorageSync(LEGACY_USER_STORAGE_KEY, nextUser);
  },

  requireLogin() {
    if (this.getCurrentUser()) return true;

    wx.showModal({
      title: '请先登录',
      content: '登录后才能关注其他用户。',
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
    return false;
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

  getPrivacyFieldByTab(tabKey) {
    const fieldMap = {
      posts: 'post_public',
      likes: 'like_public',
      history: 'history_public'
    };
    return fieldMap[tabKey] || 'post_public';
  },

  getListByTab(tabKey) {
    if (tabKey === 'likes') return this.data.likeList;
    if (tabKey === 'history') return this.data.historyList;
    return this.data.postList;
  },

  canShowTabContent(tabKey, profileUser) {
    if (this.data.isSelf) return true;
    const field = this.getPrivacyFieldByTab(tabKey);
    return profileUser ? profileUser[field] !== false : true;
  },

  getPreferredTab(profileUser) {
    const tabKeys = ['posts', 'likes', 'history'];
    const availableTab = tabKeys.find((key) => this.canShowTabContent(key, profileUser));
    return availableTab || 'posts';
  },

  canViewPost(item) {
    return Number(item.post_status) === 1;
  },

  normalizePostItem(item, mark) {
    return {
      id: item._id,
      mark,
      title: item.post_title || '未命名帖子',
      desc: `${item.post_sub_type || '校园动态'} · ${this.formatDateTime(item.post_time) || '刚刚更新'}`,
      likes: Number(item.post_like_num) || 0,
      comments: Number(item.post_comment_num) || 0,
      views: Number(item.views) || 0,
      category: item.post_sub_type || '校园动态',
      type: this.getPostType(item.post_sub_type)
    };
  },

  async fetchPostsByIds(postIds, mark) {
    const ids = Array.from(new Set(normalizeArrayField(postIds).filter(Boolean)));
    if (!ids.length) return [];

    const db = wx.cloud.database();
    const _ = db.command;
    const batches = [];
    for (let index = 0; index < ids.length; index += 100) {
      batches.push(ids.slice(index, index + 100));
    }

    const allPosts = [];
    for (const batch of batches) {
      const res = await db.collection('post').where({
        _id: _.in(batch)
      }).get();
      allPosts.push(...(res.data || []));
    }

    const postMap = new Map();
    allPosts.forEach((item) => {
      postMap.set(item._id, item);
    });

    return ids
      .map((id) => postMap.get(id))
      .filter((item) => item && this.canViewPost(item))
      .map((item) => this.normalizePostItem(item, mark));
  },

  async loadProfilePage() {
    if (!this.data.targetOpenid) {
      this.setData({
        loading: false,
        profileUser: null,
        displayList: []
      });
      wx.showToast({
        title: '用户信息缺失',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const currentUser = this.getCurrentUser();
      const currentFollowing = currentUser ? normalizeArrayField(currentUser.user_follow) : [];
      const profileRes = await wx.cloud.callFunction({
        name: 'getUserProfile',
        data: {
          target_openid: this.data.targetOpenid
        }
      });

      if (!profileRes.result || profileRes.result.code !== 0) {
        throw new Error((profileRes.result && profileRes.result.message) || 'user not found');
      }

      const profileUser = (profileRes.result.data && profileRes.result.data.user) || null;
      if (!profileUser) {
        throw new Error('user not found');
      }

      const [posts, likes, history] = await Promise.all([
        this.fetchPostsByIds(profileUser.user_post, '帖'),
        this.fetchPostsByIds(profileUser.user_like, '赞'),
        this.fetchPostsByIds(profileUser.browsing_history, '历')
      ]);

      const preferredTab = this.getPreferredTab(profileUser);
      const activeTab = this.canShowTabContent(this.data.activeTab, profileUser)
        ? this.data.activeTab
        : preferredTab;
      const activeMark = activeTab === 'posts' ? '帖' : activeTab === 'likes' ? '赞' : '历';
      const canShowCurrentTab = this.canShowTabContent(activeTab, profileUser);
      const displayList = canShowCurrentTab ? (
        activeTab === 'posts'
          ? posts
          : activeTab === 'likes'
            ? likes
            : history
      ) : [];

      this.setData({
        loading: false,
        profileUser,
        followStats: buildFollowStats(profileUser),
        privacySettings: buildPrivacySettings(profileUser),
        summaryStats: {
          postCount: posts.length,
          likeReceived: posts.reduce((sum, item) => sum + (Number(item.likes) || 0), 0),
          historyCount: history.length
        },
        postList: posts,
        likeList: likes,
        historyList: history,
        activeTab,
        activeMark,
        displayList,
        contentLocked: !canShowCurrentTab,
        isFollowing: currentFollowing.includes(this.data.targetOpenid)
      });
    } catch (error) {
      console.log('load profile page error:', error);
      this.setData({
        loading: false,
        profileUser: null,
        displayList: []
      });
      wx.showToast({
        title: '加载用户主页失败',
        icon: 'none'
      });
    }
  },

  async onTabChange(e) {
    const key = e.currentTarget.dataset.key;
    if (!key || key === this.data.activeTab || this.data.loading) return;

    const mark = key === 'posts' ? '帖' : key === 'likes' ? '赞' : '历';
    const canShowCurrentTab = this.canShowTabContent(key, this.data.profileUser);
    this.setData({
      activeTab: key,
      activeMark: mark,
      displayList: canShowCurrentTab ? this.getListByTab(key) : [],
      contentLocked: !canShowCurrentTab
    });
  },

  async toggleFollow() {
    if (this.data.isSelf) return;
    if (this.data.followLoading) return;
    if (!this.requireLogin()) return;

    this.setData({ followLoading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'toggleUserFollow',
        data: {
          target_openid: this.data.targetOpenid
        }
      });

      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.message) || '关注失败');
      }

      const resultData = res.result.data || {};
      const currentUser = {
        ...(this.getCurrentUser() || {}),
        user_follow: normalizeArrayField(resultData.current_user && resultData.current_user.user_follow),
        user_follow_count: Number(resultData.current_user && resultData.current_user.user_follow_count) || 0,
        following_count: Number(resultData.current_user && resultData.current_user.following_count) || 0
      };

      this.saveCurrentUserCache(currentUser);
      this.setData({
        isFollowing: !!resultData.following,
        followStats: buildFollowStats(resultData.target_user || this.data.profileUser),
        profileUser: resultData.target_user || this.data.profileUser
      });

      wx.showToast({
        title: resultData.following ? '已关注' : '已取消关注',
        icon: 'success'
      });
    } catch (error) {
      console.log('toggle follow error:', error);
      wx.showToast({
        title: '操作失败，请稍后再试',
        icon: 'none'
      });
    } finally {
      this.setData({ followLoading: false });
    }
  },

  toPostDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/post_detail/post_detail?id=${id}`
    });
  },

  onBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/Cir/Cir'
        });
      }
    });
  }
});
