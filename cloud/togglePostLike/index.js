const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();

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

  let userRes;
  let postRes;
  try {
    const results = await Promise.all([
      db.collection('user').where({
        user_openid: userOpenid
      }).limit(1).get(),
      db.collection('post').doc(postId).get()
    ]);
    userRes = results[0];
    postRes = results[1];
  } catch (error) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  const userInfo = (userRes.data && userRes.data[0]) || null;
  const postInfo = postRes.data || null;

  if (!userInfo) {
    return {
      code: 1,
      message: '未找到用户信息'
    };
  }

  if (!postInfo) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  const userLikeList = Array.isArray(userInfo.user_like)
    ? userInfo.user_like
    : (userInfo.user_like ? [userInfo.user_like] : []);
  const currentLikeCount = Number(postInfo.post_like_num) || 0;
  const alreadyLiked = userLikeList.includes(postId);
  const nextUserLikeList = alreadyLiked
    ? userLikeList.filter((id) => id !== postId)
    : [postId].concat(userLikeList.filter((id) => id !== postId));
  const nextLikeCount = alreadyLiked
    ? Math.max(0, currentLikeCount - 1)
    : currentLikeCount + 1;

  await db.runTransaction(async (transaction) => {
    await transaction.collection('user').doc(userInfo._id).update({
      data: {
        user_like: nextUserLikeList
      }
    });

    await transaction.collection('post').doc(postId).update({
      data: {
        post_like_num: nextLikeCount
      }
    });
  });

  return {
    code: 0,
    message: '操作成功',
    data: {
      post_id: postId,
      liked: !alreadyLiked,
      post_like_num: nextLikeCount,
      user_like: nextUserLikeList
    }
  };
};
