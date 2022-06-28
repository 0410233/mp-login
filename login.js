
// 工具：空函数
function noop() {}

// 工具：获取当前页
function getCurrentPage() {
  const pages = getCurrentPages();
  return pages[pages.length - 1];
}



////////////////////////////////////////////////////////////////////
//                          登录检测                              //
////////////////////////////////////////////////////////////////////

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



////////////////////////////////////////////////////////////////////
//                          登录回调                              //
////////////////////////////////////////////////////////////////////

// 登录回调栈
let callbacks = [];

/**
 * 执行登陆回调
 */
function handleLogin() {
  const cbs = callbacks.slice();
  callbacks = [];
  cbs.forEach(([fn, group]) => {
    fn();
  });
}

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


////////////////////////////////////////////////////////////////////
//                          登录流程                              //
////////////////////////////////////////////////////////////////////

/**
 * 微信登录获取 code，使用 Promise 包装
 * @returns {Promise}
 */
function wxLogin() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res);
        } else {
          reject(res);
        }
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

/**
 * api 登录
 * @param {any} params 
 * @returns 
 */
async function apiLogin(params) {
  throw '请覆写 apiLogin 方法';
}

/**
 * 获取登录数据
 * @param {object|null} params 
 * @returns 
 */
async function fetchLoginData(params) {
  const res = await wxLogin();
  params = params || {};
  params.code = res.code;
  const response = await apiLogin(params);
  return response;
}

/**
 * 记录登录数据
 * @param {object} user 
 * @param {string|null} token 
 */
export function loginWith(user, token) {
  const app = getApp();

  app.globalData.user = user;
  app.globalData.token = token || user.token;

  if (isLogin()) {
    handleLogin();
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
    mask: true,
  });

  loginHandler = fetchLoginData();
  
  loginHandler.then(response => {
    loginWith(response, response.token);
    return response;
  }).finally(() => {
    loginHandler = null;
    // wx.hideLoading();
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
