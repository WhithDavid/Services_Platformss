const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const CATEGORY_LIST = ['食堂美食', '校园商铺', '宿舍设施', '流浪猫狗', '校园人物', '其他校园'];

exports.main = async (event) => {
  const db = cloud.database();
  const category = event.category || '';
  const keyword = String(event.keyword || '').trim();
  const limit = Math.min(Number(event.limit) || 30, 50);
  const where = { status: 'approved' };

  if (category && CATEGORY_LIST.includes(category)) where.category = category;
  if (keyword) where.name = db.RegExp({ regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' });

  const result = await db.collection('rating_subject')
    .where(where)
    .orderBy('rating_count', 'desc')
    .limit(limit)
    .get();

  const subjects = await Promise.all((result.data || []).map(async (subject) => {
    const latestRes = await db.collection('rating_record')
      .where({ subject_id: subject._id })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    const latest = latestRes.data && latestRes.data[0];
    return { ...subject, latest_comment: latest ? latest.comment : '' };
  }));

  return {
    code: 0,
    data: {
      categories: CATEGORY_LIST,
      subjects
    }
  };
};
