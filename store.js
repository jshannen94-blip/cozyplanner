/* Cozy Planner — shared store (localStorage) */
(function (w) {
  'use strict';

  var CATS = [
    { name: 'To-do', color: '#b08b90' },
    { name: 'Grocery', color: '#84a08d' },
    { name: 'Idea', color: '#a89878' },
    { name: 'Goal', color: '#9689a8' }
  ];
  var CALENDARS = [
    { id: 'jshannen94@gmail.com', color: '#b08b90', priority: 1 },
    { id: 'zachjonespp46@gmail.com', color: '#7d94a8', priority: 2 },
    { id: 'family16142968416040620456@group.calendar.google.com', color: '#a89878', priority: 2 },
    { id: 'xoshannen94@gmail.com', color: '#8a8a8f', priority: 3 }
  ];

  function readLS(k, f) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function t12(s) {
    if (!s) return '';
    var h = +s.slice(0, 2), m = s.slice(3), ap = h < 12 ? 'am' : 'pm';
    h = h % 12; if (h === 0) h = 12;
    return h + (m === '00' ? '' : ':' + m) + ap;
  }
  function clock12(d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h < 12 ? 'AM' : 'PM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + pad(m) + ' ' + ap;
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {} }

  /* ---- tasks ---- */
  function now() { return Date.now(); }
  function deviceId() {
    var d = readLS('device_id', null);
    if (!d) { d = 'd' + Math.random().toString(36).slice(2, 9); writeLS('device_id', d); }
    return d;
  }
  function tombstones() { return readLS('deleted_v1', {}); }
  function tomb(id) { var t = tombstones(); t[id] = now(); writeLS('deleted_v1', t); }

  function tasks() { return readLS('tasks_v2', []); }
  function saveTasks(list) { writeLS('tasks_v2', list); Sync.push(); }
  function addTask(text, cat) {
    if (!text || !text.trim()) return tasks();
    var list = tasks().concat({ id: deviceId() + '-' + now(), text: text.trim(), cat: cat || 'To-do', done: false, updatedAt: now() });
    saveTasks(list); return list;
  }
  function toggleTask(id) {
    var list = tasks().map(function (t) { return t.id === id ? Object.assign({}, t, { done: !t.done, updatedAt: now() }) : t; });
    saveTasks(list); return list;
  }
  function removeTask(id) {
    tomb(id);
    var list = tasks().filter(function (t) { return t.id !== id; });
    saveTasks(list); return list;
  }
  function catColor(name) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].name === name) return CATS[i].color;
    return '#b08b90';
  }

  /* ---- local events ---- */
  function localEvents() { return readLS('local_events_v3', []); }
  function saveLocalEvents(list) {
    writeLS('local_events_v3', list.map(function (e) { return e.updatedAt ? e : Object.assign({}, e, { updatedAt: now() }); }));
    Sync.push();
  }
  function removeLocalEvent(id) {
    tomb(id);
    var list = localEvents().filter(function (e) { return e.id !== id; });
    writeLS('local_events_v3', list); Sync.push(); return list;
  }

  /* ---- holidays ---- */
  var HOL = {};
  function nthDow(y, m, dow, n) { var f = new Date(y, m, 1); return new Date(y, m, 1 + ((dow - f.getDay() + 7) % 7) + (n - 1) * 7); }
  function lastDow(y, m, dow) { var l = new Date(y, m + 1, 0); return new Date(y, m, l.getDate() - ((l.getDay() - dow + 7) % 7)); }
  function easter(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  function holidayMap(year) {
    if (HOL[year]) return HOL[year];
    var E = easter(year), map = {};
    function put(date, name) { var k = dayKey(date); (map[k] = map[k] || []).push(name); }
    function off(n) { return addDays(E, n); }
    put(new Date(year, 0, 1), "New Year's Day");
    put(new Date(year, 0, 6), 'Epiphany');
    put(nthDow(year, 0, 1, 3), 'Martin Luther King Jr. Day');
    put(nthDow(year, 1, 1, 3), "Presidents' Day");
    put(new Date(year, 1, 14), "Valentine's Day");
    put(off(-46), 'Ash Wednesday');
    put(off(-7), 'Palm Sunday');
    put(off(-2), 'Good Friday');
    put(off(-1), 'Holy Saturday');
    put(E, 'Easter Sunday');
    put(off(1), 'Easter Monday');
    put(nthDow(year, 4, 0, 2), "Mother's Day");
    put(lastDow(year, 4, 1), 'Memorial Day');
    put(off(49), 'Pentecost');
    put(nthDow(year, 5, 0, 3), "Father's Day");
    put(new Date(year, 5, 19), 'Juneteenth');
    put(new Date(year, 6, 4), 'Independence Day');
    put(nthDow(year, 8, 1, 1), 'Labor Day');
    put(nthDow(year, 9, 1, 2), 'Columbus Day');
    put(new Date(year, 9, 31), 'Halloween');
    put(new Date(year, 10, 1), "All Saints' Day");
    put(new Date(year, 10, 11), 'Veterans Day');
    put(nthDow(year, 10, 4, 4), 'Thanksgiving');
    put(new Date(year, 11, 24), 'Christmas Eve');
    put(new Date(year, 11, 25), 'Christmas Day');
    put(new Date(year, 11, 31), "New Year's Eve");
    HOL[year] = map;
    return map;
  }

  /* ---- google calendar (JSONP) ---- */
  function apiKey() { try { return localStorage.getItem('gcal_api_key') || ''; } catch (e) { return ''; } }
  function setApiKey(k) { try { localStorage.setItem('gcal_api_key', k); } catch (e) {} }

  function fetchCalendarJSONP(calId, color, priority, timeMin, timeMax) {
    return new Promise(function (resolve) {
      var cbName = 'gcal_cb_' + Math.random().toString(36).slice(2);
      var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events'
        + '?key=' + apiKey() + '&timeMin=' + encodeURIComponent(timeMin) + '&timeMax=' + encodeURIComponent(timeMax)
        + '&singleEvents=true&orderBy=startTime&maxResults=50&callback=' + cbName;
      var script = document.createElement('script');
      var timeout = setTimeout(function () {
        window[cbName] = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve([]);
      }, 8000);
      window[cbName] = function (data) {
        clearTimeout(timeout);
        window[cbName] = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(((data && data.items) ? data.items : []).map(function (item) {
          item._color = color; item._calPriority = priority; return item;
        }));
      };
      script.src = url;
      script.onerror = function () { clearTimeout(timeout); window[cbName] = null; resolve([]); };
      document.head.appendChild(script);
    });
  }

  function normalizeGoogle(item) {
    var s = item.start || {};
    if (!s.date && !s.dateTime) return null;
    var allDay = !!s.date, d;
    if (allDay) { var p = s.date.split('-'); d = new Date(+p[0], +p[1] - 1, +p[2]); }
    else d = new Date(s.dateTime);
    return {
      id: item.id || (item.summary + (s.date || s.dateTime)),
      title: item.summary || 'Untitled',
      allDay: allDay,
      startTime: allDay ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes()),
      sort: allDay ? -1 : d.getHours() * 60 + d.getMinutes(),
      color: item._color || '#7d94a8',
      priority: item._calPriority == null ? 3 : item._calPriority,
      source: 'google',
      dayKey: dayKey(d)
    };
  }

  var GCAL = {};
  function hydrateCache() {
    var base = new Date();
    for (var i = -35; i <= 45; i++) {
      var k = dayKey(addDays(base, i));
      var c = readLS('cal_' + k, null);
      if (c) GCAL[k] = c;
    }
  }
  var gcalReport = { state: 'idle', fetched: 0, cached: 0, at: 0, perCal: [] };
  function gcalStatus() {
    var cached = 0;
    Object.keys(GCAL).forEach(function (k) { cached += (GCAL[k] || []).length; });
    gcalReport.cached = cached;
    return gcalReport;
  }

  function syncRange(cursor, done) {
    if (!apiKey()) { gcalReport.state = 'no key'; if (done) done(); return; }
    gcalReport.state = 'fetching';
    var from = addDays(new Date(cursor.getFullYear(), cursor.getMonth(), 1), -10);
    var to = addDays(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), 12);
    Promise.all(CALENDARS.map(function (cal) {
      return fetchCalendarJSONP(cal.id, cal.color, cal.priority, from.toISOString(), to.toISOString());
    })).then(function (batches) {
      var touched = {}, total = 0;
      gcalReport.perCal = batches.map(function (b, i) {
        total += b.length;
        return { id: CALENDARS[i].id.split('@')[0], n: b.length };
      });
      gcalReport.fetched = total;
      gcalReport.state = total ? 'ok' : 'empty';
      gcalReport.at = Date.now();
      batches.forEach(function (items) {
        items.forEach(function (item) {
          var ev = normalizeGoogle(item);
          if (!ev) return;
          var k = ev.dayKey;
          if (!touched[k]) { touched[k] = true; GCAL[k] = (GCAL[k] || []).filter(function (e) { return e.source !== 'google'; }); }
          GCAL[k] = (GCAL[k] || []).concat(ev);
        });
      });
      Object.keys(touched).forEach(function (k) { writeLS('cal_' + k, GCAL[k]); });
      if (done) done();
    });
  }

  function hiddenList() { return readLS('hidden_events_v1', []); }
  function evKey(e) { return e.source + '|' + (e.title || '') + '|' + e.dayKey + '|' + (e.startTime || ''); }
  function toggleHidden(k) {
    var h = hiddenList();
    h = h.indexOf(k) === -1 ? h.concat(k) : h.filter(function (x) { return x !== k; });
    writeLS('hidden_events_v1', h); Sync.push(); return h;
  }
  function prefs() { return readLS('cozy_prefs', {}); }
  function savePrefs(p) { writeLS('cozy_prefs', p); Sync.push(); }

  function localFor(date) {
    var key = dayKey(date), out = [];
    localEvents().forEach(function (ev) {
      if ((ev.exceptions || []).indexOf(key) !== -1) return;
      var p = String(ev.date || '').split('-');
      if (p.length !== 3) return;
      var base = new Date(+p[0], +p[1] - 1, +p[2]);
      if (date < new Date(base.getFullYear(), base.getMonth(), base.getDate())) return;
      var rep = ev.repeat || 'none', hit = false;
      if (rep === 'none') hit = sameDay(base, date);
      else if (rep === 'daily') hit = true;
      else if (rep === 'weekly') hit = base.getDay() === date.getDay();
      else if (rep === 'monthly') hit = base.getDate() === date.getDate();
      if (!hit) return;
      out.push({
        id: ev.id + '-' + key, title: ev.title, allDay: !ev.time, startTime: ev.time || '',
        sort: ev.time ? (+ev.time.slice(0, 2)) * 60 + (+ev.time.slice(3)) : -1,
        color: ev.color || '#b08b90', priority: 1, source: 'local', dayKey: key
      });
    });
    return out;
  }

  function eventsFor(date, opts) {
    opts = opts || {};
    var key = dayKey(date), list = [];
    if (prefs().showHolidays !== false) {
      (holidayMap(date.getFullYear())[key] || []).forEach(function (n, i) {
        list.push({ id: 'hol-' + key + '-' + i, title: n, allDay: true, startTime: '', sort: -1, color: '#8a8a8f', priority: 0, source: 'holiday', dayKey: key });
      });
    }
    var g = GCAL[key];
    if (g && g.length) list = list.concat(g);
    list = list.concat(localFor(date));
    var seen = {};
    list = list.filter(function (e) {
      var k = (e.title || '').toLowerCase() + '|' + e.startTime;
      if (seen[k]) return false; seen[k] = true; return true;
    });
    if (!opts.includeHidden) {
      var hid = hiddenList();
      list = list.filter(function (e) { return hid.indexOf(evKey(e)) === -1; });
    }
    list.sort(function (a, b) {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      if (a.allDay) return a.priority - b.priority;
      return a.sort - b.sort;
    });
    return list;
  }

  /* ---- Supabase sync ---- */
  var Sync = (function () {
    var timer = null, running = false;
    var listeners = [];

    function cfg() {
      var c = readLS('sync_cfg_v1', { provider: 'supabase', url: '', key: '', code: '' });
      if (!c.provider) c.provider = 'supabase';
      return c;
    }
    function saveCfg(c) { writeLS('sync_cfg_v1', c); }
    function on() {
      var c = cfg();
      if (c.provider === 'jsonblob') return !!c.url;
      return c.provider === 'jsonbin' ? !!(c.url && c.key) : !!(c.url && c.key && c.code);
    }
    function status() { return readLS('sync_status_v1', { state: 'off', at: 0, msg: '' }); }
    function setStatus(state, msg) {
      writeLS('sync_status_v1', { state: state, at: now(), msg: msg || '' });
      listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    function onChange(fn) { listeners.push(fn); }

    function endpoint(c, qs) {
      return c.url.replace(/\/+$/, '') + '/rest/v1/planner' + (qs || '');
    }
    function headers(c, extra) {
      var h = { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' };
      if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
      return h;
    }

    function snapshot() {
      return {
        tasks: tasks(),
        events: localEvents(),
        hidden: readLS('hidden_events_v1', []),
        prefs: readLS('cozy_prefs', {}),
        deleted: tombstones(),
        at: now()
      };
    }

    function mergeList(mine, theirs, deleted) {
      var byId = {};
      (mine || []).concat(theirs || []).forEach(function (item) {
        if (!item || !item.id) return;
        var cur = byId[item.id];
        if (!cur || (item.updatedAt || 0) >= (cur.updatedAt || 0)) byId[item.id] = item;
      });
      return Object.keys(byId)
        .filter(function (id) { return !(deleted[id] && deleted[id] >= (byId[id].updatedAt || 0)); })
        .map(function (id) { return byId[id]; });
    }

    function merge(remote) {
      var mine = snapshot();
      if (!remote) return mine;
      var deleted = Object.assign({}, remote.deleted || {}, mine.deleted || {});
      Object.keys(remote.deleted || {}).forEach(function (id) {
        deleted[id] = Math.max(deleted[id] || 0, remote.deleted[id]);
      });
      return {
        tasks: mergeList(mine.tasks, remote.tasks, deleted),
        events: mergeList(mine.events, remote.events, deleted),
        hidden: Array.from(new Set((mine.hidden || []).concat(remote.hidden || []))),
        prefs: (remote.at || 0) > (mine.at || 0) ? Object.assign({}, mine.prefs, remote.prefs) : Object.assign({}, remote.prefs, mine.prefs),
        deleted: deleted,
        at: now()
      };
    }

    function applyLocal(data) {
      writeLS('tasks_v2', data.tasks || []);
      writeLS('local_events_v3', data.events || []);
      writeLS('hidden_events_v1', data.hidden || []);
      writeLS('cozy_prefs', data.prefs || {});
      writeLS('deleted_v1', data.deleted || {});
    }

    function binUrl(c) {
      return 'https://api.jsonbin.io/v3/b/' + String(c.url).trim().replace(/^.*\//, '');
    }
    function binHeaders(c, forWrite) {
      var h = { 'X-Master-Key': String(c.key).trim() };
      if (forWrite) h['Content-Type'] = 'application/json';
      else h['X-Bin-Meta'] = 'false';
      return h;
    }

    var BLOB = 'https://jsonblob.com/api/jsonBlob';
    var KV = 'https://kvdb.io';
    function blobId(c) { return String(c.url || '').trim().replace(/^.*\//, ''); }
    function isKv(id) { return !/^\d+$/.test(id); }
    function kvUrl(id) { return KV + '/' + id + '/planner'; }

    function saveStoreId(id) {
      var c = cfg();
      c.provider = 'jsonblob';
      c.url = id;
      saveCfg(c);
      setStatus('ok');
      return id;
    }

    function makeKv() {
      return fetch(KV + '/', { method: 'POST', mode: 'cors', body: '' })
        .then(function (r) {
          if (!r.ok) throw new Error('kvdb ' + r.status);
          return r.text();
        })
        .then(function (id) {
          id = (id || '').trim();
          if (!id) throw new Error('kvdb gave no id');
          return fetch(kvUrl(id), { method: 'PUT', mode: 'cors', body: JSON.stringify(snapshot()) })
            .then(function () { return saveStoreId(id); });
        });
    }

    function makeBlob() {
      return fetch(BLOB, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(snapshot())
      }).then(function (r) {
        var loc = r.headers.get('Location') || r.headers.get('location') || '';
        var id = loc.replace(/^.*\//, '');
        if (!r.ok || !id) throw new Error('Could not create a store (' + r.status + ')');
        return saveStoreId(id);
      });
    }

    function createBlob() {
      return makeKv().catch(function () { return makeBlob(); });
    }

    function pull() {
      var c = cfg();
      if (!on()) return Promise.resolve(null);
      if (c.provider === 'jsonblob') {
        var rid = blobId(c);
        var rurl = isKv(rid) ? kvUrl(rid) + '?t=' + Date.now() : BLOB + '/' + rid;
        return fetch(rurl, { method: 'GET', mode: 'cors', cache: 'no-store' })
          .then(function (r) {
            if (r.status === 404) return null;
            if (!r.ok) throw new Error('Read failed (' + r.status + ')');
            return r.text();
          })
          .then(function (d) {
            if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
            return d && (d.tasks || d.events) ? d : null;
          });
      }
      if (c.provider === 'jsonbin') {
        var unwrap = function (d) { return d && d.record ? d.record : d; };
        var readWith = function (hdrs) {
          return fetch(binUrl(c) + '/latest', { method: 'GET', headers: hdrs, mode: 'cors', cache: 'no-store' })
            .then(function (r) {
              if (r.status === 404) return null;
              if (!r.ok) return r.text().then(function (t) { throw new Error('Read failed (' + r.status + ') ' + t.slice(0, 80)); });
              return r.json();
            });
        };
        return readWith({ 'X-Master-Key': String(c.key).trim(), 'X-Bin-Meta': 'false' })
          .catch(function (e) {
            if ((e.message || '').indexOf('Failed to fetch') === -1) throw e;
            return readWith({ 'X-Master-Key': String(c.key).trim() });   // fewer headers = simpler preflight
          })
          .catch(function (e) {
            if ((e.message || '').indexOf('Failed to fetch') === -1) throw e;
            return readWith({ 'X-Access-Key': String(c.key).trim() });   // access-key style
          })
          .then(unwrap)
          .then(function (d) { return d && d.tasks ? d : null; });
      }
      return fetch(endpoint(c, '?code=eq.' + encodeURIComponent(c.code) + '&select=data'), { headers: headers(c) })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (rows) { return rows && rows[0] ? rows[0].data : null; });
    }

    function put(data) {
      var c = cfg();
      if (c.provider === 'jsonblob') {
        var wid = blobId(c);
        var kv = isKv(wid);
        return fetch(kv ? kvUrl(wid) : BLOB + '/' + wid, {
          method: 'PUT',
          mode: 'cors',
          headers: kv ? {} : { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error('Write failed (' + r.status + ')');
        });
      }
      if (c.provider === 'jsonbin') {
        return fetch(binUrl(c), {
          method: 'PUT',
          mode: 'cors',
          headers: binHeaders(c, true),
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) return r.text().then(function (t) { throw new Error('Write failed (' + r.status + ') ' + t.slice(0, 80)); });
        });
      }
      return fetch(endpoint(c), {
        method: 'POST',
        headers: headers(c, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({ code: c.code, data: data, updated_at: new Date().toISOString() })
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 120)); });
      });
    }

    function run() {
      if (!on() || running) return Promise.resolve();
      running = true;
      setStatus('syncing');
      return pull()
        .catch(function (e) {
          setStatus('error', (e.message || 'Could not read') + ' — sending local copy anyway');
          return null;
        })
        .then(function (remote) {
          var merged = merge(remote);
          applyLocal(merged);
          return put(merged);
        })
        .then(function () { setStatus('ok'); })
        .catch(function (e) {
          var m = e.message || '';
          if (m.indexOf('Failed to fetch') !== -1) {
            m = 'Blocked before reaching the sync server. Usually a stale service worker or an ad/tracker blocker. Reload once, then try again.';
          }
          setStatus('error', m || 'Sync failed');
        })
        .then(function () { running = false; });
    }

    function push() {
      if (!on()) return;
      clearTimeout(timer);
      timer = setTimeout(run, 900);
    }

    function start() {
      if (!on()) { setStatus('off'); return; }
      run();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) run(); });
      window.addEventListener('focus', run);
      setInterval(run, 60000);
    }

    return { cfg: cfg, saveCfg: saveCfg, on: on, status: status, onChange: onChange, run: run, push: push, start: start, snapshot: snapshot, createBlob: createBlob };
  })();

  /* ---- keeps "today" honest across sleeps and long-open tabs ---- */
  function watchDayChange(onNewDay) {
    var current = dayKey(new Date());
    function check() {
      var k = dayKey(new Date());
      if (k !== current) { current = k; onNewDay(); }
    }
    setInterval(check, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
  }

  w.Store = {
    CATS: CATS, CALENDARS: CALENDARS,
    readLS: readLS, writeLS: writeLS,
    pad: pad, dayKey: dayKey, addDays: addDays, sameDay: sameDay, isoDate: isoDate,
    esc: esc, t12: t12, clock12: clock12, buzz: buzz,
    tasks: tasks, saveTasks: saveTasks, addTask: addTask, toggleTask: toggleTask, removeTask: removeTask, catColor: catColor,
    localEvents: localEvents, saveLocalEvents: saveLocalEvents, removeLocalEvent: removeLocalEvent,
    Sync: Sync, deviceId: deviceId,
    apiKey: apiKey, setApiKey: setApiKey,
    hydrateCache: hydrateCache, syncRange: syncRange, gcalStatus: gcalStatus,
    clearCalCache: function () {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('cal_') === 0) localStorage.removeItem(k); });
      } catch (e) {}
      Object.keys(GCAL).forEach(function (k) { delete GCAL[k]; });
    },
    eventsFor: eventsFor, evKey: evKey, hiddenList: hiddenList, toggleHidden: toggleHidden,
    prefs: prefs, savePrefs: savePrefs,
    watchDayChange: watchDayChange
  };
})(window);
