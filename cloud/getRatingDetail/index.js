const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  const subjectId = event.subject_id || '';
  if (!subjectId) return { code: 1, message: '缺少评分对象' };

  const subjectRes = await db.collection('rating_subject').doc(subjectId).get();
  const subject = subjectRes.data;
  if (!subject || subject.status !== 'approved') return { code: 1, message: '评分对象不存在或正在审核中' };

  const recordsRes = await db.collection('rating_record')
    .where({ subject_id: subjectId })
    .orderBy('created_at', 'desc')
    .limit(50)
    .get();

  const records = (recordsRes.data || []).map((item) => ({
    ...item,
    created_at: item.created_at ? new Date(item.created_at).toLocaleString('zh-CN', { hour12: false }) : ''
  }));

  return {
    code: 0,
    data: {
      subject,
      records
    }
  };
};
