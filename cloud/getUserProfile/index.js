const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function normalizeArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value === '' || value === null || value === undefined) return [];
  return [value];
}

function isCloudFileId(url) {
  return typeof url === 'string' && url.indexOf('cloud://') === 0;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const targetOpenid = event.target_openid || '';

  if (!targetOpenid) {
    return {
      code: 1,
      message: '目标用户信息缺失'
    };
  }

  const res = await db.collection('user').where({
    user_openid: targetOpenid
  }).limit(1).get();

  const targetUser = (res.data && res.data[0]) || null;
  if (!targetUser) {
    return {
      code: 1,
      message: '用户不存在'
    };
  }

  let userIcon = targetUser.user_icon || '';
  if (isCloudFileId(userIcon)) {
    try {
      const tempRes = await cloud.getTempFileURL({
        fileList: [userIcon]
      });
      const fileInfo = (tempRes.fileList || [])[0] || {};
      userIcon = fileInfo.tempFileURL || userIcon;
    } catch (error) {
      console.log('getUserProfile temp url error:', error);
    }
  }

  const isSelf = wxContext.OPENID && wxContext.OPENID === targetOpenid;
  const postPublic = targetUser.post_public !== false;
  const likePublic = targetUser.like_public !== false;
  const historyPublic = targetUser.history_public !== false;

  return {
    code: 0,
    data: {
      user: {
        ...targetUser,
        user_icon: userIcon,
        user_post: isSelf || postPublic ? normalizeArrayField(targetUser.user_post) : [],
        user_like: isSelf || likePublic ? normalizeArrayField(targetUser.user_like) : [],
        user_collect: normalizeArrayField(targetUser.user_collect),
        user_follow: normalizeArrayField(targetUser.user_follow),
        user_fans: normalizeArrayField(targetUser.user_fans),
        browsing_history: isSelf || historyPublic ? normalizeArrayField(targetUser.browsing_history) : [],
        post_public: postPublic,
        like_public: likePublic,
        history_public: historyPublic
      }
    }
  };
};
