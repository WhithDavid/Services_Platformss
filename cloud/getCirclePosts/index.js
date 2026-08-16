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

function collectPostUrls(posts) {
  const urls = [];
  (posts || []).forEach((item) => {
    if (item.user_icon) urls.push(item.user_icon);
    normalizeMediaList(item.post_img || item.images || []).forEach((media) => {
      if (media.url) urls.push(media.url);
      if (media.poster) urls.push(media.poster);
    });
  });
  return Array.from(new Set(urls.filter(Boolean)));
}

async function getTempUrlMap(urls) {
  const fileUrlMap = new Map();
  const cloudFileIds = urls.filter((url) => isCloudFileId(url));
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

function mapMediaList(mediaList, fileUrlMap) {
  return normalizeMediaList(mediaList).map((media) => ({
    ...media,
    url: replaceFileUrl(media.url, fileUrlMap, media.url),
    poster: replaceFileUrl(media.poster, fileUrlMap, media.poster || '')
  }));
}

function resolvePosts(posts, fileUrlMap) {
  return (posts || []).map((item) => ({
    ...item,
    user_icon: replaceFileUrl(item.user_icon, fileUrlMap, '/pages/images/User.png'),
    post_img: mapMediaList(item.post_img || item.images || [], fileUrlMap)
  }));
}

exports.main = async (event) => {
  const db = cloud.database();
  const _ = db.command;
  const postLimit = Math.min(Number(event.postLimit) || 15, 30);
  const postSkip = Math.max(Number(event.postSkip) || 0, 0);
  const taskLimit = Math.min(Number(event.taskLimit) || 8, 20);
  const includeTasks = event.includeTasks !== false;

  const [postRes, taskRes] = await Promise.all([
    db.collection('post')
      .where({
        post_status: 1,
        post_parent_type: _.neq('悬赏')
      })
      .orderBy('post_time', 'desc')
      .skip(postSkip)
      .limit(postLimit + 1)
      .get(),
    includeTasks
      ? db.collection('post')
        .where({
          post_status: 1,
          post_parent_type: '悬赏'
        })
        .orderBy('post_time', 'desc')
        .limit(taskLimit)
        .get()
      : Promise.resolve({ data: [] })
  ]);

  const rawPosts = postRes.data || [];
  const posts = rawPosts.slice(0, postLimit);
  const tasks = taskRes.data || [];
  const hasMorePosts = rawPosts.length > postLimit;
  const fileUrlMap = await getTempUrlMap(collectPostUrls(posts.concat(tasks)));

  return {
    code: 0,
    data: {
      posts: resolvePosts(posts, fileUrlMap),
      tasks: resolvePosts(tasks, fileUrlMap),
      hasMorePosts,
      nextPostSkip: postSkip + posts.length
    }
  };
};
