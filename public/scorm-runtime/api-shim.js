/**
 * SCORM API postMessage shim — runs INSIDE the SCORM iframe to expose
 * `window.API` (1.2) and `window.API_1484_11` (2004) without needing
 * `allow-same-origin` on the iframe sandbox.
 *
 * Architecture:
 *   - Parent (LMS) → iframe: `{ source: 'scorm-host', type, ... }` messages
 *     pre-warm a local CMI cache and reply to async calls.
 *   - Iframe (SCO via this shim) → parent: `{ source: 'scorm-shim', type, ... }`
 *     forwards SCORM API method calls.
 *
 * The SCORM API is synchronous from the SCO's perspective. We satisfy this
 * by maintaining a local CMI cache: GetValue reads from cache, SetValue
 * writes to cache (and forwards async to parent), Initialize/Commit/Terminate
 * return 'true' immediately and forward async.
 *
 * `window._SCORM_INITIAL_CMI` is read on load if present (set by an earlier
 * inline script the asset route may inject) so resume state is available
 * for the SCO's first GetValue calls before the async cache-seed lands.
 */
(function () {
  if (window.API || window.API_1484_11) return;

  var cache = {};
  if (window._SCORM_INITIAL_CMI && typeof window._SCORM_INITIAL_CMI === 'object') {
    for (var seedKey in window._SCORM_INITIAL_CMI) {
      if (Object.prototype.hasOwnProperty.call(window._SCORM_INITIAL_CMI, seedKey)) {
        cache[seedKey] = String(window._SCORM_INITIAL_CMI[seedKey]);
      }
    }
  }
  var lastError = '0';

  function postToParent(msg) {
    try {
      msg.source = 'scorm-shim';
      window.parent.postMessage(msg, '*');
    } catch (err) {
      // Ignore — sandboxed environments may reject in pathological cases.
    }
  }

  // Listen for cache-seed and value-update messages from the parent.
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || typeof data !== 'object' || data.source !== 'scorm-host') return;
    if (data.type === 'cache-seed' && data.cmi && typeof data.cmi === 'object') {
      for (var k in data.cmi) {
        if (Object.prototype.hasOwnProperty.call(data.cmi, k)) {
          cache[k] = String(data.cmi[k]);
        }
      }
    } else if (data.type === 'cache-merge' && data.cmi && typeof data.cmi === 'object') {
      // Same shape as cache-seed but used for incremental updates.
      for (var k2 in data.cmi) {
        if (Object.prototype.hasOwnProperty.call(data.cmi, k2)) {
          cache[k2] = String(data.cmi[k2]);
        }
      }
    }
  });

  function getCached(key) {
    return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : '';
  }

  function setCached(key, value) {
    cache[key] = String(value);
    postToParent({ type: 'lms-set', key: key, value: String(value) });
    return 'true';
  }

  function commit() {
    postToParent({ type: 'lms-commit', cmi: shallowClone(cache) });
    return 'true';
  }

  function shallowClone(obj) {
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    }
    return out;
  }

  // SCORM 1.2
  var api12 = {
    LMSInitialize: function () {
      postToParent({ type: 'lms-init', version: '1.2' });
      return 'true';
    },
    LMSFinish: function () {
      postToParent({ type: 'lms-commit', cmi: shallowClone(cache) });
      postToParent({ type: 'lms-terminate', version: '1.2' });
      return 'true';
    },
    LMSGetValue: function (key) {
      return getCached(String(key));
    },
    LMSSetValue: function (key, value) {
      return setCached(String(key), value);
    },
    LMSCommit: function () {
      return commit();
    },
    LMSGetLastError: function () {
      return lastError;
    },
    LMSGetErrorString: function () {
      return 'No error';
    },
    LMSGetDiagnostic: function () {
      return 'No diagnostic';
    },
  };

  // SCORM 2004
  var api2004 = {
    Initialize: function () {
      postToParent({ type: 'lms-init', version: '2004' });
      return 'true';
    },
    Terminate: function () {
      postToParent({ type: 'lms-commit', cmi: shallowClone(cache) });
      postToParent({ type: 'lms-terminate', version: '2004' });
      return 'true';
    },
    GetValue: function (key) {
      return getCached(String(key));
    },
    SetValue: function (key, value) {
      return setCached(String(key), value);
    },
    Commit: function () {
      return commit();
    },
    GetLastError: function () {
      return lastError;
    },
    GetErrorString: function () {
      return 'No error';
    },
    GetDiagnostic: function () {
      return 'No diagnostic';
    },
  };

  window.API = api12;
  window.API_1484_11 = api2004;

  postToParent({ type: 'shim-ready' });
})();
