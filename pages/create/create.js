const POST_STORAGE_KEY = 'campusPublishedPosts';
const TASK_STORAGE_KEY = 'campusPublishedTasks';
const USER_STORAGE_KEY = 'campusUserInfo';

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
    images: [],
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
    const systemInfo = wx.getSystemInfoSync();
    const now = new Date();
    const date = this.formatDate(now);
    const time = this.formatTime(new Date(now.getTime() + 2 * 60 * 60 * 1000));

    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20,
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
    this.setData({
      selectedPostCategory: e.currentTarget.dataset.category
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

  chooseImage() {
    const remaining = 9 - this.data.images.length;
    if (remaining <= 0) {
      wx.showToast({
        title: '最多上传 9 张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: res => {
        const images = res.tempFiles.map(item => item.tempFilePath);
        this.setData({
          images: this.data.images.concat(images)
        });
      }
    });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current,
      urls: this.data.images
    });
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const images = this.data.images.filter((item, itemIndex) => itemIndex !== index);
    this.setData({ images });
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

  getAuthor() {
    const userInfo = wx.getStorageSync(USER_STORAGE_KEY);
    return {
      author: userInfo ? userInfo.Name : '校园用户',
      avatar: userInfo ? userInfo.imgHand : '/pages/images/User_select.png'
    };
  },

  getCreatedAt() {
    const now = new Date();
    return `${this.formatDate(now)} ${this.formatTime(now)}`;
  },

  buildPost(form) {
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
      images: this.data.images,
      createdAt: this.getCreatedAt(),
      views: 0,
      comments: 0,
      likes: 0,
      status: statusMap[category],
      ...authorInfo
    };
  },

  buildTask(form) {
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
      images: this.data.images,
      createdAt: this.getCreatedAt(),
      views: 0,
      comments: 0,
      likes: 0,
      status: '待接单',
      ...authorInfo
    };
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
      images: [],
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

  submitPost() {
    if (this.data.submitting) return;

    if (!wx.getStorageSync(USER_STORAGE_KEY)) {
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
      const item = this.data.publishMode === 'post'
        ? this.buildPost(form)
        : this.buildTask(form);
      this.saveContent(item);
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
      wx.showToast({
        title: '发布失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
