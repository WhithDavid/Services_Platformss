const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function normalizeArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value === '' || value === null || value === undefined) return [];
  return [value];
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();

  const userOpenid = wxContext.OPENID;
  const postId = event.post_id || '';
  const postStatus = Number(event.post_status);

  if (!userOpenid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  if (!postId || ![0, 1, 2].includes(postStatus)) {
    return {
      code: 1,
      message: '参数不正确'
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

  if (postInfo.user_openid !== userOpenid) {
    return {
      code: 1,
      message: '无权操作该帖子'
    };
  }

  const userPostList = normalizeArrayField(userInfo.user_post);
  const nextUserPostList = postStatus === 0
    ? userPostList.filter((id) => id !== postId)
    : userPostList.includes(postId)
      ? userPostList
      : [postId].concat(userPostList);

  await db.runTransaction(async (transaction) => {
    await transaction.collection('post').doc(postId).update({
      data: {
        post_status: postStatus
      }
    });

    await transaction.collection('user').doc(userInfo._id).update({
      data: {
        user_post: nextUserPostList
      }
    });
  });

  return {
    code: 0,
    message: '更新成功',
    data: {
      post_id: postId,
      post_status: postStatus,
      user_info: {
        ...userInfo,
        user_post: nextUserPostList
      }
    }
  };
};
