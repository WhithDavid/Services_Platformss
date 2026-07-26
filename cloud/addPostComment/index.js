const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;
  const payload = event.payload || {};

  const commenterOpenid = wxContext.OPENID;
  if (!commenterOpenid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  const postId = payload.post_id || '';
  const parentType = payload.parent_type === 'comment' ? 'comment' : 'post';
  const parentId = payload.parent_id || '';
  const commentContent = (payload.comment_content || '').trim();
  const commentImages = Array.isArray(payload.comment_img) ? payload.comment_img : [];

  if (!postId) {
    return {
      code: 1,
      message: '帖子信息缺失'
    };
  }

  if (!parentId) {
    return {
      code: 1,
      message: '评论目标缺失'
    };
  }

  if (!commentContent && !commentImages.length) {
    return {
      code: 1,
      message: '评论内容不能为空'
    };
  }

  let postInfo = null;
  let userRes;
  try {
    const results = await Promise.all([
      db.collection('post').doc(postId).get(),
      db.collection('user').where({
        user_openid: commenterOpenid
      }).limit(1).get()
    ]);
    postInfo = results[0].data || null;
    userRes = results[1];
  } catch (error) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  if (!postInfo) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  if (parentType === 'comment') {
    try {
      await db.collection('post_comment').doc(parentId).get();
    } catch (error) {
      return {
        code: 1,
        message: '回复的评论不存在'
      };
    }
  }

  const userInfo = (userRes.data && userRes.data[0]) || {};
  const commentData = {
    comment_content: commentContent,
    comment_img: commentImages,
    comment_likenum: 0,
    comment_status: 1,
    comment_time: new Date(),
    commenter_icon: userInfo.user_icon || '',
    commenter_name: userInfo.user_name || '微信用户',
    commenter_openid: commenterOpenid,
    liker_openid: [],
    parent_id: parentType === 'post' ? postId : parentId,
    parent_type: parentType,
    reply_name: parentType === 'comment' ? (payload.reply_name || '') : '',
    reply_openid: parentType === 'comment' ? (payload.reply_openid || '') : ''
  };

  const transactionResult = await db.runTransaction(async (transaction) => {
    const addRes = await transaction.collection('post_comment').add({
      data: commentData
    });

    await transaction.collection('post').doc(postId).update({
      data: {
        post_comment_num: _.inc(1)
      }
    });

    return addRes;
  });

  return {
    code: 0,
    message: '评论成功',
    data: {
      _id: transactionResult._id,
      ...commentData
    }
  };
};
