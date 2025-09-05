var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _buffer, _offset, _a, _buffer2, _view, _offset2, _expandBuffer, expandBuffer_fn, _b, _c, _d, _setter, setter_fn, _createType, _e, createType_fn, _isBytes, isBytes_fn, _isBytesNewtype, isBytesNewtype_fn, _isI64Newtype, isI64Newtype_fn, _events, _f, _ws, _handleOnMessage, handleOnMessage_fn, _handleOnOpen, handleOnOpen_fn, _handleOnError, handleOnError_fn, _g, _uri, _nameOrAddress, _identity, _token, _emitter, _compression, _lightMode, _createWSFn, _h, _onApplied, _onError, _i, _queryId, _unsubscribeCalled, _endedState, _activeState, _emitter2, _j, _queryId2, _emitter3, _reducerEmitter, _onApplied2, _remoteModule, _messageQueue, _subscriptionManager, _getNextQueryId, _processParsedMessage, processParsedMessage_fn, _sendMessage, sendMessage_fn, _handleOnOpen2, handleOnOpen_fn2, _applyTableUpdates, applyTableUpdates_fn, _processMessage, processMessage_fn, _handleOnMessage2, handleOnMessage_fn2, _on, on_fn, _off, off_fn, _onConnect, onConnect_fn, _onDisconnect, onDisconnect_fn, _onConnectError, onConnectError_fn, _removeOnConnect, removeOnConnect_fn, _removeOnDisconnect, removeOnDisconnect_fn, _removeOnConnectError, removeOnConnectError_fn, _k;
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(script) {
    const fetchOpts = {};
    if (script.integrity)
      fetchOpts.integrity = script.integrity;
    if (script.referrerpolicy)
      fetchOpts.referrerPolicy = script.referrerpolicy;
    if (script.crossorigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (script.crossorigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const style = "";
class Writable {
  constructor(initialValue) {
    __publicField(this, "value");
    __publicField(this, "resolved");
    __publicField(this, "previous");
    __publicField(this, "listeners", []);
    __publicField(this, "listeners_once", []);
    this.set(initialValue);
  }
  set(newValue, force = false) {
    if (newValue instanceof Promise) {
      if (!force && newValue == this.value)
        return;
      this.previous = this.resolved;
      this.resolved = void 0;
      this.value = newValue;
      this.value.then((v) => {
        if (newValue != this.value)
          return;
        this.resolved = v;
        if (v == this.previous)
          return;
        this.listeners.forEach((l) => l(v));
        this.listeners_once.forEach((l) => l(v));
        this.listeners_once = [];
      });
    } else {
      if (!force && newValue == this.resolved)
        return;
      this.value = Promise.resolve(newValue);
      this.resolved = newValue;
      this.listeners.forEach((l) => l(newValue));
      this.listeners_once.forEach((l) => l(newValue));
      this.listeners_once = [];
    }
  }
  subscribe(listener) {
    this.listeners.push(listener);
    if (this.resolved != void 0)
      listener(this.resolved);
  }
  subscribeLater(listener) {
    this.listeners.push(listener);
  }
  get() {
    return new Promise((resolve, reject) => {
      if (this.resolved != void 0)
        return resolve(this.resolved);
      let sub = (res) => {
        resolve(res);
      };
      this.listeners_once.push(sub);
    });
  }
  then(fn) {
    return this.get().then(fn);
  }
  update(fn, force = false) {
    this.set(this.get().then(fn), force);
  }
  map(mapper) {
    let res = new Writable(new Promise(() => {
    }));
    this.subscribe((v) => {
      res.set(mapper(v));
    });
    return res;
  }
}
class Stored extends Writable {
  constructor(key, initialValue) {
    if (localStorage.getItem(key) !== null) {
      initialValue = JSON.parse(localStorage.getItem(key));
    }
    super(initialValue);
    __publicField(this, "key");
    this.key = key;
    this.subscribe((v) => {
      localStorage.setItem(this.key, JSON.stringify(v));
    });
  }
}
const htmlElement = (tag, text, cls = "", args) => {
  const _element = document.createElement(tag);
  _element.innerText = text;
  if (args)
    Object.entries(args).forEach(([key, value]) => {
      if (key === "parent") {
        value.appendChild(_element);
      }
      if (key === "children") {
        value.forEach((c) => _element.appendChild(c));
      } else if (key === "eventListeners") {
        Object.entries(value).forEach(([event, listener]) => {
          _element.addEventListener(event, listener);
        });
      } else if (key === "color" || key === "background") {
        _element.style[key] = value;
      } else if (key === "style") {
        Object.entries(value).forEach(([key2, value2]) => {
          _element.style.setProperty(key2, value2);
        });
      } else if (key === "class") {
        _element.classList.add(...value.split(".").filter((x) => x));
      } else {
        _element[key] = value;
      }
    });
  return _element;
};
const html = (tag, ...cs) => {
  let children = [];
  let args = {};
  const add_arg = (arg) => {
    if (typeof arg === "string")
      children.push(htmlElement("span", arg));
    else if (typeof arg === "number")
      children.push(htmlElement("span", arg.toString()));
    else if (arg instanceof Writable) {
      const el = span({ class: "writable-container" });
      arg.subscribe((value) => {
        el.innerHTML = "";
        el.appendChild(span(value, { class: "writable-value" }));
        console.log("new el:", el);
        console.log(el.parentElement);
      });
      children.push(el);
    } else if (arg instanceof Promise) {
      const el = span();
      arg.then((value) => {
        el.innerHTML = "";
        el.appendChild(span(value));
      });
      children.push(el);
    } else if (arg instanceof HTMLElement)
      children.push(arg);
    else if (arg instanceof Array)
      arg.forEach(add_arg);
    else
      args = { ...args, ...arg };
  };
  for (let arg of cs) {
    add_arg(arg);
  }
  return htmlElement(tag, "", "", { ...args, children });
};
const newHtmlGenerator = (tag) => (...cs) => html(tag, ...cs);
const p = newHtmlGenerator("p");
const h2 = newHtmlGenerator("h2");
const div = newHtmlGenerator("div");
const button = newHtmlGenerator("button");
const span = newHtmlGenerator("span");
const input = (...cs) => {
  const writable = cs.find((c) => c instanceof Writable);
  const content = cs.filter((c) => typeof c == "string").join(" ");
  const el = html("input", ...cs);
  if (writable) {
    writable.subscribe((v) => {
      if (el.value != v.toString()) {
        el.value = v.toString();
      }
    });
    el.onkeydown = (e) => {
      if (e.key == "Enter") {
        writable.set(el.value);
      }
    };
  } else {
    el.value = content;
  }
  return el;
};
const popup = (...cs) => {
  const dialogfield = div(...cs);
  const popupbackground = div(
    { style: {
      "position": "fixed",
      "top": "0",
      "left": "0",
      "width": "100%",
      "height": "100%",
      "background": "rgba(166, 166, 166, 0.5)",
      "display": "flex",
      "justify-content": "center",
      "align-items": "center"
    } }
  );
  popupbackground.appendChild(dialogfield);
  document.body.appendChild(popupbackground);
  popupbackground.onclick = () => {
    popupbackground.remove();
  };
  dialogfield.style.background = "var(--bg)";
  dialogfield.style.color = "var(--color)";
  dialogfield.style.padding = "1em";
  dialogfield.style.paddingBottom = "2em";
  dialogfield.style.borderRadius = "1em";
  dialogfield.onclick = (e) => {
    e.stopPropagation();
  };
  return popupbackground;
};
const DEFAULT_ENCODING = "utf-8";
function decoderError(fatal, opt_code_point = void 0) {
  if (fatal)
    throw TypeError("Decoder error");
  return opt_code_point || 65533;
}
function encoderError(code_point) {
  throw TypeError("The code point " + code_point + " could not be encoded.");
}
function getEncoding(label) {
  const keyLabel = String(label).trim().toLowerCase();
  if (keyLabel in label_to_encoding) {
    return label_to_encoding[keyLabel];
  }
  return null;
}
const encodings = [
  {
    encodings: [
      {
        labels: ["unicode-1-1-utf-8", "utf-8", "utf8"],
        name: "UTF-8"
      }
    ],
    heading: "The Encoding"
  },
  {
    encodings: [
      {
        labels: ["866", "cp866", "csibm866", "ibm866"],
        name: "IBM866"
      },
      {
        labels: [
          "csisolatin2",
          "iso-8859-2",
          "iso-ir-101",
          "iso8859-2",
          "iso88592",
          "iso_8859-2",
          "iso_8859-2:1987",
          "l2",
          "latin2"
        ],
        name: "ISO-8859-2"
      },
      {
        labels: [
          "csisolatin3",
          "iso-8859-3",
          "iso-ir-109",
          "iso8859-3",
          "iso88593",
          "iso_8859-3",
          "iso_8859-3:1988",
          "l3",
          "latin3"
        ],
        name: "ISO-8859-3"
      },
      {
        labels: [
          "csisolatin4",
          "iso-8859-4",
          "iso-ir-110",
          "iso8859-4",
          "iso88594",
          "iso_8859-4",
          "iso_8859-4:1988",
          "l4",
          "latin4"
        ],
        name: "ISO-8859-4"
      },
      {
        labels: [
          "csisolatincyrillic",
          "cyrillic",
          "iso-8859-5",
          "iso-ir-144",
          "iso8859-5",
          "iso88595",
          "iso_8859-5",
          "iso_8859-5:1988"
        ],
        name: "ISO-8859-5"
      },
      {
        labels: [
          "arabic",
          "asmo-708",
          "csiso88596e",
          "csiso88596i",
          "csisolatinarabic",
          "ecma-114",
          "iso-8859-6",
          "iso-8859-6-e",
          "iso-8859-6-i",
          "iso-ir-127",
          "iso8859-6",
          "iso88596",
          "iso_8859-6",
          "iso_8859-6:1987"
        ],
        name: "ISO-8859-6"
      },
      {
        labels: [
          "csisolatingreek",
          "ecma-118",
          "elot_928",
          "greek",
          "greek8",
          "iso-8859-7",
          "iso-ir-126",
          "iso8859-7",
          "iso88597",
          "iso_8859-7",
          "iso_8859-7:1987",
          "sun_eu_greek"
        ],
        name: "ISO-8859-7"
      },
      {
        labels: [
          "csiso88598e",
          "csisolatinhebrew",
          "hebrew",
          "iso-8859-8",
          "iso-8859-8-e",
          "iso-ir-138",
          "iso8859-8",
          "iso88598",
          "iso_8859-8",
          "iso_8859-8:1988",
          "visual"
        ],
        name: "ISO-8859-8"
      },
      {
        labels: ["csiso88598i", "iso-8859-8-i", "logical"],
        name: "ISO-8859-8-I"
      },
      {
        labels: [
          "csisolatin6",
          "iso-8859-10",
          "iso-ir-157",
          "iso8859-10",
          "iso885910",
          "l6",
          "latin6"
        ],
        name: "ISO-8859-10"
      },
      {
        labels: ["iso-8859-13", "iso8859-13", "iso885913"],
        name: "ISO-8859-13"
      },
      {
        labels: ["iso-8859-14", "iso8859-14", "iso885914"],
        name: "ISO-8859-14"
      },
      {
        labels: [
          "csisolatin9",
          "iso-8859-15",
          "iso8859-15",
          "iso885915",
          "iso_8859-15",
          "l9"
        ],
        name: "ISO-8859-15"
      },
      {
        labels: ["iso-8859-16"],
        name: "ISO-8859-16"
      },
      {
        labels: ["cskoi8r", "koi", "koi8", "koi8-r", "koi8_r"],
        name: "KOI8-R"
      },
      {
        labels: ["koi8-ru", "koi8-u"],
        name: "KOI8-U"
      },
      {
        labels: ["csmacintosh", "mac", "macintosh", "x-mac-roman"],
        name: "macintosh"
      },
      {
        labels: [
          "dos-874",
          "iso-8859-11",
          "iso8859-11",
          "iso885911",
          "tis-620",
          "windows-874"
        ],
        name: "windows-874"
      },
      {
        labels: ["cp1250", "windows-1250", "x-cp1250"],
        name: "windows-1250"
      },
      {
        labels: ["cp1251", "windows-1251", "x-cp1251"],
        name: "windows-1251"
      },
      {
        labels: [
          "ansi_x3.4-1968",
          "cp1252",
          "cp819",
          "ibm819",
          "iso-ir-100",
          "windows-1252",
          "x-cp1252"
        ],
        name: "windows-1252"
      },
      {
        labels: [
          "ascii",
          "us-ascii",
          "iso-8859-1",
          "iso8859-1",
          "iso88591",
          "iso_8859-1",
          "iso_8859-1:1987",
          "l1",
          "latin1",
          "csisolatin1"
        ],
        name: "iso-8859-1"
      },
      {
        labels: ["cp1253", "windows-1253", "x-cp1253"],
        name: "windows-1253"
      },
      {
        labels: [
          "cp1254",
          "csisolatin5",
          "iso-8859-9",
          "iso-ir-148",
          "iso8859-9",
          "iso88599",
          "iso_8859-9",
          "iso_8859-9:1989",
          "l5",
          "latin5",
          "windows-1254",
          "x-cp1254"
        ],
        name: "windows-1254"
      },
      {
        labels: ["cp1255", "windows-1255", "x-cp1255"],
        name: "windows-1255"
      },
      {
        labels: ["cp1256", "windows-1256", "x-cp1256"],
        name: "windows-1256"
      },
      {
        labels: ["cp1257", "windows-1257", "x-cp1257"],
        name: "windows-1257"
      },
      {
        labels: ["cp1258", "windows-1258", "x-cp1258"],
        name: "windows-1258"
      },
      {
        labels: ["x-mac-cyrillic", "x-mac-ukrainian"],
        name: "x-mac-cyrillic"
      }
    ],
    heading: "Legacy single-byte encodings"
  },
  {
    encodings: [
      {
        labels: [
          "chinese",
          "csgb2312",
          "csiso58gb231280",
          "gb2312",
          "gb_2312",
          "gb_2312-80",
          "gbk",
          "iso-ir-58",
          "x-gbk"
        ],
        name: "GBK"
      },
      {
        labels: ["gb18030"],
        name: "gb18030"
      }
    ],
    heading: "Legacy multi-byte Chinese (simplified) encodings"
  },
  {
    encodings: [
      {
        labels: ["big5", "big5-hkscs", "cn-big5", "csbig5", "x-x-big5"],
        name: "Big5"
      }
    ],
    heading: "Legacy multi-byte Chinese (traditional) encodings"
  },
  {
    encodings: [
      {
        labels: ["cseucpkdfmtjapanese", "euc-jp", "x-euc-jp"],
        name: "EUC-JP"
      },
      {
        labels: ["csiso2022jp", "iso-2022-jp"],
        name: "ISO-2022-JP"
      },
      {
        labels: [
          "csshiftjis",
          "ms932",
          "ms_kanji",
          "shift-jis",
          "shift_jis",
          "sjis",
          "windows-31j",
          "x-sjis"
        ],
        name: "Shift_JIS"
      }
    ],
    heading: "Legacy multi-byte Japanese encodings"
  },
  {
    encodings: [
      {
        labels: [
          "cseuckr",
          "csksc56011987",
          "euc-kr",
          "iso-ir-149",
          "korean",
          "ks_c_5601-1987",
          "ks_c_5601-1989",
          "ksc5601",
          "ksc_5601",
          "windows-949"
        ],
        name: "EUC-KR"
      }
    ],
    heading: "Legacy multi-byte Korean encodings"
  },
  {
    encodings: [
      {
        labels: [
          "csiso2022kr",
          "hz-gb-2312",
          "iso-2022-cn",
          "iso-2022-cn-ext",
          "iso-2022-kr"
        ],
        name: "replacement"
      },
      {
        labels: ["utf-16be"],
        name: "UTF-16BE"
      },
      {
        labels: ["utf-16", "utf-16le"],
        name: "UTF-16LE"
      },
      {
        labels: ["x-user-defined"],
        name: "x-user-defined"
      }
    ],
    heading: "Legacy miscellaneous encodings"
  }
];
const label_to_encoding = {};
encodings.forEach((category) => {
  category.encodings.forEach((encoding) => {
    encoding.labels.forEach((label) => {
      label_to_encoding[label] = encoding;
    });
  });
});
const finished = -1;
function getArrayVal(idxVal) {
  return Array.isArray(idxVal) ? idxVal : [idxVal];
}
function inRange(a, min, max) {
  return min <= a && a <= max;
}
function includes(array, item) {
  return array.indexOf(item) !== -1;
}
function ToDictionary(o) {
  if (o === void 0 || o === null)
    return {};
  if (o === Object(o))
    return o;
  throw TypeError("Could not convert argument to dictionary");
}
function stringToCodePoints(string) {
  const s = String(string);
  const n = s.length;
  let i = 0;
  const u = [];
  while (i < n) {
    const c = s.charCodeAt(i);
    if (c < 55296 || c > 57343) {
      u.push(c);
    } else if (56320 <= c && c <= 57343) {
      u.push(65533);
    } else if (55296 <= c && c <= 56319) {
      if (i === n - 1) {
        u.push(65533);
      } else {
        const d = s.charCodeAt(i + 1);
        if (56320 <= d && d <= 57343) {
          const a = c & 1023;
          const b = d & 1023;
          u.push(65536 + (a << 10) + b);
          i += 1;
        } else {
          u.push(65533);
        }
      }
    }
    i += 1;
  }
  return u;
}
function codePointsToString(code_points) {
  let s = "";
  for (let i = 0; i < code_points.length; ++i) {
    let cp = code_points[i];
    if (cp <= 65535) {
      s += String.fromCharCode(cp);
    } else {
      cp -= 65536;
      s += String.fromCharCode((cp >> 10) + 55296, (cp & 1023) + 56320);
    }
  }
  return s;
}
function getGlobalScope() {
  if (typeof global !== "undefined")
    return global;
  if (typeof window !== "undefined")
    return window;
  if (typeof self !== "undefined")
    return self;
  return;
}
let _encodingIndexes;
function checkForEncodingIndexes() {
  if (typeof TextEncodingIndexes !== "undefined")
    return TextEncodingIndexes.encodingIndexes;
  const glo = getGlobalScope();
  if (!glo)
    return null;
  if ("TextEncodingIndexes" in glo)
    return global["TextEncodingIndexes"]["encodingIndexes"];
  if ("encoding-indexes" in glo)
    return global["encodingIndexes"];
  return null;
}
function getEncodingIndexes() {
  if (_encodingIndexes) {
    return _encodingIndexes;
  }
  const indexes = checkForEncodingIndexes();
  if (!indexes) {
    return null;
  }
  _encodingIndexes = indexes;
  return indexes;
}
function indexCodePointFor(pointer, index2) {
  if (!index2)
    return null;
  return index2[pointer] || null;
}
function indexPointerFor(code_point, index2) {
  const pointer = index2.indexOf(code_point);
  return pointer === -1 ? null : pointer;
}
function index(name) {
  const encodingIndexes2 = getEncodingIndexes();
  if (!encodingIndexes2) {
    throw Error("Indexes missing. Did you forget to include encoding-indexes.js first?");
  }
  return encodingIndexes2[name];
}
function indexGB18030RangesCodePointFor(pointer) {
  if (pointer > 39419 && pointer < 189e3 || pointer > 1237575)
    return null;
  if (pointer === 7457)
    return 59335;
  let offset = 0;
  let code_point_offset = 0;
  const idx = index("gb18030-ranges");
  for (let i = 0; i < idx.length; ++i) {
    const entry = getArrayVal(idx[i]);
    if (entry[0] <= pointer) {
      offset = entry[0];
      code_point_offset = entry[1];
    } else {
      break;
    }
  }
  return code_point_offset + pointer - offset;
}
function indexGB18030RangesPointerFor(code_point) {
  if (code_point === 59335)
    return 7457;
  let offset = 0;
  let pointer_offset = 0;
  const idx = index("gb18030-ranges");
  for (let i = 0; i < idx.length; ++i) {
    const idxVal = idx[i];
    const entry = getArrayVal(idxVal);
    if (entry[1] <= code_point) {
      offset = entry[1];
      pointer_offset = entry[0];
    } else {
      break;
    }
  }
  return pointer_offset + code_point - offset;
}
function indexShiftJISPointerFor(code_point) {
  shift_jis_index = shift_jis_index || index("jis0208").map(function(code_point2, pointer) {
    return inRange(pointer, 8272, 8835) ? null : code_point2;
  });
  const index_ = shift_jis_index;
  return index_.indexOf(code_point);
}
let shift_jis_index;
function indexBig5PointerFor(code_point) {
  big5_index_no_hkscs = big5_index_no_hkscs || index("big5").map((code_point2, pointer) => pointer < (161 - 129) * 157 ? null : code_point2);
  const index_ = big5_index_no_hkscs;
  if (code_point === 9552 || code_point === 9566 || code_point === 9569 || code_point === 9578 || code_point === 21313 || code_point === 21317) {
    return index_.lastIndexOf(code_point);
  }
  return indexPointerFor(code_point, index_);
}
let big5_index_no_hkscs;
function isASCIIByte(a) {
  return 0 <= a && a <= 127;
}
const isASCIICodePoint = isASCIIByte;
const end_of_stream = -1;
class Big5Decoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.Big5_lead = 0;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && this.Big5_lead !== 0) {
      this.Big5_lead = 0;
      return decoderError(this.fatal);
    }
    if (bite === end_of_stream && this.Big5_lead === 0)
      return finished;
    if (this.Big5_lead !== 0) {
      const lead = this.Big5_lead;
      let pointer = null;
      this.Big5_lead = 0;
      const offset = bite < 127 ? 64 : 98;
      if (inRange(bite, 64, 126) || inRange(bite, 161, 254))
        pointer = (lead - 129) * 157 + (bite - offset);
      switch (pointer) {
        case 1133:
          return [202, 772];
        case 1135:
          return [202, 780];
        case 1164:
          return [234, 772];
        case 1166:
          return [234, 780];
      }
      const code_point = pointer === null ? null : indexCodePointFor(pointer, index("big5"));
      if (code_point === null && isASCIIByte(bite))
        stream.prepend(bite);
      if (code_point === null)
        return decoderError(this.fatal);
      return code_point;
    }
    if (isASCIIByte(bite))
      return bite;
    if (inRange(bite, 129, 254)) {
      this.Big5_lead = bite;
      return null;
    }
    return decoderError(this.fatal);
  }
}
class Big5Encoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    const pointer = indexBig5PointerFor(code_point);
    if (pointer === null)
      return encoderError(code_point);
    const lead = Math.floor(pointer / 157) + 129;
    if (lead < 161)
      return encoderError(code_point);
    const trail = pointer % 157;
    const offset = trail < 63 ? 64 : 98;
    return [lead, trail + offset];
  }
}
class EUCJPDecoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.eucjp_jis0212_flag = false, this.eucjp_lead = 0;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && this.eucjp_lead !== 0) {
      this.eucjp_lead = 0;
      return decoderError(this.fatal);
    }
    if (bite === end_of_stream && this.eucjp_lead === 0)
      return finished;
    if (this.eucjp_lead === 142 && inRange(bite, 161, 223)) {
      this.eucjp_lead = 0;
      return 65377 - 161 + bite;
    }
    if (this.eucjp_lead === 143 && inRange(bite, 161, 254)) {
      this.eucjp_jis0212_flag = true;
      this.eucjp_lead = bite;
      return null;
    }
    if (this.eucjp_lead !== 0) {
      const lead = this.eucjp_lead;
      this.eucjp_lead = 0;
      let code_point = null;
      if (inRange(lead, 161, 254) && inRange(bite, 161, 254)) {
        code_point = indexCodePointFor((lead - 161) * 94 + (bite - 161), index(!this.eucjp_jis0212_flag ? "jis0208" : "jis0212"));
      }
      this.eucjp_jis0212_flag = false;
      if (!inRange(bite, 161, 254))
        stream.prepend(bite);
      if (code_point === null)
        return decoderError(this.fatal);
      return code_point;
    }
    if (isASCIIByte(bite))
      return bite;
    if (bite === 142 || bite === 143 || inRange(bite, 161, 254)) {
      this.eucjp_lead = bite;
      return null;
    }
    return decoderError(this.fatal);
  }
}
class EUCJPEncoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    if (code_point === 165)
      return 92;
    if (code_point === 8254)
      return 126;
    if (inRange(code_point, 65377, 65439))
      return [142, code_point - 65377 + 161];
    if (code_point === 8722)
      code_point = 65293;
    const pointer = indexPointerFor(code_point, index("jis0208"));
    if (pointer === null)
      return encoderError(code_point);
    const lead = Math.floor(pointer / 94) + 161;
    const trail = pointer % 94 + 161;
    return [lead, trail];
  }
}
class EUCKRDecoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.euckr_lead = 0;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && this.euckr_lead !== 0) {
      this.euckr_lead = 0;
      return decoderError(this.fatal);
    }
    if (bite === end_of_stream && this.euckr_lead === 0)
      return finished;
    if (this.euckr_lead !== 0) {
      const lead = this.euckr_lead;
      let pointer = null;
      this.euckr_lead = 0;
      if (inRange(bite, 65, 254))
        pointer = (lead - 129) * 190 + (bite - 65);
      const code_point = pointer === null ? null : indexCodePointFor(pointer, index("euc-kr"));
      if (pointer === null && isASCIIByte(bite))
        stream.prepend(bite);
      if (code_point === null)
        return decoderError(this.fatal);
      return code_point;
    }
    if (isASCIIByte(bite))
      return bite;
    if (inRange(bite, 129, 254)) {
      this.euckr_lead = bite;
      return null;
    }
    return decoderError(this.fatal);
  }
}
class EUCKREncoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    const pointer = indexPointerFor(code_point, index("euc-kr"));
    if (pointer === null)
      return encoderError(code_point);
    const lead = Math.floor(pointer / 190) + 129;
    const trail = pointer % 190 + 65;
    return [lead, trail];
  }
}
class GB18030Decoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.gb18030_first = 0, this.gb18030_second = 0, this.gb18030_third = 0;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && this.gb18030_first === 0 && this.gb18030_second === 0 && this.gb18030_third === 0) {
      return finished;
    }
    if (bite === end_of_stream && (this.gb18030_first !== 0 || this.gb18030_second !== 0 || this.gb18030_third !== 0)) {
      this.gb18030_first = 0;
      this.gb18030_second = 0;
      this.gb18030_third = 0;
      decoderError(this.fatal);
    }
    let code_point;
    if (this.gb18030_third !== 0) {
      code_point = null;
      if (inRange(bite, 48, 57)) {
        code_point = indexGB18030RangesCodePointFor((((this.gb18030_first - 129) * 10 + this.gb18030_second - 48) * 126 + this.gb18030_third - 129) * 10 + bite - 48);
      }
      const buffer = [this.gb18030_second, this.gb18030_third, bite];
      this.gb18030_first = 0;
      this.gb18030_second = 0;
      this.gb18030_third = 0;
      if (code_point === null) {
        stream.prepend(buffer);
        return decoderError(this.fatal);
      }
      return code_point;
    }
    if (this.gb18030_second !== 0) {
      if (inRange(bite, 129, 254)) {
        this.gb18030_third = bite;
        return null;
      }
      stream.prepend([this.gb18030_second, bite]);
      this.gb18030_first = 0;
      this.gb18030_second = 0;
      return decoderError(this.fatal);
    }
    if (this.gb18030_first !== 0) {
      if (inRange(bite, 48, 57)) {
        this.gb18030_second = bite;
        return null;
      }
      const lead = this.gb18030_first;
      let pointer = null;
      this.gb18030_first = 0;
      const offset = bite < 127 ? 64 : 65;
      if (inRange(bite, 64, 126) || inRange(bite, 128, 254))
        pointer = (lead - 129) * 190 + (bite - offset);
      code_point = pointer === null ? null : indexCodePointFor(pointer, index("gb18030"));
      if (code_point === null && isASCIIByte(bite))
        stream.prepend(bite);
      if (code_point === null)
        return decoderError(this.fatal);
      return code_point;
    }
    if (isASCIIByte(bite))
      return bite;
    if (bite === 128)
      return 8364;
    if (inRange(bite, 129, 254)) {
      this.gb18030_first = bite;
      return null;
    }
    return decoderError(this.fatal);
  }
}
class GB18030Encoder {
  constructor(options, gbk_flag = void 0) {
    this.gbk_flag = gbk_flag;
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    if (code_point === 58853)
      return encoderError(code_point);
    if (this.gbk_flag && code_point === 8364)
      return 128;
    let pointer = indexPointerFor(code_point, index("gb18030"));
    if (pointer !== null) {
      const lead = Math.floor(pointer / 190) + 129;
      const trail = pointer % 190;
      const offset = trail < 63 ? 64 : 65;
      return [lead, trail + offset];
    }
    if (this.gbk_flag)
      return encoderError(code_point);
    pointer = indexGB18030RangesPointerFor(code_point);
    const byte1 = Math.floor(pointer / 10 / 126 / 10);
    pointer = pointer - byte1 * 10 * 126 * 10;
    const byte2 = Math.floor(pointer / 10 / 126);
    pointer = pointer - byte2 * 10 * 126;
    const byte3 = Math.floor(pointer / 10);
    const byte4 = pointer - byte3 * 10;
    return [
      byte1 + 129,
      byte2 + 48,
      byte3 + 129,
      byte4 + 48
    ];
  }
}
var states$1;
(function(states2) {
  states2[states2["ASCII"] = 0] = "ASCII";
  states2[states2["Roman"] = 1] = "Roman";
  states2[states2["Katakana"] = 2] = "Katakana";
  states2[states2["LeadByte"] = 3] = "LeadByte";
  states2[states2["TrailByte"] = 4] = "TrailByte";
  states2[states2["EscapeStart"] = 5] = "EscapeStart";
  states2[states2["Escape"] = 6] = "Escape";
})(states$1 || (states$1 = {}));
class ISO2022JPDecoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.iso2022jp_decoder_state = states$1.ASCII, this.iso2022jp_decoder_output_state = states$1.ASCII, this.iso2022jp_lead = 0, this.iso2022jp_output_flag = false;
  }
  handler(stream, bite) {
    switch (this.iso2022jp_decoder_state) {
      default:
      case states$1.ASCII:
        if (bite === 27) {
          this.iso2022jp_decoder_state = states$1.EscapeStart;
          return null;
        }
        if (inRange(bite, 0, 127) && bite !== 14 && bite !== 15 && bite !== 27) {
          this.iso2022jp_output_flag = false;
          return bite;
        }
        if (bite === end_of_stream) {
          return finished;
        }
        this.iso2022jp_output_flag = false;
        return decoderError(this.fatal);
      case states$1.Roman:
        if (bite === 27) {
          this.iso2022jp_decoder_state = states$1.EscapeStart;
          return null;
        }
        if (bite === 92) {
          this.iso2022jp_output_flag = false;
          return 165;
        }
        if (bite === 126) {
          this.iso2022jp_output_flag = false;
          return 8254;
        }
        if (inRange(bite, 0, 127) && bite !== 14 && bite !== 15 && bite !== 27 && bite !== 92 && bite !== 126) {
          this.iso2022jp_output_flag = false;
          return bite;
        }
        if (bite === end_of_stream) {
          return finished;
        }
        this.iso2022jp_output_flag = false;
        return decoderError(this.fatal);
      case states$1.Katakana:
        if (bite === 27) {
          this.iso2022jp_decoder_state = states$1.EscapeStart;
          return null;
        }
        if (inRange(bite, 33, 95)) {
          this.iso2022jp_output_flag = false;
          return 65377 - 33 + bite;
        }
        if (bite === end_of_stream) {
          return finished;
        }
        this.iso2022jp_output_flag = false;
        return decoderError(this.fatal);
      case states$1.LeadByte:
        if (bite === 27) {
          this.iso2022jp_decoder_state = states$1.EscapeStart;
          return null;
        }
        if (inRange(bite, 33, 126)) {
          this.iso2022jp_output_flag = false;
          this.iso2022jp_lead = bite;
          this.iso2022jp_decoder_state = states$1.TrailByte;
          return null;
        }
        if (bite === end_of_stream) {
          return finished;
        }
        this.iso2022jp_output_flag = false;
        return decoderError(this.fatal);
      case states$1.TrailByte:
        if (bite === 27) {
          this.iso2022jp_decoder_state = states$1.EscapeStart;
          return decoderError(this.fatal);
        }
        if (inRange(bite, 33, 126)) {
          this.iso2022jp_decoder_state = states$1.LeadByte;
          const pointer = (this.iso2022jp_lead - 33) * 94 + bite - 33;
          const code_point = indexCodePointFor(pointer, index("jis0208"));
          if (code_point === null)
            return decoderError(this.fatal);
          return code_point;
        }
        if (bite === end_of_stream) {
          this.iso2022jp_decoder_state = states$1.LeadByte;
          stream.prepend(bite);
          return decoderError(this.fatal);
        }
        this.iso2022jp_decoder_state = states$1.LeadByte;
        return decoderError(this.fatal);
      case states$1.EscapeStart:
        if (bite === 36 || bite === 40) {
          this.iso2022jp_lead = bite;
          this.iso2022jp_decoder_state = states$1.Escape;
          return null;
        }
        stream.prepend(bite);
        this.iso2022jp_output_flag = false;
        this.iso2022jp_decoder_state = this.iso2022jp_decoder_output_state;
        return decoderError(this.fatal);
      case states$1.Escape:
        const lead = this.iso2022jp_lead;
        this.iso2022jp_lead = 0;
        let state = null;
        if (lead === 40 && bite === 66)
          state = states$1.ASCII;
        if (lead === 40 && bite === 74)
          state = states$1.Roman;
        if (lead === 40 && bite === 73)
          state = states$1.Katakana;
        if (lead === 36 && (bite === 64 || bite === 66))
          state = states$1.LeadByte;
        if (state !== null) {
          this.iso2022jp_decoder_state = this.iso2022jp_decoder_state = state;
          const output_flag = this.iso2022jp_output_flag;
          this.iso2022jp_output_flag = true;
          return !output_flag ? null : decoderError(this.fatal);
        }
        stream.prepend([lead, bite]);
        this.iso2022jp_output_flag = false;
        this.iso2022jp_decoder_state = this.iso2022jp_decoder_output_state;
        return decoderError(this.fatal);
    }
  }
}
var states;
(function(states2) {
  states2[states2["ASCII"] = 0] = "ASCII";
  states2[states2["Roman"] = 1] = "Roman";
  states2[states2["jis0208"] = 2] = "jis0208";
})(states || (states = {}));
class ISO2022JPEncoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.iso2022jp_state = states.ASCII;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream && this.iso2022jp_state !== states.ASCII) {
      stream.prepend(code_point);
      this.iso2022jp_state = states.ASCII;
      return [27, 40, 66];
    }
    if (code_point === end_of_stream && this.iso2022jp_state === states.ASCII)
      return finished;
    if ((this.iso2022jp_state === states.ASCII || this.iso2022jp_state === states.Roman) && (code_point === 14 || code_point === 15 || code_point === 27)) {
      return encoderError(65533);
    }
    if (this.iso2022jp_state === states.ASCII && isASCIICodePoint(code_point))
      return code_point;
    if (this.iso2022jp_state === states.Roman && (isASCIICodePoint(code_point) && code_point !== 92 && code_point !== 126 || (code_point == 165 || code_point == 8254))) {
      if (isASCIICodePoint(code_point))
        return code_point;
      if (code_point === 165)
        return 92;
      if (code_point === 8254)
        return 126;
    }
    if (isASCIICodePoint(code_point) && this.iso2022jp_state !== states.ASCII) {
      stream.prepend(code_point);
      this.iso2022jp_state = states.ASCII;
      return [27, 40, 66];
    }
    if ((code_point === 165 || code_point === 8254) && this.iso2022jp_state !== states.Roman) {
      stream.prepend(code_point);
      this.iso2022jp_state = states.Roman;
      return [27, 40, 74];
    }
    if (code_point === 8722)
      code_point = 65293;
    const pointer = indexPointerFor(code_point, index("jis0208"));
    if (pointer === null)
      return encoderError(code_point);
    if (this.iso2022jp_state !== states.jis0208) {
      stream.prepend(code_point);
      this.iso2022jp_state = states.jis0208;
      return [27, 36, 66];
    }
    const lead = Math.floor(pointer / 94) + 33;
    const trail = pointer % 94 + 33;
    return [lead, trail];
  }
}
class ShiftJISDecoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.Shift_JIS_lead = 0;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && this.Shift_JIS_lead !== 0) {
      this.Shift_JIS_lead = 0;
      return decoderError(this.fatal);
    }
    if (bite === end_of_stream && this.Shift_JIS_lead === 0)
      return finished;
    if (this.Shift_JIS_lead !== 0) {
      const lead = this.Shift_JIS_lead;
      let pointer = null;
      this.Shift_JIS_lead = 0;
      const offset = bite < 127 ? 64 : 65;
      const lead_offset = lead < 160 ? 129 : 193;
      if (inRange(bite, 64, 126) || inRange(bite, 128, 252))
        pointer = (lead - lead_offset) * 188 + bite - offset;
      if (inRange(pointer, 8836, 10715))
        return 57344 - 8836 + pointer;
      const code_point = pointer === null ? null : indexCodePointFor(pointer, index("jis0208"));
      if (code_point === null && isASCIIByte(bite))
        stream.prepend(bite);
      if (code_point === null)
        return decoderError(this.fatal);
      return code_point;
    }
    if (isASCIIByte(bite) || bite === 128)
      return bite;
    if (inRange(bite, 161, 223))
      return 65377 - 161 + bite;
    if (inRange(bite, 129, 159) || inRange(bite, 224, 252)) {
      this.Shift_JIS_lead = bite;
      return null;
    }
    return decoderError(this.fatal);
  }
}
class ShiftJISEncoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point) || code_point === 128)
      return code_point;
    if (code_point === 165)
      return 92;
    if (code_point === 8254)
      return 126;
    if (inRange(code_point, 65377, 65439))
      return code_point - 65377 + 161;
    if (code_point === 8722)
      code_point = 65293;
    const pointer = indexShiftJISPointerFor(code_point);
    if (pointer === null)
      return encoderError(code_point);
    const lead = Math.floor(pointer / 188);
    const lead_offset = lead < 31 ? 129 : 193;
    const trail = pointer % 188;
    const offset = trail < 63 ? 64 : 65;
    return [lead + lead_offset, trail + offset];
  }
}
class SingleByteDecoder {
  constructor(index2, options) {
    this.index = index2;
    this.fatal = options.fatal;
  }
  handler(stream, bite) {
    if (bite === end_of_stream)
      return finished;
    if (isASCIIByte(bite))
      return bite;
    const code_point = this.index[bite - 128];
    if (!code_point)
      return decoderError(this.fatal);
    return code_point;
  }
}
class SingleByteEncoder {
  constructor(index2, options) {
    this.index = index2;
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    const pointer = indexPointerFor(code_point, this.index);
    if (pointer === null)
      encoderError(code_point);
    return pointer + 128;
  }
}
function convertCodeUnitToBytes(code_unit, utf16be) {
  const byte1 = code_unit >> 8;
  const byte2 = code_unit & 255;
  if (utf16be)
    return [byte1, byte2];
  return [byte2, byte1];
}
class UTF16Decoder {
  constructor(utf16_be, options) {
    this.utf16_be = utf16_be;
    this.fatal = options.fatal;
    this.utf16_lead_byte = null;
    this.utf16_lead_surrogate = null;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && (this.utf16_lead_byte !== null || this.utf16_lead_surrogate !== null)) {
      return decoderError(this.fatal);
    }
    if (bite === end_of_stream && this.utf16_lead_byte === null && this.utf16_lead_surrogate === null) {
      return finished;
    }
    if (this.utf16_lead_byte === null) {
      this.utf16_lead_byte = bite;
      return null;
    }
    let code_unit;
    if (this.utf16_be) {
      code_unit = (this.utf16_lead_byte << 8) + bite;
    } else {
      code_unit = (bite << 8) + this.utf16_lead_byte;
    }
    this.utf16_lead_byte = null;
    if (this.utf16_lead_surrogate !== null) {
      const lead_surrogate = this.utf16_lead_surrogate;
      this.utf16_lead_surrogate = null;
      if (inRange(code_unit, 56320, 57343)) {
        return 65536 + (lead_surrogate - 55296) * 1024 + (code_unit - 56320);
      }
      stream.prepend(convertCodeUnitToBytes(code_unit, this.utf16_be));
      return decoderError(this.fatal);
    }
    if (inRange(code_unit, 55296, 56319)) {
      this.utf16_lead_surrogate = code_unit;
      return null;
    }
    if (inRange(code_unit, 56320, 57343))
      return decoderError(this.fatal);
    return code_unit;
  }
}
class UTF16Encoder {
  constructor(utf16_be, options) {
    this.utf16_be = utf16_be;
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (inRange(code_point, 0, 65535))
      return convertCodeUnitToBytes(code_point, this.utf16_be);
    const lead = convertCodeUnitToBytes((code_point - 65536 >> 10) + 55296, this.utf16_be);
    const trail = convertCodeUnitToBytes((code_point - 65536 & 1023) + 56320, this.utf16_be);
    return lead.concat(trail);
  }
}
class UTF8Decoder {
  constructor(options) {
    this.fatal = options.fatal;
    this.utf8_code_point = 0, this.utf8_bytes_seen = 0, this.utf8_bytes_needed = 0, this.utf8_lower_boundary = 128, this.utf8_upper_boundary = 191;
  }
  handler(stream, bite) {
    if (bite === end_of_stream && this.utf8_bytes_needed !== 0) {
      this.utf8_bytes_needed = 0;
      return decoderError(this.fatal);
    }
    if (bite === end_of_stream)
      return finished;
    if (this.utf8_bytes_needed === 0) {
      if (inRange(bite, 0, 127)) {
        return bite;
      } else if (inRange(bite, 194, 223)) {
        this.utf8_bytes_needed = 1;
        this.utf8_code_point = bite & 31;
      } else if (inRange(bite, 224, 239)) {
        if (bite === 224)
          this.utf8_lower_boundary = 160;
        if (bite === 237)
          this.utf8_upper_boundary = 159;
        this.utf8_bytes_needed = 2;
        this.utf8_code_point = bite & 15;
      } else if (inRange(bite, 240, 244)) {
        if (bite === 240)
          this.utf8_lower_boundary = 144;
        if (bite === 244)
          this.utf8_upper_boundary = 143;
        this.utf8_bytes_needed = 3;
        this.utf8_code_point = bite & 7;
      } else {
        return decoderError(this.fatal);
      }
      return null;
    }
    if (!inRange(bite, this.utf8_lower_boundary, this.utf8_upper_boundary)) {
      this.utf8_code_point = this.utf8_bytes_needed = this.utf8_bytes_seen = 0;
      this.utf8_lower_boundary = 128;
      this.utf8_upper_boundary = 191;
      stream.prepend(bite);
      return decoderError(this.fatal);
    }
    this.utf8_lower_boundary = 128;
    this.utf8_upper_boundary = 191;
    this.utf8_code_point = this.utf8_code_point << 6 | bite & 63;
    this.utf8_bytes_seen += 1;
    if (this.utf8_bytes_seen !== this.utf8_bytes_needed)
      return null;
    const code_point = this.utf8_code_point;
    this.utf8_code_point = this.utf8_bytes_needed = this.utf8_bytes_seen = 0;
    return code_point;
  }
}
class UTF8Encoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    let count, offset;
    if (inRange(code_point, 128, 2047)) {
      count = 1;
      offset = 192;
    } else if (inRange(code_point, 2048, 65535)) {
      count = 2;
      offset = 224;
    } else if (inRange(code_point, 65536, 1114111)) {
      count = 3;
      offset = 240;
    }
    const bytes = [(code_point >> 6 * count) + offset];
    while (count > 0) {
      const temp = code_point >> 6 * (count - 1);
      bytes.push(128 | temp & 63);
      count -= 1;
    }
    return bytes;
  }
}
class XUserDefinedDecoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, bite) {
    if (bite === end_of_stream)
      return finished;
    if (isASCIIByte(bite))
      return bite;
    return 63360 + bite - 128;
  }
}
class XUserDefinedEncoder {
  constructor(options) {
    this.fatal = options.fatal;
  }
  handler(stream, code_point) {
    if (code_point === end_of_stream)
      return finished;
    if (isASCIICodePoint(code_point))
      return code_point;
    if (inRange(code_point, 63360, 63487))
      return code_point - 63360 + 128;
    return encoderError(code_point);
  }
}
const encodingIndexes = getEncodingIndexes();
const encoders = {
  "UTF-8": (options) => new UTF8Encoder(options),
  "GBK": (options) => new GB18030Encoder(options, true),
  "gb18030": (options) => new GB18030Encoder(options),
  "Big5": (options) => new Big5Encoder(options),
  "EUC-JP": (options) => new EUCJPEncoder(options),
  "ISO-2022-JP": (options) => new ISO2022JPEncoder(options),
  "Shift_JIS": (options) => new ShiftJISEncoder(options),
  "EUC-KR": (options) => new EUCKREncoder(options),
  "UTF-16BE": (options) => new UTF16Encoder(true, options),
  "UTF-16LE": (options) => new UTF16Encoder(false, options),
  "x-user-defined": (options) => new XUserDefinedEncoder(options)
};
const decoders = {
  "UTF-8": (options) => new UTF8Decoder(options),
  "GBK": (options) => new GB18030Decoder(options),
  "gb18030": (options) => new GB18030Decoder(options),
  "Big5": (options) => new Big5Decoder(options),
  "EUC-JP": (options) => new EUCJPDecoder(options),
  "ISO-2022-JP": (options) => new ISO2022JPDecoder(options),
  "Shift_JIS": (options) => new ShiftJISDecoder(options),
  "EUC-KR": (options) => new EUCKRDecoder(options),
  "UTF-16BE": (options) => new UTF16Decoder(true, options),
  "UTF-16LE": (options) => new UTF16Decoder(false, options),
  "x-user-defined": (options) => new XUserDefinedDecoder(options)
};
if (encodingIndexes) {
  encodings.forEach(function(category) {
    if (category.heading !== "Legacy single-byte encodings")
      return;
    category.encodings.forEach(function(encoding) {
      const name = encoding.name;
      const idx = index(name.toLowerCase());
      decoders[name] = function(options) {
        return new SingleByteDecoder(idx, options);
      };
      encoders[name] = function(options) {
        return new SingleByteEncoder(idx, options);
      };
    });
  });
}
class Stream {
  constructor(tokens) {
    this.tokens = Array.from(tokens);
    this.tokens.reverse();
  }
  endOfStream() {
    return !this.tokens.length;
  }
  read() {
    if (!this.tokens.length)
      return end_of_stream;
    return this.tokens.pop();
  }
  prepend(token) {
    if (Array.isArray(token)) {
      const tokens = token;
      while (tokens.length)
        this.tokens.push(tokens.pop());
    } else {
      this.tokens.push(token);
    }
  }
  push(token) {
    if (Array.isArray(token)) {
      const tokens = token;
      while (tokens.length)
        this.tokens.unshift(tokens.shift());
    } else {
      this.tokens.unshift(token);
    }
  }
}
class TextDecoder {
  constructor(label, options) {
    label = label !== void 0 ? String(label) : DEFAULT_ENCODING;
    const optionsMap = ToDictionary(options);
    this._encoding = null;
    this._decoder = null;
    this._ignoreBOM = false;
    this._BOMseen = false;
    this._error_mode = "replacement";
    this._do_not_flush = false;
    const encoding = getEncoding(label);
    if (encoding === null || encoding.name === "replacement")
      throw RangeError("Unknown encoding: " + label);
    if (!decoders[encoding.name]) {
      throw Error("Decoder not present. Did you forget to include encoding-indexes.js first?");
    }
    this._encoding = encoding;
    if (Boolean(optionsMap["fatal"]))
      this._error_mode = "fatal";
    if (Boolean(optionsMap["ignoreBOM"]))
      this._ignoreBOM = true;
  }
  get encoding() {
    return this._encoding.name.toLowerCase();
  }
  get fatal() {
    return this._error_mode === "fatal";
  }
  get ignoreBOM() {
    return this._ignoreBOM;
  }
  decode(input2, options) {
    const bytes = getBytesFromInput(input2);
    const optionsMap = ToDictionary(options);
    if (!this._do_not_flush) {
      this._decoder = decoders[this._encoding.name]({
        fatal: this._error_mode === "fatal"
      });
      this._BOMseen = false;
    }
    this._do_not_flush = Boolean(optionsMap["stream"]);
    const input_stream = new Stream(bytes);
    const output = [];
    let result;
    while (true) {
      const token = input_stream.read();
      if (token === end_of_stream)
        break;
      result = this._decoder.handler(input_stream, token);
      if (result === finished)
        break;
      if (result !== null) {
        if (Array.isArray(result))
          output.push.apply(output, result);
        else
          output.push(result);
      }
    }
    if (!this._do_not_flush) {
      do {
        result = this._decoder.handler(input_stream, input_stream.read());
        if (result === finished)
          break;
        if (!result)
          continue;
        if (Array.isArray(result))
          output.push.apply(output, result);
        else
          output.push(result);
      } while (!input_stream.endOfStream());
      this._decoder = null;
    }
    return this.serializeStream(output);
  }
  serializeStream(stream) {
    if (includes(["UTF-8", "UTF-16LE", "UTF-16BE"], this._encoding.name) && !this._ignoreBOM && !this._BOMseen) {
      if (stream.length > 0 && stream[0] === 65279) {
        this._BOMseen = true;
        stream.shift();
      } else if (stream.length > 0) {
        this._BOMseen = true;
      } else
        ;
    }
    return codePointsToString(stream);
  }
}
function isBufferInstance(input2) {
  try {
    return input2 instanceof ArrayBuffer;
  } catch (e) {
    console.error(e);
    return false;
  }
}
function getBytesFromInput(input2) {
  if (typeof input2 !== "object")
    return new Uint8Array(0);
  if (isBufferInstance(input2)) {
    return new Uint8Array(input2);
  }
  if ("buffer" in input2 && isBufferInstance(input2.buffer)) {
    return new Uint8Array(input2.buffer, input2.byteOffset, input2.byteLength);
  }
  return new Uint8Array(0);
}
class TextEncoder$1 {
  constructor(label, options) {
    const optionsMap = ToDictionary(options);
    this._encoding = null;
    this._encoder = null;
    this._do_not_flush = false;
    this._fatal = Boolean(optionsMap["fatal"]) ? "fatal" : "replacement";
    if (Boolean(optionsMap["NONSTANDARD_allowLegacyEncoding"])) {
      label = !!label ? String(label) : DEFAULT_ENCODING;
      const encoding = getEncoding(label);
      if (encoding === null || encoding.name === "replacement")
        throw RangeError("Unknown encoding: " + label);
      if (!encoders[encoding.name]) {
        throw Error("Encoder not present. Did you forget to include encoding-indexes.js first?");
      }
      this._encoding = encoding;
    } else {
      this._encoding = getEncoding("utf-8");
      const glo = getGlobalScope() || {};
      if (label !== void 0 && "console" in glo) {
        console.warn("TextEncoder constructor called with encoding label, which is ignored.");
      }
    }
  }
  get encoding() {
    return this._encoding.name.toLowerCase();
  }
  encode(opt_string, options) {
    opt_string = opt_string === void 0 ? "" : String(opt_string);
    const optionsMap = ToDictionary(options);
    if (!this._do_not_flush)
      this._encoder = encoders[this._encoding.name]({
        fatal: this._fatal === "fatal"
      });
    this._do_not_flush = Boolean(optionsMap["stream"]);
    const input2 = new Stream(stringToCodePoints(opt_string));
    const output = [];
    let result;
    while (true) {
      const token = input2.read();
      if (token === end_of_stream)
        break;
      result = this._encoder.handler(input2, token);
      if (result === finished)
        break;
      if (Array.isArray(result))
        output.push.apply(output, result);
      else
        output.push(result);
    }
    if (!this._do_not_flush) {
      while (true) {
        result = this._encoder.handler(input2, input2.read());
        if (result === finished)
          break;
        if (Array.isArray(result))
          output.push.apply(output, result);
        else
          output.push(result);
      }
      this._encoder = null;
    }
    return new Uint8Array(output);
  }
}
if (typeof window !== "undefined") {
  const checkUndefined = (key) => !(key in window) || typeof window[key] === "undefined" || window[key] === null;
  if (checkUndefined("TextDecoder"))
    window["TextDecoder"] = TextDecoder;
  if (checkUndefined("TextEncoder"))
    window["TextEncoder"] = TextEncoder$1;
}
var fromByteArray_1 = fromByteArray;
var lookup = [];
var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
}
function tripletToBase64(num) {
  return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
}
function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16 & 16711680) + (uint8[i + 1] << 8 & 65280) + (uint8[i + 2] & 255);
    output.push(tripletToBase64(tmp));
  }
  return output.join("");
}
function fromByteArray(uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3;
  var parts = [];
  var maxChunkLength = 16383;
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
  }
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(
      lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
    );
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(
      lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
    );
  }
  return parts.join("");
}
var BinaryReader = (_a = class {
  constructor(input2) {
    __privateAdd(this, _buffer, void 0);
    __privateAdd(this, _offset, 0);
    __privateSet(this, _buffer, new DataView(input2.buffer));
    __privateSet(this, _offset, input2.byteOffset);
  }
  get offset() {
    return __privateGet(this, _offset);
  }
  readUInt8Array() {
    const length = this.readU32();
    const value = new Uint8Array(
      __privateGet(this, _buffer).buffer,
      __privateGet(this, _offset),
      length
    );
    __privateSet(this, _offset, __privateGet(this, _offset) + length);
    return value;
  }
  readBool() {
    const value = __privateGet(this, _buffer).getUint8(__privateGet(this, _offset));
    __privateSet(this, _offset, __privateGet(this, _offset) + 1);
    return value !== 0;
  }
  readByte() {
    const value = __privateGet(this, _buffer).getUint8(__privateGet(this, _offset));
    __privateSet(this, _offset, __privateGet(this, _offset) + 1);
    return value;
  }
  readBytes(length) {
    const value = new DataView(
      __privateGet(this, _buffer).buffer,
      __privateGet(this, _offset),
      length
    );
    __privateSet(this, _offset, __privateGet(this, _offset) + length);
    return new Uint8Array(value.buffer);
  }
  readI8() {
    const value = __privateGet(this, _buffer).getInt8(__privateGet(this, _offset));
    __privateSet(this, _offset, __privateGet(this, _offset) + 1);
    return value;
  }
  readU8() {
    const value = __privateGet(this, _buffer).getUint8(__privateGet(this, _offset));
    __privateSet(this, _offset, __privateGet(this, _offset) + 1);
    return value;
  }
  readI16() {
    const value = __privateGet(this, _buffer).getInt16(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 2);
    return value;
  }
  readU16() {
    const value = __privateGet(this, _buffer).getUint16(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 2);
    return value;
  }
  readI32() {
    const value = __privateGet(this, _buffer).getInt32(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 4);
    return value;
  }
  readU32() {
    const value = __privateGet(this, _buffer).getUint32(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 4);
    return value;
  }
  readI64() {
    const value = __privateGet(this, _buffer).getBigInt64(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 8);
    return value;
  }
  readU64() {
    const value = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 8);
    return value;
  }
  readU128() {
    const lowerPart = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset), true);
    const upperPart = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset) + 8, true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 16);
    return (upperPart << BigInt(64)) + lowerPart;
  }
  readI128() {
    const lowerPart = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset), true);
    const upperPart = __privateGet(this, _buffer).getBigInt64(__privateGet(this, _offset) + 8, true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 16);
    return (upperPart << BigInt(64)) + lowerPart;
  }
  readU256() {
    const p0 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset), true);
    const p1 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset) + 8, true);
    const p2 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset) + 16, true);
    const p3 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset) + 24, true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 32);
    return (p3 << BigInt(3 * 64)) + (p2 << BigInt(2 * 64)) + (p1 << BigInt(1 * 64)) + p0;
  }
  readI256() {
    const p0 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset), true);
    const p1 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset) + 8, true);
    const p2 = __privateGet(this, _buffer).getBigUint64(__privateGet(this, _offset) + 16, true);
    const p3 = __privateGet(this, _buffer).getBigInt64(__privateGet(this, _offset) + 24, true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 32);
    return (p3 << BigInt(3 * 64)) + (p2 << BigInt(2 * 64)) + (p1 << BigInt(1 * 64)) + p0;
  }
  readF32() {
    const value = __privateGet(this, _buffer).getFloat32(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 4);
    return value;
  }
  readF64() {
    const value = __privateGet(this, _buffer).getFloat64(__privateGet(this, _offset), true);
    __privateSet(this, _offset, __privateGet(this, _offset) + 8);
    return value;
  }
  readString() {
    const length = this.readU32();
    const uint8Array = new Uint8Array(
      __privateGet(this, _buffer).buffer,
      __privateGet(this, _offset),
      length
    );
    const decoder = new TextDecoder("utf-8");
    const value = decoder.decode(uint8Array);
    __privateSet(this, _offset, __privateGet(this, _offset) + length);
    return value;
  }
}, _buffer = new WeakMap(), _offset = new WeakMap(), _a);
var BinaryWriter = (_b = class {
  constructor(size) {
    __privateAdd(this, _expandBuffer);
    __privateAdd(this, _buffer2, void 0);
    __privateAdd(this, _view, void 0);
    __privateAdd(this, _offset2, 0);
    __privateSet(this, _buffer2, new Uint8Array(size));
    __privateSet(this, _view, new DataView(__privateGet(this, _buffer2).buffer));
  }
  toBase64() {
    return fromByteArray_1(__privateGet(this, _buffer2).subarray(0, __privateGet(this, _offset2)));
  }
  getBuffer() {
    return __privateGet(this, _buffer2).slice(0, __privateGet(this, _offset2));
  }
  writeUInt8Array(value) {
    const length = value.length;
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 4 + length);
    this.writeU32(length);
    __privateGet(this, _buffer2).set(value, __privateGet(this, _offset2));
    __privateSet(this, _offset2, __privateGet(this, _offset2) + value.length);
  }
  writeBool(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 1);
    __privateGet(this, _view).setUint8(__privateGet(this, _offset2), value ? 1 : 0);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 1);
  }
  writeByte(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 1);
    __privateGet(this, _view).setUint8(__privateGet(this, _offset2), value);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 1);
  }
  writeI8(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 1);
    __privateGet(this, _view).setInt8(__privateGet(this, _offset2), value);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 1);
  }
  writeU8(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 1);
    __privateGet(this, _view).setUint8(__privateGet(this, _offset2), value);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 1);
  }
  writeI16(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 2);
    __privateGet(this, _view).setInt16(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 2);
  }
  writeU16(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 2);
    __privateGet(this, _view).setUint16(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 2);
  }
  writeI32(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 4);
    __privateGet(this, _view).setInt32(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 4);
  }
  writeU32(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 4);
    __privateGet(this, _view).setUint32(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 4);
  }
  writeI64(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 8);
    __privateGet(this, _view).setBigInt64(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 8);
  }
  writeU64(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 8);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 8);
  }
  writeU128(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 16);
    const lowerPart = value & BigInt("0xFFFFFFFFFFFFFFFF");
    const upperPart = value >> BigInt(64);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2), lowerPart, true);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8, upperPart, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 16);
  }
  writeI128(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 16);
    const lowerPart = value & BigInt("0xFFFFFFFFFFFFFFFF");
    const upperPart = value >> BigInt(64);
    __privateGet(this, _view).setBigInt64(__privateGet(this, _offset2), lowerPart, true);
    __privateGet(this, _view).setBigInt64(__privateGet(this, _offset2) + 8, upperPart, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 16);
  }
  writeU256(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 32);
    const low_64_mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const p0 = value & low_64_mask;
    const p1 = value >> BigInt(64 * 1) & low_64_mask;
    const p2 = value >> BigInt(64 * 2) & low_64_mask;
    const p3 = value >> BigInt(64 * 3);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 0, p0, true);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 1, p1, true);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 2, p2, true);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 3, p3, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 32);
  }
  writeI256(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 32);
    const low_64_mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const p0 = value & low_64_mask;
    const p1 = value >> BigInt(64 * 1) & low_64_mask;
    const p2 = value >> BigInt(64 * 2) & low_64_mask;
    const p3 = value >> BigInt(64 * 3);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 0, p0, true);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 1, p1, true);
    __privateGet(this, _view).setBigUint64(__privateGet(this, _offset2) + 8 * 2, p2, true);
    __privateGet(this, _view).setBigInt64(__privateGet(this, _offset2) + 8 * 3, p3, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 32);
  }
  writeF32(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 4);
    __privateGet(this, _view).setFloat32(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 4);
  }
  writeF64(value) {
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, 8);
    __privateGet(this, _view).setFloat64(__privateGet(this, _offset2), value, true);
    __privateSet(this, _offset2, __privateGet(this, _offset2) + 8);
  }
  writeString(value) {
    const encoder = new TextEncoder$1();
    const encodedString = encoder.encode(value);
    this.writeU32(encodedString.length);
    __privateMethod(this, _expandBuffer, expandBuffer_fn).call(this, encodedString.length);
    __privateGet(this, _buffer2).set(encodedString, __privateGet(this, _offset2));
    __privateSet(this, _offset2, __privateGet(this, _offset2) + encodedString.length);
  }
}, _buffer2 = new WeakMap(), _view = new WeakMap(), _offset2 = new WeakMap(), _expandBuffer = new WeakSet(), expandBuffer_fn = function(additionalCapacity) {
  const minCapacity = __privateGet(this, _offset2) + additionalCapacity + 1;
  if (minCapacity <= __privateGet(this, _buffer2).length)
    return;
  let newCapacity = __privateGet(this, _buffer2).length * 2;
  if (newCapacity < minCapacity)
    newCapacity = minCapacity;
  const newBuffer = new Uint8Array(newCapacity);
  newBuffer.set(__privateGet(this, _buffer2));
  __privateSet(this, _buffer2, newBuffer);
  __privateSet(this, _view, new DataView(__privateGet(this, _buffer2).buffer));
}, _b);
function deepEqual(obj1, obj2) {
  if (obj1 === obj2)
    return true;
  if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length)
    return false;
  for (let key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}
