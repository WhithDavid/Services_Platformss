const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const CATEGORY_LIST = ['食堂美食', '校园商铺', '宿舍设施', '流浪猫狗', '校园人物', '其他校园'];

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const payload = event.payload || {};
  const name = String(payload.name || '').trim();
  const category = String(payload.category || '').trim();
  const location = String(payload.location || '').trim();
  const description = String(payload.description || '').trim();

  if (!wxContext.OPENID) return { code: 1, message: '请先登录校园账号' };
  if (name.length < 2 || name.length > 40) return { code: 1, message: '评分对象名称需为 2 到 40 个字' };
  if (!CATEGORY_LIST.includes(category)) return { code: 1, message: '请选择有效的对象分类' };
  if (description.length > 120) return { code: 1, message: '对象简介不能超过 120 个字' };

  const duplicate = await db.collection('rating_subject').where({
    name,
    category,
    status: db.command.in(['pending', 'approved'])
  }).limit(1).get();

  if (duplicate.data && duplicate.data.length) {
    return { code: 1, message: duplicate.data[0].status === 'pending' ? '该对象正在审核中' : '该评分对象已经存在' };
  }

  const userRes = await db.collection('user').where({ user_openid: wxContext.OPENID }).limit(1).get();
  const user = userRes.data[0] || {};
  const now = new Date();
  const addRes = await db.collection('rating_subject').add({
    data: {
      name,
      category,
      location,
      description,
      status: 'pending',
      average_score: 0,
      rating_count: 0,
      created_by: wxContext.OPENID,
      created_by_name: user.user_name || '校园用户',
      created_at: now,
      updated_at: now
    }
  });

  return { code: 0, message: '已提交审核', data: { _id: addRes._id, status: 'pending' } };
};
