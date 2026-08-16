const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const subjectId = event.subject_id || '';
  const status = event.status || '';
  if (!wxContext.OPENID) return { code: 1, message: '身份获取失败' };
  if (!subjectId || !['approved', 'rejected'].includes(status)) return { code: 1, message: '审核参数无效' };

  const adminRes = await db.collection('user').where({ user_openid: wxContext.OPENID, is_admin: true }).limit(1).get();
  if (!adminRes.data || !adminRes.data.length) return { code: 1, message: '没有管理员权限' };

  await db.collection('rating_subject').doc(subjectId).update({
    data: { status, reviewed_by: wxContext.OPENID, reviewed_at: new Date(), updated_at: new Date() }
  });
  return { code: 0, message: status === 'approved' ? '已通过审核' : '已拒绝审核' };
};
