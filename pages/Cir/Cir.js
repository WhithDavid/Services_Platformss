// pages/cir/cir.js
Page({
  data: {
    statusBarHeight: 20 , // 默认状态栏高度
    handle_navigation_index:0,
    handle_navigation:["校园动态","闲置出售","人才市场","校园评分","物品代拿","失物招领","外卖"],
    notice_text:['通知1','通知2','通知3','通知3','通知4','通知5','通知6','通知7'],
    photo_burr:{
      photo_cir_handle:"https://zsb.gxvnu.edu.cn/img/bannerny.jpg"
    },
    swiperImgurl:["https://c-ssl.duitang.com/uploads/blog/202207/09/20220709132233_b473e.jpg","https://c-ssl.duitang.com/uploads/item/202003/03/20200303214302_QCjGt.jpeg","https://tse2.mm.bing.net/th/id/OIP.CtAIEgmO8rhLhP7hoCX7wgHaO0?w=1024&h=2048&rs=1&pid=ImgDetMain&o=7&rm=3"]

  },
  clic: function(e){
    console.log(e.currentTarget.dataset.nid)
    this.setData({
      handle_navigation_index:e.currentTarget.dataset.nid

    })
  },
  onLoad() {
    // 获取系统信息，适配状态栏高度
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    })
  },

  onSearchInput(e) {
    console.log('输入内容：', e.detail.value)
  },

  onSearch() {
    console.log('执行搜索')
    // 跳转搜索页或其他逻辑
  }
})