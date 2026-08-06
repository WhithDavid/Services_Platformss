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
  const currentOpenid = wxContext.OPENID;
  const targetOpenid = event.target_openid || '';

  if (!currentOpenid) {
    return {
      code: 1,
      message: '用户身份获取失败'
    };
  }

  if (!targetOpenid) {
    return {
      code: 1,
      message: '目标用户信息缺失'
    };
  }

  if (targetOpenid === currentOpenid) {
    return {
      code: 1,
      message: '不能关注自己'
    };
  }

  const [currentUserRes, targetUserRes] = await Promise.all([
    db.collection('user').where({
      user_openid: currentOpenid
    }).limit(1).get(),
    db.collection('user').where({
      user_openid: targetOpenid
    }).limit(1).get()
  ]);

  const currentUser = (currentUserRes.data && currentUserRes.data[0]) || null;
  const targetUser = (targetUserRes.data && targetUserRes.data[0]) || null;

  if (!currentUser || !targetUser) {
    return {
      code: 1,
      message: '用户信息不存在'
    };
  }

  const currentFollowList = normalizeArrayField(currentUser.user_follow);
  const targetFansList = normalizeArrayField(targetUser.user_fans);
  const alreadyFollowing = currentFollowList.includes(targetOpenid);

  const nextCurrentFollowList = alreadyFollowing
    ? currentFollowList.filter((openid) => openid !== targetOpenid)
    : [targetOpenid].concat(currentFollowList.filter((openid) => openid !== targetOpenid));
  const nextTargetFansList = alreadyFollowing
    ? targetFansList.filter((openid) => openid !== currentOpenid)
    : [currentOpenid].concat(targetFansList.filter((openid) => openid !== currentOpenid));

  await db.runTransaction(async (transaction) => {
    await transaction.collection('user').doc(currentUser._id).update({
      data: {
        user_follow: nextCurrentFollowList,
        user_follow_count: nextCurrentFollowList.length,
        following_count: nextCurrentFollowList.length
      }
    });

    await transaction.collection('user').doc(targetUser._id).update({
      data: {
        user_fans: nextTargetFansList,
        user_fans_count: nextTargetFansList.length,
        fans_count: nextTargetFansList.length
      }
    });
  });

  return {
    code: 0,
    message: '操作成功',
    data: {
      following: !alreadyFollowing,
      current_user: {
        user_follow: nextCurrentFollowList,
        user_follow_count: nextCurrentFollowList.length,
        following_count: nextCurrentFollowList.length
      },
      target_user: {
        ...targetUser,
        user_fans: nextTargetFansList,
        user_fans_count: nextTargetFansList.length,
        fans_count: nextTargetFansList.length
      }
    }
  };
};
