const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  const userOpenid = wxContext.OPENID;
  const postId = event.post_id || '';

  if (!userOpenid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  if (!postId) {
    return {
      code: 1,
      message: '帖子信息缺失'
    };
  }

  const userRes = await db.collection('user').where({
    user_openid: userOpenid
  }).limit(1).get();

  const userInfo = (userRes.data && userRes.data[0]) || null;
  if (!userInfo) {
    return {
      code: 1,
      message: '未找到用户信息'
    };
  }

  const browsingHistory = Array.isArray(userInfo.browsing_history)
    ? userInfo.browsing_history
    : (userInfo.browsing_history ? [userInfo.browsing_history] : []);
  const nextHistory = [postId]
    .concat(browsingHistory.filter((id) => id !== postId))
    .slice(0, 50);

  try {
    await db.collection('post').doc(postId).get();
  } catch (error) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  await db.runTransaction(async (transaction) => {
    await transaction.collection('user').doc(userInfo._id).update({
      data: {
        browsing_history: nextHistory
      }
    });

    await transaction.collection('post').doc(postId).update({
      data: {
        views: _.inc(1)
      }
    });
  });

  return {
    code: 0,
    message: '记录成功',
    data: {
      browsing_history: nextHistory
    }
  };
};
