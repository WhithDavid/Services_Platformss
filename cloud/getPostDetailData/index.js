const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function normalizeArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value === '' || value === null || value === undefined) return [];
  return [value];
}

function isCloudFileId(url) {
  return typeof url === 'string' && url.indexOf('cloud://') === 0;
}

function chunkArray(list, size) {
  const chunks = [];
  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }
  return chunks;
}

function isVideoFile(url) {
  return /\.(mp4|mov|m4v|avi|wmv|webm)$/i.test(url || '');
}

function normalizeMediaList(mediaList) {
  const list = normalizeArrayField(mediaList);
  return list.map((item) => {
    if (typeof item === 'string') {
      return {
        url: item,
        type: isVideoFile(item) ? 'video' : 'image',
        poster: ''
      };
    }

    if (item && item.url) {
      return {
        url: item.url,
        type: item.type || (isVideoFile(item.url) ? 'video' : 'image'),
        poster: item.poster || ''
      };
    }

    return null;
  }).filter(Boolean);
}

async function loadComments(db, postId) {
  const _ = db.command;
  const topLevelRes = await db.collection('post_comment')
    .where({
      parent_type: 'post',
      parent_id: postId,
      comment_status: 1
    })
    .orderBy('comment_time', 'desc')
    .limit(100)
    .get();

  const allItems = topLevelRes.data ? topLevelRes.data.slice() : [];
  const visited = new Set(allItems.map((item) => item._id));
  let frontier = allItems.map((item) => item._id);

  while (frontier.length) {
    const batches = chunkArray(frontier, 100);
    frontier = [];

    for (const batch of batches) {
      const replyRes = await db.collection('post_comment')
        .where({
          parent_type: 'comment',
          parent_id: _.in(batch),
          comment_status: 1
        })
        .orderBy('comment_time', 'asc')
        .limit(100)
        .get();

      (replyRes.data || []).forEach((item) => {
        if (visited.has(item._id)) return;
        visited.add(item._id);
        allItems.push(item);
        frontier.push(item._id);
      });
    }
  }

  return allItems;
}

function collectPostUrls(post) {
  const urls = [];
  if (!post) return urls;

  if (post.user_icon) urls.push(post.user_icon);
  normalizeMediaList(post.post_img).forEach((media) => {
    if (media.url) urls.push(media.url);
    if (media.poster) urls.push(media.poster);
  });
  return urls;
}

function collectCommentUrls(comments) {
  const urls = [];
  (comments || []).forEach((item) => {
    if (item.commenter_icon) urls.push(item.commenter_icon);
    normalizeArrayField(item.comment_img).forEach((img) => {
      if (img) urls.push(img);
    });
  });
  return urls;
}

async function getTempUrlMap(urls) {
  const fileUrlMap = new Map();
  const cloudFileIds = Array.from(new Set((urls || []).filter((url) => isCloudFileId(url))));
  if (!cloudFileIds.length) return fileUrlMap;

  const batches = chunkArray(cloudFileIds, 50);
  for (const batch of batches) {
    const res = await cloud.getTempFileURL({
      fileList: batch
    });

    (res.fileList || []).forEach((item) => {
      if (item.fileID) {
        fileUrlMap.set(item.fileID, item.tempFileURL || item.fileID);
      }
    });
  }

  return fileUrlMap;
}

function replaceFileUrl(url, fileUrlMap, fallback = '') {
  if (!url) return fallback || '';
  if (!isCloudFileId(url)) return url;
  return fileUrlMap.get(url) || fallback || url;
}

function resolvePost(post, fileUrlMap) {
  if (!post) return null;

  return {
    ...post,
    user_icon: replaceFileUrl(post.user_icon, fileUrlMap, '/pages/images/User.png'),
    post_img: normalizeMediaList(post.post_img).map((media) => ({
      ...media,
      url: replaceFileUrl(media.url, fileUrlMap, media.url),
      poster: replaceFileUrl(media.poster, fileUrlMap, media.poster || '')
    }))
  };
}

function resolveComments(comments, fileUrlMap) {
  return (comments || []).map((item) => ({
    ...item,
    commenter_icon: replaceFileUrl(item.commenter_icon, fileUrlMap, '/pages/images/User.png'),
    comment_img: normalizeArrayField(item.comment_img).map((img) => replaceFileUrl(img, fileUrlMap, img))
  }));
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const postId = event.post_id || '';
  const currentUserOpenid = wxContext.OPENID || '';

  if (!postId) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  const postRes = await db.collection('post').doc(postId).get();
  const post = postRes.data || null;

  if (!post) {
    return {
      code: 1,
      message: '帖子不存在'
    };
  }

  if (Number(post.post_status) === 0) {
    return {
      code: 1,
      message: '帖子已删除'
    };
  }

  if (Number(post.post_status) === 2 && post.user_openid !== currentUserOpenid) {
    return {
      code: 1,
      message: '帖子仅自己可见'
    };
  }

  const comments = await loadComments(db, postId);
  const fileUrlMap = await getTempUrlMap([
    ...collectPostUrls(post),
    ...collectCommentUrls(comments)
  ]);

  return {
    code: 0,
    data: {
      post: resolvePost(post, fileUrlMap),
      comments: resolveComments(comments, fileUrlMap),
      commentTotal: comments.length
    }
  };
};
