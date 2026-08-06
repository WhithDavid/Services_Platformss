const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function normalizeUserData(userData) {
  return {
    ...userData,
    user_like: Array.isArray(userData.user_like)
      ? userData.user_like
      : (userData.user_like ? [userData.user_like] : []),
    user_collect: Array.isArray(userData.user_collect)
      ? userData.user_collect
      : (userData.user_collect ? [userData.user_collect] : []),
    user_post: Array.isArray(userData.user_post)
      ? userData.user_post
      : (userData.user_post ? [userData.user_post] : []),
    browsing_history: Array.isArray(userData.browsing_history)
      ? userData.browsing_history
      : (userData.browsing_history ? [userData.browsing_history] : []),
    user_follow: Array.isArray(userData.user_follow)
      ? userData.user_follow
      : (userData.user_follow ? [userData.user_follow] : []),
    user_fans: Array.isArray(userData.user_fans)
      ? userData.user_fans
      : (userData.user_fans ? [userData.user_fans] : []),
    post_public: userData.post_public !== false,
    like_public: userData.like_public !== false,
    history_public: userData.history_public !== false
  };
}

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();

  const resUser = await db.collection('user').where({
    user_openid: wxContext.OPENID
  }).limit(1).get();

  if (!resUser.data.length) {
    const userData = {
      user_openid: wxContext.OPENID,
      user_icon: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      user_name: '微信用户',
      user_like: [],
      user_collect: [],
      user_uid: 0,
      user_post: [],
      browsing_history: [],
      user_follow: [],
      user_fans: [],
      user_follow_count: 0,
      user_fans_count: 0,
      post_public: true,
      like_public: true,
      history_public: true,
      Registration_date: new Date()
    };

    const resAdd = await db.collection('user').add({
      data: userData
    });

    if (resAdd && resAdd._id) {
      return {
        code: 0,
        data: {
          _id: resAdd._id,
          ...userData
        }
      };
    }

    return {
      code: 1,
      message: '初始化用户失败'
    };
  }

  const targetUser = normalizeUserData(resUser.data[0]);
  const needSync =
    !Array.isArray(resUser.data[0].user_like) ||
    !Array.isArray(resUser.data[0].user_collect) ||
    !Array.isArray(resUser.data[0].user_post) ||
    !Array.isArray(resUser.data[0].browsing_history) ||
    !Array.isArray(resUser.data[0].user_follow) ||
    !Array.isArray(resUser.data[0].user_fans) ||
    resUser.data[0].post_public === undefined ||
    resUser.data[0].like_public === undefined ||
    resUser.data[0].history_public === undefined;

  if (needSync) {
    await db.collection('user').doc(targetUser._id).update({
      data: {
        user_like: targetUser.user_like,
        user_collect: targetUser.user_collect,
        user_post: targetUser.user_post,
        browsing_history: targetUser.browsing_history,
        user_follow: targetUser.user_follow,
        user_fans: targetUser.user_fans,
        user_follow_count: Number(targetUser.user_follow_count) || targetUser.user_follow.length,
        user_fans_count: Number(targetUser.user_fans_count) || targetUser.user_fans.length,
        post_public: targetUser.post_public,
        like_public: targetUser.like_public,
        history_public: targetUser.history_public
      }
    });
  }

  return {
    code: 0,
    data: targetUser
  };
};
