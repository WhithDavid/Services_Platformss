const categories = ['推荐', '校园动态', '二手市场', '失物招领', '校园评分'];

const notices = ['欢迎来到校园服务平台', '二手交易请线下验货', '代拿任务请确认地点和时间'];

const posts = [
  {
    id: 'post-001',
    type: 'normal',
    category: '校园动态',
    title: '今天图书馆自习氛围不错',
    content: '三楼靠窗位置比较安静，适合复习。晚一点人会变多，建议早点去占座。',
    author: '校园观察员',
    avatar: 'https://img2.woyaogexing.com/2018/03/05/0979ae91fadb63e5!400x400_big.jpg',
    createdAt: '2026-07-14 09:30',
    views: 128,
    comments: 12,
    likes: 36,
    status: '正常'
  },
  {
    id: 'post-002',
    type: 'goods',
    category: '二手市场',
    title: '出一本高数教材，九成新',
    content: '教材无缺页，有少量笔记，适合同校学弟学妹使用。可在食堂门口面交。',
    author: '小陈同学',
    avatar: 'https://img2.woyaogexing.com/2018/03/05/0979ae91fadb63e5!400x400_big.jpg',
    createdAt: '2026-07-14 10:10',
    price: 18,
    views: 86,
    comments: 5,
    likes: 9,
    status: '在售'
  },
  {
    id: 'post-004',
    type: 'rating',
    category: '校园评分',
    title: '一食堂麻辣香锅评分',
    content: '味道 8 分，排队 6 分，价格 7 分。总体值得吃，但饭点建议错峰。',
    author: '吃饭很认真',
    avatar: 'https://img2.woyaogexing.com/2018/03/05/0979ae91fadb63e5!400x400_big.jpg',
    createdAt: '2026-07-14 12:00',
    score: 8.1,
    views: 203,
    comments: 28,
    likes: 51,
    status: '已评分'
  }
];

const tasks = [
  {
    id: 'task-001',
    type: 'task',
    category: '快递代拿',
    title: '东门快递送到 3 号宿舍楼',
    content: '快递不重，18:30 前送到即可。',
    location: '东门快递站 → 3 号宿舍楼',
    deadline: '今天 18:30 前',
    author: '赶课的人',
    avatar: 'https://img2.woyaogexing.com/2018/03/05/0979ae91fadb63e5!400x400_big.jpg',
    createdAt: '2026-07-14 11:20',
    reward: 5,
    views: 44,
    comments: 3,
    likes: 2,
    status: '待接单'
  },
  {
    id: 'task-002',
    type: 'task',
    category: '外卖代取',
    title: '南门外卖送到女生宿舍 2 栋',
    content: '外卖已到南门，希望 12:20 前送到。',
    location: '南门外卖柜 → 女生宿舍 2 栋',
    deadline: '今天 12:20 前',
    author: '正在上课',
    avatar: 'https://img2.woyaogexing.com/2018/03/05/0979ae91fadb63e5!400x400_big.jpg',
    createdAt: '2026-07-14 11:45',
    reward: 6,
    views: 31,
    comments: 1,
    likes: 0,
    status: '待接单'
  }
];

module.exports = {
  categories,
  notices,
  posts,
  tasks
};
