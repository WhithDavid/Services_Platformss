const DEFAULT_AVATAR = '/pages/images/User.png';
const USER_STORAGE_KEY = 'user';
const LEGACY_USER_STORAGE_KEY = 'campusUserInfo';
const REPLY_FOLD_LIMIT = 3;
const COMMENT_IMAGE_LIMIT = 3;

Page({
  data: {
    statusBarHeight: 20,
    postId: '',
    loading: true,
    submittingComment: false,
    currentUserOpenid: '',
    post: null,
    comments: [],
    commentTotal: 0,
    commentInput: '',
    commentImages: [],
    commentPlaceholder: '说点什么，友善交流...',
    replyTarget: null,
    inputFocus: false
  },

  onLoad(options) {
    const app = getApp();
    const postId = options.id || '';
    const currentUser = this.getCurrentUser();

    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      postId,
      currentUserOpenid: currentUser ? (currentUser.user_openid || '') : ''
    });

    this.loadPostDetail();
  },

  onShow() {
    const currentUser = this.getCurrentUser();
    const currentUserOpenid = currentUser ? (currentUser.user_openid || '') : '';

    if (currentUserOpenid !== this.data.currentUserOpenid) {
      this.setData({ currentUserOpenid });
      if (!this.data.loading && this.data.postId) {
        this.refreshComments();
      }
    }
  },

  onPullDownRefresh() {
    this.loadPostDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  getCurrentUser() {
    return wx.getStorageSync(USER_STORAGE_KEY) || wx.getStorageSync(LEGACY_USER_STORAGE_KEY);
  },

  requireLogin() {
    if (this.getCurrentUser()) return true;

    wx.showModal({
      title: '请先登录',
      content: '登录校园账号后才能发表评论、回复或点赞。',
      confirmText: '前往登录',
      confirmColor: '#222222',
      success: res => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/User/User'
          });
        }
      }
    });
    return false;
  },

  async loadPostDetail() {
    if (!this.data.postId) {
      this.setData({
        loading: false,
        post: null,
        comments: [],
        commentTotal: 0
      });
      wx.showToast({
        title: '帖子不存在',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const [post, commentResult] = await Promise.all([
        this.fetchPostDetail(this.data.postId),
        this.fetchComments(this.data.postId)
      ]);

      const commentTotal = commentResult.totalCount || post.comments || 0;
      post.comments = commentTotal;

      this.setData({
        post,
        comments: commentResult.comments,
        commentTotal,
        loading: false
      });
    } catch (error) {
      console.log('load post detail error:', error);
      this.setData({
        loading: false,
        post: null,
        comments: [],
        commentTotal: 0
      });
      wx.showToast({
        title: '加载详情失败',
        icon: 'none'
      });
    }
  },

  async fetchPostDetail(postId) {
    const db = wx.cloud.database();
    const res = await db.collection('post').doc(postId).get();
    const rawPost = res.data || null;

    if (!rawPost) {
      throw new Error('post not found');
    }

    return this.normalizePost(rawPost);
  },

  async refreshComments() {
    if (!this.data.postId) return;

    try {
      const commentResult = await this.fetchComments(this.data.postId);
      this.setData({
        comments: commentResult.comments,
        commentTotal: commentResult.totalCount,
        'post.comments': commentResult.totalCount
      });
    } catch (error) {
      console.log('refresh comments error:', error);
    }
  },

  async fetchComments(postId) {
    const db = wx.cloud.database();
    const _ = db.command;
    const topLevelRes = await db.collection('post_comment')
      .where({
        parent_type: 'post',
        parent_id: postId,
        comment_status: 1
      })
      .orderBy('comment_time', 'desc')
      .limit(100)
      .get();

    const allItems = topLevelRes.data ? topLevelRes.data.slice() : [];
    const visited = new Set(allItems.map(item => item._id));
    let frontier = allItems.map(item => item._id);

    while (frontier.length) {
      const batches = this.chunkArray(frontier, 100);
      frontier = [];

      for (const batch of batches) {
        const replyRes = await db.collection('post_comment')
          .where({
            parent_type: 'comment',
            parent_id: _.in(batch),
            comment_status: 1
          })
          .orderBy('comment_time', 'asc')
          .limit(100)
          .get();

        (replyRes.data || []).forEach((item) => {
          if (visited.has(item._id)) return;
          visited.add(item._id);
          allItems.push(item);
          frontier.push(item._id);
        });
      }
    }

    return {
      comments: this.buildCommentThreads(allItems),
      totalCount: allItems.length
    };
  },

  chunkArray(list, size) {
    const chunks = [];
    for (let index = 0; index < list.length; index += size) {
      chunks.push(list.slice(index, index + size));
    }
    return chunks;
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

  getMediaLayoutClass(count) {
    if (count <= 1) return 'grid-1';
    if (count <= 4) return 'grid-2';
    return 'grid-3';
  },

  normalizePost(item) {
    const mediaFiles = this.normalizeMediaList(item.post_img || []);
    const category = item.post_sub_type || '校园动态';
    return {
      id: item._id,
      type: this.getPostType(category),
      category,
      title: item.post_title || '',
      content: item.post_content || '',
      author: item.user_name || '校园用户',
      avatar: item.user_icon || DEFAULT_AVATAR,
      createdAt: this.formatDateTime(item.post_time),
      price: item.post_price ?? '',
      score: item.post_score ?? '',
      reward: item.post_reward ?? '',
      pickupLocation: item.post_pickup_location || '',
      deliveryLocation: item.post_delivery_location || '',
      deadline: item.post_deadline || '',
      mediaFiles,
      mediaLayoutClass: this.getMediaLayoutClass(mediaFiles.length),
      images: mediaFiles.filter(media => media.type === 'image').map(media => media.url),
      views: item.views ?? 0,
      comments: item.post_comment_num ?? 0,
      likes: item.post_like_num ?? 0,
      status: this.getPostStatus(item),
      parentType: item.post_parent_type || '帖子'
    };
  },

  normalizeCommentItem(item) {
    const likerOpenids = Array.isArray(item.liker_openid) ? item.liker_openid : [];
    const currentUserOpenid = this.data.currentUserOpenid;
    const likeCount = Number(item.comment_likenum) || 0;
    const commentImages = Array.isArray(item.comment_img) ? item.comment_img : [];
    const timestamp = new Date(item.comment_time).getTime();

    return {
      id: item._id,
      parentId: item.parent_id || '',
      parentType: item.parent_type || 'post',
      replyName: item.reply_name || '',
      replyOpenid: item.reply_openid || '',
      userName: item.commenter_name || '校园用户',
      userIcon: item.commenter_icon || DEFAULT_AVATAR,
      userOpenid: item.commenter_openid || '',
      time: this.formatDateTime(item.comment_time),
      timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
      content: item.comment_content || '',
      images: commentImages,
      likeCount,
      isLiked: !!currentUserOpenid && likerOpenids.includes(currentUserOpenid),
      likerOpenids
    };
  },

  buildCommentThreads(rawItems) {
    const items = rawItems.map(item => this.normalizeCommentItem(item));
    const itemMap = new Map();
    const rootRepliesMap = new Map();
    const topLevelComments = [];

    items.forEach((item) => {
      itemMap.set(item.id, item);
    });

    items.forEach((item) => {
      if (item.parentType === 'post' && item.parentId === this.data.postId) {
        topLevelComments.push(item);
        return;
      }

      if (item.parentType !== 'comment') return;

      const rootCommentId = this.findRootCommentId(item, itemMap);
      if (!rootCommentId) return;

      const replyItem = {
        ...item,
        rootCommentId
      };

      if (!rootRepliesMap.has(rootCommentId)) {
        rootRepliesMap.set(rootCommentId, []);
      }
      rootRepliesMap.get(rootCommentId).push(replyItem);
    });

    topLevelComments.sort((prev, next) => next.timestamp - prev.timestamp);

    return topLevelComments.map((comment) => {
      const replies = (rootRepliesMap.get(comment.id) || []).sort((prev, next) => prev.timestamp - next.timestamp);
      return this.decorateComment({
        ...comment,
        replies
      });
    });
  },

  findRootCommentId(comment, itemMap) {
    let current = comment;
    let guard = 0;

    while (current && guard < 100) {
      if (current.parentType === 'post') {
        return current.id;
      }

      const parent = itemMap.get(current.parentId);
      if (!parent) return '';
      if (parent.parentType === 'post') {
        return parent.id;
      }

      current = parent;
      guard += 1;
    }

    return '';
  },

  decorateComment(comment) {
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    return {
      ...comment,
      expanded: false,
      visibleReplies: replies.slice(0, REPLY_FOLD_LIMIT),
      hiddenReplyCount: Math.max(0, replies.length - REPLY_FOLD_LIMIT)
    };
  },

  getVisibleReplies(replies, expanded) {
    const list = Array.isArray(replies) ? replies : [];
    return expanded ? list : list.slice(0, REPLY_FOLD_LIMIT);
  },

  toggleReplies(e) {
    const commentId = e.currentTarget.dataset.id;
    const comments = this.data.comments.map((comment) => {
      if (comment.id !== commentId) return comment;
      const expanded = !comment.expanded;
      return {
        ...comment,
        expanded,
        visibleReplies: this.getVisibleReplies(comment.replies, expanded)
      };
    });

    this.setData({ comments });
  },

  startReply(e) {
    if (!this.requireLogin()) return;

    const { id, name, openid } = e.currentTarget.dataset;
    this.setData({
      replyTarget: {
        targetId: id,
        targetName: name,
        targetOpenid: openid || ''
      },
      commentPlaceholder: `回复 ${name}`,
      inputFocus: true
    });
  },

  clearReplyTarget() {
    this.setData({
      replyTarget: null,
      commentPlaceholder: '说点什么，友善交流...',
      inputFocus: false
    });
  },

  onCommentInput(e) {
    this.setData({
      commentInput: e.detail.value
    });
  },

  onInputBlur() {
    this.setData({
      inputFocus: false
    });
  },

  chooseCommentImage() {
    if (!this.requireLogin()) return;

    const remaining = COMMENT_IMAGE_LIMIT - this.data.commentImages.length;
    if (remaining <= 0) {
      wx.showToast({
        title: `最多上传 ${COMMENT_IMAGE_LIMIT} 张图片`,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const images = (res.tempFiles || []).map(item => item.tempFilePath);
        this.setData({
          commentImages: this.data.commentImages.concat(images)
        });
      }
    });
  },

  removeCommentImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const commentImages = this.data.commentImages.filter((item, itemIndex) => itemIndex !== index);
    this.setData({ commentImages });
  },

  previewComposerImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current,
      urls: this.data.commentImages
    });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    const images = e.currentTarget.dataset.images || [];
    wx.previewImage({
      current,
      urls: images
    });
  },

  getFileExtension(filePath) {
    const cleanPath = filePath.split('?')[0];
    const matched = cleanPath.match(/\.([^.\\/]+)$/);
    return matched ? matched[1] : 'jpg';
  },

  async uploadCommentImagesToCloud() {
    if (!this.data.commentImages.length) return [];

    const uploadTasks = this.data.commentImages.map((filePath, index) => {
      const extension = this.getFileExtension(filePath);
      const cloudPath = `comment/${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}.${extension}`;
      return wx.cloud.uploadFile({
        cloudPath,
        filePath
      });
    });

    const results = await Promise.all(uploadTasks);
    return results.map(item => item.fileID);
  },

  async submitComment() {
    if (this.data.submittingComment) return;
    if (!this.requireLogin()) return;

    const content = (this.data.commentInput || '').trim();
    if (!content && !this.data.commentImages.length) {
      wx.showToast({
        title: '请输入评论内容或添加图片',
        icon: 'none'
      });
      return;
    }

    this.setData({ submittingComment: true });

    try {
      const commentImages = await this.uploadCommentImagesToCloud();
      const replyTarget = this.data.replyTarget;
      const cloudRes = await wx.cloud.callFunction({
        name: 'addPostComment',
        data: {
          payload: {
            post_id: this.data.postId,
            comment_content: content,
            comment_img: commentImages,
            parent_type: replyTarget ? 'comment' : 'post',
            parent_id: replyTarget ? replyTarget.targetId : this.data.postId,
            reply_name: replyTarget ? replyTarget.targetName : '',
            reply_openid: replyTarget ? replyTarget.targetOpenid : ''
          }
        }
      });

      if (!cloudRes.result || cloudRes.result.code !== 0) {
        throw new Error((cloudRes.result && cloudRes.result.message) || '评论失败');
      }

      this.setData({
        commentInput: '',
        commentImages: [],
        replyTarget: null,
        commentPlaceholder: '说点什么，友善交流...',
        inputFocus: false
      });

      await this.refreshComments();
      wx.showToast({
        title: replyTarget ? '回复成功' : '评论成功',
        icon: 'success'
      });
    } catch (error) {
      console.log('submit comment error:', error);
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submittingComment: false });
    }
  },

  async toggleCommentLike(e) {
    if (!this.requireLogin()) return;

    const commentId = e.currentTarget.dataset.id;
    if (!commentId) return;

    try {
      const cloudRes = await wx.cloud.callFunction({
        name: 'togglePostCommentLike',
        data: {
          comment_id: commentId
        }
      });

      if (!cloudRes.result || cloudRes.result.code !== 0) {
        throw new Error((cloudRes.result && cloudRes.result.message) || '操作失败');
      }

      const { comment_id: targetId, liked, comment_likenum: likeCount } = cloudRes.result.data || {};
      const comments = this.data.comments.map((comment) => {
        if (comment.id === targetId) {
          return {
            ...comment,
            isLiked: liked,
            likeCount
          };
        }

        const replies = (comment.replies || []).map((reply) => {
          if (reply.id !== targetId) return reply;
          return {
            ...reply,
            isLiked: liked,
            likeCount
          };
        });

        const visibleReplies = comment.expanded ? replies : replies.slice(0, REPLY_FOLD_LIMIT);
        return {
          ...comment,
          replies,
          visibleReplies
        };
      });

      this.setData({ comments });
    } catch (error) {
      console.log('toggle comment like error:', error);
      wx.showToast({
        title: '点赞失败，请稍后再试',
        icon: 'none'
      });
    }
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