function uint8ArrayToHexString(array) {
  return Array.prototype.map.call(array.reverse(), (x) => ("00" + x.toString(16)).slice(-2)).join("");
}
function uint8ArrayToU128(array) {
  if (array.length != 16) {
    throw new Error(`Uint8Array is not 16 bytes long: ${array}`);
  }
  return new BinaryReader(array).readU128();
}
function uint8ArrayToU256(array) {
  if (array.length != 32) {
    throw new Error(`Uint8Array is not 32 bytes long: [${array}]`);
  }
  return new BinaryReader(array).readU256();
}
function hexStringToUint8Array(str) {
  if (str.startsWith("0x")) {
    str = str.slice(2);
  }
  let matches = str.match(/.{1,2}/g) || [];
  let data = Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
  if (data.length != 32) {
    return new Uint8Array(0);
  }
  return data.reverse();
}
function hexStringToU128(str) {
  return uint8ArrayToU128(hexStringToUint8Array(str));
}
function hexStringToU256(str) {
  return uint8ArrayToU256(hexStringToUint8Array(str));
}
function u128ToUint8Array(data) {
  let writer = new BinaryWriter(16);
  writer.writeU128(data);
  return writer.getBuffer();
}
function u128ToHexString(data) {
  return uint8ArrayToHexString(u128ToUint8Array(data));
}
function u256ToUint8Array(data) {
  let writer = new BinaryWriter(32);
  writer.writeU256(data);
  return writer.getBuffer();
}
function u256ToHexString(data) {
  return uint8ArrayToHexString(u256ToUint8Array(data));
}
var ConnectionId = class _ConnectionId {
  constructor(data) {
    __publicField(this, "data");
    this.data = data;
  }
  get __connection_id__() {
    return this.data;
  }
  isZero() {
    return this.data === BigInt(0);
  }
  static nullIfZero(addr) {
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
  static random() {
    function randomU8() {
      return Math.floor(Math.random() * 255);
    }
    let result = BigInt(0);
    for (let i = 0; i < 16; i++) {
      result = result << BigInt(8) | BigInt(randomU8());
    }
    return new _ConnectionId(result);
  }
  isEqual(other) {
    return this.data == other.data;
  }
  toHexString() {
    return u128ToHexString(this.data);
  }
  toUint8Array() {
    return u128ToUint8Array(this.data);
  }
  static fromString(str) {
    return new _ConnectionId(hexStringToU128(str));
  }
  static fromStringOrNull(str) {
    let addr = _ConnectionId.fromString(str);
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
};
var TimeDuration = (_c = class {
  constructor(micros) {
    __publicField(this, "__time_duration_micros__");
    this.__time_duration_micros__ = micros;
  }
  get micros() {
    return this.__time_duration_micros__;
  }
  get millis() {
    return Number(this.micros / _c.MICROS_PER_MILLIS);
  }
  static fromMillis(millis) {
    return new _c(BigInt(millis) * _c.MICROS_PER_MILLIS);
  }
}, __publicField(_c, "MICROS_PER_MILLIS", 1000n), _c);
var Timestamp = (_d = class {
  constructor(micros) {
    __publicField(this, "__timestamp_micros_since_unix_epoch__");
    this.__timestamp_micros_since_unix_epoch__ = micros;
  }
  get microsSinceUnixEpoch() {
    return this.__timestamp_micros_since_unix_epoch__;
  }
  static now() {
    return _d.fromDate(/* @__PURE__ */ new Date());
  }
  static fromDate(date) {
    const millis = date.getTime();
    const micros = BigInt(millis) * _d.MICROS_PER_MILLIS;
    return new _d(micros);
  }
  toDate() {
    const micros = this.__timestamp_micros_since_unix_epoch__;
    const millis = micros / _d.MICROS_PER_MILLIS;
    if (millis > BigInt(Number.MAX_SAFE_INTEGER) || millis < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError(
        "Timestamp is outside of the representable range of JS's Date"
      );
    }
    return new Date(Number(millis));
  }
}, __publicField(_d, "MICROS_PER_MILLIS", 1000n), __publicField(_d, "UNIX_EPOCH", new _d(0n)), _d);
var Identity = class _Identity {
  constructor(data) {
    __publicField(this, "data");
    this.data = typeof data === "string" ? hexStringToU256(data) : data;
  }
  get __identity__() {
    return this.data;
  }
  isEqual(other) {
    return this.toHexString() === other.toHexString();
  }
  toHexString() {
    return u256ToHexString(this.data);
  }
  toUint8Array() {
    return u256ToUint8Array(this.data);
  }
  static fromString(str) {
    return new _Identity(str);
  }
};
var ScheduleAt;
((ScheduleAt2) => {
  function getAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant("Interval", AlgebraicType.createTimeDurationType()),
      new SumTypeVariant("Time", AlgebraicType.createTimestampType())
    ]);
  }
  ScheduleAt2.getAlgebraicType = getAlgebraicType;
  ScheduleAt2.Interval = (value) => ({
    tag: "Interval",
    value: { __time_duration_micros__: value }
  });
  ScheduleAt2.Time = (value) => ({
    tag: "Time",
    value: { __timestamp_micros_since_unix_epoch__: value }
  });
  function fromValue(value) {
    let sumValue = value.asSumValue();
    switch (sumValue.tag) {
      case 0:
        return {
          tag: "Interval",
          value: {
            __time_duration_micros__: sumValue.value.asProductValue().elements[0].asBigInt()
          }
        };
      case 1:
        return {
          tag: "Time",
          value: {
            __timestamp_micros_since_unix_epoch__: sumValue.value.asBigInt()
          }
        };
      default:
        throw "unreachable";
    }
  }
  ScheduleAt2.fromValue = fromValue;
})(ScheduleAt || (ScheduleAt = {}));
var schedule_at_default = ScheduleAt;
var SumTypeVariant = class {
  constructor(name, algebraicType) {
    __publicField(this, "name");
    __publicField(this, "algebraicType");
    this.name = name;
    this.algebraicType = algebraicType;
  }
};
var SumType = class {
  constructor(variants) {
    __publicField(this, "variants");
    __publicField(this, "serialize", (writer, value) => {
      if (this.variants.length == 2 && this.variants[0].name === "some" && this.variants[1].name === "none") {
        if (value !== null && value !== void 0) {
          writer.writeByte(0);
          this.variants[0].algebraicType.serialize(writer, value);
        } else {
          writer.writeByte(1);
        }
      } else {
        let variant = value["tag"];
        const index2 = this.variants.findIndex((v) => v.name === variant);
        if (index2 < 0) {
          throw `Can't serialize a sum type, couldn't find ${value.tag} tag`;
        }
        writer.writeU8(index2);
        this.variants[index2].algebraicType.serialize(writer, value["value"]);
      }
    });
    __publicField(this, "deserialize", (reader) => {
      let tag = reader.readU8();
      if (this.variants.length == 2 && this.variants[0].name === "some" && this.variants[1].name === "none") {
        if (tag === 0) {
          return this.variants[0].algebraicType.deserialize(reader);
        } else if (tag === 1) {
          return void 0;
        } else {
          throw `Can't deserialize an option type, couldn't find ${tag} tag`;
        }
      } else {
        let variant = this.variants[tag];
        let value = variant.algebraicType.deserialize(reader);
        return { tag: variant.name, value };
      }
    });
    this.variants = variants;
  }
};
var ProductTypeElement = class {
  constructor(name, algebraicType) {
    __publicField(this, "name");
    __publicField(this, "algebraicType");
    this.name = name;
    this.algebraicType = algebraicType;
  }
};
var ProductType = class {
  constructor(elements) {
    __publicField(this, "elements");
    __publicField(this, "serialize", (writer, value) => {
      for (let element of this.elements) {
        element.algebraicType.serialize(writer, value[element.name]);
      }
    });
    __publicField(this, "deserialize", (reader) => {
      let result = {};
      if (this.elements.length === 1) {
        if (this.elements[0].name === "__time_duration_micros__") {
          return new TimeDuration(reader.readI64());
        }
        if (this.elements[0].name === "__timestamp_micros_since_unix_epoch__") {
          return new Timestamp(reader.readI64());
        }
        if (this.elements[0].name === "__identity__") {
          return new Identity(reader.readU256());
        }
        if (this.elements[0].name === "__connection_id__") {
          return new ConnectionId(reader.readU128());
        }
      }
      for (let element of this.elements) {
        result[element.name] = element.algebraicType.deserialize(reader);
      }
      return result;
    });
    this.elements = elements;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
  intoMapKey(value) {
    if (this.elements.length === 1) {
      if (this.elements[0].name === "__time_duration_micros__") {
        return value.__time_duration_micros__;
      }
      if (this.elements[0].name === "__timestamp_micros_since_unix_epoch__") {
        return value.__timestamp_micros_since_unix_epoch__;
      }
      if (this.elements[0].name === "__identity__") {
        return value.__identity__;
      }
      if (this.elements[0].name === "__connection_id__") {
        return value.__connection_id__;
      }
    }
    const writer = new BinaryWriter(10);
    this.serialize(writer, value);
    return writer.toBase64();
  }
};
var MapType = class {
  constructor(keyType, valueType) {
    __publicField(this, "keyType");
    __publicField(this, "valueType");
    this.keyType = keyType;
    this.valueType = valueType;
  }
};
var AlgebraicType = (_e = class {
  constructor() {
    __privateAdd(this, _setter);
    __privateAdd(this, _isBytes);
    __privateAdd(this, _isBytesNewtype);
    __privateAdd(this, _isI64Newtype);
    __publicField(this, "type");
    __publicField(this, "type_");
  }
  get product() {
    if (this.type !== Type.ProductType) {
      throw "product type was requested, but the type is not ProductType";
    }
    return this.type_;
  }
  set product(value) {
    __privateMethod(this, _setter, setter_fn).call(this, Type.ProductType, value);
  }
  get sum() {
    if (this.type !== Type.SumType) {
      throw "sum type was requested, but the type is not SumType";
    }
    return this.type_;
  }
  set sum(value) {
    __privateMethod(this, _setter, setter_fn).call(this, Type.SumType, value);
  }
  get array() {
    if (this.type !== Type.ArrayType) {
      throw "array type was requested, but the type is not ArrayType";
    }
    return this.type_;
  }
  set array(value) {
    __privateMethod(this, _setter, setter_fn).call(this, Type.ArrayType, value);
  }
  get map() {
    if (this.type !== Type.MapType) {
      throw "map type was requested, but the type is not MapType";
    }
    return this.type_;
  }
  set map(value) {
    __privateMethod(this, _setter, setter_fn).call(this, Type.MapType, value);
  }
  static createProductType(elements) {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.ProductType, new ProductType(elements));
  }
  static createSumType(variants) {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.SumType, new SumType(variants));
  }
  static createArrayType(elementType) {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.ArrayType, elementType);
  }
  static createMapType(key, val) {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.MapType, new MapType(key, val));
  }
  static createBoolType() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.Bool, null);
  }
  static createI8Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.I8, null);
  }
  static createU8Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.U8, null);
  }
  static createI16Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.I16, null);
  }
  static createU16Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.U16, null);
  }
  static createI32Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.I32, null);
  }
  static createU32Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.U32, null);
  }
  static createI64Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.I64, null);
  }
  static createU64Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.U64, null);
  }
  static createI128Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.I128, null);
  }
  static createU128Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.U128, null);
  }
  static createI256Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.I256, null);
  }
  static createU256Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.U256, null);
  }
  static createF32Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.F32, null);
  }
  static createF64Type() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.F64, null);
  }
  static createStringType() {
    return __privateMethod(this, _createType, createType_fn).call(this, Type.String, null);
  }
  static createBytesType() {
    return this.createArrayType(this.createU8Type());
  }
  static createOptionType(innerType) {
    return this.createSumType([
      new SumTypeVariant("some", innerType),
      new SumTypeVariant("none", this.createProductType([]))
    ]);
  }
  static createIdentityType() {
    return this.createProductType([
      new ProductTypeElement("__identity__", this.createU256Type())
    ]);
  }
  static createConnectionIdType() {
    return this.createProductType([
      new ProductTypeElement("__connection_id__", this.createU128Type())
    ]);
  }
  static createScheduleAtType() {
    return schedule_at_default.getAlgebraicType();
  }
  static createTimestampType() {
    return this.createProductType([
      new ProductTypeElement(
        "__timestamp_micros_since_unix_epoch__",
        this.createI64Type()
      )
    ]);
  }
  static createTimeDurationType() {
    return this.createProductType([
      new ProductTypeElement("__time_duration_micros__", this.createI64Type())
    ]);
  }
  isProductType() {
    return this.type === Type.ProductType;
  }
  isSumType() {
    return this.type === Type.SumType;
  }
  isArrayType() {
    return this.type === Type.ArrayType;
  }
  isMapType() {
    return this.type === Type.MapType;
  }
  isIdentity() {
    return __privateMethod(this, _isBytesNewtype, isBytesNewtype_fn).call(this, "__identity__");
  }
  isConnectionId() {
    return __privateMethod(this, _isBytesNewtype, isBytesNewtype_fn).call(this, "__connection_id__");
  }
  isScheduleAt() {
    return this.isSumType() && this.sum.variants.length === 2 && this.sum.variants[0].name === "Interval" && this.sum.variants[0].algebraicType.type === Type.U64 && this.sum.variants[1].name === "Time" && this.sum.variants[1].algebraicType.type === Type.U64;
  }
  isTimestamp() {
    return __privateMethod(this, _isI64Newtype, isI64Newtype_fn).call(this, "__timestamp_micros_since_unix_epoch__");
  }
  isTimeDuration() {
    return __privateMethod(this, _isI64Newtype, isI64Newtype_fn).call(this, "__time_duration_micros__");
  }
  intoMapKey(value) {
    switch (this.type) {
      case Type.U8:
      case Type.U16:
      case Type.U32:
      case Type.U64:
      case Type.U128:
      case Type.U256:
      case Type.I8:
      case Type.I16:
      case Type.I64:
      case Type.I128:
      case Type.F32:
      case Type.F64:
      case Type.String:
      case Type.Bool:
        return value;
      case Type.ProductType:
        return this.product.intoMapKey(value);
      default:
        const writer = new BinaryWriter(10);
        this.serialize(writer, value);
        return writer.toBase64();
    }
  }
  serialize(writer, value) {
    switch (this.type) {
      case Type.ProductType:
        this.product.serialize(writer, value);
        break;
      case Type.SumType:
        this.sum.serialize(writer, value);
        break;
      case Type.ArrayType:
        if (__privateMethod(this, _isBytes, isBytes_fn).call(this)) {
          writer.writeUInt8Array(value);
        } else {
          const elemType = this.array;
          writer.writeU32(value.length);
          for (let elem of value) {
            elemType.serialize(writer, elem);
          }
        }
        break;
      case Type.MapType:
        throw new Error("not implemented");
      case Type.Bool:
        writer.writeBool(value);
        break;
      case Type.I8:
        writer.writeI8(value);
        break;
      case Type.U8:
        writer.writeU8(value);
        break;
      case Type.I16:
        writer.writeI16(value);
        break;
      case Type.U16:
        writer.writeU16(value);
        break;
      case Type.I32:
        writer.writeI32(value);
        break;
      case Type.U32:
        writer.writeU32(value);
        break;
      case Type.I64:
        writer.writeI64(value);
        break;
      case Type.U64:
        writer.writeU64(value);
        break;
      case Type.I128:
        writer.writeI128(value);
        break;
      case Type.U128:
        writer.writeU128(value);
        break;
      case Type.I256:
        writer.writeI256(value);
        break;
      case Type.U256:
        writer.writeU256(value);
        break;
      case Type.F32:
        writer.writeF32(value);
        break;
      case Type.F64:
        writer.writeF64(value);
        break;
      case Type.String:
        writer.writeString(value);
        break;
      default:
        throw new Error(`not implemented, ${this.type}`);
    }
  }
  deserialize(reader) {
    switch (this.type) {
      case Type.ProductType:
        return this.product.deserialize(reader);
      case Type.SumType:
        return this.sum.deserialize(reader);
      case Type.ArrayType:
        if (__privateMethod(this, _isBytes, isBytes_fn).call(this)) {
          return reader.readUInt8Array();
        } else {
          const elemType = this.array;
          const length = reader.readU32();
          let result = [];
          for (let i = 0; i < length; i++) {
            result.push(elemType.deserialize(reader));
          }
          return result;
        }
      case Type.MapType:
        throw new Error("not implemented");
      case Type.Bool:
        return reader.readBool();
      case Type.I8:
        return reader.readI8();
      case Type.U8:
        return reader.readU8();
      case Type.I16:
        return reader.readI16();
      case Type.U16:
        return reader.readU16();
      case Type.I32:
        return reader.readI32();
      case Type.U32:
        return reader.readU32();
      case Type.I64:
        return reader.readI64();
      case Type.U64:
        return reader.readU64();
      case Type.I128:
        return reader.readI128();
      case Type.U128:
        return reader.readU128();
      case Type.U256:
        return reader.readU256();
      case Type.F32:
        return reader.readF32();
      case Type.F64:
        return reader.readF64();
      case Type.String:
        return reader.readString();
      default:
        throw new Error(`not implemented, ${this.type}`);
    }
  }
}, _setter = new WeakSet(), setter_fn = function(type, payload) {
  this.type_ = payload;
  this.type = payload === void 0 ? Type.None : type;
}, _createType = new WeakSet(), createType_fn = function(type, payload) {
  var _a2;
  let at = new _e();
  __privateMethod(_a2 = at, _setter, setter_fn).call(_a2, type, payload);
  return at;
}, _isBytes = new WeakSet(), isBytes_fn = function() {
  return this.isArrayType() && this.array.type == Type.U8;
}, _isBytesNewtype = new WeakSet(), isBytesNewtype_fn = function(tag) {
  return this.isProductType() && this.product.elements.length === 1 && (this.product.elements[0].algebraicType.type == Type.U128 || this.product.elements[0].algebraicType.type == Type.U256) && this.product.elements[0].name === tag;
}, _isI64Newtype = new WeakSet(), isI64Newtype_fn = function(tag) {
  return this.isProductType() && this.product.elements.length === 1 && this.product.elements[0].algebraicType.type === Type.I64 && this.product.elements[0].name === tag;
}, __privateAdd(_e, _createType), _e);
((AlgebraicType2) => {
  ((Type3) => {
    Type3["SumType"] = "SumType";
    Type3["ProductType"] = "ProductType";
    Type3["ArrayType"] = "ArrayType";
    Type3["MapType"] = "MapType";
    Type3["Bool"] = "Bool";
    Type3["I8"] = "I8";
    Type3["U8"] = "U8";
    Type3["I16"] = "I16";
    Type3["U16"] = "U16";
    Type3["I32"] = "I32";
    Type3["U32"] = "U32";
    Type3["I64"] = "I64";
    Type3["U64"] = "U64";
    Type3["I128"] = "I128";
    Type3["U128"] = "U128";
    Type3["I256"] = "I256";
    Type3["U256"] = "U256";
    Type3["F32"] = "F32";
    Type3["F64"] = "F64";
    Type3["String"] = "String";
    Type3["None"] = "None";
  })(AlgebraicType2.Type || (AlgebraicType2.Type = {}));
})(AlgebraicType || (AlgebraicType = {}));
var Type = AlgebraicType.Type;
function parseValue(ty, src) {
  const reader = new BinaryReader(src);
  return ty.deserialize(reader);
}
var RowSizeHint;
((RowSizeHint2) => {
  RowSizeHint2.FixedSize = (value) => ({
    tag: "FixedSize",
    value
  });
  RowSizeHint2.RowOffsets = (value) => ({
    tag: "RowOffsets",
    value
  });
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant("FixedSize", AlgebraicType.createU16Type()),
      new SumTypeVariant(
        "RowOffsets",
        AlgebraicType.createArrayType(AlgebraicType.createU64Type())
      )
    ]);
  }
  RowSizeHint2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    RowSizeHint2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  RowSizeHint2.serialize = serialize;
  function deserialize(reader) {
    return RowSizeHint2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  RowSizeHint2.deserialize = deserialize;
})(RowSizeHint || (RowSizeHint = {}));
var BsatnRowList;
((BsatnRowList3) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "sizeHint",
        RowSizeHint.getTypeScriptAlgebraicType()
      ),
      new ProductTypeElement(
        "rowsData",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      )
    ]);
  }
  BsatnRowList3.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    BsatnRowList3.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  BsatnRowList3.serialize = serialize;
  function deserialize(reader) {
    return BsatnRowList3.getTypeScriptAlgebraicType().deserialize(reader);
  }
  BsatnRowList3.deserialize = deserialize;
})(BsatnRowList || (BsatnRowList = {}));
var CallReducer;
((CallReducer2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("reducer", AlgebraicType.createStringType()),
      new ProductTypeElement(
        "args",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      ),
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement("flags", AlgebraicType.createU8Type())
    ]);
  }
  CallReducer2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    CallReducer2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  CallReducer2.serialize = serialize;
  function deserialize(reader) {
    return CallReducer2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  CallReducer2.deserialize = deserialize;
})(CallReducer || (CallReducer = {}));
var Subscribe;
((Subscribe2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "queryStrings",
        AlgebraicType.createArrayType(AlgebraicType.createStringType())
      ),
      new ProductTypeElement("requestId", AlgebraicType.createU32Type())
    ]);
  }
  Subscribe2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Subscribe2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Subscribe2.serialize = serialize;
  function deserialize(reader) {
    return Subscribe2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Subscribe2.deserialize = deserialize;
})(Subscribe || (Subscribe = {}));
var OneOffQuery;
((OneOffQuery2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "messageId",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      ),
      new ProductTypeElement("queryString", AlgebraicType.createStringType())
    ]);
  }
  OneOffQuery2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    OneOffQuery2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  OneOffQuery2.serialize = serialize;
  function deserialize(reader) {
    return OneOffQuery2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  OneOffQuery2.deserialize = deserialize;
})(OneOffQuery || (OneOffQuery = {}));
var QueryId;
((QueryId2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("id", AlgebraicType.createU32Type())
    ]);
  }
  QueryId2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    QueryId2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  QueryId2.serialize = serialize;
  function deserialize(reader) {
    return QueryId2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  QueryId2.deserialize = deserialize;
})(QueryId || (QueryId = {}));
var SubscribeSingle;
((SubscribeSingle2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("query", AlgebraicType.createStringType()),
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType())
    ]);
  }
  SubscribeSingle2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SubscribeSingle2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SubscribeSingle2.serialize = serialize;
  function deserialize(reader) {
    return SubscribeSingle2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  SubscribeSingle2.deserialize = deserialize;
})(SubscribeSingle || (SubscribeSingle = {}));
var SubscribeMulti;
((SubscribeMulti2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "queryStrings",
        AlgebraicType.createArrayType(AlgebraicType.createStringType())
      ),
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType())
    ]);
  }
  SubscribeMulti2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SubscribeMulti2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SubscribeMulti2.serialize = serialize;
  function deserialize(reader) {
    return SubscribeMulti2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  SubscribeMulti2.deserialize = deserialize;
})(SubscribeMulti || (SubscribeMulti = {}));
var Unsubscribe;
((Unsubscribe2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType())
    ]);
  }
  Unsubscribe2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Unsubscribe2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Unsubscribe2.serialize = serialize;
  function deserialize(reader) {
    return Unsubscribe2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Unsubscribe2.deserialize = deserialize;
})(Unsubscribe || (Unsubscribe = {}));
var UnsubscribeMulti;
((UnsubscribeMulti2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType())
    ]);
  }
  UnsubscribeMulti2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    UnsubscribeMulti2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  UnsubscribeMulti2.serialize = serialize;
  function deserialize(reader) {
    return UnsubscribeMulti2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  UnsubscribeMulti2.deserialize = deserialize;
})(UnsubscribeMulti || (UnsubscribeMulti = {}));
var ClientMessage;
((ClientMessage2) => {
  ClientMessage2.CallReducer = (value) => ({
    tag: "CallReducer",
    value
  });
  ClientMessage2.Subscribe = (value) => ({
    tag: "Subscribe",
    value
  });
  ClientMessage2.OneOffQuery = (value) => ({
    tag: "OneOffQuery",
    value
  });
  ClientMessage2.SubscribeSingle = (value) => ({
    tag: "SubscribeSingle",
    value
  });
  ClientMessage2.SubscribeMulti = (value) => ({
    tag: "SubscribeMulti",
    value
  });
  ClientMessage2.Unsubscribe = (value) => ({
    tag: "Unsubscribe",
    value
  });
  ClientMessage2.UnsubscribeMulti = (value) => ({ tag: "UnsubscribeMulti", value });
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant(
        "CallReducer",
        CallReducer.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant("Subscribe", Subscribe.getTypeScriptAlgebraicType()),
      new SumTypeVariant(
        "OneOffQuery",
        OneOffQuery.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "SubscribeSingle",
        SubscribeSingle.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "SubscribeMulti",
        SubscribeMulti.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "Unsubscribe",
        Unsubscribe.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "UnsubscribeMulti",
        UnsubscribeMulti.getTypeScriptAlgebraicType()
      )
    ]);
  }
  ClientMessage2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    ClientMessage2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  ClientMessage2.serialize = serialize;
  function deserialize(reader) {
    return ClientMessage2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  ClientMessage2.deserialize = deserialize;
})(ClientMessage || (ClientMessage = {}));
var QueryUpdate;
((QueryUpdate2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "deletes",
        BsatnRowList.getTypeScriptAlgebraicType()
      ),
      new ProductTypeElement(
        "inserts",
        BsatnRowList.getTypeScriptAlgebraicType()
      )
    ]);
  }
  QueryUpdate2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    QueryUpdate2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  QueryUpdate2.serialize = serialize;
  function deserialize(reader) {
    return QueryUpdate2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  QueryUpdate2.deserialize = deserialize;
})(QueryUpdate || (QueryUpdate = {}));
var CompressableQueryUpdate;
((CompressableQueryUpdate2) => {
  CompressableQueryUpdate2.Uncompressed = (value) => ({ tag: "Uncompressed", value });
  CompressableQueryUpdate2.Brotli = (value) => ({
    tag: "Brotli",
    value
  });
  CompressableQueryUpdate2.Gzip = (value) => ({
    tag: "Gzip",
    value
  });
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant(
        "Uncompressed",
        QueryUpdate.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "Brotli",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      ),
      new SumTypeVariant(
        "Gzip",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      )
    ]);
  }
  CompressableQueryUpdate2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    CompressableQueryUpdate2.getTypeScriptAlgebraicType().serialize(
      writer,
      value
    );
  }
  CompressableQueryUpdate2.serialize = serialize;
  function deserialize(reader) {
    return CompressableQueryUpdate2.getTypeScriptAlgebraicType().deserialize(
      reader
    );
  }
  CompressableQueryUpdate2.deserialize = deserialize;
})(CompressableQueryUpdate || (CompressableQueryUpdate = {}));
var TableUpdate;
((TableUpdate2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("tableId", AlgebraicType.createU32Type()),
      new ProductTypeElement("tableName", AlgebraicType.createStringType()),
      new ProductTypeElement("numRows", AlgebraicType.createU64Type()),
      new ProductTypeElement(
        "updates",
        AlgebraicType.createArrayType(
          CompressableQueryUpdate.getTypeScriptAlgebraicType()
        )
      )
    ]);
  }
  TableUpdate2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    TableUpdate2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  TableUpdate2.serialize = serialize;
  function deserialize(reader) {
    return TableUpdate2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  TableUpdate2.deserialize = deserialize;
})(TableUpdate || (TableUpdate = {}));
var DatabaseUpdate;
((DatabaseUpdate3) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "tables",
        AlgebraicType.createArrayType(
          TableUpdate.getTypeScriptAlgebraicType()
        )
      )
    ]);
  }
  DatabaseUpdate3.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    DatabaseUpdate3.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  DatabaseUpdate3.serialize = serialize;
  function deserialize(reader) {
    return DatabaseUpdate3.getTypeScriptAlgebraicType().deserialize(reader);
  }
  DatabaseUpdate3.deserialize = deserialize;
})(DatabaseUpdate || (DatabaseUpdate = {}));
var InitialSubscription;
((InitialSubscription2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "databaseUpdate",
        DatabaseUpdate.getTypeScriptAlgebraicType()
      ),
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "totalHostExecutionDuration",
        AlgebraicType.createTimeDurationType()
      )
    ]);
  }
  InitialSubscription2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    InitialSubscription2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  InitialSubscription2.serialize = serialize;
  function deserialize(reader) {
    return InitialSubscription2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  InitialSubscription2.deserialize = deserialize;
})(InitialSubscription || (InitialSubscription = {}));
var UpdateStatus;
((UpdateStatus2) => {
  UpdateStatus2.Committed = (value) => ({
    tag: "Committed",
    value
  });
  UpdateStatus2.Failed = (value) => ({
    tag: "Failed",
    value
  });
  UpdateStatus2.OutOfEnergy = { tag: "OutOfEnergy" };
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant(
        "Committed",
        DatabaseUpdate.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant("Failed", AlgebraicType.createStringType()),
      new SumTypeVariant("OutOfEnergy", AlgebraicType.createProductType([]))
    ]);
  }
  UpdateStatus2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    UpdateStatus2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  UpdateStatus2.serialize = serialize;
  function deserialize(reader) {
    return UpdateStatus2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  UpdateStatus2.deserialize = deserialize;
})(UpdateStatus || (UpdateStatus = {}));
var ReducerCallInfo;
((ReducerCallInfo2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("reducerName", AlgebraicType.createStringType()),
      new ProductTypeElement("reducerId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "args",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      ),
      new ProductTypeElement("requestId", AlgebraicType.createU32Type())
    ]);
  }
  ReducerCallInfo2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    ReducerCallInfo2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  ReducerCallInfo2.serialize = serialize;
  function deserialize(reader) {
    return ReducerCallInfo2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  ReducerCallInfo2.deserialize = deserialize;
})(ReducerCallInfo || (ReducerCallInfo = {}));
var EnergyQuanta;
((EnergyQuanta2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("quanta", AlgebraicType.createU128Type())
    ]);
  }
  EnergyQuanta2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    EnergyQuanta2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  EnergyQuanta2.serialize = serialize;
  function deserialize(reader) {
    return EnergyQuanta2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  EnergyQuanta2.deserialize = deserialize;
})(EnergyQuanta || (EnergyQuanta = {}));
var TransactionUpdate;
((TransactionUpdate2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "status",
        UpdateStatus.getTypeScriptAlgebraicType()
      ),
      new ProductTypeElement("timestamp", AlgebraicType.createTimestampType()),
      new ProductTypeElement(
        "callerIdentity",
        AlgebraicType.createIdentityType()
      ),
      new ProductTypeElement(
        "callerConnectionId",
        AlgebraicType.createConnectionIdType()
      ),
      new ProductTypeElement(
        "reducerCall",
        ReducerCallInfo.getTypeScriptAlgebraicType()
      ),
      new ProductTypeElement(
        "energyQuantaUsed",
        EnergyQuanta.getTypeScriptAlgebraicType()
      ),
      new ProductTypeElement(
        "totalHostExecutionDuration",
        AlgebraicType.createTimeDurationType()
      )
    ]);
  }
  TransactionUpdate2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    TransactionUpdate2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  TransactionUpdate2.serialize = serialize;
  function deserialize(reader) {
    return TransactionUpdate2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  TransactionUpdate2.deserialize = deserialize;
})(TransactionUpdate || (TransactionUpdate = {}));
var TransactionUpdateLight;
((TransactionUpdateLight2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "update",
        DatabaseUpdate.getTypeScriptAlgebraicType()
      )
    ]);
  }
  TransactionUpdateLight2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    TransactionUpdateLight2.getTypeScriptAlgebraicType().serialize(
      writer,
      value
    );
  }
  TransactionUpdateLight2.serialize = serialize;
  function deserialize(reader) {
    return TransactionUpdateLight2.getTypeScriptAlgebraicType().deserialize(
      reader
    );
  }
  TransactionUpdateLight2.deserialize = deserialize;
})(TransactionUpdateLight || (TransactionUpdateLight = {}));
var IdentityToken;
((IdentityToken2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("identity", AlgebraicType.createIdentityType()),
      new ProductTypeElement("token", AlgebraicType.createStringType()),
      new ProductTypeElement(
        "connectionId",
        AlgebraicType.createConnectionIdType()
      )
    ]);
  }
  IdentityToken2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    IdentityToken2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  IdentityToken2.serialize = serialize;
  function deserialize(reader) {
    return IdentityToken2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  IdentityToken2.deserialize = deserialize;
})(IdentityToken || (IdentityToken = {}));
var OneOffTable;
((OneOffTable2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("tableName", AlgebraicType.createStringType()),
      new ProductTypeElement(
        "rows",
        BsatnRowList.getTypeScriptAlgebraicType()
      )
    ]);
  }
  OneOffTable2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    OneOffTable2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  OneOffTable2.serialize = serialize;
  function deserialize(reader) {
    return OneOffTable2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  OneOffTable2.deserialize = deserialize;
})(OneOffTable || (OneOffTable = {}));
var OneOffQueryResponse;
((OneOffQueryResponse2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "messageId",
        AlgebraicType.createArrayType(AlgebraicType.createU8Type())
      ),
      new ProductTypeElement(
        "error",
        AlgebraicType.createOptionType(AlgebraicType.createStringType())
      ),
      new ProductTypeElement(
        "tables",
        AlgebraicType.createArrayType(
          OneOffTable.getTypeScriptAlgebraicType()
        )
      ),
      new ProductTypeElement(
        "totalHostExecutionDuration",
        AlgebraicType.createTimeDurationType()
      )
    ]);
  }
  OneOffQueryResponse2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    OneOffQueryResponse2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  OneOffQueryResponse2.serialize = serialize;
  function deserialize(reader) {
    return OneOffQueryResponse2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  OneOffQueryResponse2.deserialize = deserialize;
})(OneOffQueryResponse || (OneOffQueryResponse = {}));
var SubscribeRows;
((SubscribeRows2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("tableId", AlgebraicType.createU32Type()),
      new ProductTypeElement("tableName", AlgebraicType.createStringType()),
      new ProductTypeElement(
        "tableRows",
        TableUpdate.getTypeScriptAlgebraicType()
      )
    ]);
  }
  SubscribeRows2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SubscribeRows2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SubscribeRows2.serialize = serialize;
  function deserialize(reader) {
    return SubscribeRows2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  SubscribeRows2.deserialize = deserialize;
})(SubscribeRows || (SubscribeRows = {}));
var SubscribeApplied;
((SubscribeApplied2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "totalHostExecutionDurationMicros",
        AlgebraicType.createU64Type()
      ),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType()),
      new ProductTypeElement(
        "rows",
        SubscribeRows.getTypeScriptAlgebraicType()
      )
    ]);
  }
  SubscribeApplied2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SubscribeApplied2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SubscribeApplied2.serialize = serialize;
  function deserialize(reader) {
    return SubscribeApplied2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  SubscribeApplied2.deserialize = deserialize;
})(SubscribeApplied || (SubscribeApplied = {}));
var UnsubscribeApplied;
((UnsubscribeApplied2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "totalHostExecutionDurationMicros",
        AlgebraicType.createU64Type()
      ),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType()),
      new ProductTypeElement(
        "rows",
        SubscribeRows.getTypeScriptAlgebraicType()
      )
    ]);
  }
  UnsubscribeApplied2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    UnsubscribeApplied2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  UnsubscribeApplied2.serialize = serialize;
  function deserialize(reader) {
    return UnsubscribeApplied2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  UnsubscribeApplied2.deserialize = deserialize;
})(UnsubscribeApplied || (UnsubscribeApplied = {}));
var SubscriptionError;
((SubscriptionError2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement(
        "totalHostExecutionDurationMicros",
        AlgebraicType.createU64Type()
      ),
      new ProductTypeElement(
        "requestId",
        AlgebraicType.createOptionType(AlgebraicType.createU32Type())
      ),
      new ProductTypeElement(
        "queryId",
        AlgebraicType.createOptionType(AlgebraicType.createU32Type())
      ),
      new ProductTypeElement(
        "tableId",
        AlgebraicType.createOptionType(AlgebraicType.createU32Type())
      ),
      new ProductTypeElement("error", AlgebraicType.createStringType())
    ]);
  }
  SubscriptionError2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SubscriptionError2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SubscriptionError2.serialize = serialize;
  function deserialize(reader) {
    return SubscriptionError2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  SubscriptionError2.deserialize = deserialize;
})(SubscriptionError || (SubscriptionError = {}));
var SubscribeMultiApplied;
((SubscribeMultiApplied2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "totalHostExecutionDurationMicros",
        AlgebraicType.createU64Type()
      ),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType()),
      new ProductTypeElement(
        "update",
        DatabaseUpdate.getTypeScriptAlgebraicType()
      )
    ]);
  }
  SubscribeMultiApplied2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SubscribeMultiApplied2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SubscribeMultiApplied2.serialize = serialize;
  function deserialize(reader) {
    return SubscribeMultiApplied2.getTypeScriptAlgebraicType().deserialize(
      reader
    );
  }
  SubscribeMultiApplied2.deserialize = deserialize;
})(SubscribeMultiApplied || (SubscribeMultiApplied = {}));
var UnsubscribeMultiApplied;
((UnsubscribeMultiApplied2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("requestId", AlgebraicType.createU32Type()),
      new ProductTypeElement(
        "totalHostExecutionDurationMicros",
        AlgebraicType.createU64Type()
      ),
      new ProductTypeElement("queryId", QueryId.getTypeScriptAlgebraicType()),
      new ProductTypeElement(
        "update",
        DatabaseUpdate.getTypeScriptAlgebraicType()
      )
    ]);
  }
  UnsubscribeMultiApplied2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    UnsubscribeMultiApplied2.getTypeScriptAlgebraicType().serialize(
      writer,
      value
    );
  }
  UnsubscribeMultiApplied2.serialize = serialize;
  function deserialize(reader) {
    return UnsubscribeMultiApplied2.getTypeScriptAlgebraicType().deserialize(
      reader
    );
  }
  UnsubscribeMultiApplied2.deserialize = deserialize;
})(UnsubscribeMultiApplied || (UnsubscribeMultiApplied = {}));
var ServerMessage;
((ServerMessage2) => {
  ServerMessage2.InitialSubscription = (value) => ({ tag: "InitialSubscription", value });
  ServerMessage2.TransactionUpdate = (value) => ({ tag: "TransactionUpdate", value });
  ServerMessage2.TransactionUpdateLight = (value) => ({ tag: "TransactionUpdateLight", value });
  ServerMessage2.IdentityToken = (value) => ({
    tag: "IdentityToken",
    value
  });
  ServerMessage2.OneOffQueryResponse = (value) => ({ tag: "OneOffQueryResponse", value });
  ServerMessage2.SubscribeApplied = (value) => ({ tag: "SubscribeApplied", value });
  ServerMessage2.UnsubscribeApplied = (value) => ({ tag: "UnsubscribeApplied", value });
  ServerMessage2.SubscriptionError = (value) => ({ tag: "SubscriptionError", value });
  ServerMessage2.SubscribeMultiApplied = (value) => ({ tag: "SubscribeMultiApplied", value });
  ServerMessage2.UnsubscribeMultiApplied = (value) => ({ tag: "UnsubscribeMultiApplied", value });
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant(
        "InitialSubscription",
        InitialSubscription.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "TransactionUpdate",
        TransactionUpdate.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "TransactionUpdateLight",
        TransactionUpdateLight.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "IdentityToken",
        IdentityToken.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "OneOffQueryResponse",
        OneOffQueryResponse.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "SubscribeApplied",
        SubscribeApplied.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "UnsubscribeApplied",
        UnsubscribeApplied.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "SubscriptionError",
        SubscriptionError.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "SubscribeMultiApplied",
        SubscribeMultiApplied.getTypeScriptAlgebraicType()
      ),
      new SumTypeVariant(
        "UnsubscribeMultiApplied",
        UnsubscribeMultiApplied.getTypeScriptAlgebraicType()
      )
    ]);
  }
  ServerMessage2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    ServerMessage2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  ServerMessage2.serialize = serialize;
  function deserialize(reader) {
    return ServerMessage2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  ServerMessage2.deserialize = deserialize;
})(ServerMessage || (ServerMessage = {}));
var EventEmitter = (_f = class {
  constructor() {
    __privateAdd(this, _events, /* @__PURE__ */ new Map());
  }
  on(event, callback) {
    let callbacks = __privateGet(this, _events).get(event);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set();
      __privateGet(this, _events).set(event, callbacks);
    }
    callbacks.add(callback);
  }
  off(event, callback) {
    let callbacks = __privateGet(this, _events).get(event);
    if (!callbacks) {
      return;
    }
    callbacks.delete(callback);
  }
  emit(event, ...args) {
    let callbacks = __privateGet(this, _events).get(event);
    if (!callbacks) {
      return;
    }
    for (let callback of callbacks) {
      callback(...args);
    }
  }
}, _events = new WeakMap(), _f);
var LogLevelIdentifierIcon = {
  component: "\u{1F4E6}",
  info: "\u2139\uFE0F",
  warn: "\u26A0\uFE0F",
  error: "\u274C",
  debug: "\u{1F41B}"
};
var LogStyle = {
  component: "color: #fff; background-color: #8D6FDD; padding: 2px 5px; border-radius: 3px;",
  info: "color: #fff; background-color: #007bff; padding: 2px 5px; border-radius: 3px;",
  warn: "color: #fff; background-color: #ffc107; padding: 2px 5px; border-radius: 3px;",
  error: "color: #fff; background-color: #dc3545; padding: 2px 5px; border-radius: 3px;",
  debug: "color: #fff; background-color: #28a745; padding: 2px 5px; border-radius: 3px;"
};
var LogTextStyle = {
  component: "color: #8D6FDD;",
  info: "color: #007bff;",
  warn: "color: #ffc107;",
  error: "color: #dc3545;",
  debug: "color: #28a745;"
};
var stdbLogger = (level, message) => {
  console.log(
    `%c${LogLevelIdentifierIcon[level]} ${level.toUpperCase()}%c ${message}`,
    LogStyle[level],
    LogTextStyle[level]
  );
};
var TableCache32 = class {
  constructor(tableTypeInfo) {
    __publicField(this, "rows");
    __publicField(this, "tableTypeInfo");
    __publicField(this, "emitter");
    __publicField(this, "applyOperations", (operations, ctx) => {
      const pendingCallbacks = [];
      if (this.tableTypeInfo.primaryKeyInfo !== void 0) {
        const insertMap = /* @__PURE__ */ new Map();
        const deleteMap = /* @__PURE__ */ new Map();
        for (const op of operations) {
          if (op.type === "insert") {
            const [_, prevCount] = insertMap.get(op.rowId) || [op, 0];
            insertMap.set(op.rowId, [op, prevCount + 1]);
          } else {
            const [_, prevCount] = deleteMap.get(op.rowId) || [op, 0];
            deleteMap.set(op.rowId, [op, prevCount + 1]);
          }
        }
        for (const [primaryKey, [insertOp, refCount]] of insertMap) {
          const deleteEntry = deleteMap.get(primaryKey);
          if (deleteEntry) {
            const [_, deleteCount] = deleteEntry;
            const refCountDelta = refCount - deleteCount;
            const maybeCb = this.update(
              ctx,
              primaryKey,
              insertOp.row,
              refCountDelta
            );
            if (maybeCb) {
              pendingCallbacks.push(maybeCb);
            }
            deleteMap.delete(primaryKey);
          } else {
            const maybeCb = this.insert(ctx, insertOp, refCount);
            if (maybeCb) {
              pendingCallbacks.push(maybeCb);
            }
          }
        }
        for (const [deleteOp, refCount] of deleteMap.values()) {
          const maybeCb = this.delete(ctx, deleteOp, refCount);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        }
      } else {
        for (const op of operations) {
          if (op.type === "insert") {
            const maybeCb = this.insert(ctx, op);
            if (maybeCb) {
              pendingCallbacks.push(maybeCb);
            }
          } else {
            const maybeCb = this.delete(ctx, op);
            if (maybeCb) {
              pendingCallbacks.push(maybeCb);
            }
          }
        }
      }
      return pendingCallbacks;
    });
    __publicField(this, "update", (ctx, rowId, newRow, refCountDelta = 0) => {
      const existingEntry = this.rows.get(rowId);
      if (!existingEntry) {
        stdbLogger(
          "error",
          `Updating a row that was not present in the cache. Table: ${this.tableTypeInfo.tableName}, RowId: ${rowId}`
        );
        return void 0;
      }
      const [oldRow, previousCount] = existingEntry;
      const refCount = Math.max(1, previousCount + refCountDelta);
      if (previousCount + refCountDelta <= 0) {
        stdbLogger(
          "error",
          `Negative reference count for in table ${this.tableTypeInfo.tableName} row ${rowId} (${previousCount} + ${refCountDelta})`
        );
        return void 0;
      }
      this.rows.set(rowId, [newRow, refCount]);
      if (previousCount === 0) {
        stdbLogger(
          "error",
          `Updating a row id in table ${this.tableTypeInfo.tableName} which was not present in the cache (rowId: ${rowId})`
        );
        return {
          type: "insert",
          table: this.tableTypeInfo.tableName,
          cb: () => {
            this.emitter.emit("insert", ctx, newRow);
          }
        };
      }
      return {
        type: "update",
        table: this.tableTypeInfo.tableName,
        cb: () => {
          this.emitter.emit("update", ctx, oldRow, newRow);
        }
      };
    });
    __publicField(this, "insert", (ctx, operation, count = 1) => {
      const [_, previousCount] = this.rows.get(operation.rowId) || [
        operation.row,
        0
      ];
      this.rows.set(operation.rowId, [operation.row, previousCount + count]);
      if (previousCount === 0) {
        return {
          type: "insert",
          table: this.tableTypeInfo.tableName,
          cb: () => {
            this.emitter.emit("insert", ctx, operation.row);
          }
        };
      }
      return void 0;
    });
    __publicField(this, "delete", (ctx, operation, count = 1) => {
      const [_, previousCount] = this.rows.get(operation.rowId) || [
        operation.row,
        0
      ];
      if (previousCount === 0) {
        stdbLogger("warn", "Deleting a row that was not present in the cache");
        return void 0;
      }
      if (previousCount <= count) {
        this.rows.delete(operation.rowId);
        return {
          type: "delete",
          table: this.tableTypeInfo.tableName,
          cb: () => {
            this.emitter.emit("delete", ctx, operation.row);
          }
        };
      }
      this.rows.set(operation.rowId, [operation.row, previousCount - count]);
      return void 0;
    });
    __publicField(this, "onInsert", (cb) => {
      this.emitter.on("insert", cb);
    });
    __publicField(this, "onDelete", (cb) => {
      this.emitter.on("delete", cb);
    });
    __publicField(this, "onUpdate", (cb) => {
      this.emitter.on("update", cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      this.emitter.off("insert", cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      this.emitter.off("delete", cb);
    });
    __publicField(this, "removeOnUpdate", (cb) => {
      this.emitter.off("update", cb);
    });
    this.tableTypeInfo = tableTypeInfo;
    this.rows = /* @__PURE__ */ new Map();
    this.emitter = new EventEmitter();
  }
  count() {
    return this.rows.size;
  }
  iter() {
    return Array.from(this.rows.values()).map(([row]) => row);
  }
};
var ClientCache = class {
  constructor() {
    __publicField(this, "tables");
    this.tables = /* @__PURE__ */ new Map();
  }
  getTable(name) {
    const table = this.tables.get(name);
    if (!table) {
      console.error(
        "The table has not been registered for this client. Please register the table before using it. If you have registered global tables using the SpacetimeDBClient.registerTables() or `registerTable()` method, please make sure that is executed first!"
      );
      throw new Error(`Table ${name} does not exist`);
    }
    return table;
  }
  getOrCreateTable(tableTypeInfo) {
    let table;
    if (!this.tables.has(tableTypeInfo.tableName)) {
      table = new TableCache32(tableTypeInfo);
      this.tables.set(tableTypeInfo.tableName, table);
    } else {
      table = this.tables.get(tableTypeInfo.tableName);
    }
    return table;
  }
};
function comparePreReleases(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const aPart = a[i];
    const bPart = b[i];
    if (aPart === bPart)
      continue;
    if (typeof aPart === "number" && typeof bPart === "number") {
      return aPart - bPart;
    }
    if (typeof aPart === "string" && typeof bPart === "string") {
      return aPart.localeCompare(bPart);
    }
    return typeof aPart === "string" ? 1 : -1;
  }
  return a.length - b.length;
}
var SemanticVersion = class _SemanticVersion {
  constructor(major, minor, patch, preRelease = null, buildInfo = null) {
    __publicField(this, "major");
    __publicField(this, "minor");
    __publicField(this, "patch");
    __publicField(this, "preRelease");
    __publicField(this, "buildInfo");
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.preRelease = preRelease;
    this.buildInfo = buildInfo;
  }
  toString() {
    let versionString = `${this.major}.${this.minor}.${this.patch}`;
    if (this.preRelease) {
      versionString += `-${this.preRelease.join(".")}`;
    }
    if (this.buildInfo) {
      versionString += `+${this.buildInfo}`;
    }
    return versionString;
  }
  compare(other) {
    if (this.major !== other.major) {
      return this.major - other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }
    if (this.patch !== other.patch) {
      return this.patch - other.patch;
    }
    if (this.preRelease && other.preRelease) {
      return comparePreReleases(this.preRelease, other.preRelease);
    }
    if (this.preRelease) {
      return -1;
    }
    if (other.preRelease) {
      return -1;
    }
    return 0;
  }
  clone() {
    return new _SemanticVersion(
      this.major,
      this.minor,
      this.patch,
      this.preRelease ? [...this.preRelease] : null,
      this.buildInfo
    );
  }
  static parseVersionString(version) {
    const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/;
    const match = version.match(regex);
    if (!match) {
      throw new Error(`Invalid version string: ${version}`);
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const preRelease = match[4] ? match[4].split(".").map((id) => isNaN(Number(id)) ? id : Number(id)) : null;
    const buildInfo = match[5] || null;
    return new _SemanticVersion(major, minor, patch, preRelease, buildInfo);
  }
};
var _MINIMUM_CLI_VERSION = new SemanticVersion(
  1,
  2,
  0
);
function ensureMinimumVersionOrThrow(versionString) {
  if (versionString === void 0) {
    throw new Error(versionErrorMessage(versionString));
  }
  const version = SemanticVersion.parseVersionString(versionString);
  if (version.compare(_MINIMUM_CLI_VERSION) < 0) {
    throw new Error(versionErrorMessage(versionString));
  }
}
function versionErrorMessage(incompatibleVersion) {
  return `Module code was generated with an incompatible version of the spacetimedb cli (${incompatibleVersion}).  Update the cli version to at least ${_MINIMUM_CLI_VERSION.toString()} and regenerate the bindings. You can upgrade to the latest cli version by running: spacetime version upgrade`;
}
async function decompress(buffer, type, chunkSize = 128 * 1024) {
  let offset = 0;
  const readableStream = new ReadableStream({
    pull(controller) {
      if (offset < buffer.length) {
        const chunk = buffer.subarray(
          offset,
          Math.min(offset + chunkSize, buffer.length)
        );
        controller.enqueue(chunk);
        offset += chunkSize;
      } else {
        controller.close();
      }
    }
  });
  const decompressionStream = new DecompressionStream(type);
  const decompressedStream = readableStream.pipeThrough(decompressionStream);
  const reader = decompressedStream.getReader();
  const chunks = [];
  let totalLength = 0;
  let result;
  while (!(result = await reader.read()).done) {
    chunks.push(result.value);
    totalLength += result.value.length;
  }
  const decompressedArray = new Uint8Array(totalLength);
  let chunkOffset = 0;
  for (const chunk of chunks) {
    decompressedArray.set(chunk, chunkOffset);
    chunkOffset += chunk.length;
  }
  return decompressedArray;
}
var WebsocketDecompressAdapter = (_g = class {
  constructor(ws) {
    __privateAdd(this, _handleOnMessage);
    __privateAdd(this, _handleOnOpen);
    __privateAdd(this, _handleOnError);
    __publicField(this, "onclose");
    __publicField(this, "onopen");
    __publicField(this, "onmessage");
    __publicField(this, "onerror");
    __privateAdd(this, _ws, void 0);
    this.onmessage = void 0;
    this.onopen = void 0;
    this.onmessage = void 0;
    this.onerror = void 0;
    ws.onmessage = __privateMethod(this, _handleOnMessage, handleOnMessage_fn).bind(this);
    ws.onerror = __privateMethod(this, _handleOnError, handleOnError_fn).bind(this);
    ws.onclose = __privateMethod(this, _handleOnError, handleOnError_fn).bind(this);
    ws.onopen = __privateMethod(this, _handleOnOpen, handleOnOpen_fn).bind(this);
    ws.binaryType = "arraybuffer";
    __privateSet(this, _ws, ws);
  }
  send(msg) {
    __privateGet(this, _ws).send(msg);
  }
  close() {
    __privateGet(this, _ws).close();
  }
  static async createWebSocketFn({
    url,
    nameOrAddress,
    wsProtocol,
    authToken,
    compression,
    lightMode
  }) {
    const headers = new Headers();
    let WS;
    {
      WS = WebSocket;
    }
    let temporaryAuthToken = void 0;
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
      const tokenUrl = new URL("v1/identity/websocket-token", url);
      tokenUrl.protocol = url.protocol === "wss:" ? "https:" : "http:";
      const response = await fetch(tokenUrl, { method: "POST", headers });
      if (response.ok) {
        const { token } = await response.json();
        temporaryAuthToken = token;
      } else {
        return Promise.reject(
          new Error(`Failed to verify token: ${response.statusText}`)
        );
      }
    }
    const databaseUrl = new URL(`v1/database/${nameOrAddress}/subscribe`, url);
    if (temporaryAuthToken) {
      databaseUrl.searchParams.set("token", temporaryAuthToken);
    }
    databaseUrl.searchParams.set(
      "compression",
      compression === "gzip" ? "Gzip" : "None"
    );
    if (lightMode) {
      databaseUrl.searchParams.set("light", "true");
    }
    const ws = new WS(databaseUrl.toString(), wsProtocol);
    return new _g(ws);
  }
}, _ws = new WeakMap(), _handleOnMessage = new WeakSet(), handleOnMessage_fn = async function(msg) {
  const buffer = new Uint8Array(msg.data);
  let decompressed;
  if (buffer[0] === 0) {
    decompressed = buffer.slice(1);
  } else if (buffer[0] === 1) {
    throw new Error(
      "Brotli Compression not supported. Please use gzip or none compression in withCompression method on DbConnection."
    );
  } else if (buffer[0] === 2) {
    decompressed = await decompress(buffer.slice(1), "gzip");
  } else {
    throw new Error(
      "Unexpected Compression Algorithm. Please use `gzip` or `none`"
    );
  }
  this.onmessage?.({ data: decompressed });
}, _handleOnOpen = new WeakSet(), handleOnOpen_fn = function(msg) {
  this.onopen?.(msg);
}, _handleOnError = new WeakSet(), handleOnError_fn = function(msg) {
  this.onerror?.(msg);
}, _g);
var DbConnectionBuilder32 = (_h = class {
  constructor(remoteModule, dbConnectionConstructor) {
    __privateAdd(this, _uri, void 0);
    __privateAdd(this, _nameOrAddress, void 0);
    __privateAdd(this, _identity, void 0);
    __privateAdd(this, _token, void 0);
    __privateAdd(this, _emitter, new EventEmitter());
    __privateAdd(this, _compression, "gzip");
    __privateAdd(this, _lightMode, false);
    __privateAdd(this, _createWSFn, void 0);
    this.remoteModule = remoteModule;
    this.dbConnectionConstructor = dbConnectionConstructor;
    __privateSet(this, _createWSFn, WebsocketDecompressAdapter.createWebSocketFn);
  }
  withUri(uri) {
    __privateSet(this, _uri, new URL(uri));
    return this;
  }
  withModuleName(nameOrAddress) {
    __privateSet(this, _nameOrAddress, nameOrAddress);
    return this;
  }
  withToken(token) {
    __privateSet(this, _token, token);
    return this;
  }
  withWSFn(createWSFn) {
    __privateSet(this, _createWSFn, createWSFn);
    return this;
  }
  withCompression(compression) {
    __privateSet(this, _compression, compression);
    return this;
  }
  withLightMode(lightMode) {
    __privateSet(this, _lightMode, lightMode);
    return this;
  }
  onConnect(callback) {
    __privateGet(this, _emitter).on("connect", callback);
    return this;
  }
  onConnectError(callback) {
    __privateGet(this, _emitter).on("connectError", callback);
    return this;
  }
  onDisconnect(callback) {
    __privateGet(this, _emitter).on("disconnect", callback);
    return this;
  }
  build() {
    if (!__privateGet(this, _uri)) {
      throw new Error("URI is required to connect to SpacetimeDB");
    }
    if (!__privateGet(this, _nameOrAddress)) {
      throw new Error(
        "Database name or address is required to connect to SpacetimeDB"
      );
    }
    ensureMinimumVersionOrThrow(this.remoteModule.versionInfo?.cliVersion);
    return this.dbConnectionConstructor(
      new DbConnectionImpl32({
        uri: __privateGet(this, _uri),
        nameOrAddress: __privateGet(this, _nameOrAddress),
        identity: __privateGet(this, _identity),
        token: __privateGet(this, _token),
        emitter: __privateGet(this, _emitter),
        compression: __privateGet(this, _compression),
        lightMode: __privateGet(this, _lightMode),
        createWSFn: __privateGet(this, _createWSFn),
        remoteModule: this.remoteModule
      })
    );
  }
}, _uri = new WeakMap(), _nameOrAddress = new WeakMap(), _identity = new WeakMap(), _token = new WeakMap(), _emitter = new WeakMap(), _compression = new WeakMap(), _lightMode = new WeakMap(), _createWSFn = new WeakMap(), _h);
var SubscriptionBuilderImpl32 = (_i = class {
  constructor(db) {
    __privateAdd(this, _onApplied, void 0);
    __privateAdd(this, _onError, void 0);
    this.db = db;
  }
  onApplied(cb) {
    __privateSet(this, _onApplied, cb);
    return this;
  }
  onError(cb) {
    __privateSet(this, _onError, cb);
    return this;
  }
  subscribe(query_sql) {
    const queries = Array.isArray(query_sql) ? query_sql : [query_sql];
    if (queries.length === 0) {
      throw new Error("Subscriptions must have at least one query");
    }
    return new SubscriptionHandleImpl(
      this.db,
      queries,
      __privateGet(this, _onApplied),
      __privateGet(this, _onError)
    );
  }
  subscribeToAllTables() {
    this.subscribe("SELECT * FROM *");
  }
}, _onApplied = new WeakMap(), _onError = new WeakMap(), _i);
var SubscriptionManager = class {
  constructor() {
    __publicField(this, "subscriptions", /* @__PURE__ */ new Map());
  }
};
var SubscriptionHandleImpl = (_j = class {
  constructor(db, querySql, onApplied, onError) {
    __privateAdd(this, _queryId, void 0);
    __privateAdd(this, _unsubscribeCalled, false);
    __privateAdd(this, _endedState, false);
    __privateAdd(this, _activeState, false);
    __privateAdd(this, _emitter2, new EventEmitter());
    this.db = db;
    __privateGet(this, _emitter2).on(
      "applied",
      (ctx) => {
        __privateSet(this, _activeState, true);
        if (onApplied) {
          onApplied(ctx);
        }
      }
    );
    __privateGet(this, _emitter2).on(
      "error",
      (ctx, error) => {
        __privateSet(this, _activeState, false);
        __privateSet(this, _endedState, true);
        if (onError) {
          onError(ctx, error);
        }
      }
    );
    __privateSet(this, _queryId, this.db.registerSubscription(this, __privateGet(this, _emitter2), querySql));
  }
  unsubscribe() {
    if (__privateGet(this, _unsubscribeCalled)) {
      throw new Error("Unsubscribe has already been called");
    }
    __privateSet(this, _unsubscribeCalled, true);
    this.db.unregisterSubscription(__privateGet(this, _queryId));
    __privateGet(this, _emitter2).on(
      "end",
      (_ctx) => {
        __privateSet(this, _endedState, true);
        __privateSet(this, _activeState, false);
      }
    );
  }
  unsubscribeThen(onEnd) {
    if (__privateGet(this, _endedState)) {
      throw new Error("Subscription has already ended");
    }
    if (__privateGet(this, _unsubscribeCalled)) {
      throw new Error("Unsubscribe has already been called");
    }
    __privateSet(this, _unsubscribeCalled, true);
    this.db.unregisterSubscription(__privateGet(this, _queryId));
    __privateGet(this, _emitter2).on(
      "end",
      (ctx) => {
        __privateSet(this, _endedState, true);
        __privateSet(this, _activeState, false);
        onEnd(ctx);
      }
    );
  }
  isEnded() {
    return __privateGet(this, _endedState);
  }
  isActive() {
    return __privateGet(this, _activeState);
  }
}, _queryId = new WeakMap(), _unsubscribeCalled = new WeakMap(), _endedState = new WeakMap(), _activeState = new WeakMap(), _emitter2 = new WeakMap(), _j);
function callReducerFlagsToNumber(flags) {
  switch (flags) {
    case "FullUpdate":
      return 0;
    case "NoSuccessNotify":
      return 1;
  }
}
var DbConnectionImpl32 = (_k = class {
  constructor({
    uri,
    nameOrAddress,
    identity,
    token,
    emitter,
    remoteModule,
    createWSFn,
    compression,
    lightMode
  }) {
    __privateAdd(this, _processParsedMessage);
    __privateAdd(this, _sendMessage);
    __privateAdd(this, _handleOnOpen2);
    __privateAdd(this, _applyTableUpdates);
    __privateAdd(this, _processMessage);
    __privateAdd(this, _handleOnMessage2);
    __privateAdd(this, _on);
    __privateAdd(this, _off);
    __privateAdd(this, _onConnect);
    __privateAdd(this, _onDisconnect);
    __privateAdd(this, _onConnectError);
    __privateAdd(this, _removeOnConnect);
    __privateAdd(this, _removeOnDisconnect);
    __privateAdd(this, _removeOnConnectError);
    __publicField(this, "isActive", false);
    __publicField(this, "identity");
    __publicField(this, "token");
    __publicField(this, "db");
    __publicField(this, "reducers");
    __publicField(this, "setReducerFlags");
    __publicField(this, "connectionId", ConnectionId.random());
    __privateAdd(this, _queryId2, 0);
    __privateAdd(this, _emitter3, void 0);
    __privateAdd(this, _reducerEmitter, new EventEmitter());
    __privateAdd(this, _onApplied2, void 0);
    __privateAdd(this, _remoteModule, void 0);
    __privateAdd(this, _messageQueue, Promise.resolve());
    __privateAdd(this, _subscriptionManager, new SubscriptionManager());
    __publicField(this, "clientCache");
    __publicField(this, "ws");
    __publicField(this, "wsPromise");
    __privateAdd(this, _getNextQueryId, () => {
      const queryId = __privateGet(this, _queryId2);
      __privateSet(this, _queryId2, __privateGet(this, _queryId2) + 1);
      return queryId;
    });
    __publicField(this, "subscriptionBuilder", () => {
      return new SubscriptionBuilderImpl32(this);
    });
    stdbLogger("info", "Connecting to SpacetimeDB WS...");
    let url = new URL(uri.toString());
    if (!/^wss?:/.test(uri.protocol)) {
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    }
    this.identity = identity;
    this.token = token;
    __privateSet(this, _remoteModule, remoteModule);
    __privateSet(this, _emitter3, emitter);
    let connectionId = this.connectionId.toHexString();
    url.searchParams.set("connection_id", connectionId);
    this.clientCache = new ClientCache();
    this.db = __privateGet(this, _remoteModule).dbViewConstructor(this);
    this.setReducerFlags = __privateGet(this, _remoteModule).setReducerFlagsConstructor();
    this.reducers = __privateGet(this, _remoteModule).reducersConstructor(
      this,
      this.setReducerFlags
    );
    this.wsPromise = createWSFn({
      url,
      nameOrAddress,
      wsProtocol: "v1.bsatn.spacetimedb",
      authToken: token,
      compression,
      lightMode
    }).then((v) => {
      this.ws = v;
      this.ws.onclose = () => {
        __privateGet(this, _emitter3).emit("disconnect", this);
      };
      this.ws.onerror = (e) => {
        __privateGet(this, _emitter3).emit("connectError", this, e);
      };
      this.ws.onopen = __privateMethod(this, _handleOnOpen2, handleOnOpen_fn2).bind(this);
      this.ws.onmessage = __privateMethod(this, _handleOnMessage2, handleOnMessage_fn2).bind(this);
      return v;
    }).catch((e) => {
      stdbLogger("error", "Error connecting to SpacetimeDB WS");
      __privateGet(this, _emitter3).emit("connectError", this, e);
      return void 0;
    });
  }
  registerSubscription(handle, handleEmitter, querySql) {
    const queryId = __privateGet(this, _getNextQueryId).call(this);
    __privateGet(this, _subscriptionManager).subscriptions.set(queryId, {
      handle,
      emitter: handleEmitter
    });
    __privateMethod(this, _sendMessage, sendMessage_fn).call(this, ClientMessage.SubscribeMulti({
      queryStrings: querySql,
      queryId: { id: queryId },
      requestId: 0
    }));
    return queryId;
  }
  unregisterSubscription(queryId) {
    __privateMethod(this, _sendMessage, sendMessage_fn).call(this, ClientMessage.UnsubscribeMulti({
      queryId: { id: queryId },
      requestId: 0
    }));
  }
  callReducer(reducerName, argsBuffer, flags) {
    const message = ClientMessage.CallReducer({
      reducer: reducerName,
      args: argsBuffer,
      requestId: 0,
      flags: callReducerFlagsToNumber(flags)
    });
    __privateMethod(this, _sendMessage, sendMessage_fn).call(this, message);
  }
  disconnect() {
    this.wsPromise.then((wsResolved) => {
      if (wsResolved) {
        wsResolved.close();
      }
    });
  }
  onReducer(reducerName, callback) {
    __privateGet(this, _reducerEmitter).on(reducerName, callback);
  }
  offReducer(reducerName, callback) {
    __privateGet(this, _reducerEmitter).off(reducerName, callback);
  }
}, _queryId2 = new WeakMap(), _emitter3 = new WeakMap(), _reducerEmitter = new WeakMap(), _onApplied2 = new WeakMap(), _remoteModule = new WeakMap(), _messageQueue = new WeakMap(), _subscriptionManager = new WeakMap(), _getNextQueryId = new WeakMap(), _processParsedMessage = new WeakSet(), processParsedMessage_fn = async function(message) {
  const parseRowList = (type, tableName, rowList) => {
    const buffer = rowList.rowsData;
    const reader = new BinaryReader(buffer);
    const rows = [];
    const rowType = __privateGet(this, _remoteModule).tables[tableName].rowType;
    const primaryKeyInfo = __privateGet(this, _remoteModule).tables[tableName].primaryKeyInfo;
    while (reader.offset < buffer.length + buffer.byteOffset) {
      const initialOffset = reader.offset;
      const row = rowType.deserialize(reader);
      let rowId = void 0;
      if (primaryKeyInfo !== void 0) {
        rowId = primaryKeyInfo.colType.intoMapKey(
          row[primaryKeyInfo.colName]
        );
      } else {
        const rowBytes = buffer.subarray(
          initialOffset - buffer.byteOffset,
          reader.offset - buffer.byteOffset
        );
        const asBase64 = fromByteArray_1(rowBytes);
        rowId = asBase64;
      }
      rows.push({
        type,
        rowId,
        row
      });
    }
    return rows;
  };
  const parseTableUpdate = async (rawTableUpdate) => {
    const tableName = rawTableUpdate.tableName;
    let operations = [];
    for (const update of rawTableUpdate.updates) {
      let decompressed;
      if (update.tag === "Gzip") {
        const decompressedBuffer = await decompress(update.value, "gzip");
        decompressed = QueryUpdate.deserialize(
          new BinaryReader(decompressedBuffer)
        );
      } else if (update.tag === "Brotli") {
        throw new Error(
          "Brotli compression not supported. Please use gzip or none compression in withCompression method on DbConnection."
        );
      } else {
        decompressed = update.value;
      }
      operations = operations.concat(
        parseRowList("insert", tableName, decompressed.inserts)
      );
      operations = operations.concat(
        parseRowList("delete", tableName, decompressed.deletes)
      );
    }
    return {
      tableName,
      operations
    };
  };
  const parseDatabaseUpdate = async (dbUpdate) => {
    const tableUpdates = [];
    for (const rawTableUpdate of dbUpdate.tables) {
      tableUpdates.push(await parseTableUpdate(rawTableUpdate));
    }
    return tableUpdates;
  };
  switch (message.tag) {
    case "InitialSubscription": {
      const dbUpdate = message.value.databaseUpdate;
      const tableUpdates = await parseDatabaseUpdate(dbUpdate);
      const subscriptionUpdate = {
        tag: "InitialSubscription",
        tableUpdates
      };
      return subscriptionUpdate;
    }
    case "TransactionUpdateLight": {
      const dbUpdate = message.value.update;
      const tableUpdates = await parseDatabaseUpdate(dbUpdate);
      const subscriptionUpdate = {
        tag: "TransactionUpdateLight",
        tableUpdates
      };
      return subscriptionUpdate;
    }
    case "TransactionUpdate": {
      const txUpdate = message.value;
      const identity = txUpdate.callerIdentity;
      const connectionId = ConnectionId.nullIfZero(
        txUpdate.callerConnectionId
      );
      const reducerName = txUpdate.reducerCall.reducerName;
      const args = txUpdate.reducerCall.args;
      const energyQuantaUsed = txUpdate.energyQuantaUsed;
      let tableUpdates;
      let errMessage = "";
      switch (txUpdate.status.tag) {
        case "Committed":
          tableUpdates = await parseDatabaseUpdate(txUpdate.status.value);
          break;
        case "Failed":
          tableUpdates = [];
          errMessage = txUpdate.status.value;
          break;
        case "OutOfEnergy":
          tableUpdates = [];
          break;
      }
      if (reducerName === "<none>") {
        let errorMessage = errMessage;
        console.error(`Received an error from the database: ${errorMessage}`);
        return;
      }
      let reducerInfo;
      if (reducerName !== "") {
        reducerInfo = {
          reducerName,
          args
        };
      }
      const transactionUpdate = {
        tag: "TransactionUpdate",
        tableUpdates,
        identity,
        connectionId,
        reducerInfo,
        status: txUpdate.status,
        energyConsumed: energyQuantaUsed.quanta,
        message: errMessage,
        timestamp: txUpdate.timestamp
      };
      return transactionUpdate;
    }
    case "IdentityToken": {
      const identityTokenMessage = {
        tag: "IdentityToken",
        identity: message.value.identity,
        token: message.value.token,
        connectionId: message.value.connectionId
      };
      return identityTokenMessage;
    }
    case "OneOffQueryResponse": {
      throw new Error(
        `TypeScript SDK never sends one-off queries, but got OneOffQueryResponse ${message}`
      );
    }
    case "SubscribeMultiApplied": {
      const parsedTableUpdates = await parseDatabaseUpdate(
        message.value.update
      );
      const subscribeAppliedMessage = {
        tag: "SubscribeApplied",
        queryId: message.value.queryId.id,
        tableUpdates: parsedTableUpdates
      };
      return subscribeAppliedMessage;
    }
    case "UnsubscribeMultiApplied": {
      const parsedTableUpdates = await parseDatabaseUpdate(
        message.value.update
      );
      const unsubscribeAppliedMessage = {
        tag: "UnsubscribeApplied",
        queryId: message.value.queryId.id,
        tableUpdates: parsedTableUpdates
      };
      return unsubscribeAppliedMessage;
    }
    case "SubscriptionError": {
      return {
        tag: "SubscriptionError",
        queryId: message.value.queryId,
        error: message.value.error
      };
    }
  }
}, _sendMessage = new WeakSet(), sendMessage_fn = function(message) {
  this.wsPromise.then((wsResolved) => {
    if (wsResolved) {
      const writer = new BinaryWriter(1024);
      ClientMessage.serialize(writer, message);
      const encoded = writer.getBuffer();
      wsResolved.send(encoded);
    }
  });
}, _handleOnOpen2 = new WeakSet(), handleOnOpen_fn2 = function() {
  this.isActive = true;
}, _applyTableUpdates = new WeakSet(), applyTableUpdates_fn = function(tableUpdates, eventContext) {
  let pendingCallbacks = [];
  for (let tableUpdate of tableUpdates) {
    const tableName = tableUpdate.tableName;
    const tableTypeInfo = __privateGet(this, _remoteModule).tables[tableName];
    const table = this.clientCache.getOrCreateTable(tableTypeInfo);
    const newCallbacks = table.applyOperations(
      tableUpdate.operations,
      eventContext
    );
    for (const callback of newCallbacks) {
      pendingCallbacks.push(callback);
    }
  }
  return pendingCallbacks;
}, _processMessage = new WeakSet(), processMessage_fn = async function(data) {
  var _a2;
  const serverMessage = parseValue(ServerMessage, data);
  const message = await __privateMethod(this, _processParsedMessage, processParsedMessage_fn).call(this, serverMessage);
  if (!message) {
    return;
  }
  switch (message.tag) {
    case "InitialSubscription": {
      let event = { tag: "SubscribeApplied" };
      const eventContext = __privateGet(this, _remoteModule).eventContextConstructor(
        this,
        event
      );
      const { event: _, ...subscriptionEventContext } = eventContext;
      const callbacks = __privateMethod(this, _applyTableUpdates, applyTableUpdates_fn).call(this, message.tableUpdates, eventContext);
      if (__privateGet(this, _emitter3)) {
        (_a2 = __privateGet(this, _onApplied2)) == null ? void 0 : _a2.call(this, subscriptionEventContext);
      }
      for (const callback of callbacks) {
        callback.cb();
      }
      break;
    }
    case "TransactionUpdateLight": {
      let event = { tag: "UnknownTransaction" };
      const eventContext = __privateGet(this, _remoteModule).eventContextConstructor(
        this,
        event
      );
      const callbacks = __privateMethod(this, _applyTableUpdates, applyTableUpdates_fn).call(this, message.tableUpdates, eventContext);
      for (const callback of callbacks) {
        callback.cb();
      }
      break;
    }
    case "TransactionUpdate": {
      let reducerInfo = message.reducerInfo;
      let unknownTransaction = false;
      let reducerArgs;
      let reducerTypeInfo;
      if (!reducerInfo) {
        unknownTransaction = true;
      } else {
        reducerTypeInfo = __privateGet(this, _remoteModule).reducers[reducerInfo.reducerName];
        try {
          const reader = new BinaryReader(reducerInfo.args);
          reducerArgs = reducerTypeInfo.argsType.deserialize(reader);
        } catch {
          console.debug("Failed to deserialize reducer arguments");
          unknownTransaction = true;
        }
      }
      if (unknownTransaction) {
        const event2 = { tag: "UnknownTransaction" };
        const eventContext2 = __privateGet(this, _remoteModule).eventContextConstructor(
          this,
          event2
        );
        const callbacks2 = __privateMethod(this, _applyTableUpdates, applyTableUpdates_fn).call(this, message.tableUpdates, eventContext2);
        for (const callback of callbacks2) {
          callback.cb();
        }
        return;
      }
      reducerInfo = reducerInfo;
      reducerTypeInfo = reducerTypeInfo;
      const reducerEvent = {
        callerIdentity: message.identity,
        status: message.status,
        callerConnectionId: message.connectionId,
        timestamp: message.timestamp,
        energyConsumed: message.energyConsumed,
        reducer: {
          name: reducerInfo.reducerName,
          args: reducerArgs
        }
      };
      const event = {
        tag: "Reducer",
        value: reducerEvent
      };
      const eventContext = __privateGet(this, _remoteModule).eventContextConstructor(
        this,
        event
      );
      const reducerEventContext = {
        ...eventContext,
        event: reducerEvent
      };
      const callbacks = __privateMethod(this, _applyTableUpdates, applyTableUpdates_fn).call(this, message.tableUpdates, eventContext);
      const argsArray = [];
      reducerTypeInfo.argsType.product.elements.forEach((element, index2) => {
        argsArray.push(reducerArgs[element.name]);
      });
      __privateGet(this, _reducerEmitter).emit(
        reducerInfo.reducerName,
        reducerEventContext,
        ...argsArray
      );
      for (const callback of callbacks) {
        callback.cb();
      }
      break;
    }
    case "IdentityToken": {
      this.identity = message.identity;
      if (!this.token && message.token) {
        this.token = message.token;
      }
      this.connectionId = message.connectionId;
      __privateGet(this, _emitter3).emit("connect", this, this.identity, this.token);
      break;
    }
    case "SubscribeApplied": {
      const subscription = __privateGet(this, _subscriptionManager).subscriptions.get(
        message.queryId
      );
      if (subscription === void 0) {
        stdbLogger(
          "error",
          `Received SubscribeApplied for unknown queryId ${message.queryId}.`
        );
        break;
      }
      const event = { tag: "SubscribeApplied" };
      const eventContext = __privateGet(this, _remoteModule).eventContextConstructor(
        this,
        event
      );
      const { event: _, ...subscriptionEventContext } = eventContext;
      const callbacks = __privateMethod(this, _applyTableUpdates, applyTableUpdates_fn).call(this, message.tableUpdates, eventContext);
      subscription?.emitter.emit("applied", subscriptionEventContext);
      for (const callback of callbacks) {
        callback.cb();
      }
      break;
    }
    case "UnsubscribeApplied": {
      const subscription = __privateGet(this, _subscriptionManager).subscriptions.get(
        message.queryId
      );
      if (subscription === void 0) {
        stdbLogger(
          "error",
          `Received UnsubscribeApplied for unknown queryId ${message.queryId}.`
        );
        break;
      }
      const event = { tag: "UnsubscribeApplied" };
      const eventContext = __privateGet(this, _remoteModule).eventContextConstructor(
        this,
        event
      );
      const { event: _, ...subscriptionEventContext } = eventContext;
      const callbacks = __privateMethod(this, _applyTableUpdates, applyTableUpdates_fn).call(this, message.tableUpdates, eventContext);
      subscription?.emitter.emit("end", subscriptionEventContext);
      __privateGet(this, _subscriptionManager).subscriptions.delete(message.queryId);
      for (const callback of callbacks) {
        callback.cb();
      }
      break;
    }
    case "SubscriptionError": {
      const error = Error(message.error);
      const event = { tag: "Error", value: error };
      const eventContext = __privateGet(this, _remoteModule).eventContextConstructor(
        this,
        event
      );
      const errorContext = {
        ...eventContext,
        event: error
      };
      if (message.queryId !== void 0) {
        __privateGet(this, _subscriptionManager).subscriptions.get(message.queryId)?.emitter.emit("error", errorContext, error);
        __privateGet(this, _subscriptionManager).subscriptions.delete(message.queryId);
      } else {
        console.error("Received an error message without a queryId: ", error);
        __privateGet(this, _subscriptionManager).subscriptions.forEach(({ emitter }) => {
          emitter.emit("error", errorContext, error);
        });
      }
    }
  }
}, _handleOnMessage2 = new WeakSet(), handleOnMessage_fn2 = function(wsMessage) {
  __privateSet(this, _messageQueue, __privateGet(this, _messageQueue).then(() => {
    return __privateMethod(this, _processMessage, processMessage_fn).call(this, wsMessage.data);
  }));
}, _on = new WeakSet(), on_fn = function(eventName, callback) {
  __privateGet(this, _emitter3).on(eventName, callback);
}, _off = new WeakSet(), off_fn = function(eventName, callback) {
  __privateGet(this, _emitter3).off(eventName, callback);
}, _onConnect = new WeakSet(), onConnect_fn = function(callback) {
  __privateGet(this, _emitter3).on("connect", callback);
}, _onDisconnect = new WeakSet(), onDisconnect_fn = function(callback) {
  __privateGet(this, _emitter3).on("disconnect", callback);
}, _onConnectError = new WeakSet(), onConnectError_fn = function(callback) {
  __privateGet(this, _emitter3).on("connectError", callback);
}, _removeOnConnect = new WeakSet(), removeOnConnect_fn = function(callback) {
  __privateGet(this, _emitter3).off("connect", callback);
}, _removeOnDisconnect = new WeakSet(), removeOnDisconnect_fn = function(callback) {
  __privateGet(this, _emitter3).off("disconnect", callback);
}, _removeOnConnectError = new WeakSet(), removeOnConnectError_fn = function(callback) {
  __privateGet(this, _emitter3).off("connectError", callback);
}, _k);
var CallLambda;
((CallLambda2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("appHash", AlgebraicType.createU256Type()),
      new ProductTypeElement("lam", AlgebraicType.createU256Type()),
      new ProductTypeElement("callId", AlgebraicType.createU32Type()),
      new ProductTypeElement("arg", AlgebraicType.createStringType())
    ]);
  }
  CallLambda2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    CallLambda2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  CallLambda2.serialize = serialize;
  function deserialize(reader) {
    return CallLambda2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  CallLambda2.deserialize = deserialize;
})(CallLambda || (CallLambda = {}));
var IdentityConnected;
((IdentityConnected2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([]);
  }
  IdentityConnected2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    IdentityConnected2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  IdentityConnected2.serialize = serialize;
  function deserialize(reader) {
    return IdentityConnected2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  IdentityConnected2.deserialize = deserialize;
})(IdentityConnected || (IdentityConnected = {}));
var AppData;
((AppData2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("setup", AlgebraicType.createStringType()),
      new ProductTypeElement("functions", AlgebraicType.createArrayType(AlgebraicType.createStringType()))
    ]);
  }
  AppData2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    AppData2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  AppData2.serialize = serialize;
  function deserialize(reader) {
    return AppData2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  AppData2.deserialize = deserialize;
})(AppData || (AppData = {}));
var Publish;
((Publish2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("app", AppData.getTypeScriptAlgebraicType())
    ]);
  }
  Publish2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Publish2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Publish2.serialize = serialize;
  function deserialize(reader) {
    return Publish2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Publish2.deserialize = deserialize;
})(Publish || (Publish = {}));
var SetHost;
((SetHost2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("app", AlgebraicType.createU256Type()),
      new ProductTypeElement("value", AlgebraicType.createBoolType())
    ]);
  }
  SetHost2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    SetHost2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  SetHost2.serialize = serialize;
  function deserialize(reader) {
    return SetHost2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  SetHost2.deserialize = deserialize;
})(SetHost || (SetHost = {}));
class AppTableHandle {
  constructor(tableCache) {
    __publicField(this, "tableCache");
    __publicField(this, "id", {
      find: (col_val) => {
        for (let row of this.tableCache.iter()) {
          if (deepEqual(row.id, col_val)) {
            return row;
          }
        }
      }
    });
    __publicField(this, "onInsert", (cb) => {
      return this.tableCache.onInsert(cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      return this.tableCache.removeOnInsert(cb);
    });
    __publicField(this, "onDelete", (cb) => {
      return this.tableCache.onDelete(cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      return this.tableCache.removeOnDelete(cb);
    });
    __publicField(this, "onUpdate", (cb) => {
      return this.tableCache.onUpdate(cb);
    });
    __publicField(this, "removeOnUpdate", (cb) => {
      return this.tableCache.removeOnUpdate(cb);
    });
    this.tableCache = tableCache;
  }
  count() {
    return this.tableCache.count();
  }
  iter() {
    return this.tableCache.iter();
  }
}
class HostTableHandle {
  constructor(tableCache) {
    __publicField(this, "tableCache");
    __publicField(this, "onInsert", (cb) => {
      return this.tableCache.onInsert(cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      return this.tableCache.removeOnInsert(cb);
    });
    __publicField(this, "onDelete", (cb) => {
      return this.tableCache.onDelete(cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      return this.tableCache.removeOnDelete(cb);
    });
    this.tableCache = tableCache;
  }
  count() {
    return this.tableCache.count();
  }
  iter() {
    return this.tableCache.iter();
  }
}
class LambdaTableHandle {
  constructor(tableCache) {
    __publicField(this, "tableCache");
    __publicField(this, "id", {
      find: (col_val) => {
        for (let row of this.tableCache.iter()) {
          if (deepEqual(row.id, col_val)) {
            return row;
          }
        }
      }
    });
    __publicField(this, "onInsert", (cb) => {
      return this.tableCache.onInsert(cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      return this.tableCache.removeOnInsert(cb);
    });
    __publicField(this, "onDelete", (cb) => {
      return this.tableCache.onDelete(cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      return this.tableCache.removeOnDelete(cb);
    });
    __publicField(this, "onUpdate", (cb) => {
      return this.tableCache.onUpdate(cb);
    });
    __publicField(this, "removeOnUpdate", (cb) => {
      return this.tableCache.removeOnUpdate(cb);
    });
    this.tableCache = tableCache;
  }
  count() {
    return this.tableCache.count();
  }
  iter() {
    return this.tableCache.iter();
  }
}
class NotificationTableHandle {
  constructor(tableCache) {
    __publicField(this, "tableCache");
    __publicField(this, "target", {
      find: (col_val) => {
        for (let row of this.tableCache.iter()) {
          if (deepEqual(row.target, col_val)) {
            return row;
          }
        }
      }
    });
    __publicField(this, "onInsert", (cb) => {
      return this.tableCache.onInsert(cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      return this.tableCache.removeOnInsert(cb);
    });
    __publicField(this, "onDelete", (cb) => {
      return this.tableCache.onDelete(cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      return this.tableCache.removeOnDelete(cb);
    });
    __publicField(this, "onUpdate", (cb) => {
      return this.tableCache.onUpdate(cb);
    });
    __publicField(this, "removeOnUpdate", (cb) => {
      return this.tableCache.removeOnUpdate(cb);
    });
    this.tableCache = tableCache;
  }
  count() {
    return this.tableCache.count();
  }
  iter() {
    return this.tableCache.iter();
  }
}
class ReturnsTableHandle {
  constructor(tableCache) {
    __publicField(this, "tableCache");
    __publicField(this, "owner", {
      find: (col_val) => {
        for (let row of this.tableCache.iter()) {
          if (deepEqual(row.owner, col_val)) {
            return row;
          }
        }
      }
    });
    __publicField(this, "onInsert", (cb) => {
      return this.tableCache.onInsert(cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      return this.tableCache.removeOnInsert(cb);
    });
    __publicField(this, "onDelete", (cb) => {
      return this.tableCache.onDelete(cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      return this.tableCache.removeOnDelete(cb);
    });
    __publicField(this, "onUpdate", (cb) => {
      return this.tableCache.onUpdate(cb);
    });
    __publicField(this, "removeOnUpdate", (cb) => {
      return this.tableCache.removeOnUpdate(cb);
    });
    this.tableCache = tableCache;
  }
  count() {
    return this.tableCache.count();
  }
  iter() {
    return this.tableCache.iter();
  }
}
class StoreTableHandle {
  constructor(tableCache) {
    __publicField(this, "tableCache");
    __publicField(this, "onInsert", (cb) => {
      return this.tableCache.onInsert(cb);
    });
    __publicField(this, "removeOnInsert", (cb) => {
      return this.tableCache.removeOnInsert(cb);
    });
    __publicField(this, "onDelete", (cb) => {
      return this.tableCache.onDelete(cb);
    });
    __publicField(this, "removeOnDelete", (cb) => {
      return this.tableCache.removeOnDelete(cb);
    });
    this.tableCache = tableCache;
  }
  count() {
    return this.tableCache.count();
  }
  iter() {
    return this.tableCache.iter();
  }
}
var App;
((App2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("id", AlgebraicType.createU256Type()),
      new ProductTypeElement("setup", AlgebraicType.createStringType())
    ]);
  }
  App2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    App2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  App2.serialize = serialize;
  function deserialize(reader) {
    return App2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  App2.deserialize = deserialize;
})(App || (App = {}));
var Host;
((Host2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("host", AlgebraicType.createIdentityType()),
      new ProductTypeElement("app", AlgebraicType.createU256Type())
    ]);
  }
  Host2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Host2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Host2.serialize = serialize;
  function deserialize(reader) {
    return Host2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Host2.deserialize = deserialize;
})(Host || (Host = {}));
var LamResult;
((LamResult2) => {
  LamResult2.Ok = (value) => ({ tag: "Ok", value });
  LamResult2.Err = (value) => ({ tag: "Err", value });
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createSumType([
      new SumTypeVariant("Ok", AlgebraicType.createStringType()),
      new SumTypeVariant("Err", AlgebraicType.createStringType())
    ]);
  }
  LamResult2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    LamResult2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  LamResult2.serialize = serialize;
  function deserialize(reader) {
    return LamResult2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  LamResult2.deserialize = deserialize;
})(LamResult || (LamResult = {}));
var Lambda;
((Lambda2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("id", AlgebraicType.createU256Type()),
      new ProductTypeElement("code", AlgebraicType.createStringType())
    ]);
  }
  Lambda2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Lambda2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Lambda2.serialize = serialize;
  function deserialize(reader) {
    return Lambda2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Lambda2.deserialize = deserialize;
})(Lambda || (Lambda = {}));
var Notification;
((Notification2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("target", AlgebraicType.createIdentityType()),
      new ProductTypeElement("app", AlgebraicType.createU256Type()),
      new ProductTypeElement("sender", AlgebraicType.createIdentityType()),
      new ProductTypeElement("arg", AlgebraicType.createStringType())
    ]);
  }
  Notification2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Notification2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Notification2.serialize = serialize;
  function deserialize(reader) {
    return Notification2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Notification2.deserialize = deserialize;
})(Notification || (Notification = {}));
var Return;
((Return2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("owner", AlgebraicType.createIdentityType()),
      new ProductTypeElement("app", AlgebraicType.createU256Type()),
      new ProductTypeElement("id", AlgebraicType.createU32Type()),
      new ProductTypeElement("logs", AlgebraicType.createArrayType(AlgebraicType.createStringType())),
      new ProductTypeElement("result", LamResult.getTypeScriptAlgebraicType())
    ]);
  }
  Return2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Return2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Return2.serialize = serialize;
  function deserialize(reader) {
    return Return2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Return2.deserialize = deserialize;
})(Return || (Return = {}));
var Store;
((Store2) => {
  function getTypeScriptAlgebraicType() {
    return AlgebraicType.createProductType([
      new ProductTypeElement("key", AlgebraicType.createU256Type()),
      new ProductTypeElement("owner", AlgebraicType.createIdentityType()),
      new ProductTypeElement("content", AlgebraicType.createStringType())
    ]);
  }
  Store2.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
  function serialize(writer, value) {
    Store2.getTypeScriptAlgebraicType().serialize(writer, value);
  }
  Store2.serialize = serialize;
  function deserialize(reader) {
    return Store2.getTypeScriptAlgebraicType().deserialize(reader);
  }
  Store2.deserialize = deserialize;
})(Store || (Store = {}));
const REMOTE_MODULE = {
  tables: {
    app: {
      tableName: "app",
      rowType: App.getTypeScriptAlgebraicType(),
      primaryKey: "id",
      primaryKeyInfo: {
        colName: "id",
        colType: App.getTypeScriptAlgebraicType().product.elements[0].algebraicType
      }
    },
    host: {
      tableName: "host",
      rowType: Host.getTypeScriptAlgebraicType()
    },
    lambda: {
      tableName: "lambda",
      rowType: Lambda.getTypeScriptAlgebraicType(),
      primaryKey: "id",
      primaryKeyInfo: {
        colName: "id",
        colType: Lambda.getTypeScriptAlgebraicType().product.elements[0].algebraicType
      }
    },
    notification: {
      tableName: "notification",
      rowType: Notification.getTypeScriptAlgebraicType(),
      primaryKey: "target",
      primaryKeyInfo: {
        colName: "target",
        colType: Notification.getTypeScriptAlgebraicType().product.elements[0].algebraicType
      }
    },
    returns: {
      tableName: "returns",
      rowType: Return.getTypeScriptAlgebraicType(),
      primaryKey: "owner",
      primaryKeyInfo: {
        colName: "owner",
        colType: Return.getTypeScriptAlgebraicType().product.elements[0].algebraicType
      }
    },
    store: {
      tableName: "store",
      rowType: Store.getTypeScriptAlgebraicType()
    }
  },
  reducers: {
    call_lambda: {
      reducerName: "call_lambda",
      argsType: CallLambda.getTypeScriptAlgebraicType()
    },
    identity_connected: {
      reducerName: "identity_connected",
      argsType: IdentityConnected.getTypeScriptAlgebraicType()
    },
    publish: {
      reducerName: "publish",
      argsType: Publish.getTypeScriptAlgebraicType()
    },
    set_host: {
      reducerName: "set_host",
      argsType: SetHost.getTypeScriptAlgebraicType()
    }
  },
  versionInfo: {
    cliVersion: "1.2.0"
  },
  eventContextConstructor: (imp, event) => {
    return {
      ...imp,
      event
    };
  },
  dbViewConstructor: (imp) => {
    return new RemoteTables(imp);
  },
  reducersConstructor: (imp, setReducerFlags) => {
    return new RemoteReducers(imp, setReducerFlags);
  },
  setReducerFlagsConstructor: () => {
    return new SetReducerFlags();
  }
};
class RemoteReducers {
  constructor(connection, setCallReducerFlags) {
    this.connection = connection;
    this.setCallReducerFlags = setCallReducerFlags;
  }
  callLambda(appHash, lam, callId, arg) {
    const __args = { appHash, lam, callId, arg };
    let __writer = new BinaryWriter(1024);
    CallLambda.getTypeScriptAlgebraicType().serialize(__writer, __args);
    let __argsBuffer = __writer.getBuffer();
    this.connection.callReducer("call_lambda", __argsBuffer, this.setCallReducerFlags.callLambdaFlags);
  }
  onCallLambda(callback) {
    this.connection.onReducer("call_lambda", callback);
  }
  removeOnCallLambda(callback) {
    this.connection.offReducer("call_lambda", callback);
  }
  onIdentityConnected(callback) {
    this.connection.onReducer("identity_connected", callback);
  }
  removeOnIdentityConnected(callback) {
    this.connection.offReducer("identity_connected", callback);
  }
  publish(app) {
    const __args = { app };
    let __writer = new BinaryWriter(1024);
    Publish.getTypeScriptAlgebraicType().serialize(__writer, __args);
    let __argsBuffer = __writer.getBuffer();
    this.connection.callReducer("publish", __argsBuffer, this.setCallReducerFlags.publishFlags);
  }
  onPublish(callback) {
    this.connection.onReducer("publish", callback);
  }
  removeOnPublish(callback) {
    this.connection.offReducer("publish", callback);
  }
  setHost(app, value) {
    const __args = { app, value };
    let __writer = new BinaryWriter(1024);
    SetHost.getTypeScriptAlgebraicType().serialize(__writer, __args);
    let __argsBuffer = __writer.getBuffer();
    this.connection.callReducer("set_host", __argsBuffer, this.setCallReducerFlags.setHostFlags);
  }
  onSetHost(callback) {
    this.connection.onReducer("set_host", callback);
  }
  removeOnSetHost(callback) {
    this.connection.offReducer("set_host", callback);
  }
}
class SetReducerFlags {
  constructor() {
    __publicField(this, "callLambdaFlags", "FullUpdate");
    __publicField(this, "publishFlags", "FullUpdate");
    __publicField(this, "setHostFlags", "FullUpdate");
  }
  callLambda(flags) {
    this.callLambdaFlags = flags;
  }
  publish(flags) {
    this.publishFlags = flags;
  }
  setHost(flags) {
    this.setHostFlags = flags;
  }
}
class RemoteTables {
  constructor(connection) {
    this.connection = connection;
  }
  get app() {
    return new AppTableHandle(this.connection.clientCache.getOrCreateTable(REMOTE_MODULE.tables.app));
  }
  get host() {
    return new HostTableHandle(this.connection.clientCache.getOrCreateTable(REMOTE_MODULE.tables.host));
  }
  get lambda() {
    return new LambdaTableHandle(this.connection.clientCache.getOrCreateTable(REMOTE_MODULE.tables.lambda));
  }
  get notification() {
    return new NotificationTableHandle(this.connection.clientCache.getOrCreateTable(REMOTE_MODULE.tables.notification));
  }
  get returns() {
    return new ReturnsTableHandle(this.connection.clientCache.getOrCreateTable(REMOTE_MODULE.tables.returns));
  }
  get store() {
    return new StoreTableHandle(this.connection.clientCache.getOrCreateTable(REMOTE_MODULE.tables.store));
  }
}
class SubscriptionBuilder extends SubscriptionBuilderImpl32 {
}
class DbConnection extends DbConnectionImpl32 {
  constructor() {
    super(...arguments);
    __publicField(this, "subscriptionBuilder", () => {
      return new SubscriptionBuilder(this);
    });
  }
}
__publicField(DbConnection, "builder", () => {
  return new DbConnectionBuilder32(REMOTE_MODULE, (imp) => imp);
});
const textEncoder = new TextEncoder();
function toU256FromBytes(bytes) {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) + BigInt(bytes[i]);
  }
  return result;
}
function u256ToBeBytes(value) {
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
function concatBytes(chunks) {
  const total = chunks.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
async function hashString(s) {
  const data = textEncoder.encode(s);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return toU256FromBytes(digest);
}
async function hashApp(app) {
  const lambdaHashes = await Promise.all(app.functions.map(hashString));
  const setupBytes = textEncoder.encode(app.setup);
  const functionBytes = lambdaHashes.map(u256ToBeBytes);
  const allBytes = concatBytes([setupBytes, ...functionBytes]);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", allBytes));
  const hash = toU256FromBytes(digest);
  return { hash, lambdas: lambdaHashes };
}
const IdString = (id) => {
  return "id" + id.toHexString();
};
class ServerConnection {
  constructor(identity, server) {
    __publicField(this, "notifyListeners", /* @__PURE__ */ new Map());
    __publicField(this, "returnListeners", /* @__PURE__ */ new Map());
    this.identity = identity;
    this.server = server;
  }
  static connect(url, token) {
    return new Promise(async (resolve, reject) => {
      DbConnection.builder().withUri(url).withToken(token).withModuleName("rubox").onConnect(async (conn, identity, token2) => {
        localStorage.setItem(`${url}-token`, token2);
        let server = new ServerConnection(IdString(identity), conn);
        const handleNotify = (note) => {
          server.notifyListeners.get(note.app)?.(JSON.parse(note.arg));
        };
        const handleReturn = (ret) => {
          if (!ret.app) {
            return;
          }
          if (ret.logs.length > 0) {
            console.info("logs:");
            ret.logs.forEach((l) => console.log(l));
          }
          let expector = server.returnListeners.get(ret.app)?.get(ret.id);
          if (!expector) {
            return;
          }
          ret.result.tag == "Ok" ? expector.resolve(JSON.parse(ret.result.value)) : expector.reject(ret.result.value);
        };
        conn.subscriptionBuilder().onApplied((c) => {
          c.db.notification.onInsert((c2, note) => {
            handleNotify(note);
          });
          c.db.returns.onInsert((c2, ret) => {
            handleReturn(ret);
          });
          c.db.notification.onUpdate((c2, old, note) => {
            handleNotify(note);
          });
          c.db.returns.onUpdate((c2, old, ret) => {
            handleReturn(ret);
          });
        }).onError(console.error).subscribe([
          `SELECT * FROM notification WHERE target = '${identity.toHexString()}'`,
          `SELECT * FROM returns WHERE owner = '${identity.toHexString()}'`
        ]);
        conn.reducers.onCallLambda((c, a, l, id, arg) => {
          if (c.event.status.tag == "Failed") {
            console.warn("onCallLambda failed", id, c.event.status.value);
            server.returnListeners.get(a)?.get(id)?.reject(c.event.status.value);
          }
        });
        resolve([server, token2]);
      }).onConnectError((e) => {
        reject(e);
      }).build();
    });
  }
  users(app) {
    return new Promise(async (resolve, reject) => {
      this.server.subscriptionBuilder().onApplied((c) => {
        resolve(Array.from(c.db.host.iter()).filter((h) => h.app == app).map((h) => IdString(h.host)));
      }).onError(console.error).subscribe([`SELECT * FROM host WHERE app = ${app.toString()}`]);
    });
  }
}
class AppHandle {
  constructor(server, box, onNotify) {
    __publicField(this, "callCounter", 0);
    __publicField(this, "identity");
    __publicField(this, "app");
    this.server = server;
    this.identity = server.identity;
    let appData = {
      setup: box.loadApp.toString(),
      functions: Object.values(box.api).map((fn) => fn.toString())
    };
    server.server.reducers.publish(appData);
    this.app = hashApp(appData).then((app) => {
      let appHash = app.hash;
      server.notifyListeners.set(appHash, onNotify);
      server.returnListeners.set(appHash, /* @__PURE__ */ new Map());
      server.server.reducers.setHost(appHash, true);
      return app.hash;
    });
  }
  async call(fn, arg = null) {
    if (!fn) {
      throw new Error("fn must be a function: " + fn);
    }
    return new Promise(async (resolve, reject) => {
      let funHash = await hashString(fn.toString());
      let appHash = await this.app;
      this.server.returnListeners.get(appHash)?.set(this.callCounter, { resolve, reject });
      this.server.server.reducers.callLambda(appHash, funHash, this.callCounter, JSON.stringify(arg));
      this.callCounter += 1;
    });
  }
  async users() {
    return this.server.users(await this.app);
  }
}
const msgApp = {
  name: "chatbox",
  loadApp: (c) => {
    return {
      pushMsg: (target, msg) => {
        let d = {
          sender: c.self,
          receiver: target,
          message: msg
        };
        c.DB.set(target, "messages", [...c.DB.get(target, "messages") ?? [], d]);
        if (c.self == target) {
          return null;
        }
        let prev = c.DB.get(c.self, "messages");
        c.DB.set(c.self, "messages", [...prev ?? [], d]);
        c.notify(target, ["new message", prev ? prev.length : 0]);
      }
    };
  },
  api: {
    setname: (ctx, arg) => {
      ctx.DB.set(ctx.self, "name", arg);
    },
    getname: (ctx, target) => {
      return ctx.DB.get(target, "name") || "anonym";
    },
    sendMessage: (ctx, arg) => {
      ctx.pushMsg(arg.target, arg.message);
    },
    getMessages: (ctx, arg) => {
      return ctx.DB.get(ctx.self, "messages") || [];
    }
  }
};
const _ChatService = class {
  constructor(server) {
    __publicField(this, "nameCache", /* @__PURE__ */ new Map());
    __publicField(this, "msgs", new Writable([]));
    __publicField(this, "active_partner");
    __publicField(this, "conn");
    let instance = _ChatService.instances.find((i) => i.conn.server == server);
    if (instance)
      return instance;
    console.log("creating chat service");
    this.conn = new AppHandle(server, msgApp, (note) => this.refreshMsgs());
    this.active_partner = new Stored(`chat_partner_${this.conn.app}`, this.conn.identity);
  }
  render() {
    let myname = this.getName(this.conn.identity);
    myname.get().then((n) => {
      myname.subscribeLater((n2) => {
        this.conn.call(msgApp.api.setname, n2).then(() => popup("name updated: ", n2));
      });
    });
    this.refreshMsgs();
    let nameview = input(myname);
    return div(
      h2("chatbox"),
      p("my name:", nameview, button("update", { onclick: () => {
        myname.set(nameview.value);
      } })),
      p("active users:"),
      this.conn.users().then((us) => us.map(
        (u) => p(this.getName(u), " ", button("message", { onclick: () => {
          this.active_partner.set(u);
        } }))
      )),
      p("chatting with:", this.active_partner.map((p2) => this.getName(p2))),
      p("messages:"),
      this.active_partner.map((partner) => this.filterMsgs(partner).map((m) => m.map((m2) => p(this.getName(m2.sender), " : ", m2.message)))),
      input({
        placeholder: "enter message",
        onkeydown: (e) => {
          if (e.key === "Enter") {
            let inp = e.target;
            this.sendMessage(inp.value);
            inp.value = "";
          }
        }
      })
    );
  }
  async sendMessage(message) {
    await this.sendMessageTo(message, await this.active_partner.get());
  }
  async sendMessageTo(message, target) {
    await this.conn.call(msgApp.api.sendMessage, { target, message }).then(() => {
      this.refreshMsgs();
    });
  }
  filterMsgs(partner) {
    return this.msgs.map((m) => m.filter((m2) => m2.receiver == partner && m2.sender == this.conn.identity || m2.sender == partner && m2.receiver == this.conn.identity)).map((m) => {
      console.log("filtering messages for", partner);
      console.log("messages", m);
      return m;
    });
  }
  async refreshMsgs() {
    await this.conn.call(msgApp.api.getMessages).then((m) => m).then((m) => this.msgs.set(m));
  }
  getName(id) {
    if (!this.nameCache.has(id)) {
      const nm = this.conn.call(msgApp.api.getname, id);
      let res = new Writable(
        nm.catch((e) => {
          return "anonym";
        })
      );
      this.nameCache.set(id, res);
    }
    return this.nameCache.get(id);
  }
  async setName(name) {
    await this.conn.call(msgApp.api.setname, name);
  }
};
let ChatService = _ChatService;
__publicField(ChatService, "instances", []);
let chessApp = {
  name: "chess",
  loadApp: (c) => {
    let startBoard = [
      { type: "rook", color: "white" },
      { type: "knight", color: "white" },
      { type: "bishop", color: "white" },
      { type: "queen", color: "white" },
      { type: "king", color: "white" },
      { type: "bishop", color: "white" },
      { type: "knight", color: "white" },
      { type: "rook", color: "white" },
      null,
      null,
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      null,
      null,
      { type: "rook", color: "black" },
      { type: "knight", color: "black" },
      { type: "bishop", color: "black" },
      { type: "queen", color: "black" },
      { type: "king", color: "black" },
      { type: "bishop", color: "black" },
      { type: "knight", color: "black" },
      { type: "rook", color: "black" },
      null,
      null
    ];
    function isPos(pos) {
      return pos >= 0 && pos < 80 && pos % 10 < 8;
    }
    function getPieceAt(board, pos) {
      return board[pos];
    }
    function arrSet(arr, index2, value) {
      return arr.map((v, i) => i == index2 ? value : v);
    }
    let left = 1;
    let right = -left;
    function directions(p2) {
      let up = p2.color == "white" ? 10 : -10;
      let down = -up;
      return p2.type == "pawn" ? [up, up + up] : p2.type == "pawnmoved" || p2.type == "pawnmoveddouble" ? [up] : p2.type == "knight" ? [up + left * 2, up + right * 2, down + left * 2, down + right * 2, up * 2 + left, up * 2 + right, down * 2 + left, down * 2 + right] : p2.type == "bishop" ? [up + left, up + right, down + left, down + right] : p2.type == "rook" || p2.type == "rookmoved" ? [up, down, left, right] : p2.type == "king" || p2.type == "queen" || p2.type == "kingmoved" ? [up, down, left, right, up + left, up + right, down + left, down + right] : [];
    }
    function getLegalMoves(board, pos) {
      let piece = getPieceAt(board, pos);
      if (!piece) {
        return [];
      }
      if (piece.type == "pawn" || piece.type == "pawnmoved" || piece.type == "pawnmoveddouble") {
        let moves = directions(piece).map((d) => pos + d).filter((p2) => isPos(p2) && getPieceAt(board, p2) == null);
        let up = piece.color == "white" ? 10 : -10;
        let hits = [left, right].map((d) => pos + d + up).filter((t) => {
          let target = getPieceAt(board, t);
          return target && target.color != piece.color;
        });
        let passants = [left, right].map((d) => pos + d).filter((t) => {
          let target = getPieceAt(board, t);
          if (target && target.type == "pawnmoveddouble" && target.color != piece.color) {
            return true;
          }
          return false;
        }).map((t) => t + up);
        return [...moves, ...passants, ...hits];
      }
      let getRay = (pos2, dir) => {
        let pp = pos2 + dir;
        if (!isPos(pp)) {
          return [];
        }
        let target = getPieceAt(board, pp);
        if (target) {
          if (target.color == piece.color) {
            return [];
          }
          return [pp];
        }
        if (piece.type == "king" || piece.type == "kingmoved" || piece.type == "knight") {
          return [pp];
        }
        return [pp, ...getRay(pp, dir)];
      };
      return directions(piece).reduce((acc, dir) => {
        return [...acc, ...getRay(pos, dir)];
      }, []);
    }
    function makeMove(m, move) {
      let piece = getPieceAt(m.board, move.start);
      if (!piece) {
        return ["no piece at start", m];
      }
      if (m.winner != null) {
        return ["game over", m];
      }
      if (piece.color != m.turn) {
        return ["not your turn", m];
      }
      let options = getLegalMoves(m.board, move.start);
      let dist = move.end - move.start;
      let npBoard = m.board.map((p2) => p2 && p2.type == "pawnmoveddouble" ? { ...p2, type: "pawnmoved" } : p2);
      let ptype = piece.type == "pawn" || piece.type == "pawnmoveddouble" ? dist == 20 || dist == -20 ? "pawnmoveddouble" : "pawnmoved" : piece.type == "king" ? "kingmoved" : piece.type == "rook" ? "rookmoved" : piece.type;
      let newBoard = arrSet(arrSet(npBoard, move.start, null), move.end, { ...piece, type: ptype });
      if (!options.includes(move.end)) {
        return ["Invalid move", m];
      }
      let resMatch = {
        ...m,
        board: newBoard,
        turn: m.turn == "white" ? "black" : "white"
      };
      if (ptype == "pawnmoved") {
        if (dist % 10 != 0) {
          let passant = move.end % 10 + Math.floor(move.start / 10) * 10;
          let target = getPieceAt(resMatch.board, passant);
          let pboard = arrSet(resMatch.board, passant, null);
          if (target && target.type == "pawnmoveddouble" && target.color != piece.color) {
            return ["", { ...resMatch, board: pboard }];
          }
        }
      }
      return ["", resMatch];
    }
    return {
      startBoard,
      getLegalMoves,
      makeMove
    };
  },
  api: {
    startMatch: (c, target) => {
      let match = {
        host: c.self,
        white: c.self,
        black: target,
        board: c.startBoard,
        turn: "white",
        winner: null
      };
      if (c.DB.get(c.self, "match_host")) {
        return ["already playing", null];
      }
      if (c.DB.get(target, "match_host")) {
        return ["opponent already playing", null];
      }
      c.DB.set(c.self, "match_host", c.self);
      c.DB.set(target, "match_host", c.self);
      c.DB.set(c.self, "match_data", match);
      c.notify(target, {
        type: "new match",
        data: match
      });
      return ["", match];
    },
    getHost: (c, arg) => {
      return c.DB.get(c.self, "match_host");
    },
    getMatch: (c, arg) => {
      let host = c.DB.get(c.self, "match_host");
      if (!host) {
        return null;
      }
      return c.DB.get(host, "match_data");
    },
    resignMatch: (c, arg) => {
      let match = c.DB.get(c.self, "match_data");
      if (match.black != c.self && match.white != c.self) {
        return ["not your match", null];
      }
      let other = match.white == c.self ? match.black : match.white;
      let newmatch = {
        ...match,
        winner: other
      };
      c.DB.set(c.self, "match_data", newmatch);
      c.notify(other, {
        type: "game over",
        data: newmatch
      });
      c.DB.set(c.self, "match_host", null);
      c.DB.set(other, "match_host", null);
      return ["", newmatch];
    },
    requestMove: (c, arg) => {
      let match = c.DB.get(arg.host, "match_data");
      if (match.winner != null) {
        return ["game over", match];
      }
      if (match.turn == "white" && match.white != c.self) {
        return ["not your turn", match];
      }
      if (match.turn == "black" && match.black != c.self) {
        return ["not your turn", match];
      }
      let [err, newmatch] = c.makeMove(match, arg.move);
      if (err.length > 0) {
        return [err, match];
      }
      c.DB.set(arg.host, "match_data", newmatch);
      c.notify(
        match.white == c.self ? match.black : match.white,
        { type: "new move", data: newmatch }
      );
      return [err, newmatch];
    }
  }
};
let pieceImages = {
  "pawn": "p",
  "knight": "N",
  "bishop": "B",
  "rook": "R",
  "queen": "Q",
  "king": "K",
  "kingmoved": "K",
  "rookmoved": "R",
  "pawnmoved": "p",
  "pawnmoveddouble": "p"
};
let boardSize = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) * 0.6;
let focuspos = 0;
let displayBoard = (m, onMove) => {
  let chessBoard = div({ class: "chessboard", style: {
    backgroundColor: "#f0d9b5",
    width: boardSize + "px",
    height: boardSize + "px",
    margin: "auto",
    position: "relative",
    cursor: "pointer"
  } });
  chessBoard.innerHTML = "";
  chessBoard.appendChild(div(m.board.map((p2, n) => {
    let x = n % 10;
    let y = Math.floor(n / 10);
    let square = div({
      style: {
        width: boardSize / 8 + "px",
        height: boardSize / 8 + "px",
        "background-color": (x + y) % 2 == 0 ? focuspos == n ? "#c5a8a3" : "#b58863" : focuspos == n ? "#c5a8a3" : "#a9a0a0",
        left: x * boardSize / 8 + "px",
        bottom: y * boardSize / 8 + "px",
        position: "absolute"
      },
      onclick: async () => {
        let move = {
          start: focuspos,
          end: n,
          promo: null
        };
        focuspos = focuspos == n ? null : n;
        onMove(move);
      }
    });
    let piece = m.board[n];
    if (piece) {
      let pieceElement = div(pieceImages[piece.type], {
        style: {
          width: boardSize / 8 + "px",
          height: boardSize / 8 + "px",
          position: "absolute",
          color: piece.color === "white" ? "white" : "black",
          "font-weight": "bold",
          "font-size": boardSize / 8 + "px"
        }
      });
      square.appendChild(pieceElement);
    }
    return x > 7 ? div() : square;
  })));
  return chessBoard;
};
function getother(m, self2) {
  if (m.white == self2) {
    return m.black;
  }
  if (m.black == self2) {
    return m.white;
  }
  return null;
}
class ChessService {
  constructor(server) {
    __publicField(this, "match", new Writable(null));
    __publicField(this, "conn");
    __publicField(this, "chatService");
    this.server = server;
    this.conn = new AppHandle(server, chessApp, (note) => {
      if (note.type == "new move") {
        this.match.set(note.data);
      } else if (note.type == "new match") {
        this.match.set(note.data);
      } else if (note.type == "game over") {
        this.match.set(note.data);
      }
    });
    this.chatService = new ChatService(server);
    this.conn.call(chessApp.api.getHost).then((h) => {
      if (h) {
        this.conn.call(chessApp.api.getMatch, h).then((m) => {
          this.match.set(m);
        });
      } else {
        this.match.set(null, true);
      }
    });
  }
  render() {
    let matchMaker = button("new match", { onclick: () => {
      this.conn.users().then((users) => {
        let oppicker = popup(
          h2("choose an opponent"),
          users.map(async (user) => {
            let occ = await this.conn.call(chessApp.api.getHost);
            if (occ != null)
              return null;
            return p(
              button(this.chatService.getName(user), { onclick: () => {
                this.conn.call(chessApp.api.startMatch, user).then(([err, newmatch]) => {
                  if (err) {
                    popup(err);
                  } else {
                    this.match.set(newmatch);
                  }
                });
                oppicker.remove();
              } })
            );
          })
        );
      });
    } });
    let showChat = new Stored("show_chat_chess", true);
    let opponent = this.match.map((m) => m ? getother(m, this.conn.identity) : null);
    let msgsView = div();
    opponent.subscribe((o) => {
      msgsView.innerHTML = "";
      if (o) {
        this.chatService.refreshMsgs().then(() => {
          this.chatService.filterMsgs(o).subscribe((m) => {
            msgsView.innerHTML = "";
            msgsView.appendChild(div(m.map((m2) => p(this.chatService.getName(m2.sender), " : ", m2.message))));
          });
        });
      }
    });
    let chatview = showChat.map(
      (h) => div(
        h && opponent ? [
          button("x", { onclick: () => showChat.set(false) }),
          h2("chat"),
          msgsView,
          input({ onkeydown: async (e) => {
            if (e.key === "Enter") {
              let inp = e.target;
              await this.chatService.sendMessageTo(inp.value, await opponent.get());
              inp.value = "";
            }
          } })
        ] : button("open chat", { onclick: () => showChat.set(true) }),
        {
          style: {
            position: "absolute",
            top: "1em",
            right: "1em",
            zIndex: "1000",
            "max-width": "20em",
            border: "1px solid #000",
            "border-radius": "1em",
            "background-color": "var(--bg)"
          }
        }
      )
    );
    return div(
      { style: {
        padding: "20px"
      } },
      h2("chess"),
      this.match.map((m) => {
        if (m) {
          let host = m.host;
          getother(m, this.conn.identity);
          return [
            displayBoard(m, (move) => {
              this.conn.call(chessApp.api.requestMove, { move, host }).then(([err, newmatch]) => {
                this.match.set(newmatch);
              });
            }),
            p("my name:", this.chatService.getName(this.conn.identity)),
            p("white:", this.chatService.getName(m.white)),
            p("black:", this.chatService.getName(m.black)),
            p("turn:", m.turn),
            p("winner:", m.winner == null || m.winner == "draw" ? m.winner : this.chatService.getName(m.winner)),
            m.winner == null ? button("resign", { onclick: () => {
              this.conn.call(chessApp.api.resignMatch, null).then(([err, newmatch]) => {
                if (err) {
                  popup(err);
                } else {
                  this.match.set(newmatch);
                }
              });
            } }) : matchMaker,
            chatview
          ];
        }
        return matchMaker;
      })
    );
  }
}
const appname = "rubox_app";
document.title = appname;
function getLocation() {
  const items = window.location.pathname.split("/").filter(Boolean);
  const serverLocal = items.includes("local");
  const frontendLocal = !items.includes(appname);
  return {
    serverLocal,
    frontendLocal,
    path: items.filter((x) => x != "local" && x != appname)
  };
}
let location = getLocation();
const serverurl = location.serverLocal ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";
const body = document.body;
body.appendChild(h2("loading..."));
async function setup() {
  let tokenLocation = `${serverurl}-token`;
  let [server, token] = await ServerConnection.connect(serverurl, localStorage.getItem(tokenLocation) ?? "").catch(async (e) => {
    console.warn("error connecting to server", e);
    localStorage.clear();
    return await ServerConnection.connect(serverurl, "");
  });
  localStorage.setItem(tokenLocation, token);
  const home = () => div(
    h2("welcome to the rubox"),
    p("This is a simple app to demonstrate the use of the Rubox framework."),
    ...apps.filter((x) => x.path).map((app) => p(
      button(app.path, {
        onclick: () => {
          route(app.path.split("/"), server);
        }
      })
    ))
  );
  const apps = [
    { render: home, path: "" },
    { render: (server2) => new ChatService(server2).render(), path: "chat" },
    { render: (server2) => new ChessService(server2).render(), path: "chess" }
  ];
  route(location.path, server);
  window.addEventListener("popstate", (e) => {
    location = getLocation();
    route(location.path, server);
  });
  function route(path, server2) {
    let newpath = "/" + (location.frontendLocal ? "" : appname) + "/" + path.join("/") + (location.serverLocal ? "/local" : "");
    newpath = window.location.origin + "/" + newpath.split("/").filter(Boolean).join("/");
    window.history.pushState({}, "", newpath);
    body.innerHTML = "";
    body.appendChild(div(
      {
        style: {
          "max-width": "20em",
          position: "absolute",
          top: "0",
          left: "1em",
          cursor: "pointer"
        },
        onclick: () => {
          route([], server2);
        }
      },
      h2("rubox")
    ));
    body.style.fontFamily = "monospace";
    body.style.textAlign = "center";
    for (const app of apps) {
      if (app.path === path.join("/")) {
        if (!app.cache) {
          app.cache = div(app.render(server2));
        }
        body.appendChild(app.cache);
      }
    }
  }
}
setup();
