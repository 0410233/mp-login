
// 工具：空函数
function noop() {}

// 工具：获取当前页
function getCurrentPage() {
  const pages = getCurrentPages();
  return pages[pages.length - 1];
}

/**
 * 微信登录（获取 code）
 * @returns {Promise}
 */
export function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: res => {
        if (res.code) {
          resolve(res);
        } else {
          reject(res);
        }
      },
      fail: err => {
        reject(err);
      },
    });
  });
}

/**
 * api 登录
 * @param {object|null} params 
 * @returns 
 */
export async function apiLogin(params) {
  const res = await wxLogin();
  params = params || {};
  params.code = res.code;
  const response = await api.post_users_login(params);
  return response;
}

/**
 * 验证登录
 * @returns {string|null}
 */
export function validateLogin() {
  const data = getApp().globalData;
  if (!data.token) {
    return '没有token';
  }

  if (!data.user) {
    return '没有用户信息';
  }

  return null;
}

/**
 * 判断是否已登录
 * @returns {boolean}
 */
export function isLogin() {
  const error = validateLogin();
  return !error;
}

/**
 * 登录用户
 * @param {object} user 
 * @param {string|null} token 
 */
export function loginUser(user, token) {
  const app = getApp();

  app.globalData.user = user;
  app.globalData.token = token || user.token;

  if (isLogin()) {
    const cbs = callbacks.slice();
    callbacks = [];
    cbs.forEach(([fn, group]) => {
      fn();
    });
  }
}

let loginHandler = null;

/**
 * 登录
 * @returns 
 */
export function login() {
  if (isLogin()) {
    return Promise.resolve(true);
  }
  
  if (loginHandler) {
    return loginHandler;
  }

  wx.showLoading({
    title: '正在登录...',
  });

  loginHandler = apiLogin().then(response => {
    loginUser(response, response.token);
    return response;
  }).finally(() => {
    loginHandler = null;
    wx.hideLoading()
  });

  return loginHandler;
}

/**
 * 登出
 */
export function logout() {
  const app = getApp();
  app.globalData.user = null;
  app.globalData.token = null;
}

// 登录回调栈
let callbacks = [];

/**
 * 添加登录回调
 * @param {Function} cb 
 * @param {string} group - 分组标记
 */
export function onLogin(cb, group) {
  if (typeof cb !== 'function') {
    return noop;
  }

  if (isLogin()) {
    cb();
    return noop;
  }

  if (group == null) {
    group = '';
  }
  group = String(group) || getCurrentPage().route;

  const item = [cb, group];
  callbacks.push(item);

  // 返回的函数可用来移除回调
  return function() {
    const index = callbacks.findIndex(item);
    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  };
}

/**
 * 清除登录回调
 * @param {string} group - 分组标记
 */
export function offLogin(group) {
  if (group == null) {
    group = '';
  }
  group = String(group) || getCurrentPage().route;

  if (group == 'all') {
    callbacks = [];
  } else {
    callbacks = callbacks.filter(item => item[1] != group);
  }
}
