const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const profile = event.profile || {};

  const user_openid = wxContext.OPENID;
  if (!user_openid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  const updateData = {
    user_name: (profile.user_name || '').trim() || '微信用户',
    user_icon: profile.user_icon || '',
    user_gender: profile.user_gender || '保密',
    user_bio: (profile.user_bio || '').trim(),
    user_major: (profile.user_major || '').trim(),
    user_campus: profile.user_campus || '育才校区',
    studentTag: profile.studentTag || '校园用户',
    post_public: profile.post_public !== false,
    like_public: profile.like_public !== false,
    history_public: profile.history_public !== false
  };

  const userRes = await db.collection('user').where({
    user_openid
  }).get();

  if (!userRes.data.length) {
    return {
      code: 1,
      message: '未找到用户记录'
    };
  }

  const targetUser = userRes.data[0];

  await db.collection('user').doc(targetUser._id).update({
    data: updateData
  });

  return {
    code: 0,
    message: '更新成功',
    data: {
      ...targetUser,
      ...updateData
    }
  };
};
