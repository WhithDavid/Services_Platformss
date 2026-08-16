const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  if (!wxContext.OPENID) return { code: 1, message: '身份获取失败' };

  const adminRes = await db.collection('user').where({ user_openid: wxContext.OPENID, is_admin: true }).limit(1).get();
  if (!adminRes.data || !adminRes.data.length) return { code: 1, message: '没有管理员权限' };

  const result = await db.collection('rating_subject')
    .where({ status: 'pending' })
    .orderBy('created_at', 'desc')
    .limit(50)
    .get();
  return { code: 0, data: { subjects: result.data || [] } };
};
