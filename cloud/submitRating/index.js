const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;
  const subjectId = event.subject_id || '';
  const score = Number(event.score);
  const comment = String(event.comment || '').trim();

  if (!wxContext.OPENID) return { code: 1, message: '请先登录校园账号' };
  if (!subjectId) return { code: 1, message: '缺少评分对象' };
  if (!Number.isFinite(score) || score < 0 || score > 10 || Math.round(score * 10) !== score * 10) {
    return { code: 1, message: '评分需为 0 到 10 的一位小数' };
  }
  if (!comment) return { code: 1, message: '请填写评价内容' };
  if (comment.length > 500) return { code: 1, message: '评价内容不能超过 500 个字' };

  const userRes = await db.collection('user').where({ user_openid: wxContext.OPENID }).limit(1).get();
  const user = userRes.data[0] || {};
  const now = new Date();
  const result = await db.runTransaction(async (transaction) => {
    const subjectRes = await transaction.collection('rating_subject').doc(subjectId).get();
    const subject = subjectRes.data;
    if (!subject || subject.status !== 'approved') throw new Error('评分对象不存在或正在审核中');

    const existing = await transaction.collection('rating_record').where({
      subject_id: subjectId,
      user_openid: wxContext.OPENID
    }).limit(1).get();
    if (existing.data && existing.data.length) throw new Error('你已经评价过这个对象');

    const count = Number(subject.rating_count) || 0;
    const average = Number(subject.average_score) || 0;
    const nextCount = count + 1;
    const nextAverage = Number(((average * count + score) / nextCount).toFixed(1));

    const addRes = await transaction.collection('rating_record').add({
      data: {
        subject_id: subjectId,
        user_openid: wxContext.OPENID,
        user_name: user.user_name || '校园用户',
        user_icon: user.user_icon || '/pages/images/User_select.png',
        score,
        comment,
        created_at: now
      }
    });
    await transaction.collection('rating_subject').doc(subjectId).update({
      data: {
        average_score: nextAverage,
        rating_count: nextCount,
        updated_at: now
      }
    });
    return { _id: addRes._id, average_score: nextAverage, rating_count: nextCount };
  });

  return { code: 0, message: '评分成功', data: result };
};
