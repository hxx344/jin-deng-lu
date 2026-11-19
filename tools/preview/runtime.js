// 浏览器里的最小小程序运行环境：只实现本项目用到的 WXML 语法和 wx 接口。
var __modules = {};
var __cache = {};
var __page = null;

function __require(p) {
  var name = p.split('/').pop().replace(/\.js$/, '');
  if (!__cache[name]) {
    var m = { exports: {} };
    __cache[name] = m;
    __modules[name](m, m.exports, __require);
  }
  return __cache[name].exports;
}

var wx = {
  getStorageSync: function (key) {
    var v = localStorage.getItem(key);
    return v ? JSON.parse(v) : '';
  },
  setStorageSync: function (key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  removeStorageSync: function (key) {
    localStorage.removeItem(key);
  },
  vibrateShort: function () {},
  getWindowInfo: function () {
    return { pixelRatio: window.devicePixelRatio || 1 };
  },
  createSelectorQuery: function () {
    var query = {
      selector: '',
      in: function () { return query; },
      select: function (selector) { query.selector = selector; return query; },
      fields: function () { return query; },
      exec: function (callback) {
        var el = document.querySelector(query.selector);
        var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
        callback([el ? { node: el, width: rect.width, height: rect.height } : null]);
      }
    };
    return query;
  },
  canvasToTempFilePath: function (options) {
    setTimeout(function () {
      try {
        options.success({ tempFilePath: options.canvas.toDataURL('image/png') });
      } catch (e) {
        if (options.fail) options.fail(e);
      }
    }, 0);
  },
  // 用 <audio> 顶替；浏览器在用户点击前不让出声，所以被拦下的播放留到第一次点击后重试。
  createInnerAudioContext: function () {
    var el = new Audio();
    var ctx = {
      set src(v) { el.src = String(v).replace(/^\//, ''); },
      set loop(v) { el.loop = !!v; },
      set volume(v) { el.volume = v; },
      play: function () {
        __audioLog.push('play ' + el.src.split('/').pop());
        var p = el.play();
        if (p && p.catch) {
          p.catch(function () {
            document.addEventListener('click', function retry() {
              document.removeEventListener('click', retry);
              if (el.loop && !el.dataset.paused) el.play().catch(function () {});
            });
          });
        }
        delete el.dataset.paused;
      },
      pause: function () {
        __audioLog.push('pause ' + el.src.split('/').pop());
        el.dataset.paused = '1';
        el.pause();
      },
      stop: function () {
        el.pause();
        el.currentTime = 0;
      }
    };
    return ctx;
  }
};
var __audioLog = [];

function Page(options) {
  __page = Object.assign({}, options);
  __page.data = JSON.parse(JSON.stringify(options.data || {}));
  __page.setData = function (patch, callback) {
    Object.assign(this.data, patch);
    __schedule();
    if (callback) setTimeout(callback, 0);
  };
}

var __exprCache = {};
function __evaluate(expr, scope) {
  var fn = __exprCache[expr];
  if (!fn) fn = __exprCache[expr] = new Function('__s', 'with (__s) { return (' + expr + '); }');
  try {
    return fn(scope);
  } catch (e) {
    return undefined;
  }
}

function __interpolate(str, scope) {
  // 整段只有一个 {{}} 时保留原类型；两个 {{}} 紧挨着的文本不能当成一个表达式。
  var whole = str.match(/^\{\{((?:(?!\}\})[\s\S])+)\}\}$/);
  if (whole) return __evaluate(whole[1], scope);
  return str.replace(/\{\{([\s\S]+?)\}\}/g, function (_, expr) {
    var v = __evaluate(expr, scope);
    return v === undefined || v === null ? '' : v;
  });
}

function __renderNodes(nodes, scope, out) {
  var pending = false;
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.nodeType === 3) {
      var t = n.nodeValue.trim();
      if (t) out.appendChild(document.createTextNode(String(__interpolate(t, scope))));
      continue;
    }
    if (n.nodeType !== 1) continue;
    if (n.hasAttribute('wx:if')) {
      pending = !__interpolate(n.getAttribute('wx:if'), scope);
      if (pending) continue;
    } else if (n.hasAttribute('wx:elif')) {
      if (!pending) continue;
      pending = !__interpolate(n.getAttribute('wx:elif'), scope);
      if (pending) continue;
    } else if (n.hasAttribute('wx:else')) {
      if (!pending) continue;
      pending = false;
    }
    if (n.hasAttribute('wx:for')) {
      var list = __interpolate(n.getAttribute('wx:for'), scope) || [];
      for (var j = 0; j < list.length; j++) {
        var child = Object.create(scope);
        child.item = list[j];
        child.index = j;
        __renderElement(n, child, out);
      }
    } else {
      __renderElement(n, scope, out);
    }
  }
}

