// 云函数⼊⼝⽂件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使⽤当前云环境
// 云函数⼊⼝函数
exports.main = async (event, context) => {
const wxContext = cloud.getWXContext()
// openID: wxContext.OPENID
// 1、先拿到⽤⼾的openID --- wxContext.OPENID
// 2、判断userInfo表中是否存在这个⽤⼾
var res_user = await cloud.database().collection('user').where({
user_openid: wxContext.OPENID
}).get()
if (res_user.data.length == 0) {
// 如果没有这个⽤⼾，要初始化⼀个⽤⼾，提供默认头像和昵称等⽤⼾属性，以最便捷的⽅式完成微信登录
var userData = {
user_openid: wxContext.OPENID,
user_icon: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0', // 给⼀个默认头像
user_name: '微信⽤⼾', // 给⼀个默认昵称
user_like: '', // 用户点赞
user_collect: '', //用户收藏
user_uid: 0, //用户uid
user_post:'',//用户帖子
}
// 将初始化的⽤⼾保存到userInfo集合中
var res_add = await cloud.database().collection('user').add({
data: userData
})
// 返回结果，告知程序端⽤⼾登录成功
if (res_add) {
return {
code: 0, // 0代表成功，数字可以⾃⼰定义
data: userData // 将⽤⼾数据返回给⼩程序
}
}
} else {
// 如果有这个⽤⼾，就直接读取⽤⼾数据，并返回
return {
code: 0,// 0代表成功，数字可以
data: res_user.data[0] // 将⽤⼾数据返回给⼩程序
}
}
}