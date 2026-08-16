const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();

  const likerOpenid = wxContext.OPENID;
  const commentId = event.comment_id || '';

  if (!likerOpenid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  if (!commentId) {
    return {
      code: 1,
      message: '评论信息缺失'
    };
  }

  let commentInfo;
  try {
    const commentRes = await db.collection('post_comment').doc(commentId).get();
    commentInfo = commentRes.data || null;
  } catch (error) {
    return {
      code: 1,
      message: '评论不存在'
    };
  }

  const likerOpenids = Array.isArray(commentInfo.liker_openid) ? commentInfo.liker_openid : [];
  const currentLikeCount = Number(commentInfo.comment_likenum) || 0;
  const alreadyLiked = likerOpenids.includes(likerOpenid);
  const nextLikerOpenids = alreadyLiked
    ? likerOpenids.filter(openid => openid !== likerOpenid)
    : likerOpenids.concat(likerOpenid);
  const nextLikeCount = alreadyLiked
    ? Math.max(0, currentLikeCount - 1)
    : currentLikeCount + 1;

  await db.collection('post_comment').doc(commentId).update({
    data: {
      liker_openid: nextLikerOpenids,
      comment_likenum: nextLikeCount
    }
  });

  return {
    code: 0,
    message: '操作成功',
    data: {
      comment_id: commentId,
      liked: !alreadyLiked,
      comment_likenum: nextLikeCount,
      liker_openid: nextLikerOpenids
    }
  };
};