function __renderElement(n, scope, out) {
  var tag = n.tagName.toLowerCase();
  if (tag === 'block') {
    __renderNodes(n.childNodes, scope, out);
    return;
  }
  var el = document.createElement(tag);
  for (var i = 0; i < n.attributes.length; i++) {
    var a = n.attributes[i];
    if (a.name.indexOf('wx:') === 0) continue;
    var v = __interpolate(a.value, scope);
    if (v === false || v === undefined || v === null) continue;
    v = String(v);
    if (tag === 'img' && a.name === 'src') v = v.replace(/^\//, '');
    el.setAttribute(a.name, v);
  }
  __renderNodes(n.childNodes, scope, el);
  out.appendChild(el);
}

// 按位置比对并原地更新，保留滚动位置和正在播放的动画。
function __morph(a, b) {
  if (a.nodeType === 3) {
    if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue;
    return;
  }
  var i;
  for (i = a.attributes.length - 1; i >= 0; i--) {
    var name = a.attributes[i].name;
    if (!b.hasAttribute(name)) a.removeAttribute(name);
  }
  for (i = 0; i < b.attributes.length; i++) {
    var attr = b.attributes[i];
    if (a.getAttribute(attr.name) !== attr.value) a.setAttribute(attr.name, attr.value);
  }
  var ac = Array.prototype.slice.call(a.childNodes);
  var bc = Array.prototype.slice.call(b.childNodes);
  for (i = 0; i < bc.length; i++) {
    if (!ac[i]) a.appendChild(bc[i]);
    else if (ac[i].nodeType === bc[i].nodeType && ac[i].nodeName === bc[i].nodeName) __morph(ac[i], bc[i]);
    else a.replaceChild(bc[i], ac[i]);
  }
  for (i = bc.length; i < ac.length; i++) a.removeChild(ac[i]);
}

var __template = null;
var __app = null;
var __scheduled = false;

function __render() {
  var next = document.createElement('div');
  next.id = 'app';
  __renderNodes(__template.childNodes, __page.data, next);
  __morph(__app, next);
}

function __schedule() {
  if (__scheduled) return;
  __scheduled = true;
  setTimeout(function () {
    __scheduled = false;
    __render();
  }, 0);
}

function __boot(name) {
  __app = document.getElementById('app');
  __template = new DOMParser().parseFromString(document.getElementById('wxml').textContent, 'text/html').body;
  __require(name);

  __app.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.nodeType === 1 && el !== __app) {
      var caught = el.getAttribute('catchtap');
      var handler = caught || el.getAttribute('bindtap');
      if (handler && typeof __page[handler] === 'function') {
        __page[handler]({
          type: 'tap',
          currentTarget: { dataset: Object.assign({}, el.dataset) },
          detail: { x: e.clientX, y: e.clientY }
        });
      }
      if (el.getAttribute('open-type') === 'share' && typeof __page.onShareAppMessage === 'function') {
        window.__lastShare = __page.onShareAppMessage({ from: 'button' });
      }
      if (caught) break;
      el = el.parentNode;
    }
  });

  __app.addEventListener('pointerdown', function (e) {
    var el = e.target.closest ? e.target.closest('[hover-class]') : null;
    if (!el) return;
    var cls = el.getAttribute('hover-class');
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 120);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (__page.onHide) __page.onHide();
    } else if (__page.onShow) {
      __page.onShow();
    }
  });

  if (__page.onLoad) __page.onLoad({});
  if (__page.onShow) __page.onShow();
}
