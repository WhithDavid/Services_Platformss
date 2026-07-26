const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const payload = event.payload || {};
  const user_openid = wxContext.OPENID;

  if (!user_openid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  if (!payload.post_title || !payload.post_content) {
    return {
      code: 1,
      message: '标题和内容不能为空'
    };
  }

  const userRes = await db.collection('user').where({
    user_openid
  }).get();

  const userInfo = userRes.data[0] || {};
  const postData = {
    post_comment_num: 0,
    post_content: payload.post_content,
    post_img: Array.isArray(payload.post_img) ? payload.post_img : [],
    post_like_num: 0,
    post_parent_type: payload.post_parent_type || '帖子',
    post_status: typeof payload.post_status === 'number' ? payload.post_status : 1,
    post_sub_type: payload.post_sub_type || '',
    post_time: new Date(),
    post_title: payload.post_title,
    post_video: Array.isArray(payload.post_video) ? payload.post_video : [],
    user_icon: userInfo.user_icon || payload.user_icon || '',
    user_name: userInfo.user_name || payload.user_name || '微信用户',
    user_openid
  };

  const extraFields = [
    'post_price',
    'post_condition',
    'post_trade_location',
    'post_rating_target',
    'post_score',
    'post_reward',
    'post_pickup_location',
    'post_delivery_location',
    'post_deadline'
  ];

  extraFields.forEach((field) => {
    if (payload[field] !== undefined && payload[field] !== '') {
      postData[field] = payload[field];
    }
  });

  const addRes = await db.collection('post').add({
    data: postData
  });

  return {
    code: 0,
    message: '发布成功',
    data: {
      _id: addRes._id,
      ...postData
    }
  };
};
