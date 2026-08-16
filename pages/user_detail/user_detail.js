const app = getApp();

const USER_STORAGE_KEY = 'user';
const LEGACY_USER_STORAGE_KEY = 'campusUserInfo';
const DEFAULT_AVATAR = '/pages/images/User.png';
const DEFAULT_PROFILE = {
  user_icon: DEFAULT_AVATAR,
  user_name: '微信用户',
  user_gender: '保密',
  user_bio: '',
  user_major: '',
  user_campus: '育才校区',
  studentTag: '校园用户',
  post_public: true,
  like_public: true,
  history_public: true
};

Page({
  data: {
    statusBarHeight: 20,
    genderOptions: ['男', '女', '保密'],
    campusOptions: ['育才校区', '雁山校区', '王城校区'],
    profile: { ...DEFAULT_PROFILE },
    saving: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20
    });
    this.loadUserProfile();
  },

  loadUserProfile() {
    const storedUser =
      wx.getStorageSync(USER_STORAGE_KEY) || wx.getStorageSync(LEGACY_USER_STORAGE_KEY);

    if (!storedUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/User/User'
        });
      }, 1200);
      return;
    }

    this.setData({
      profile: {
        ...DEFAULT_PROFILE,
        ...storedUser,
        user_icon: storedUser.user_icon || DEFAULT_AVATAR,
        user_name: storedUser.user_name || DEFAULT_PROFILE.user_name,
        user_gender: storedUser.user_gender || DEFAULT_PROFILE.user_gender,
        user_bio: storedUser.user_bio || '',
        user_major: storedUser.user_major || '',
        user_campus: storedUser.user_campus || DEFAULT_PROFILE.user_campus,
        studentTag: storedUser.studentTag || DEFAULT_PROFILE.studentTag,
        post_public: storedUser.post_public !== false,
        like_public: storedUser.like_public !== false,
        history_public: storedUser.history_public !== false
      }
    });
  },

  onBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/User/User'
        });
      }
    });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFile = res.tempFiles && res.tempFiles[0];
        if (!tempFile) return;

        this.setData({
          'profile.user_icon': tempFile.tempFilePath
        });
      }
    });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    this.setData({
      [`profile.${field}`]: value
    });
  },

  onGenderChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      'profile.user_gender': this.data.genderOptions[index]
    });
  },

  onCampusChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      'profile.user_campus': this.data.campusOptions[index]
    });
  },

  onPrivacySwitchChange(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;

    this.setData({
      [`profile.${field}`]: !!e.detail.value
    });
  },

  isTempAvatarPath(path) {
    return !!path && /^(wxfile|http:\/\/tmp|https:\/\/tmp|\/tmp\/)/.test(path);
  },

  async uploadAvatarIfNeeded(avatarPath) {
    if (!this.isTempAvatarPath(avatarPath)) {
      return avatarPath || DEFAULT_AVATAR;
    }

    const extension = avatarPath.split('.').pop() || 'png';
    const cloudPath = `user-avatar/${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`;

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: avatarPath
    });

    return uploadRes.fileID;
  },

  async saveProfile() {
    if (this.data.saving) return;

    const profile = {
      ...this.data.profile,
      user_name: (this.data.profile.user_name || '').trim(),
      user_bio: (this.data.profile.user_bio || '').trim(),
      user_major: (this.data.profile.user_major || '').trim()
    };

    if (!profile.user_name) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({
      title: '保存中...'
    });

    try {
      const uploadedAvatar = await this.uploadAvatarIfNeeded(profile.user_icon);
      const payload = {
        ...profile,
        user_icon: uploadedAvatar
      };

      const res = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          profile: payload
        }
      });

      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.message) || '保存失败');
      }

      wx.setStorageSync(USER_STORAGE_KEY, res.result.data);
      wx.setStorageSync(LEGACY_USER_STORAGE_KEY, res.result.data);
      this.setData({
        profile: {
          ...DEFAULT_PROFILE,
          ...res.result.data
        }
      });

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      console.log('saveProfile error:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  outLogin() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将返回“我的”页面。',
      confirmText: '确认退出',
      confirmColor: '#d85c5c',
      success: (res) => {
        if (!res.confirm) return;

        wx.removeStorageSync(USER_STORAGE_KEY);
        wx.removeStorageSync(LEGACY_USER_STORAGE_KEY);

        wx.showToast({
          title: '退出成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/User/User'
          });
        }, 800);
      }
    });
  }
});
