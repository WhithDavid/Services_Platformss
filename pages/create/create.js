const POST_STORAGE_KEY = 'campusPublishedPosts';
                                                                                                                                                                                                            const TASK_STORAGE_KEY = 'campusPublishedTasks';
const USER_STORAGE_KEY = 'user';
const LEGACY_USER_STORAGE_KEY = 'campusUserInfo';
const DEFAULT_AVATAR = '/pages/images/User_select.png';

Page({
  data: {
    statusBarHeight: 20,
    publishMode: 'post',
    postCategories: [
      { key: '校园动态', icon: '动' },
      { key: '二手市场', icon: '二' },
      { key: '失物招领', icon: '寻' },
      { key: '校园评分', icon: '评' }
    ],
    taskTypes: [
      { key: '快递代拿', icon: '快' },
      { key: '外卖代取', icon: '餐' },
      { key: '其他跑腿', icon: '跑' }
    ],
    selectedPostCategory: '校园动态',
    selectedTaskType: '快递代拿',
    mediaFiles: [],
    submitting: false,
    form: {
      title: '',
      content: '',
      price: '',
      condition: '',
      tradeLocation: '',
      ratingTarget: '',
      score: '',
      reward: '',
      pickupLocation: '',
      deliveryLocation: '',
      deadlineDate: '',
      deadlineTime: ''
    }
  },

  onLoad() {
    const app = getApp();
    const now = new Date();
    const date = this.formatDate(now);
    const time = this.formatTime(new Date(now.getTime() + 2 * 60 * 60 * 1000));

    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
      'form.deadlineDate': date,
      'form.deadlineTime': time
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  },

  selectMode(e) {
    this.setData({
      publishMode: e.currentTarget.dataset.mode
    });
  },

  selectPostCategory(e) {
    const category = e.currentTarget.dataset.category;
    if (category === '校园评分') {
      wx.navigateTo({
        url: '/pages/rating/rating?create=1'
      });
      return;
    }
    this.setData({
      selectedPostCategory: category
    });
  },

  selectTaskType(e) {
    this.setData({
      selectedTaskType: e.currentTarget.dataset.type
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: e.detail.value
    });
  },

  onDateChange(e) {
    this.setData({
      'form.deadlineDate': e.detail.value
    });
  },

  onTimeChange(e) {
    this.setData({
      'form.deadlineTime': e.detail.value
    });
  },

  chooseMedia() {
    const remaining = 9 - this.data.mediaFiles.length;
    if (remaining <= 0) {
      wx.showToast({
        title: '最多上传 9 个媒体文件',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: res => {
        const mediaFiles = res.tempFiles.map(item => ({
          type: item.fileType === 'video' ? 'video' : 'image',
          url: item.tempFilePath,
          poster: item.thumbTempFilePath || ''
        }));
        this.setData({
          mediaFiles: this.data.mediaFiles.concat(mediaFiles)
        });
      }
    });
  },

  previewMedia(e) {
    const { src, type } = e.currentTarget.dataset;

    if (type === 'video') return;

    const imageUrls = this.data.mediaFiles
      .filter(item => item.type === 'image')
      .map(item => item.url);

    wx.previewImage({
      current: src,
      urls: imageUrls
    });
  },

  removeMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    const mediaFiles = this.data.mediaFiles.filter((item, itemIndex) => itemIndex !== index);
    this.setData({ mediaFiles });
  },

  getTrimmedForm() {
    const form = {};
    Object.keys(this.data.form).forEach(key => {
      const value = this.data.form[key];
      form[key] = typeof value === 'string' ? value.trim() : value;
    });
    return form;
  },

  validatePost(form) {
    if (!form.title || !form.content) return '请填写标题和正文内容';

    if (this.data.selectedPostCategory === '二手市场') {
      if (!form.price || Number(form.price) <= 0) return '请输入有效的商品价格';
      if (!form.condition) return '请填写商品成色';
      if (!form.tradeLocation) return '请填写交易地点';
    }

    if (this.data.selectedPostCategory === '校园评分') {
      const score = Number(form.score);
      if (!form.ratingTarget) return '请填写评分对象';
      if (!form.score || score < 0 || score > 10) return '评分请输入 0 到 10';
    }

    return '';
  },

  validateTask(form) {
    if (!form.title || !form.content) return '请填写任务标题和说明';
    if (!form.pickupLocation) return '请填写取件地点';
    if (!form.deliveryLocation) return '请填写送达地点';
    if (!form.reward || Number(form.reward) <= 0) return '请输入有效的悬赏金额';
    if (!form.deadlineDate || !form.deadlineTime) return '请选择截止时间';
    return '';
  },

  getCurrentUser() {
    return wx.getStorageSync(USER_STORAGE_KEY) || wx.getStorageSync(LEGACY_USER_STORAGE_KEY);
  },

  getAuthor() {
    const userInfo = this.getCurrentUser();
    return {
      user_name: userInfo ? (userInfo.user_name || userInfo.Name || '校园用户') : '校园用户',
      user_icon: userInfo ? (userInfo.user_icon || userInfo.imgHand || DEFAULT_AVATAR) : DEFAULT_AVATAR,
      user_openid: userInfo ? userInfo.user_openid || '' : ''
    };
  },

  getCreatedAt() {
    const now = new Date();
    return `${this.formatDate(now)} ${this.formatTime(now)}`;
  },

  buildPost(form) {//创建帖子
    const authorInfo = this.getAuthor();
    const category = this.data.selectedPostCategory;
    const typeMap = {
      '校园动态': 'normal',
      '二手市场': 'goods',
      '失物招领': 'lost',
      '校园评分': 'rating'
    };
    const statusMap = {
      '校园动态': '正常',
      '二手市场': '在售',
      '失物招领': '寻找中',
      '校园评分': '已评分'
    };

    return {
      id: `post-${Date.now()}`,
      type: typeMap[category],
      category,
      title: form.title,
      content: form.content,
      price: category === '二手市场' ? Number(form.price) : '',
      condition: category === '二手市场' ? form.condition : '',
      tradeLocation: category === '二手市场' ? form.tradeLocation : '',
      ratingTarget: category === '校园评分' ? form.ratingTarget : '',
      score: category === '校园评分' ? Number(form.score) : '',
      mediaFiles: this.data.mediaFiles,
      images: this.data.mediaFiles.filter(item => item.type === 'image').map(item => item.url),
      videos: this.data.mediaFiles.filter(item => item.type === 'video').map(item => item.url),
      createdAt: this.getCreatedAt(),
      views: 0,
      comments: 0,
      likes: 0,
      status: statusMap[category],
      author: authorInfo.user_name,
      avatar: authorInfo.user_icon
    };
  },

  buildTask(form) {//创建悬赏
    const authorInfo = this.getAuthor();
    return {
      id: `task-${Date.now()}`,
      type: 'task',
      category: this.data.selectedTaskType,
      title: form.title,
      content: form.content,
      pickupLocation: form.pickupLocation,
      deliveryLocation: form.deliveryLocation,
      location: `${form.pickupLocation} → ${form.deliveryLocation}`,
      deadline: `${form.deadlineDate} ${form.deadlineTime} 前`,
      reward: Number(form.reward),
      mediaFiles: this.data.mediaFiles,
      images: this.data.mediaFiles.filter(item => item.type === 'image').map(item => item.url),
      videos: this.data.mediaFiles.filter(item => item.type === 'video').map(item => item.url),
      createdAt: this.getCreatedAt(),
      views: 0,
      comments: 0,
      likes: 0,
      status: '待接单',
      author: authorInfo.user_name,
      avatar: authorInfo.user_icon
    };
  },

  buildCloudPayload(form, mediaFileIds) {
    const authorInfo = this.getAuthor();
    const isPost = this.data.publishMode === 'post';
    const selectedType = isPost ? this.data.selectedPostCategory : this.data.selectedTaskType;
    const payload = {
      post_title: form.title,
      post_content: form.content,
      post_img: mediaFileIds,
      post_video: [],
      post_parent_type: isPost ? '帖子' : '悬赏',
      post_sub_type: selectedType,
      post_status: 1,
      user_name: authorInfo.user_name,
      user_icon: authorInfo.user_icon,
      user_openid: authorInfo.user_openid
    };

    if (isPost) {
      if (selectedType === '二手市场') {
        payload.post_price = Number(form.price);
        payload.post_condition = form.condition;
        payload.post_trade_location = form.tradeLocation;
      }

      if (selectedType === '校园评分') {
        payload.post_rating_target = form.ratingTarget;
        payload.post_score = Number(form.score);
      }
    } else {
      payload.post_reward = Number(form.reward);
      payload.post_pickup_location = form.pickupLocation;
      payload.post_delivery_location = form.deliveryLocation;
      payload.post_deadline = `${form.deadlineDate} ${form.deadlineTime}`;
    }

    return payload;
  },

  getFileExtension(filePath) {
    const cleanPath = filePath.split('?')[0];
    const matched = cleanPath.match(/\.([^.\\/]+)$/);
    return matched ? matched[1] : 'jpg';
  },

  async uploadMediaToCloud() {
    if (!this.data.mediaFiles.length) return [];

    const uploadTasks = this.data.mediaFiles.map((file, index) => {
      const extension = this.getFileExtension(file.url);
      const cloudPath = `post/${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}.${extension}`;
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: file.url
      });
    });

    const uploadResults = await Promise.all(uploadTasks);
    return uploadResults.map(item => item.fileID);
  },

  saveContent(item) {
    const storageKey = this.data.publishMode === 'post' ? POST_STORAGE_KEY : TASK_STORAGE_KEY;
    const list = wx.getStorageSync(storageKey) || [];
    wx.setStorageSync(storageKey, [item].concat(list));
  },

  resetForm() {
    const deadlineDate = this.data.form.deadlineDate;
    const deadlineTime = this.data.form.deadlineTime;
    this.setData({
      mediaFiles: [],
      form: {
        title: '',
        content: '',
        price: '',
        condition: '',
        tradeLocation: '',
        ratingTarget: '',
        score: '',
        reward: '',
        pickupLocation: '',
        deliveryLocation: '',
        deadlineDate,
        deadlineTime
      }
    });
  },

  async submitPost() {
    if (this.data.submitting) return;

    if (!this.getCurrentUser()) {
      wx.showModal({
        title: '请先登录',
        content: '登录校园账号后才能发布帖子或悬赏任务。',
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
      return;
    }

    const form = this.getTrimmedForm();
    const error = this.data.publishMode === 'post'
      ? this.validatePost(form)
      : this.validateTask(form);

    if (error) {
      wx.showToast({
        title: error,
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const mediaFileIds = await this.uploadMediaToCloud();
      const payload = this.buildCloudPayload(form, mediaFileIds);
      const cloudRes = await wx.cloud.callFunction({
        name: 'publishPost',
        data: {
          payload
        }
      });

      if (!cloudRes.result || cloudRes.result.code !== 0) {
        throw new Error((cloudRes.result && cloudRes.result.message) || '发布失败');
      }

      const item = this.data.publishMode === 'post'
        ? this.buildPost(form)
        : this.buildTask(form);
      item.id = cloudRes.result.data && cloudRes.result.data._id
        ? cloudRes.result.data._id
        : item.id;
      item.mediaFiles = mediaFileIds.map((url) => ({
        url,
        type: /\.(mp4|mov|m4v|avi|wmv|webm)$/i.test(url) ? 'video' : 'image'
      }));
      item.images = item.mediaFiles.filter(media => media.type === 'image').map(media => media.url);
      item.videos = item.mediaFiles.filter(media => media.type === 'video').map(media => media.url);
      this.saveContent(item);
      const currentUser = this.getCurrentUser();
      if (currentUser && item.id) {
        const userPostList = Array.isArray(currentUser.user_post)
          ? currentUser.user_post
          : (currentUser.user_post ? [currentUser.user_post] : []);
        const nextUser = {
          ...currentUser,
          user_post: [item.id].concat(userPostList.filter(id => id !== item.id))
        };
        wx.setStorageSync(USER_STORAGE_KEY, nextUser);
        wx.setStorageSync(LEGACY_USER_STORAGE_KEY, nextUser);
      }
      this.resetForm();

      wx.showToast({
        title: this.data.publishMode === 'post' ? '帖子发布成功' : '悬赏发布成功',
        icon: 'success',
        duration: 1200
      });

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/Cir/Cir'
        });
      }, 900);
    } catch (error) {
      console.log('publish post error:', error);
      wx.showToast({
        title: '发布失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
