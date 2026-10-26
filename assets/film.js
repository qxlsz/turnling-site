/* turnling film: an animated explainer of "Attributing Subagent Work in
   Coding-Agent Protocol Adapters". Hand-drawn from the paper; it does not run
   an adapter. The squares in the results scene are the 956 schedules of
   Table I's first three Codex rows: one square per schedule, coloured from
   the final Turnstile runs (original, start-time and dispatch-time builds);
   the CELLS line is generated from the runs' verdict indexes by gen_cells.py.
   Every frame is a pure function of time, so the film can be scrubbed. */
(function () {
  'use strict';
  var FW = 1600, FH = 900;   // frame size in world units; portrait uses 560 x 960
  // ---------- math, easing, time windows ----------
  function clamp(x, a, b) { if (a === undefined) { a = 0; b = 1; } return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var E = {
    lin: function (t) { return t; },
    io: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    out5: function (t) { return 1 - Math.pow(1 - t, 5); },
    inn: function (t) { return t * t * t; },
    back: function (t) { if (t <= 0) return 0; if (t >= 1) return 1; var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    spring: function (t) { return t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(11 * t); },
    sine: function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }
  };
  // Eased progress of t through [a, b].
  function P(t, a, b, e) { return (e || E.io)(clamp((t - a) / (b - a))); }
  // Fade in over [a, b], hold, fade out over [c, d].
  function win(t, a, b, c, d) {
    if (t <= a || (d !== undefined && t >= d)) return 0;
    if (t < b) return E.sine((t - a) / (b - a));
    if (d === undefined || t <= c) return 1;
    return 1 - E.sine((t - c) / (d - c));
  }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mixHex(h1, h2, t) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // ---------- palette and type ----------
  var C = {
    bg0: '#06080d', bg1: '#111726',
    card: '#121826', card2: '#171e2e', line: '#2a3245', line2: '#3a4459',
    ink: '#eef1f6', ink2: '#aeb6c6', ink3: '#737c90', ink4: '#454d60',
    A: '#6d9cff', B: '#2fd1ae', mis: '#ff5468', miss: '#f2b544', ok: '#3b4458', okHi: '#56617a', white: '#ffffff'
  };
  var SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif';
  var MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  // ---------- drawing state ----------
  var X = null;   // 2D context
  var SA = 1;     // scene alpha (transitions)
  var PORT = false;
  function alpha(a) { X.globalAlpha = clamp(a) * SA; }
  function font(sz, w, mono) { X.font = (w || 500) + ' ' + sz + 'px ' + (mono ? MONO : SANS); }
  function tw(s, sz, w, mono) { font(sz, w, mono); return X.measureText(s).width; }
  function txt(s, x, y, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a;
    if (a <= 0.004 || !s) return;
    font(o.sz || 20, o.w || 500, o.mono);
    X.fillStyle = o.c || C.ink;
    X.textAlign = o.al || 'left';
    X.textBaseline = o.bl || 'middle';
    alpha(a);
    X.fillText(s, x, y);
  }
  function wrap(s, maxW, sz, w) {
    var words = s.split(' '), lines = [], cur = '';
    font(sz, w);
    for (var i = 0; i < words.length; i++) {
      var tryS = cur ? cur + ' ' + words[i] : words[i];
      if (X.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = tryS;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function para(s, x, y, maxW, o) {
    o = o || {};
    var sz = o.sz || 20, lh = o.lh || sz * 1.35;
    var lines = wrap(s, maxW, sz, o.w || 500);
    for (var i = 0; i < lines.length; i++) txt(lines[i], x, y + i * lh, o);
    return lines.length * lh;
  }
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    X.beginPath();
    X.moveTo(x + r, y);
    X.arcTo(x + w, y, x + w, y + h, r);
    X.arcTo(x + w, y + h, x, y + h, r);
    X.arcTo(x, y + h, x, y, r);
    X.arcTo(x, y, x + w, y, r);
    X.closePath();
  }
  function fillRR(x, y, w, h, r, c, a) { if (a <= 0.004) return; rr(x, y, w, h, r); X.fillStyle = c; alpha(a === undefined ? 1 : a); X.fill(); }
  function strokeRR(x, y, w, h, r, c, lw, a, dash) {
    if (a <= 0.004) return;
    rr(x, y, w, h, r); X.strokeStyle = c; X.lineWidth = lw || 1; alpha(a === undefined ? 1 : a);
    if (dash) X.setLineDash(dash);
    X.stroke();
    if (dash) X.setLineDash([]);
  }
  function circle(x, y, r, c, a) { if (a <= 0.004 || r <= 0) return; X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fillStyle = c; alpha(a === undefined ? 1 : a); X.fill(); }
  function ring(x, y, r, c, lw, a, dash) {
    if (a <= 0.004 || r <= 0) return;
    X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.strokeStyle = c; X.lineWidth = lw || 1; alpha(a === undefined ? 1 : a);
    if (dash) X.setLineDash(dash);
    X.stroke();
    if (dash) X.setLineDash([]);
  }
  function arc(x, y, r, a0, a1, c, lw, a) {
    if (a <= 0.004) return;
    X.beginPath(); X.arc(x, y, r, a0, a1); X.strokeStyle = c; X.lineWidth = lw; X.lineCap = 'round'; alpha(a); X.stroke(); X.lineCap = 'butt';
  }
  function line(x1, y1, x2, y2, c, lw, a, dash) {
    if (a <= 0.004) return;
    X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2);
    X.strokeStyle = c; X.lineWidth = lw || 1; X.lineCap = 'round'; alpha(a === undefined ? 1 : a);
    if (dash) X.setLineDash(dash);
    X.stroke();
    if (dash) X.setLineDash([]);
    X.lineCap = 'butt';
  }

  // ---------- glow sprites ----------
  var glowCache = {};
  function glowSprite(c) {
    if (glowCache[c]) return glowCache[c];
    var s = document.createElement('canvas'); s.width = s.height = 128;
    var g = s.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.22, rgba(c, 0.55)); gr.addColorStop(0.5, rgba(c, 0.16)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowCache[c] = s;
    return s;
  }
  function glow(x, y, r, c, a) {
    if (a <= 0.004 || r <= 0) return;
    var prev = X.globalCompositeOperation;
    X.globalCompositeOperation = 'lighter';
    alpha(a);
    X.drawImage(glowSprite(c), x - r, y - r, r * 2, r * 2);
    X.globalCompositeOperation = prev;
  }

  // ---------- paths ----------
  function Path(pts) {
    this.p = pts; this.L = [0];
    for (var i = 1; i < pts.length; i++) this.L.push(this.L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.total = this.L[this.L.length - 1] || 1;
  }
  Path.prototype.at = function (u) {
    u = clamp(u); var d = u * this.total, L = this.L, lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (L[m] < d) lo = m; else hi = m; }
    var seg = (L[hi] - L[lo]) || 1, k = (d - L[lo]) / seg, a = this.p[lo], b = this.p[hi];
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  function cub(p0, p1, p2, p3, n) {
    var out = [];
    n = n || 40;
    for (var i = 0; i <= n; i++) {
      var t = i / n, m = 1 - t;
      out.push([m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
                m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  function seg(a, b, n) { var out = []; n = n || 8; for (var i = 0; i <= n; i++) out.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); return out; }
  function join() { var out = []; for (var i = 0; i < arguments.length; i++) { var s = arguments[i]; for (var j = (out.length ? 1 : 0); j < s.length; j++) out.push(s[j]); } return new Path(out); }
  function strokePath(path, u0, u1, c, lw, a, dash) {
    if (a <= 0.004 || u1 <= u0) return;
    var p0 = path.at(u0);
    X.beginPath(); X.moveTo(p0.x, p0.y);
    var d0 = u0 * path.total, d1 = u1 * path.total;
    for (var i = 1; i < path.p.length; i++) { if (path.L[i] > d0 && path.L[i] < d1) X.lineTo(path.p[i][0], path.p[i][1]); }
    var p1 = path.at(u1); X.lineTo(p1.x, p1.y);
    X.strokeStyle = c; X.lineWidth = lw || 1; X.lineCap = 'round'; X.lineJoin = 'round'; alpha(a);
    if (dash) X.setLineDash(dash);
    X.stroke();
    if (dash) X.setLineDash([]);
    X.lineCap = 'butt';
  }

  // A glowing message travelling a path, with a fading trail and an optional label.
  function comet(path, u, c, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a, r = o.r || 7;
    if (u <= 0 || a <= 0.004) return;
    if (u >= 1 && !o.keep) return;
    var span = (o.trail || 110) / path.total;
    for (var k = 9; k >= 1; k--) {
      var uu = u - span * k / 9;
      if (uu <= 0) continue;
      var q = path.at(uu);
      glow(q.x, q.y, r * 2.4 * (1 - k / 11), c, 0.32 * (1 - k / 10) * a);
    }
    var p = path.at(Math.min(u, 1));
    glow(p.x, p.y, r * 4.2, c, 0.55 * a);
    circle(p.x, p.y, r * 0.62, '#ffffff', a);
    if (o.label) tag(o.label, p.x + (o.lx || 0), p.y + (o.ly === undefined ? -26 : o.ly), c, a * (o.la === undefined ? 1 : o.la));
  }
  function tag(s, x, y, c, a, o) {
    o = o || {};
    if (a <= 0.004) return;
    var sz = o.sz || 16, w = tw(s, sz, 600, o.mono) + 18, h = sz + 12;
    fillRR(x - w / 2, y - h / 2, w, h, h / 2, C.bg0, 0.88 * a);
    strokeRR(x - w / 2, y - h / 2, w, h, h / 2, c, 1.2, 0.85 * a);
    txt(s, x, y + 0.5, { sz: sz, w: 600, c: o.tc || C.ink, al: 'center', a: a, mono: o.mono });
  }

  // ---------- reusable objects ----------
  function panel(x, y, w, h, title, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a;
    if (a <= 0.004) return;
    fillRR(x, y, w, h, 18, o.fill || C.card, 0.92 * a);
    strokeRR(x, y, w, h, 18, o.stroke || C.line, o.lw || 1.2, a);
    if (o.hi) { strokeRR(x, y, w, h, 18, o.hi, 2, a * (o.hiA === undefined ? 1 : o.hiA)); }
    if (title) txt(title, x + 24, y + 34, { sz: o.tsz || 22, w: 650, c: C.ink, a: a });
    if (o.sub) txt(o.sub, x + 24, y + 62, { sz: 15, w: 500, c: C.ink3, a: a });
  }
  // A request token: a coloured disc with its letter.
  function token(x, y, letter, c, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a, r = (o.r || 17) * (o.s === undefined ? 1 : o.s);
    if (a <= 0.004 || r <= 0) return;
    if (o.glow) glow(x, y, r * 3, c, 0.45 * a * o.glow);
    circle(x, y, r, c, a * (o.dim ? 0.35 : 1));
    txt(letter, x, y + 1, { sz: r * 1.05, w: 750, c: o.dim ? C.ink2 : C.bg0, al: 'center', a: a });
  }
  // A document glyph whose colour shows who the edit was made for.
  function docIcon(x, y, c, a, s) {
    s = s || 1;
    var w = 15 * s, h = 19 * s, f = 5 * s;
    X.beginPath();
    X.moveTo(x - w / 2, y - h / 2); X.lineTo(x + w / 2 - f, y - h / 2); X.lineTo(x + w / 2, y - h / 2 + f); X.lineTo(x + w / 2, y + h / 2); X.lineTo(x - w / 2, y + h / 2); X.closePath();
    X.fillStyle = c; alpha(a); X.fill();
    X.beginPath(); X.moveTo(x + w / 2 - f, y - h / 2); X.lineTo(x + w / 2 - f, y - h / 2 + f); X.lineTo(x + w / 2, y - h / 2 + f);
    X.strokeStyle = 'rgba(0,0,0,.45)'; X.lineWidth = 1.2; X.stroke();
  }
  // A file chip: icon colour = who it was made for; outline and corner tag = whose report it is in.
  function fileChip(x, y, name, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a, s = o.s === undefined ? 1 : o.s;
    if (a <= 0.004 || s <= 0.01) return;
    var sz = o.sz || 19, w = tw(name, sz, 600, true) + 48, h = sz + 20;
    var bad = o.bad || 0;
    var sx = bad > 0 && bad < 1 ? Math.sin(bad * 40) * 5 * (1 - bad) : 0;
    X.save();
    X.translate(x + sx, y); X.scale(s, s);
    if (o.glow) glow(0, 0, w * 0.8, o.glowC || o.truth || C.ink2, 0.35 * o.glow * a);
    if (bad > 0) glow(0, 0, w * 0.9, C.mis, 0.5 * a * Math.min(1, bad * 2));
    fillRR(-w / 2, -h / 2, w, h, 10, C.card2, a);
    var sc = bad > 0 ? mixHex(o.stamp || C.line2, C.mis, Math.min(1, bad * 2)) : (o.stamp || C.line2);
    strokeRR(-w / 2, -h / 2, w, h, 10, sc, o.stamp || bad ? 2.4 : 1.3, a);
    docIcon(-w / 2 + 18, 0, o.truth || C.ink3, a, sz / 19);
    txt(name, -w / 2 + 32, 1, { sz: sz, w: 600, mono: true, c: C.ink, a: a });
    if (o.tag && o.tagA > 0) {
      var ts = o.tagA;
      token(w / 2 - 2, -h / 2 + 1, o.tag, o.stamp || C.ink2, { r: 11, s: E.back(Math.min(1, ts)), a: a });
    }
    if (bad >= 1 && o.cross !== false) {
      circle(-w / 2 - 2, -h / 2 + 1, 11, C.mis, a);
      line(-w / 2 - 6, -h / 2 - 3, -w / 2 + 2, -h / 2 + 5, C.bg0, 2.4, a);
      line(-w / 2 + 2, -h / 2 - 3, -w / 2 - 6, -h / 2 + 5, C.bg0, 2.4, a);
    }
    X.restore();
    return w * s;
  }
  // Split-flap display that flips from one letter to another.
  function flapHalf(cx, cy, w, h, ch, col, top, sy, a, shade) {
    if (Math.abs(sy) < 0.01) return;
    X.save();
    X.translate(cx, cy); X.scale(1, sy);
    X.beginPath(); if (top) X.rect(-w / 2 - 2, -h / 2 - 2, w + 4, h / 2 + 2); else X.rect(-w / 2 - 2, 0, w + 4, h / 2 + 2); X.clip();
    fillRR(-w / 2, -h / 2, w, h, 14, col ? mixHex(C.card2, col, 0.32) : C.card2, a);
    strokeRR(-w / 2, -h / 2, w, h, 14, col || C.line2, 1.6, a);
    txt(ch, 0, h * 0.04, { sz: h * 0.6, w: 760, c: col ? C.white : C.ink4, al: 'center', a: a });
    if (shade) fillRR(-w / 2, -h / 2, w, h, 14, '#000000', shade * a);
    X.restore();
  }
  function flap(cx, cy, w, h, from, to, p, cf, ct, a) {
    if (a <= 0.004) return;
    p = clamp(p);
    if (ct) glow(cx, cy, w * 1.15, ct, 0.28 * a * p);
    if (cf && p < 1) glow(cx, cy, w * 1.15, cf, 0.28 * a * (1 - p));
    flapHalf(cx, cy, w, h, to, ct, true, 1, a, 0);
    flapHalf(cx, cy, w, h, from, cf, false, 1, a, p > 0.5 ? 0 : 0.25 * p);
    if (p < 0.5) flapHalf(cx, cy, w, h, from, cf, true, 1 - 2 * p, a, 0.5 * p);
    else flapHalf(cx, cy, w, h, to, ct, false, 2 * p - 1, a, 0.4 * (1 - p));
    line(cx - w / 2, cy, cx + w / 2, cy, C.bg0, 2.2, a);
  }
  // A rolling-digit counter.
  function odometer(x, y, v, o) {
    o = o || {};
    var sz = o.sz || 72, a = o.a === undefined ? 1 : o.a, c = o.c || C.ink;
    if (a <= 0.004) return;
    var digits = Math.max(1, String(Math.round(Math.max(o.max || v, 1))).length);
    font(sz, 760);
    var dw = X.measureText('0').width * 1.0, h = sz * 1.05;
    var shown = Math.max(1, String(Math.floor(Math.max(v, 0) + 1e-6)).length);
    var total = shown * dw;
    var x0 = o.al === 'right' ? x - total : o.al === 'center' ? x - total / 2 : x;
    X.save();
    X.beginPath(); X.rect(x0 - 4, y - h / 2, total + 8, h); X.clip();
    for (var k = 0; k < shown; k++) {
      var place = shown - 1 - k, q = v / Math.pow(10, place), lo = Math.floor(q + 1e-9), f = q - lo;
      var roll = place === 0 ? (o.smooth ? f : 0) : clamp((f * 10 - 9));
      var d0 = ((lo % 10) + 10) % 10, d1 = (d0 + 1) % 10, dx = x0 + k * dw;
      txt(String(d0), dx, y - roll * h, { sz: sz, w: 760, c: c, a: a, bl: 'middle' });
      if (roll > 0.001) txt(String(d1), dx, y + h - roll * h, { sz: sz, w: 760, c: c, a: a, bl: 'middle' });
    }
    X.restore();
    return total;
  }
  function check(x, y, r, c, a, p) {
    p = p === undefined ? 1 : p;
    if (a <= 0.004) return;
    X.beginPath();
    var pts = [[x - r * 0.45, y + r * 0.02], [x - r * 0.1, y + r * 0.36], [x + r * 0.5, y - r * 0.34]];
    X.moveTo(pts[0][0], pts[0][1]);
    var l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]), d = p * (l1 + l2);
    if (d <= l1) X.lineTo(lerp(pts[0][0], pts[1][0], d / l1), lerp(pts[0][1], pts[1][1], d / l1));
    else { X.lineTo(pts[1][0], pts[1][1]); X.lineTo(lerp(pts[1][0], pts[2][0], (d - l1) / l2), lerp(pts[1][1], pts[2][1], (d - l1) / l2)); }
    X.strokeStyle = c; X.lineWidth = r * 0.2; X.lineCap = 'round'; X.lineJoin = 'round'; alpha(a); X.stroke(); X.lineCap = 'butt';
  }
  function cross(x, y, r, c, a, p) {
    p = p === undefined ? 1 : p;
    if (a <= 0.004) return;
    var q1 = clamp(p * 2), q2 = clamp(p * 2 - 1), k = r * 0.36;
    line(x - k, y - k, x - k + 2 * k * q1, y - k + 2 * k * q1, c, r * 0.2, a);
    if (q2 > 0) line(x + k, y - k, x + k - 2 * k * q2, y - k + 2 * k * q2, c, r * 0.2, a);
  }
  // A verdict lamp: a disc that pops in with a tick or a cross.
  function lamp(x, y, r, bad, p, a, o) {
    o = o || {};
    if (a <= 0.004 || p <= 0) return;
    var s = E.back(clamp(p * 1.6)), c = bad === 'miss' ? C.miss : bad ? C.mis : C.okHi;
    glow(x, y, r * 3 * s, c, (bad ? 0.5 : 0.25) * a);
    circle(x, y, r * s, c, a);
    if (bad) cross(x, y, r * s, C.bg0, a, clamp(p * 2 - 0.4)); else check(x, y, r * s, C.bg0, a, clamp(p * 2 - 0.4));
    if (o.label) txt(o.label, x + (o.lx || 0), y + (o.ly || r + 26), { sz: o.sz || 17, w: 650, c: c === C.okHi ? C.ink2 : c, al: o.al || 'center', a: a * clamp(p * 2 - 0.6) });
  }
  // Chapter heading in the frame's top-left corner.
  function heading(n, title, t, t0, t1) {
    var a = win(t, t0, t0 + 0.6, t1 - 0.5, t1), k = 1 - P(t, t0, t0 + 0.8, E.out5);
    if (a <= 0) return;
    var x = PORT ? 26 : 56, y = PORT ? 40 : 62;
    var gr = X.createLinearGradient(0, 0, 0, y + 46);
    gr.addColorStop(0, rgba(C.bg0, 0.85)); gr.addColorStop(1, rgba(C.bg0, 0));
    alpha(a); X.fillStyle = gr; X.fillRect(0, 0, FW, y + 46);
    ring(x + 16, y, 16, C.ink3, 1.4, a);
    txt(String(n), x + 16, y + 1, { sz: 17, w: 700, c: C.ink2, al: 'center', a: a });
    txt(title, x + 44 + k * 30, y + 1, { sz: PORT ? 22 : 26, w: 700, c: C.ink, a: a });
  }
  // Big centred words that rise in one after another.
  function kinetic(lines, t, t0, o) {
    o = o || {};
    var sz = o.sz || (PORT ? 44 : 74), lh = sz * 1.18, cx = o.x === undefined ? FW / 2 : o.x, cy = o.y === undefined ? FH / 2 : o.y;
    var a0 = o.a === undefined ? 1 : o.a;
    var k = 0, y0 = cy - (lines.length - 1) * lh / 2;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], words = L.s.split(' '), widths = [], sp = tw(' ', sz, 760), total = 0;
      for (var j = 0; j < words.length; j++) { widths.push(tw(words[j], sz, 760)); total += widths[j] + (j ? sp : 0); }
      var x = cx - total / 2;
      for (j = 0; j < words.length; j++) {
        var p = P(t, t0 + k * 0.09, t0 + k * 0.09 + 0.7, E.out5);
        txt(words[j], x, y0 + i * lh + (1 - p) * sz * 0.6, { sz: sz, w: 760, c: L.c || C.ink, a: p * a0 });
        x += widths[j] + sp; k++;
      }
    }
  }
  // ======================================================================
  // Scene 0: the question
  // ======================================================================
  var S0 = (function () {
    var END = 3.8;
    function draw(t) {
      var cx = FW / 2, cy = FH / 2 + (PORT ? 170 : 150);
      var a = win(t, 0.9, 1.4, END - 0.7, END), s = P(t, 0.9, 1.6, E.spring);
      if (a <= 0) return;
      // a subagent's edit, between two requests
      var sw = Math.sin(t * 2.2) * 0.5 + 0.5;
      token(cx - (PORT ? 120 : 170), cy, 'A', C.A, { r: PORT ? 20 : 24, a: a * P(t, 1.2, 1.6), glow: 0.6 + 0.4 * (1 - sw) });
      token(cx + (PORT ? 120 : 170), cy, 'B', C.B, { r: PORT ? 20 : 24, a: a * P(t, 1.3, 1.7), glow: 0.6 + 0.4 * sw });
      line(cx - (PORT ? 92 : 136), cy, cx - (PORT ? 64 : 84), cy, C.A, 2, a * 0.5, [3, 5]);
      line(cx + (PORT ? 64 : 84), cy, cx + (PORT ? 92 : 136), cy, C.B, 2, a * 0.5, [3, 5]);
      X.save(); X.translate(cx, cy); X.scale(1.4, 1.4);
      fileChip(0, 0, 'a.txt', { truth: C.ink3, s: s, a: a, glow: 1, glowC: C.ink2 });
      X.restore();
      txt('?', cx, cy - (PORT ? 52 : 62), { sz: PORT ? 30 : 36, w: 760, c: C.ink2, al: 'center', a: a * P(t, 1.8, 2.2) });
    }
    function over(t) {
      var a = win(t, 0.05, 0.4, END - 0.7, END);
      if (a <= 0) return;
      txt('TURNLING', FW / 2, FH / 2 - (PORT ? 190 : 190), { sz: PORT ? 14 : 16, w: 750, c: C.ink3, al: 'center', a: a * P(t, 0.1, 0.6) });
      kinetic(PORT ? [{ s: 'A subagent outlives' }, { s: 'its request.' }, { s: 'Who gets the credit?', c: C.ink2 }] : [{ s: 'A subagent outlives its request.' }, { s: 'Who gets the credit?', c: C.ink2 }], t, 0.2, { a: a, sz: PORT ? 34 : 58, y: FH / 2 - (PORT ? 80 : 60) });
    }
    return { dur: END, draw: draw, over: over, chapters: [[0, 'The setup']], caps: [[0.1, 'When a subagent outlives the request that started it, which request gets credit for its work?']] };
  })();
  // ======================================================================
  // Scene 1: the setup and the bug (Fig. 1)
  // ======================================================================
  var S1 = (function () {
    var T = {
      promptA: 1.9, sendA: 2.45, flipA: 3.2, fwdA: 3.35, rootA: 4.0,
      spawn: 5.0, spawnMsg: 5.35, cNode: 5.8,
      cancelBtn: 10.15, cancel: 10.4, aEnd: 11.45, aIntMsg: 11.7, repA: 12.5, repAArr: 13.2,
      promptB: 13.9, sendB: 14.35, flipB: 15.05, fwdB: 15.2, rootB: 15.8,
      cStart: 16.6, edit: 18.0, editFly: 18.35, inspect: 19.75, look: 20.0, stamp: 20.9, tray: 21.5,
      bEdit: 22.3, bFly: 22.5, bArr: 23.35, bStamp: 23.55, bTray: 23.85, bEnd: 24.2, repB: 24.8, repBArr: 25.9,
      reveal: 26.7, title: 28.4, end: 32.4
    };
    var cache = {};
    function link(a, b, ax, k) {
      k = k === undefined ? 0.5 : k;
      if (ax === 'h') return cub(a, [lerp(a[0], b[0], k), a[1]], [lerp(b[0], a[0], k), b[1]], b, 36);
      return cub(a, [a[0], lerp(a[1], b[1], k)], [b[0], lerp(b[1], a[1], k)], b, 36);
    }
    function geo() {
      var key = PORT ? 'p' : 'l';
      if (cache[key]) return cache[key];
      var G = PORT ? {
        ED: { x: 24, y: 78, w: 512, h: 236 }, AD: { x: 24, y: 368, w: 512, h: 296 }, CX: { x: 24, y: 718, w: 512, h: 224 },
        pE: [280, 314], pAL: [280, 368], pAR: [280, 664], pC: [280, 718],
        flap: { x: 136, y: 508, w: 100, h: 100 }, flapLbl: [136, 438],
        insp: [136, 618], trayA: { x: 300, y: 392, w: 112, h: 250 }, trayB: { x: 418, y: 392, w: 112, h: 250 },
        slot0: 74, slotH: 50, chipSz: 17,
        rowA: [54, 160], rowB: [54, 230], card: { x: 300, y: 116, w: 214, h: 180 }, cardSlot0: 82, cardSlotH: 50,
        rootY: 800, childY: 884, lx0: 158, lx1: 505, laneX0: 146, laneX1: 520,
        lbl: 'left', lblRoot: [48, 800], lblChild: [48, 884],
        ax: 'v', camAd: { x: 280, y: 520, z: 1.16 }, camEd: { x: 280, y: 214, z: 1.12 }
      } : {
        ED: { x: 60, y: 130, w: 330, h: 660 }, AD: { x: 560, y: 130, w: 400, h: 660 }, CX: { x: 1130, y: 130, w: 410, h: 660 },
        pE: [390, 470], pAL: [560, 470], pAR: [960, 470], pC: [1130, 470],
        flap: { x: 760, y: 300, w: 128, h: 128 }, flapLbl: [760, 210],
        insp: [760, 458], trayA: { x: 582, y: 524, w: 170, h: 246 }, trayB: { x: 768, y: 524, w: 170, h: 246 },
        slot0: 92, slotH: 58, chipSz: 19,
        rowA: [100, 248], rowB: [100, 340], card: { x: 84, y: 416, w: 282, h: 300 }, cardSlot0: 104, cardSlotH: 60,
        rootY: 334, childY: 612, lx0: 1182, lx1: 1500, laneX0: 1160, laneX1: 1516,
        lbl: 'above', lblRoot: [1154, 296], lblChild: [1154, 574],
        ax: 'h', camAd: { x: 760, y: 500, z: 1.55 }, camEd: { x: 226, y: 470, z: 1.5 }
      };
      var ax = G.ax;
      G.xT = function (t) { return lerp(G.lx0, G.lx1, clamp((t - T.rootA) / (26 - T.rootA))); };
      G.flapC = [G.flap.x, G.flap.y];
      G.pillA = [G.rowA[0], G.rowA[1]]; G.pillB = [G.rowB[0], G.rowB[1]];
      G.pathPromptA = join(link(G.pillA, G.pE, ax), seg(G.pE, G.pAL), link(G.pAL, G.flapC, ax));
      G.pathPromptB = join(link(G.pillB, G.pE, ax), seg(G.pE, G.pAL), link(G.pAL, G.flapC, ax));
      G.pathFwdA = join(link(G.flapC, G.pAR, ax), seg(G.pAR, G.pC), link(G.pC, [G.xT(T.rootA), G.rootY], ax));
      G.pathFwdB = join(link(G.flapC, G.pAR, ax), seg(G.pAR, G.pC), link(G.pC, [G.xT(T.rootB), G.rootY], ax));
      G.pathCancel = join(link(G.pillA, G.pE, ax), seg(G.pE, G.pAL), seg(G.pAL, G.pAR), seg(G.pAR, G.pC), link(G.pC, [G.xT(T.aEnd), G.rootY], ax));
      var tA = [G.trayA.x + G.trayA.w / 2, G.trayA.y];
      G.pathRepA = join(link(tA, G.pAL, ax), seg(G.pAL, G.pE), link(G.pE, [G.rowA[0] + 30, G.rowA[1] + 26], ax));
      G.msg = {};
      G.msgPath = function (x, y, to) {
        var k = x.toFixed(0) + ',' + y.toFixed(0) + (to ? 'f' : '');
        if (!G.msg[k]) G.msg[k] = join(link([x, y], G.pC, ax), seg(G.pC, G.pAR), link(G.pAR, to || G.insp, ax));
        return G.msg[k];
      };
      G.slot = function (tray, i) { return [tray.x + tray.w / 2, tray.y + G.slot0 + i * G.slotH]; };
      G.cardSlot = function (i) { return [G.card.x + G.card.w / 2, G.card.y + G.cardSlot0 + i * G.cardSlotH]; };
      G.pathInspToTray = function (i) { return join(link(G.insp, G.slot(G.trayB, i), ax === 'h' ? 'v' : 'h')); };
      G.pathTrayToCard = function (i) {
        var s = G.slot(G.trayB, i), c = G.cardSlot(i);
        return join(link(s, G.pAL, ax), seg(G.pAL, G.pE), link(G.pE, c, ax));
      };
      cache[key] = G;
      return G;
    }

    function cam(t) {
      var G = geo(), F = { x: FW / 2, y: FH / 2, z: 1 };
      var keys = [[0, F], [18.5, F], [19.8, G.camAd], [23.2, G.camAd], [24.5, F], [25.9, F], [26.8, G.camEd], [28.0, G.camEd], [28.9, F]];
      for (var i = keys.length - 1; i >= 0; i--) {
        if (t >= keys[i][0]) {
          var a = keys[i][1], n = keys[i + 1];
          if (!n) return a;
          var p = P(t, keys[i][0], n[0]);
          return { x: lerp(a.x, n[1].x, p), y: lerp(a.y, n[1].y, p), z: lerp(a.z, n[1].z, p) };
        }
      }
      return F;
    }

    function typed(s, t, t0, dur) { var n = Math.round(clamp((t - t0) / dur) * s.length); return s.slice(0, n); }

    function draw(t) {
      var G = geo(), ax = G.ax;
      var aEd = P(t, 0.1, 0.9, E.out), aAd = P(t, 0.35, 1.15, E.out), aCx = P(t, 0.6, 1.4, E.out);
      var slide = PORT ? 0 : 40;

      // ----- wires -----
      var aw = P(t, 1.0, 1.7);
      line(G.pE[0], G.pE[1], lerp(G.pE[0], G.pAL[0], aw), lerp(G.pE[1], G.pAL[1], aw), C.line2, 2, 1);
      line(G.pAR[0], G.pAR[1], lerp(G.pAR[0], G.pC[0], aw), lerp(G.pAR[1], G.pC[1], aw), C.line2, 2, 1);
      line(G.pAL[0], G.pAL[1], G.pAR[0], G.pAR[1], C.line, 1.4, 0.7 * aAd, [4, 6]);

      // ----- editor -----
      X.save(); X.translate(-(1 - aEd) * slide, PORT ? -(1 - aEd) * 20 : 0);
      var ED = G.ED;
      panel(ED.x, ED.y, ED.w, ED.h, null, { a: aEd });
      for (var d = 0; d < 3; d++) circle(ED.x + 24 + d * 17, ED.y + 26, 5.5, [C.ink4, C.ink4, C.ink4][d], aEd);
      txt('Editor', ED.x + 84, ED.y + 27, { sz: 19, w: 650, c: C.ink2, a: aEd });
      line(ED.x, ED.y + 50, ED.x + ED.w, ED.y + 50, C.line, 1, aEd);
      // row A
      var ra = P(t, T.promptA, T.promptA + 0.5, E.spring), aDim = t > T.repAArr ? 1 : 0;
      if (t > T.promptA) {
        token(G.rowA[0], G.rowA[1], 'A', C.A, { s: ra, dim: aDim, glow: t < T.sendA + 0.6 ? 1 - P(t, T.sendA, T.sendA + 0.6) : 0 });
        txt(typed('prompt A', t, T.promptA + 0.1, 0.45), G.rowA[0] + 28, G.rowA[1] + 1, { sz: 20, w: 600, c: aDim ? C.ink3 : C.ink });
        var stA = t < T.repAArr ? (t > T.sendA ? 'working' + '...'.slice(0, 1 + Math.floor(t * 2.5) % 3) : '') : 'cancelled, no report';
        txt(stA, G.rowA[0] + 28, G.rowA[1] + 26, { sz: 15, c: C.ink3, a: t > T.repAArr ? P(t, T.repAArr, T.repAArr + 0.4) : 1 });
        // cancel button flash
        var cb = win(t, T.cancelBtn - 0.4, T.cancelBtn, T.cancel + 0.3, T.cancel + 0.7);
        if (cb > 0) {
          var bx = ED.x + ED.w - (PORT ? 250 : 64), by = G.rowA[1];
          var press = 1 - 0.12 * win(t, T.cancelBtn, T.cancelBtn + 0.08, T.cancelBtn + 0.16, T.cancelBtn + 0.3);
          X.save(); X.translate(bx, by); X.scale(press, press);
          fillRR(-34, -15, 68, 30, 15, C.card2, cb); strokeRR(-34, -15, 68, 30, 15, C.ink3, 1.2, cb);
          fillRR(-22, -5, 10, 10, 2, C.ink2, cb);
          txt('stop', -6, 1, { sz: 14, w: 650, c: C.ink2, a: cb });
          X.restore();
        }
      }
      // row B
      if (t > T.promptB) {
        var rb = P(t, T.promptB, T.promptB + 0.5, E.spring);
        token(G.rowB[0], G.rowB[1], 'B', C.B, { s: rb, glow: t < T.sendB + 0.6 ? 1 - P(t, T.sendB, T.sendB + 0.6) : 0 });
        txt(typed('prompt B', t, T.promptB + 0.1, 0.45), G.rowB[0] + 28, G.rowB[1] + 1, { sz: 20, w: 600 });
        var stB = t < T.repBArr ? (t > T.sendB ? 'working' + '...'.slice(0, 1 + Math.floor(t * 2.5) % 3) : '') : 'report received';
        txt(stB, G.rowB[0] + 28, G.rowB[1] + 26, { sz: 15, c: C.ink3 });
      }
      // report card
      var ca = P(t, T.repB + 0.4, T.repB + 0.9, E.out);
      if (ca > 0) {
        var cd = G.card, hiBad = P(t, T.reveal, T.reveal + 0.5);
        fillRR(cd.x, cd.y, cd.w, cd.h, 14, C.card2, ca);
        strokeRR(cd.x, cd.y, cd.w, cd.h, 14, mixHex(C.B, C.mis, hiBad * 0.0), 1.6, ca);
        token(cd.x + 24, cd.y + 30, 'B', C.B, { r: 12, a: ca });
        txt("B's report", cd.x + 44, cd.y + 31, { sz: 17, w: 650, c: C.ink2, a: ca });
      }
      X.restore();

      // ----- adapter -----
      var AD = G.AD;
      X.save();
      var adS = lerp(0.94, 1, aAd);
      X.translate(AD.x + AD.w / 2, AD.y + AD.h / 2); X.scale(adS, adS); X.translate(-(AD.x + AD.w / 2), -(AD.y + AD.h / 2));
      panel(AD.x, AD.y, AD.w, AD.h, 'ACP adapter', { a: aAd });
      txt('current request', G.flapLbl[0], G.flapLbl[1], { sz: 15, w: 600, c: C.ink3, al: 'center', a: aAd });
      var fA = P(t, T.flipA, T.flipA + 0.45, E.io), fB = P(t, T.flipB, T.flipB + 0.45, E.io);
      if (t < T.flipB) flap(G.flap.x, G.flap.y, G.flap.w, G.flap.h, '–', 'A', fA, null, fA > 0 ? C.A : null, aAd);
      else flap(G.flap.x, G.flap.y, G.flap.w, G.flap.h, 'A', 'B', fB, C.A, C.B, aAd);
      [T.flipA + 0.2, T.flipB + 0.2].forEach(function (tf, i) {
        var w = P(t, tf, tf + 0.7, E.out);
        if (w > 0 && w < 1) strokeRR(G.flap.x - G.flap.w / 2 - 40 * w, G.flap.y - G.flap.h / 2 - 40 * w, G.flap.w + 80 * w, G.flap.h + 80 * w, 14 + 30 * w, i ? C.B : C.A, 2.5, (1 - w) * aAd);
      });
      // trays
      var trA = G.trayA, trB = G.trayB;
      var aOn = P(t, T.flipA, T.flipA + 0.6), aOff = P(t, T.repA, T.repA + 0.6), bOn = P(t, T.flipB, T.flipB + 0.6);
      fillRR(trA.x, trA.y, trA.w, trA.h, 12, C.bg0, 0.5 * aAd);
      strokeRR(trA.x, trA.y, trA.w, trA.h, 12, mixHex(C.line, C.A, aOn * (1 - aOff) * 0.85), 1.4, aAd, aOff > 0.5 ? [5, 5] : null);
      txt("A's report", trA.x + 14, trA.y + 26, { sz: 16, w: 650, c: mixHex(C.ink3, C.A, aOn * (1 - aOff)), a: aAd });
      if (aOff > 0) {
        var ly = trA.y + trA.h / 2 + 10;
        txt('not sent:', trA.x + trA.w / 2, ly - 12, { sz: 15, c: C.ink3, al: 'center', a: aOff * aAd });
        txt('A was cancelled', trA.x + trA.w / 2, ly + 10, { sz: 15, c: C.ink3, al: 'center', a: aOff * aAd });
      }
      fillRR(trB.x, trB.y, trB.w, trB.h, 12, C.bg0, 0.5 * aAd);
      strokeRR(trB.x, trB.y, trB.w, trB.h, 12, mixHex(C.line, C.B, bOn * 0.85), 1.4, aAd);
      txt("B's report", trB.x + 14, trB.y + 26, { sz: 16, w: 650, c: mixHex(C.ink3, C.B, bOn), a: aAd });
      var trayGlow = win(t, 7.4, 8.0, 9.4, 10.0);
      if (trayGlow > 0) {
        strokeRR(trA.x - 4, trA.y - 4, trA.w + 8, trA.h + 8, 15, C.ink2, 1.2, trayGlow * 0.8, [3, 5]);
        strokeRR(trB.x - 4, trB.y - 4, trB.w + 8, trB.h + 8, 15, C.ink2, 1.2, trayGlow * 0.8, [3, 5]);
      }
      X.restore();

      // ----- codex -----
      var CX = G.CX;
      X.save(); X.translate((1 - aCx) * slide, PORT ? (1 - aCx) * 20 : 0);
      panel(CX.x, CX.y, CX.w, CX.h, 'Codex', { a: aCx, sub: PORT ? null : 'provider: one thread per agent' });
      var lal = G.lbl === 'left' ? 'left' : 'left';
      txt('root thread', G.lblRoot[0], G.lblRoot[1], { sz: 15, w: 600, c: C.ink3, al: lal, a: aCx });
      var cAppear = P(t, T.cNode - 0.2, T.cNode + 0.4);
      txt(PORT ? 'subagent c' : "subagent c's thread", G.lblChild[0], G.lblChild[1], { sz: 15, w: 600, c: C.ink3, al: lal, a: aCx * (0.35 + 0.65 * cAppear) });
      line(G.laneX0, G.rootY, G.laneX1, G.rootY, C.line, 2, aCx);
      line(G.laneX0, G.childY, G.laneX1, G.childY, C.line, 2, aCx * (0.35 + 0.65 * cAppear), [3, 7]);
      // now cursor
      if (t > T.rootA && t < 26.5) {
        var nx = G.xT(t);
        line(nx, G.rootY - 34, nx, G.childY + 26, C.ink3, 1, 0.22 * win(t, T.rootA, T.rootA + 0.5, 25.6, 26.5), [2, 5]);
      }
      // turn A
      if (t > T.rootA) {
        var xa0 = G.xT(T.rootA), xa1 = G.xT(Math.min(t, T.aEnd));
        line(xa0, G.rootY, xa1, G.rootY, C.A, 6, 1);
        if (t < T.aEnd) glow(xa1, G.rootY, 22, C.A, 0.8);
        else { line(xa1 + 1, G.rootY - 11, xa1 + 1, G.rootY + 11, C.A, 3, 1); txt('interrupted', xa1, G.rootY + 26, { sz: 14, c: C.ink3, al: 'center', a: P(t, T.aEnd, T.aEnd + 0.4) }); }
        txt('turn A', xa0, G.rootY - 20, { sz: 15, w: 650, c: C.A, a: P(t, T.rootA, T.rootA + 0.4) });
      }
      // spawn branch and child c
      if (t > T.spawn) {
        var sx0 = G.xT(T.spawn), sx1 = G.xT(T.cNode);
        var br = new Path(cub([sx0, G.rootY], [sx0, lerp(G.rootY, G.childY, 0.65)], [sx1, lerp(G.childY, G.rootY, 0.45)], [sx1, G.childY], 30));
        var bp = P(t, T.spawn, T.cNode, E.io);
        strokePath(br, 0, bp, C.A, 3, 0.9);
        if (bp < 1) { var hp = br.at(bp); glow(hp.x, hp.y, 18, C.A, 0.8); }
      }
      if (t > T.cNode) {
        var cx0 = G.xT(T.cNode), cx1 = G.xT(t), cpop = P(t, T.cNode, T.cNode + 0.6, E.spring);
        if (cx1 > cx0 + 15) { line(cx0 + 15, G.childY, cx1, G.childY, C.A, 6, 1); glow(cx1, G.childY, 22, C.A, 0.75); }
        glow(cx0, G.childY, 40 * cpop, C.A, 0.35 * (1 - P(t, T.cNode + 0.3, T.cNode + 1.5)));
        circle(cx0, G.childY, 15 * cpop, C.card2, 1); ring(cx0, G.childY, 15 * cpop, C.A, 2.5, 1);
        txt('c', cx0, G.childY + 1, { sz: 18 * cpop, w: 700, c: C.ink, al: 'center' });
        // c's start message, held back until it is delivered
        if (t < T.cStart) {
          var qa = P(t, T.cNode + 0.5, T.cNode + 1.0);
          var qx = cx0 + 4, qy = G.childY + 36, pulse = 0.5 + 0.5 * Math.sin(t * 4);
          ring(qx, qy, 6 + 3 * pulse, C.A, 1.2, qa * 0.6);
          circle(qx, qy, 4, C.A, qa * 0.9);
          txt('c started', qx + 14, qy + 1, { sz: 14, c: C.ink3, a: qa });
        }
      }
      // turn B
      if (t > T.rootB) {
        var xb0 = G.xT(T.rootB), xb1 = G.xT(Math.min(t, T.bEnd));
        line(xb0, G.rootY, xb1, G.rootY, C.B, 6, 1);
        if (t < T.bEnd) glow(xb1, G.rootY, 22, C.B, 0.8);
        else line(xb1 + 1, G.rootY - 11, xb1 + 1, G.rootY + 11, C.B, 3, 1);
        txt('turn B', xb0, G.rootY - 20, { sz: 15, w: 650, c: C.B, a: P(t, T.rootB, T.rootB + 0.4) });
      }
      X.restore();

      // ----- messages -----
      comet(G.pathPromptA, P(t, T.sendA, T.flipA, E.io), C.A, { label: 'prompt A' });
      comet(G.pathFwdA, P(t, T.fwdA, T.rootA, E.io), C.A, {});
      comet(G.msgPath(G.xT(T.spawnMsg), G.rootY), P(t, T.spawnMsg, T.spawnMsg + 0.9, E.io), C.A, { label: 'spawn c' });
      comet(G.pathCancel, P(t, T.cancel, T.aEnd, E.io), C.ink2, { label: 'cancel A' });
      comet(G.msgPath(G.xT(T.aEnd), G.rootY), P(t, T.aIntMsg, T.aIntMsg + 0.75, E.io), C.A, { label: 'A interrupted' });
      comet(G.pathRepA, P(t, T.repA, T.repAArr, E.io), C.ink3, { label: 'A: no report' });
      comet(G.pathPromptB, P(t, T.sendB, T.flipB, E.io), C.B, { label: 'prompt B' });
      comet(G.pathFwdB, P(t, T.fwdB, T.rootB, E.io), C.B, {});
      comet(G.msgPath(G.xT(T.cNode) + 4, G.childY + 36), P(t, T.cStart, T.cStart + 0.85, E.io), C.A, { label: 'c started' });
      // arrival ripples at the adapter's intake
      [T.spawnMsg + 0.9, T.aIntMsg + 0.75, T.cStart + 0.85].forEach(function (ta) {
        var rp = P(t, ta, ta + 0.6, E.out);
        if (rp > 0 && rp < 1) ring(G.insp[0], G.insp[1], 8 + 26 * rp, C.ink2, 1.5, 1 - rp);
      });

      // ----- a.txt: made for A, credited to B -----
      var aChip = { truth: C.A, sz: G.chipSz };
      if (t > T.edit) {
        var pos, born = P(t, T.edit, T.edit + 0.5, E.spring), ex = G.xT(T.edit);
        if (t < T.editFly) pos = [ex, G.childY - 30 * born];
        else if (t < T.inspect) { var q = G.msgPath(ex, G.childY - 30).at(P(t, T.editFly, T.inspect, E.io)); pos = [q.x, q.y]; }
        else if (t < T.tray) pos = G.insp;
        else if (t < T.repB) { var q2 = G.pathInspToTray(1).at(P(t, T.tray, T.tray + 0.6, E.io)); pos = [q2.x, q2.y]; }
        else { var q3 = G.pathTrayToCard(1).at(P(t, T.repB, T.repBArr, E.io)); pos = [q3.x, q3.y]; }
        if (t > T.editFly && t < T.inspect) {
          var path = G.msgPath(ex, G.childY - 30), u = P(t, T.editFly, T.inspect, E.io);
          for (var k = 8; k >= 1; k--) { var uu = u - 0.012 * k; if (uu > 0) { var qq = path.at(uu); glow(qq.x, qq.y, 16 * (1 - k / 10), C.A, 0.3 * (1 - k / 9)); } }
        }
        if (t > T.look && t < T.stamp + 0.6) {
          // the lookup: which request is current?
          var lp = P(t, T.look, T.look + 0.5, E.io), la = win(t, T.look, T.look + 0.2, T.stamp + 0.2, T.stamp + 0.6);
          var fx = G.flap.x, fy = G.flap.y + G.flap.h / 2 + 4;
          line(G.insp[0], G.insp[1] - 20, lerp(G.insp[0], fx, lp), lerp(G.insp[1] - 20, fy, lp), C.B, 2, la, [4, 5]);
          glow(fx, G.flap.y, G.flap.w * 1.3, C.B, 0.5 * la * P(t, T.look + 0.4, T.look + 0.7));
          tag('current?', G.insp[0] + (PORT ? 0 : 128), G.insp[1] + (PORT ? 44 : 0), C.ink3, la * P(t, T.look, T.look + 0.3) * (1 - P(t, T.look + 0.6, T.look + 0.8)), { sz: 15 });
          tag('B', G.insp[0] + (PORT ? 0 : 128), G.insp[1] + (PORT ? 44 : 0), C.B, la * P(t, T.look + 0.65, T.look + 0.85), { sz: 15 });
        }
        var stamped = t > T.stamp;
        var ringP = P(t, T.stamp, T.stamp + 0.5, E.out);
        if (ringP > 0 && ringP < 1) ring(G.insp[0], G.insp[1], 30 + 50 * ringP, C.B, 3, 1 - ringP);
        var bad = t > T.reveal ? P(t, T.reveal, T.reveal + 0.7, E.lin) : 0;
        fileChip(pos[0], pos[1], 'a.txt', { truth: C.A, sz: G.chipSz, s: born * (t > T.repB && t < T.repBArr ? lerp(1, 1.06, Math.sin(Math.PI * P(t, T.repB, T.repBArr))) : 1), stamp: stamped ? C.B : null, tag: stamped ? 'B' : null, tagA: P(t, T.stamp, T.stamp + 0.35), glow: t < T.inspect + 0.5 ? 1 : 0, bad: bad });
        if (bad > 0) {
          var mx = pos[0], my = pos[1] + (PORT ? 30 : 34);
          tag('made for A', mx, my, C.mis, P(t, T.reveal + 0.3, T.reveal + 0.7), { sz: 15, tc: C.mis });
        }
      }
      // ----- b.txt: B's own edit -----
      if (t > T.bEdit) {
        var bpos, bborn = P(t, T.bEdit, T.bEdit + 0.4, E.spring), bx0 = G.xT(T.bEdit);
        if (t < T.bFly) bpos = [bx0, G.rootY - 30 * bborn];
        else if (t < T.bArr) { var r1 = G.msgPath(bx0, G.rootY - 30).at(P(t, T.bFly, T.bArr, E.io)); bpos = [r1.x, r1.y]; }
        else if (t < T.bTray) bpos = G.insp;
        else if (t < T.repB) { var r2 = G.pathInspToTray(0).at(P(t, T.bTray, T.bTray + 0.5, E.io)); bpos = [r2.x, r2.y]; }
        else { var r3 = G.pathTrayToCard(0).at(P(t, T.repB + 0.12, T.repBArr + 0.12, E.io)); bpos = [r3.x, r3.y]; }
        var bst = t > T.bStamp;
        fileChip(bpos[0], bpos[1], 'b.txt', { truth: C.B, sz: G.chipSz, s: bborn, stamp: bst ? C.B : null, tag: bst ? 'B' : null, tagA: P(t, T.bStamp, T.bStamp + 0.3), glow: t < T.bArr + 0.3 ? 1 : 0 });
      }
      comet(G.pathTrayToCard(0), P(t, T.repB - 0.1, T.repBArr - 0.1, E.io), C.B, { label: 'report B', r: 6 });
    }

    function over(t) {
      heading(1, 'The setup', t, 0.2, T.cancelBtn - 0.3);
      heading(2, 'The bug', t, T.cancelBtn - 0.1, T.title - 0.2);
      var s = win(t, T.title, T.title + 0.5, T.end - 0.6, T.end);
      if (s > 0) {
        alpha(0.9 * s); X.fillStyle = C.bg0; X.fillRect(0, 0, FW, FH);
        kinetic(PORT ? [{ s: 'Arrival' }, { s: 'is not origin.', c: C.mis }] : [{ s: 'Arrival is not' }, { s: 'origin.', c: C.mis }], t, T.title + 0.15, { a: s });
        var sub = PORT ? 'B’s report credited a.txt by when it arrived, not by who asked for it.' : 'The adapter credited a.txt by when it arrived, not by who asked for it.';
        var lines = wrap(sub, PORT ? 440 : 1000, PORT ? 19 : 24, 500);
        for (var i = 0; i < lines.length; i++) txt(lines[i], FW / 2, FH / 2 + (PORT ? 96 : 130) + i * (PORT ? 26 : 32), { sz: PORT ? 19 : 24, c: C.ink2, al: 'center', a: s * P(t, T.title + 1.0, T.title + 1.6) });
      }
    }

    return {
      dur: T.end, draw: draw, over: over, cam: cam,
      chapters: [[T.cancelBtn - 0.1, 'The bug']],
      caps: [
        [0.3, 'An editor sends each request to an ACP adapter. The adapter drives Codex and tells the editor which files each request changed.'],
        [4.6, 'Request A’s turn starts a subagent, c, on a thread of its own. Whatever c does, it does for A.'],
        [7.4, 'The adapter keeps one report per request: the files that request changed.'],
        [10.1, 'The user cancels A. That ends A’s own turn, but not c, which keeps working.'],
        [13.9, 'The user sends request B. The adapter now treats B as the current request.'],
        [16.6, 'c’s start message only now reaches the adapter. Messages from different threads can arrive in any order.'],
        [18.1, 'c edits a.txt. That edit was made for A.'],
        [19.9, 'The adapter asks only which request is current. The answer is B, so a.txt goes into B’s report.'],
        [22.3, 'B edits b.txt, which really is B’s work.'],
        [24.7, 'B’s report reaches the editor.'],
        [26.6, 'It lists a.txt, which was made for A. The request id is right and the files are wrong, and the editor cannot tell.'],
        [28.4, 'The paper calls this arrival-time attribution. We found it in both the Codex and the Claude ACP adapters.']
      ]
    };
  })();
  // ======================================================================
  // Scene 2: one scenario, many arrival orders
  // ======================================================================
  var S2 = (function () {
    var BEADS = [
      { s: 0, i: 0, label: 'spawn c', c: C.A, L: 'A' },
      { s: 0, i: 1, label: 'A ends', c: C.A, L: 'A' },
      { s: 0, i: 2, label: 'B starts', c: C.B, L: 'B' },
      { s: 0, i: 3, label: 'b.txt', c: C.B, L: 'B', file: true },
      { s: 0, i: 4, label: 'B ends', c: C.B, L: 'B' },
      { s: 1, i: 0, label: 'c started', c: C.A, L: 'c' },
      { s: 1, i: 1, label: 'a.txt', c: C.A, L: 'c', file: true, hero: true }
    ];
    // An order is given by the slots (1..6) of c's two messages; the root thread fills the rest.
    function order(i, j) {
      var o = [0], r = 1;
      for (var k = 1; k <= 6; k++) o.push(k === i ? 5 : k === j ? 6 : r++);
      return o;   // o[k] = bead index at arrival position k
    }
    var PAIRS = [[3, 4], [1, 2], [1, 4], [5, 6], [2, 3], [1, 6], [3, 5], [2, 4], [1, 3], [4, 5], [2, 6], [3, 6], [1, 5], [2, 5], [4, 6]];
    var ORDERS = PAIRS.map(function (p) { return order(p[0], p[1]); });
    function slotsOf(o) { var s = []; for (var k = 0; k < o.length; k++) s[o[k]] = k; return s; }
    function isBad(o) { var s = slotsOf(o); return s[6] > s[2] && s[6] < s[4]; }
    var M0 = 1.9, MDT = 0.34, MDUR = 0.7;
    var STEPS = [{ t: 6.6, d: 1.0 }, { t: 8.7, d: 1.0 }, { t: 10.8, d: 1.0 }];
    for (var q = 0; q < 11; q++) STEPS.push({ t: 12.6 + q * 0.42, d: 0.3 });
    var SETTLE = [M0 + 6 * MDT + MDUR + 0.15];
    STEPS.forEach(function (s) { SETTLE.push(s.t + s.d + 0.1 + (s.d > 0.5 ? 0.15 : 0)); });
    var END = 18.6;

    var cache = {};
    function geo() {
      var key = PORT ? 'p' : 'l';
      if (cache[key]) return cache[key];
      var G = PORT ? {
        sy: [196, 336], sx0: 70, sdx: 84, lbl: [[40, 146, 'left'], [40, 286, 'left']], F: [280, 452], my: 548, mx0: 52, mdx: 76, r: 20,
        band: [30, 530, 602], brY: 500, ad: { x: 210, y: 690, w: 140, h: 54 }, lamp: [446, 717], tally: [44, 852, 24, 31.4], tallyLbl: [44, 812], arrLbl: [30, 648], lsz: 14
      } : {
        sy: [214, 340], sx0: 560, sdx: 112, lbl: [[516, 214, 'right'], [516, 340, 'right']], F: [800, 470], my: 576, mx0: 330, mdx: 150, r: 30,
        band: [290, 1270, 648], brY: 500, ad: { x: 1318, y: 544, w: 150, h: 64 }, lamp: [1393, 700], tally: [330, 812, 28, 38], tallyLbl: [330, 770], arrLbl: [290, 714], lsz: 17
      };
      G.strand = function (b) { return [G.sx0 + b.i * G.sdx, G.sy[b.s]]; };
      G.slot = function (k) { return [G.mx0 + k * G.mdx, G.my]; };
      G.mergePath = {};
      cache[key] = G;
      return G;
    }
    function mergePath(G, bi, k) {
      var key = bi + ':' + k;
      if (G.mergePath[key]) return G.mergePath[key];
      var a = G.strand(BEADS[bi]), b = G.slot(k), F = G.F;
      var p = PORT
        ? join(cub(a, [a[0], a[1] + 60], [F[0], F[1] - 70], F, 30), cub(F, [F[0], F[1] + 40], [b[0], b[1] - 50], b, 30))
        : join(cub(a, [a[0] + 120, a[1]], [F[0] - 90, F[1]], F, 30), cub(F, [F[0] + 40, F[1]], [b[0] - 50, b[1]], b, 30));
      G.mergePath[key] = p;
      return p;
    }
    // Where each bead is at time t.
    function state(t) {
      var G = geo(), pos = [], n = BEADS.length, cur = 0;
      for (var s = STEPS.length - 1; s >= 0; s--) if (t >= STEPS[s].t) { cur = s + 1; break; }
      if (cur === 0) {
        var sl = slotsOf(ORDERS[0]);
        for (var b = 0; b < n; b++) {
          var dep = M0 + sl[b] * MDT, u = P(t, dep, dep + MDUR, E.io);
          if (u <= 0) pos.push(G.strand(BEADS[b]).concat([0]));
          else { var q = mergePath(G, b, sl[b]).at(u); pos.push([q.x, q.y, u]); }
        }
        return { pos: pos, idx: 0, moving: t < SETTLE[0] };
      }
      var st = STEPS[cur - 1], from = slotsOf(ORDERS[cur - 1]), to = slotsOf(ORDERS[cur]);
      for (var c = 0; c < n; c++) {
        var a = G.slot(from[c]), z = G.slot(to[c]), stag = st.d > 0.5 ? c * 0.035 : 0;
        var p = P(t, st.t + stag, st.t + stag + st.d, E.io);
        var dx = z[0] - a[0], lift = (dx > 0 ? -1 : 1) * Math.min(80, Math.abs(dx) * 0.45) * (PORT ? 0.8 : 1);
        var x = lerp(a[0], z[0], p), y = lerp(a[1], z[1], p) + lift * Math.sin(Math.PI * p);
        pos.push([x, y, 1]);
      }
      return { pos: pos, idx: cur, moving: t < SETTLE[cur] };
    }
    function bead(x, y, b, o) {
      o = o || {};
      var r = geo().r * (o.s === undefined ? 1 : o.s), a = o.a === undefined ? 1 : o.a;
      if (a <= 0.004 || r <= 0.5) return;
      if (b.hero) glow(x, y, r * 3.2, o.bad ? C.mis : b.c, (o.bad ? 0.65 : 0.4) * a);
      circle(x, y, r, C.card2, a);
      ring(x, y, r, o.bad ? C.mis : b.c, b.hero ? 3.2 : 2.4, a);
      if (b.file) docIcon(x, y, b.c, a, r / 22);
      else txt(b.L, x, y + 1, { sz: r * 0.9, w: 750, c: b.c, al: 'center', a: a });
      if (o.label !== false) txt(b.label, x, y + r + 18, { sz: geo().lsz, w: b.hero ? 700 : 550, c: b.hero ? C.ink : C.ink2, al: 'center', a: a * (o.la === undefined ? 1 : o.la) });
    }

    function draw(t) {
      var G = geo(), r = G.r, st = state(t), pos = st.pos;
      var appear = function (b) { return P(t, 0.2 + BEADS.indexOf(b) * 0.1, 0.7 + BEADS.indexOf(b) * 0.1, E.spring); };
      var la = P(t, 0.1, 0.7);
      // strand guides and labels
      txt('root thread: A’s turn, then B’s', G.lbl[0][0], G.lbl[0][1], { sz: PORT ? 16 : 18, w: 650, c: C.ink2, a: la, al: G.lbl[0][2] });
      txt('subagent c’s thread', G.lbl[1][0], G.lbl[1][1], { sz: PORT ? 16 : 18, w: 650, c: C.ink2, a: la, al: G.lbl[1][2] });
      var e0 = G.strand(BEADS[4]), e1 = G.strand(BEADS[6]), F = G.F;
      line(G.sx0 - 36, G.sy[0], e0[0] + 36, G.sy[0], C.line, 2, la);
      line(G.sx0 - 36, G.sy[1], e1[0] + 36, G.sy[1], C.line, 2, la);
      var g0 = new Path(cub([e0[0] + 36, G.sy[0]], [e0[0] + 110, G.sy[0]], [F[0] + (PORT ? 0 : 60), F[1] - 120], F, 24));
      var g1 = new Path(cub([e1[0] + 36, G.sy[1]], [e1[0] + (PORT ? 150 : 110), G.sy[1]], [F[0] - (PORT ? 0 : 40), F[1] - 80], F, 24));
      var gp = P(t, 0.6, 1.4);
      strokePath(g0, 0, gp, C.line, 2, 1, [2, 6]); strokePath(g1, 0, gp, C.line, 2, 1, [2, 6]);
      var s0 = G.slot(0), s6 = G.slot(6);
      line(F[0], F[1], F[0], F[1] + gp * (s0[1] - F[1] - (PORT ? 40 : 46)), C.line, 2, 1, [2, 6]);
      line(s0[0] - 34, G.my, lerp(s0[0] - 34, s6[0] + 34, gp), G.my, C.line, 2, la);
      txt('arrival order at the adapter', G.arrLbl[0], G.arrLbl[1], { sz: PORT ? 14 : 16, w: 600, c: C.ink3, a: la });
      // adapter box
      var ad = G.ad;
      if (PORT) { line(280, G.band[2] + 58, 280, ad.y - 8, C.line2, 2, la); }
      else line(s6[0] + 34, G.my, ad.x - 6, G.my, C.line2, 2, la);
      fillRR(ad.x, ad.y, ad.w, ad.h, 12, C.card2, la); strokeRR(ad.x, ad.y, ad.w, ad.h, 12, C.line2, 1.4, la);
      txt('adapter', ad.x + ad.w / 2, ad.y + ad.h / 2 + 1, { sz: 17, w: 650, c: C.ink2, al: 'center', a: la });
      // ghost beads remain on the strands, so each thread's own order stays visible
      BEADS.forEach(function (b) { var p = G.strand(b); ring(p[0], p[1], r, b.c, 1.4, 0.28 * appear(b), [3, 4]); });

      // current-request band, which switches at "B starts"
      var bandA = P(t, M0 + 6 * MDT + 0.2, M0 + 6 * MDT + 0.8);
      if (bandA > 0) {
        var bx = pos[2][0] - G.mdx / 2, x0 = G.band[0], x1 = G.band[1], by = G.band[2];
        bx = clamp(bx, x0, x1);
        fillRR(x0, by - 5, bx - x0 - 2, 10, 5, C.A, 0.85 * bandA);
        fillRR(bx + 2, by - 5, x1 - bx - 2, 10, 5, C.B, 0.85 * bandA);
        txt('current: A', (x0 + bx) / 2, by + 24, { sz: PORT ? 13 : 16, w: 650, c: C.A, al: 'center', a: bandA * clamp((bx - x0 - 70) / 40) });
        txt('current: B', (bx + x1) / 2, by + 24, { sz: PORT ? 13 : 16, w: 650, c: C.B, al: 'center', a: bandA * clamp((x1 - bx - 70) / 40) });
        // B's report window
        var w0 = pos[2][0], w1 = pos[4][0], wy = G.brY;
        line(w0, wy, w1, wy, C.B, 2, bandA); line(w0, wy - 7, w0, wy + 7, C.B, 2, bandA); line(w1, wy - 7, w1, wy + 7, C.B, 2, bandA);
        txt('lands in B’s report', (w0 + w1) / 2, wy - 20, { sz: PORT ? 14 : 17, w: 650, c: C.B, al: 'center', a: bandA });
      }
      // beads
      var bad = !st.moving && isBad(ORDERS[st.idx]);
      var sinceSettle = t - SETTLE[st.idx];
      BEADS.forEach(function (b, i) {
        var p = pos[i], s = appear(b);
        var heroBad = b.hero && bad;
        var shake = heroBad ? Math.sin(sinceSettle * 50) * 4 * clamp(1 - sinceSettle * 2.5) : 0;
        if (p[2] > 0 && p[2] < 1) glow(p[0], p[1], r * 2.2, b.c, 0.35);
        bead(p[0] + shake, p[1], b, { s: s, bad: heroBad, la: st.moving && p[2] > 0 && p[2] < 1 ? 0.3 : 1 });
      });
      // verdict lamp and tally
      var shown = st.moving ? st.idx - 1 : st.idx;
      if (!st.moving) {
        var lp = P(t, SETTLE[st.idx], SETTLE[st.idx] + 0.35, E.lin);
        var lampOut = st.idx + 1 < SETTLE.length ? 1 - P(t, STEPS[st.idx].t - 0.15, STEPS[st.idx].t) : 1;
        lamp(G.lamp[0], G.lamp[1], PORT ? 24 : 32, bad, lp, lampOut, { label: bad ? 'a.txt in B’s report' : 'B’s report is right', ly: (PORT ? 24 : 32) + 26, al: 'center', sz: PORT ? 16 : 18 });
      }
      var T = G.tally, tl = P(t, SETTLE[0] - 0.2, SETTLE[0] + 0.3);
      txt('orders tried', G.tallyLbl[0], G.tallyLbl[1], { sz: PORT ? 15 : 16, w: 600, c: C.ink3, a: tl });
      for (var k = 0; k < ORDERS.length; k++) {
        var cx = T[0] + k * T[3], on = k <= shown ? P(t, SETTLE[k], SETTLE[k] + 0.3, E.back) : 0;
        strokeRR(cx, T[1] - T[2] / 2, T[2], T[2], 6, C.line2, 1.2, tl);
        if (on > 0) {
          var cb = isBad(ORDERS[k]);
          var sz = T[2] * on;
          fillRR(cx + (T[2] - sz) / 2, T[1] - sz / 2, sz, sz, 6, cb ? C.mis : C.okHi, 1);
          if (k === shown && on < 1) glow(cx + T[2] / 2, T[1], T[2] * 1.6, cb ? C.mis : C.okHi, 0.6 * (1 - on));
        }
      }
    }
    function over(t) { heading(3, 'Many orders', t, 0.1, END - 0.3); }
    return {
      dur: END, draw: draw, over: over,
      chapters: [[0, 'Many orders']],
      caps: [
        [0.2, 'Each thread delivers its own messages in order. Nothing orders one thread’s messages against another’s.'],
        [1.9, 'Here is the order from before: a.txt arrives after B starts, so it lands in B’s report.'],
        [6.6, 'The same work in another order: a.txt arrives before B starts, and B’s report is right.'],
        [8.7, 'Here c starts early, but its edit still arrives during B. Wrong again.'],
        [10.8, 'Here the edit arrives after B ends. Right.'],
        [12.6, 'Which report a.txt lands in depends only on the order. So Turnstile tries every order its model of the provider allows.']
      ]
    };
  })();
  // ======================================================================
  // Scene 3: Turnstile, the 956 schedules, and the two fixes
  // ======================================================================
  var S3 = (function () {
    var CELLS = { cancel: 'eqqqqeeqqlqeqeqqqelleeeeqlqllqqeleqellqqeqqqleqeqqqeeqqeqqeqqeelqelleeqllqellellqqeqeleqlllqeeeeleeqeqqeeqeeeeeeeqqeqqleeqllqqeqleeeeeeeeqeeeeeeeeqeeelleqqeeellleeqeqeqqeqleeleqeqqleqqqeeeeeeleqeeqeeqeeeelqeeqeeeeleleeqqleeeqlqeqqqqeeqqleeqeeeqqeqqeeqlqellqleeeleeleeeeeqeleqelqeeqeqlqqeqqeqqleeleqlllqeeeeleeqeqqeeqeeeeeeeqqeqqleeqllqqeqleeeeeeeeqeeeeeeeeqeeelleqqeeellleeqeqeqqeqleeleqeqqleqqqeeeeeeleqeeqeeqeeeelqeeqeeeeleleeqqleeeqlqeqqqqeeqqleeqeeeqqeqqeeqlqellqleeeleeleeeeeqeleqelqeeqeqlqqeqqeqqle', interrupted: 'lqqqqllleleellqleleleqqeqqellqeqleqllqqeqleeelelqeeeeqqleeelleellelqeeqqlleeeeeqqleeeeeeqeeqeleleeleleelqeelleeqqeleelleelelleleeleqeqeellqqeqleeeeeeleeqelleleeeleeeqeqqleqeqqleqlqeqeeelleellelqeeqqlleeeeeqqleeeeeeqeeqeleleeleleelqeelleeqqeleelleelelleleeleqeqeellqqeqleeeeeeleeqelleleeeleeeqeqqleqeqqleqlqeq' };
    var T = {
      build: 0.2, grow: 1.5, runs: [6.0, 8.9, 10.7], cascade: 12.4, morph: 14.6, count: 17.6,
      chap: 21.2, regroup: 21.4, orig: 24.6, start: 29.4, startFix: 31.4, late: 34.2, disp: 38.2, dispFix: 41.0,
      cost: 46.2, claude: 50.0, end: 55.0
    };
    // ----- cells: one per schedule -----
    var cells = [], byClass = { q: [], e: [], l: [] }, groups = [[], [], []];
    function addGroup(str, g) {
      for (var i = 0; i < str.length; i++) {
        var c = { g: g, cls: str[i], gi: groups[g].length };
        groups[g].push(c); cells.push(c);
        if (g < 2) { c.ci = byClass[c.cls].length; byClass[c.cls].push(c); }
      }
    }
    addGroup(CELLS.cancel, 0); addGroup(CELLS.interrupted, 1);
    var comp = ''; for (var z = 0; z < 144; z++) comp += 'q'; addGroup(comp, 2);
    cells.forEach(function (c, i) { c.i = i; c.h = hash(i * 1.37 + 0.5); c.h2 = hash(i * 2.11 + 9.1); });

    // ----- the tree of schedules -----
    var tree = (function () {
      var nodes = [{ d: 0, kids: [], id: 0 }], frontier = [nodes[0]], id = 1;
      for (var d = 1; d <= 6; d++) {
        var next = [];
        frontier.forEach(function (n) {
          var k = d === 1 ? 2 : 1 + Math.floor(hash(n.id * 3.7 + d * 1.3) * 2.55);
          if (d >= 5 && next.length > 30) k = 1;
          for (var j = 0; j < k; j++) { var m = { d: d, kids: [], id: id++, parent: n }; n.kids.push(m); nodes.push(m); next.push(m); }
        });
        frontier = next;
      }
      var leaves = frontier;
      leaves.forEach(function (l, i) { l.li = i; l.bad = hash(i * 5.3 + 2) < 0.61; });
      leaves[Math.floor(leaves.length * 0.3)].bad = true;
      leaves[Math.floor(leaves.length * 0.72)].bad = false;
      leaves[Math.floor(leaves.length * 0.52)].bad = true;
      return { nodes: nodes, leaves: leaves, run: [Math.floor(leaves.length * 0.3), Math.floor(leaves.length * 0.72), Math.floor(leaves.length * 0.52)] };
    })();
    var NL = tree.leaves.length;
    function leafTime(li) {
      var r = tree.run.indexOf(li);
      if (r >= 0) return T.runs[r] + [2.1, 1.45, 1.0][r];
      var rank = 0; for (var k = 0; k < li; k++) if (tree.run.indexOf(k) < 0) rank++;
      return T.cascade + rank * (1.9 / (NL - 3));
    }

    var cache = {};
    function geo() {
      var key = PORT ? 'p' : 'l';
      if (cache[key]) return cache[key];
      var G;
      if (!PORT) G = {
        scen: { x: 70, y: 250, w: 250, h: 400 }, root: [400, 450], dx: 98, leafSpan: [150, 750],
        ad: { x: 1100, y: 220, w: 300, h: 150 }, or: { x: 1100, y: 430, w: 300, h: 220 }, lamp: [1480, 540],
        grid: { cols: 18, pitch: 17, cell: 14, x0: [110, 486, 862], bottom: 752, lblY: 784 },
        bars: { cols: 13, pitch: 15, cell: 12, x0: [830, 1088, 1346], bottom: 740, lblY: 772 },
        counter: [1536, 150], cntSz: 78, cntLbl: [1536, 204], cntW: 330,
        pan: { x: 60, y: 130, w: 700, h: 640 }, tl: { y: 470, x0: 110, x1: 720, spawn: 150, bstart: 380, early: 265, late: 500, edit: 600, bend: 700, lbl1: 506, lbl2: 534, pin: 396, read: 350, out: 626 },
        compNote: [1536, 862], compAl: 'right'
      };
      else G = {
        scen: { x: 24, y: 86, w: 512, h: 110 }, root: [280, 252], dx: 54, leafSpan: [36, 524],
        ad: { x: 24, y: 652, w: 250, h: 116 }, or: { x: 286, y: 652, w: 250, h: 170 }, lamp: [150, 820],
        grid: { cols: 12, pitch: 13.5, cell: 11, x0: [26, 199, 372], bottom: 856, lblY: 882 },
        bars: { cols: 12, pitch: 12.5, cell: 10, x0: [40, 205, 370], bottom: 872, lblY: 896 },
        counter: [530, 156], cntSz: 60, cntLbl: [530, 200], cntW: 300, counter2: [530, 492], cntLbl2: [530, 532],
        pan: { x: 20, y: 76, w: 520, h: 360 }, tl: { y: 300, x0: 40, x1: 520, spawn: 70, bstart: 240, early: 150, late: 330, edit: 410, bend: 498, lbl1: 330, lbl2: 354, pin: 238, read: 204, out: 400 },
        compNote: [280, 940], compAl: 'center'
      };
      // tree positions
      var span = G.leafSpan, V = {}, port = PORT;
      tree.leaves.forEach(function (l, i) { V[l.id] = lerp(span[0], span[1], NL === 1 ? 0.5 : i / (NL - 1)); });
      for (var d = 5; d >= 0; d--) tree.nodes.forEach(function (n) { if (n.d === d) { var s = 0; n.kids.forEach(function (k) { s += V[k.id]; }); V[n.id] = s / n.kids.length; } });
      G.np = function (n) { return port ? [V[n.id], G.root[1] + n.d * G.dx] : [G.root[0] + n.d * G.dx, V[n.id]]; };
      G.edge = {};
      G.edgePath = function (n) {
        if (G.edge[n.id]) return G.edge[n.id];
        var a = G.np(n.parent), b = G.np(n);
        var p = PORT ? new Path(cub(a, [a[0], (a[1] + b[1]) / 2], [b[0], (a[1] + b[1]) / 2], b, 16)) : new Path(cub(a, [(a[0] + b[0]) / 2, a[1]], [(a[0] + b[0]) / 2, b[1]], b, 16));
        G.edge[n.id] = p; return p;
      };
      G.adIn = PORT ? [G.ad.x + G.ad.w / 2, G.ad.y] : [G.ad.x, G.ad.y + G.ad.h / 2];
      G.trainPath = function (leaf) {
        var k = 'tr' + leaf.id; if (G.edge[k]) return G.edge[k];
        var a = G.np(leaf), b = G.adIn;
        var p = PORT ? new Path(cub(a, [a[0], a[1] + 40], [b[0], b[1] - 40], b, 24)) : new Path(cub(a, [a[0] + 60, a[1]], [b[0] - 60, b[1]], b, 24));
        G.edge[k] = p; return p;
      };
      G.repPath = PORT ? new Path(cub([G.ad.x + G.ad.w, G.ad.y + 50], [G.ad.x + G.ad.w + 20, G.ad.y + 50], [G.or.x + 40, G.or.y - 10], [G.or.x + 60, G.or.y + 26], 20))
        : new Path(cub([G.ad.x + G.ad.w / 2, G.ad.y + G.ad.h], [G.ad.x + G.ad.w / 2, G.ad.y + G.ad.h + 30], [G.or.x + G.or.w / 2, G.or.y - 30], [G.or.x + G.or.w / 2, G.or.y + 10], 20));
      // grid by scenario group
      var gr = G.grid;
      G.gridPos = function (c) { var col = c.gi % gr.cols, row = Math.floor(c.gi / gr.cols); return [gr.x0[c.g] + col * gr.pitch, gr.bottom - (row + 1) * gr.pitch]; };
      var br = G.bars, ci = { q: 0, e: 1, l: 2 };
      G.barPos = function (c) {
        if (c.g === 2) return [G.compNote[0] - (PORT ? 0 : 120) + (c.gi % 24) * 4, G.compNote[1] - 30];
        var col = c.ci % br.cols, row = Math.floor(c.ci / br.cols);
        return [br.x0[ci[c.cls]] + col * br.pitch, br.bottom - (row + 1) * br.pitch];
      };
      G.rows = { e: Math.ceil(byClass.e.length / br.cols), l: Math.ceil(byClass.l.length / br.cols) };
      cache[key] = G;
      return G;
    }

    // misattributions per build, and when each cell turns clean
    function cellRed(c, t, G) {
      if (c.cls === 'q') return 0;
      var br = G.bars, row = Math.floor(c.ci / br.cols);
      if (c.cls === 'e') { var te = T.startFix + (row / G.rows.e) * 1.3 + c.h * 0.15; return t < te ? 1 : 0; }
      var tl = T.dispFix + (row / G.rows.l) * 1.3 + c.h * 0.15; return t < tl ? 1 : 0;
    }
    function flipTime(c, G) {
      var br = G.bars, row = Math.floor(c.ci / br.cols);
      if (c.cls === 'e') return T.startFix + (row / G.rows.e) * 1.3 + c.h * 0.15;
      if (c.cls === 'l') return T.dispFix + (row / G.rows.l) * 1.3 + c.h * 0.15;
      return 1e9;
    }
    function counterValue(t) {
      if (t < T.startFix) return 581;
      if (t < T.dispFix) return lerp(581, 174, P(t, T.startFix, T.startFix + 1.45, E.io));
      return lerp(174, 0, P(t, T.dispFix, T.dispFix + 1.45, E.io));
    }

    function drawTree(t, G, a) {
      if (a <= 0.004) return;
      tree.nodes.forEach(function (n) {
        if (!n.parent) return;
        var t0 = T.grow + (n.d - 1) * 0.68 + hash(n.id) * 0.18, p = P(t, t0, t0 + 0.62, E.out);
        if (p <= 0) return;
        var path = G.edgePath(n);
        strokePath(path, 0, p, C.line2, 1.6, a);
        if (p < 1) { var h = path.at(p); glow(h.x, h.y, 10, C.A, 0.6 * a); }
      });
      var r0 = P(t, T.grow - 0.3, T.grow, E.back);
      var rp = G.np(tree.nodes[0]);
      circle(rp[0], rp[1], 7 * r0, C.ink, a);
      glow(rp[0], rp[1], 26, C.ink, 0.3 * a * r0);
      tree.leaves.forEach(function (l) {
        var t0 = T.grow + 5 * 0.68 + 0.6, p = P(t, t0, t0 + 0.3, E.back);
        if (p <= 0) return;
        var q = G.np(l), lt = leafTime(l.li), on = P(t, lt, lt + 0.25);
        var col = on > 0 ? (l.bad ? C.mis : C.okHi) : C.ink3;
        circle(q[0], q[1], 5.5 * p, col, a);
        if (on > 0 && on < 1) ring(q[0], q[1], 6 + 16 * on, col, 2, (1 - on) * a);
      });
      // featured runs: highlight the path from the root to the leaf
      T.runs.forEach(function (rt, r) {
        var leaf = tree.leaves[tree.run[r]], k = [1, 0.7, 0.5][r];
        var hp = P(t, rt, rt + 0.6 * k, E.io), ha = win(t, rt, rt + 0.1, rt + 2.2 * k, rt + 2.6 * k);
        if (ha <= 0) return;
        var chain = []; for (var n = leaf; n.parent; n = n.parent) chain.unshift(n);
        chain.forEach(function (n, j) {
          var lp = clamp(hp * chain.length - j);
          if (lp > 0) strokePath(G.edgePath(n), 0, lp, '#ffffff', 2.6, ha);
          if (lp > 0 && lp < 1) { var h = G.edgePath(n).at(lp); glow(h.x, h.y, 18, C.ink, 0.7 * ha); }
        });
        // the schedule's messages travel to the adapter
        var tp = G.trainPath(leaf);
        for (var b = 0; b < 6; b++) {
          var u = P(t, rt + 0.6 * k + b * 0.05 * k, rt + 1.1 * k + b * 0.05 * k, E.io);
          if (u > 0 && u < 1) { var q = tp.at(u); glow(q.x, q.y, 12, b === 4 ? C.A : C.ink2, 0.8 * ha); circle(q.x, q.y, 3, C.white, ha); }
        }
      });
      // cascade: the rest of the leaves flash as they run
      if (t > T.cascade && t < T.cascade + 2.4) {
        tree.leaves.forEach(function (l) {
          if (tree.run.indexOf(l.li) >= 0) return;
          var lt = leafTime(l.li), f = win(t, lt - 0.25, lt - 0.1, lt, lt + 0.25);
          if (f <= 0) return;
          for (var n = l; n.parent; n = n.parent) strokePath(G.edgePath(n), 0, 1, '#ffffff', 1.4, 0.35 * f * a);
        });
      }
    }

    function drawMachine(t, G, a) {
      if (a <= 0.004) return;
      var sc = G.scen;
      panel(sc.x, sc.y, sc.w, sc.h, 'Scenario', { a: a, tsz: 20 });
      var my = PORT ? [sc.y + 64, sc.y + 92] : [sc.y + 92, sc.y + 140], mx = sc.x + 30, sp = PORT ? 26 : 34;
      if (PORT) { mx = sc.x + 150; my = [sc.y + 40, sc.y + 76]; }
      line(mx - 10, my[0], mx + 4 * sp + 10, my[0], C.line, 1.5, a); line(mx - 10, my[1], mx + sp + 10, my[1], C.line, 1.5, a);
      for (var i = 0; i < 5; i++) { circle(mx + i * sp, my[0], 8, C.card2, a); ring(mx + i * sp, my[0], 8, i < 2 ? C.A : C.B, 2, a); }
      for (i = 0; i < 2; i++) { circle(mx + i * sp, my[1], 8, C.card2, a); ring(mx + i * sp, my[1], 8, C.A, 2, a); }
      if (!PORT) {
        var rules = ['each thread in order', 'any order across threads', 'c only after its spawn', 'B only after A ends'];
        rules.forEach(function (r, j) { circle(sc.x + 32, sc.y + 196 + j * 44, 3, C.ink3, a); txt(r, sc.x + 46, sc.y + 197 + j * 44, { sz: 16, c: C.ink2, a: a }); });
      } else {
        txt('each thread in order,', sc.x + 290, sc.y + 40, { sz: 14, c: C.ink2, a: a });
        txt('any order across threads', sc.x + 290, sc.y + 62, { sz: 14, c: C.ink2, a: a });
      }
      // adapter box
      var ad = G.ad, act = 0;
      T.runs.forEach(function (rt, r) { var k = [1, 0.7, 0.5][r]; act = Math.max(act, win(t, rt + 1.0 * k, rt + 1.15 * k, rt + 1.5 * k, rt + 1.8 * k)); });
      if (t > T.cascade && t < T.cascade + 2.0) act = Math.max(act, 0.6 + 0.4 * Math.sin(t * 30));
      panel(ad.x, ad.y, ad.w, ad.h, 'codex-acp', { a: a, tsz: 20, hi: C.A, hiA: act });
      txt('unmodified build', ad.x + 24, ad.y + 64, { sz: 15, c: C.ink3, a: a });
      txt('fresh process per schedule', ad.x + 24, ad.y + 88, { sz: 15, c: C.ink3, a: a });
      var sx = ad.x + ad.w - 40, sy = ad.y + 36, spin = t * 5;
      arc(sx, sy, 12, spin, spin + 4.6, act > 0.05 ? C.A : C.ink4, 2.6, a);
      // oracle box
      var or = G.or;
      panel(or.x, or.y, or.w, or.h, 'Oracle', { a: a, tsz: 20 });
      txt(PORT ? 'hidden ledger' : 'hidden ledger: who each edit was made for', or.x + 24, or.y + 62, { sz: PORT ? 13 : 15, c: C.ink3, a: a });
      var ly = PORT ? [or.y + 100, or.y + 136] : [or.y + 112, or.y + 156];
      var cmp = 0;
      T.runs.forEach(function (rt, r) { var k = [1, 0.7, 0.5][r]; cmp = Math.max(cmp, win(t, rt + 1.55 * k, rt + 1.7 * k, rt + 2.2 * k, rt + 2.5 * k)); });
      fillRR(or.x + 16, ly[0] - 17, or.w - 32, 34, 8, C.A, 0.12 * cmp * a);
      docIcon(or.x + 36, ly[0], C.A, a); txt('a.txt', or.x + 54, ly[0] + 1, { sz: 17, w: 600, mono: true, a: a });
      txt('made for', or.x + (PORT ? 120 : 130), ly[0] + 1, { sz: 15, c: C.ink3, a: a }); token(or.x + or.w - (PORT ? 40 : 46), ly[0], 'A', C.A, { r: 12, a: a });
      docIcon(or.x + 36, ly[1], C.B, a); txt('b.txt', or.x + 54, ly[1] + 1, { sz: 17, w: 600, mono: true, a: a });
      txt('made for', or.x + (PORT ? 120 : 130), ly[1] + 1, { sz: 15, c: C.ink3, a: a }); token(or.x + or.w - (PORT ? 40 : 46), ly[1], 'B', C.B, { r: 12, a: a });
      // report travelling from adapter to oracle, then the verdict
      T.runs.forEach(function (rt, r) {
        var k = [1, 0.7, 0.5][r], leaf = tree.leaves[tree.run[r]];
        var u = P(t, rt + 1.2 * k, rt + 1.6 * k, E.io);
        if (u > 0 && u < 1) { var q = G.repPath.at(u); tag(leaf.bad ? 'B: a.txt, b.txt' : 'B: b.txt', q.x, q.y, C.B, a, { sz: 14 }); }
        var lp = P(t, rt + 1.75 * k, rt + 2.1 * k, E.lin), lo = 1 - P(t, rt + 2.4 * k, rt + 2.7 * k);
        if (lp > 0) lamp(G.lamp[0], G.lamp[1], PORT ? 22 : 30, leaf.bad, lp, lo * a, { label: leaf.bad ? 'misattribution' : 'clean', ly: (PORT ? 22 : 30) + 26 });
      });
      if (t > T.cascade && t < T.cascade + 2.3) {
        var idx = Math.min(NL - 1, Math.floor((t - T.cascade) / (1.9 / NL)));
        var cb = tree.leaves[idx].bad, fl = 0.6 + 0.4 * Math.sin(t * 40);
        lamp(G.lamp[0], G.lamp[1], PORT ? 22 : 30, cb, 1, a * fl * (1 - P(t, T.cascade + 1.9, T.cascade + 2.3)), {});
      }
    }

    function drawCells(t, G) {
      var gr = G.grid, br = G.bars;
      var inMorph = t < T.regroup;
      var mAll = P(t, T.morph, T.morph + 0.3);
      if (mAll <= 0) return;
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i], x, y, s = 1, a = 1, sz;
        if (inMorph) {
          var leaf = tree.leaves[i % NL], src = G.np(leaf), dst = G.gridPos(c);
          var rowf = Math.floor(c.gi / gr.cols) / Math.ceil(groups[c.g].length / gr.cols);
          var t0 = T.morph + rowf * 1.5 + c.h * 0.3 + c.g * 0.12, u = P(t, t0, t0 + 1.0, E.io);
          if (u <= 0) continue;
          var mx = (src[0] + dst[0]) / 2 + (c.h2 - 0.5) * 50, my = Math.min(src[1], dst[1]) - 40 - c.h2 * 40;
          var m = 1 - u;
          x = m * m * src[0] + 2 * m * u * mx + u * u * dst[0]; y = m * m * src[1] + 2 * m * u * my + u * u * dst[1];
          sz = lerp(5, gr.cell, u); a = clamp(u * 3);
          var red = c.cls !== 'q';
          fillRR(x, y, sz, sz, sz * 0.22, red ? C.mis : C.ok, a);
          if (u < 1) glow(x + sz / 2, y + sz / 2, sz * 1.6, red ? C.mis : C.okHi, 0.25 * (1 - u));
        } else {
          var from = G.gridPos(c), to = G.barPos(c);
          var t1 = T.regroup + c.h * 0.9 + (c.cls === 'e' ? 0.15 : c.cls === 'l' ? 0.3 : 0), u2 = P(t, t1, t1 + 1.25, E.io);
          var lift = (c.g === 2 ? 40 : -90 - c.h2 * 60) * Math.sin(Math.PI * u2);
          x = lerp(from[0], to[0], u2); y = lerp(from[1], to[1], u2) + lift;
          sz = lerp(gr.cell, c.g === 2 ? 3 : br.cell, u2);
          a = c.g === 2 ? 1 - P(t, t1 + 0.6, t1 + 1.25) : 1;
          if (a <= 0.004) continue;
          var r2 = c.cls === 'q' ? 0 : cellRed(c, t, G);
          var ft = flipTime(c, G), flash = c.cls !== 'q' ? win(t, ft - 0.05, ft, ft + 0.05, ft + 0.5) : 0;
          var col = r2 ? C.mis : C.ok;
          // during the original-build segment, failing bars breathe
          fillRR(x, y, sz, sz, sz * 0.22, col, a);
          if (flash > 0) { fillRR(x, y, sz, sz, sz * 0.22, C.okHi, 0.8 * flash); glow(x + sz / 2, y + sz / 2, sz * 1.6, C.okHi, 0.22 * flash); }
        }
      }
    }

    function drawGridLabels(t, G) {
      var gr = G.grid, a = win(t, T.morph + 1.4, T.morph + 2.0, T.regroup, T.regroup + 0.4);
      if (a <= 0) return;
      var names = PORT ? ['A cancelled', 'A interrupted', 'A completed'] : ['A cancelled by the user', 'A interrupted', 'A completed'];
      var w = gr.cols * gr.pitch;
      [504, 308, 144].forEach(function (n, g) {
        var cx = gr.x0[g] + w / 2;
        txt(names[g], cx, gr.lblY, { sz: PORT ? 14 : 18, w: 650, c: C.ink2, al: 'center', a: a });
        txt(n + ' schedules', cx, gr.lblY + (PORT ? 20 : 26), { sz: PORT ? 13 : 16, c: C.ink3, al: 'center', a: a });
      });
    }
    function drawBarLabels(t, G) {
      var br = G.bars, a = P(t, T.regroup + 1.2, T.regroup + 1.8);
      if (a <= 0) return;
      var w = br.cols * br.pitch;
      var L = [['no edit in B', 231, 'q'], ['early start', 407, 'e'], ['late start', 174, 'l']];
      L.forEach(function (l, k) {
        var cx = br.x0[k] + w / 2;
        var hot = k === 0 ? 0 : (k === 1 ? win(t, T.orig + 0.6, T.orig + 1.0, T.startFix, T.startFix + 0.4) : win(t, T.orig + 0.6, T.orig + 1.0, T.dispFix, T.dispFix + 0.4));
        txt(l[0], cx, br.lblY, { sz: PORT ? 14 : 18, w: 650, c: hot > 0.5 ? C.ink : C.ink2, al: 'center', a: a });
        txt(String(l[1]), cx, br.lblY + (PORT ? 20 : 26), { sz: PORT ? 13 : 16, c: C.ink3, al: 'center', a: a });
      });
      var ca = P(t, T.regroup + 1.4, T.regroup + 2.0);
      var cn = G.compNote, lines = PORT ? ['A completed: 144 more schedules, clean on every build'] : ['A completed: 144 more schedules, clean on every build'];
      txt(lines[0], cn[0], cn[1], { sz: PORT ? 13 : 15, c: C.ink3, al: G.compAl, a: ca });
    }
    function drawCounter(t, G) {
      var a = P(t, T.count - 0.2, T.count + 0.5);
      if (a <= 0) return;
      var v = counterValue(t), c = v < 0.5 ? C.ink : C.mis, k = G.counter, kl = G.cntLbl;
      if (G.counter2) { var mv = P(t, T.regroup, T.regroup + 1.2, E.io); k = [lerp(G.counter[0], G.counter2[0], mv), lerp(G.counter[1], G.counter2[1], mv)]; kl = [k[0], lerp(G.cntLbl[1], G.cntLbl2[1], mv)]; }
      var label = t < T.start ? 'original adapter' : t < T.disp ? 'start-time binding' : 'dispatch-time binding';
      var la = t < T.start ? 1 : t < T.disp ? win(t, T.start, T.start + 0.5, 99, 100) : P(t, T.disp, T.disp + 0.5);
      if (t > T.start - 0.5 && t < T.start) la = 1 - P(t, T.start - 0.5, T.start);
      if (t > T.disp - 0.5 && t < T.disp) la = 1 - P(t, T.disp - 0.5, T.disp);
      txt(label.toUpperCase(), k[0], k[1] - G.cntSz * 0.72, { sz: PORT ? 12 : 14, w: 700, c: C.ink3, al: 'right', a: a * la });
      if (v < 0.5) glow(k[0] - G.cntSz * 0.3, k[1], G.cntSz * 1.4, C.okHi, 0.25 * a * P(t, T.dispFix + 1.4, T.dispFix + 1.8));
      odometer(k[0], k[1], v, { sz: G.cntSz, c: c, a: a, al: 'right', max: 581 });
      var lines = wrap('of 956 schedules put an edit made for A in B’s report', G.cntW * (PORT ? 0.55 : 1), PORT ? 14 : 17, 500);
      for (var i = 0; i < lines.length; i++) txt(lines[i], k[0], kl[1] + i * (PORT ? 19 : 23), { sz: PORT ? 14 : 17, c: C.ink2, al: 'right', a: a });
    }

    // ----- the binding panel -----
    function drawPanel(t, G) {
      var pa = win(t, T.orig - 0.4, T.orig + 0.3, T.cost - 0.4, T.cost);
      if (pa <= 0) return;
      var pn = G.pan, tl = G.tl;
      panel(pn.x, pn.y, pn.w, pn.h, null, { a: pa });
      var stage = t < T.start ? 0 : t < T.disp ? 1 : 2;
      var names = ['Original adapter', 'Start-time binding', 'Dispatch-time binding'];
      var descs = ['Credits each edit to the request that is current when the edit arrives.',
        'Ties c to the request that is current when c’s start message arrives.',
        'Ties c to the turn that sent the spawn item. Codex sends that item under A’s turn, naming c’s thread.'];
      var bounds = [T.orig, T.start, T.disp, T.cost];
      var sa = win(t, bounds[stage], bounds[stage] + 0.4, bounds[stage + 1] - 0.35, bounds[stage + 1]);
      if (stage === 2) sa = win(t, bounds[2], bounds[2] + 0.4, 999, 1000);
      var sl = (1 - P(t, bounds[stage], bounds[stage] + 0.5, E.out5)) * 24;
      txt(names[stage], pn.x + 36 + sl, pn.y + (PORT ? 30 : 64), { sz: PORT ? 24 : 34, w: 760, a: pa * sa });
      para(descs[stage], pn.x + 36 + sl, pn.y + (PORT ? 62 : 110), pn.w - 72, { sz: PORT ? 15 : 19, c: C.ink2, a: pa * sa, lh: PORT ? 20 : 27 });
      // c's start: early or late?
      var cs;
      if (stage === 0) cs = 0.5 + 0.5 * Math.sin((t - T.orig - 1.2) * 1.6 - Math.PI / 2) * (t > T.orig + 1.2 ? 1 : 0) - (t > T.orig + 1.2 ? 0 : 0.5);
      else if (stage === 1) cs = P(t, T.late, T.late + 1.0, E.io);
      else cs = 0.5 + 0.5 * Math.sin((t - T.dispFix + 1.0) * 1.7);
      cs = clamp(cs);
      var xC = lerp(tl.early, tl.late, cs), y = tl.y;
      // timeline: the line is coloured by the current request
      line(tl.x0, y, tl.bstart - 3, y, C.A, 6, pa); line(tl.bstart + 3, y, tl.x1, y, C.B, 6, pa);
      txt('current request', tl.x0, y - 22, { sz: PORT ? 12 : 14, w: 600, c: C.ink3, a: pa });
      function tick(x, c, l1, row, hi) {
        circle(x, y, PORT ? 8 : 10, C.card, pa); ring(x, y, PORT ? 8 : 10, c, 3, pa);
        if (hi) glow(x, y, 30, c, 0.5 * pa * hi);
        txt(l1, x, row === 1 ? tl.lbl1 : tl.lbl2, { sz: PORT ? 13 : 16, w: 600, c: C.ink2, al: 'center', a: pa });
      }
      tick(tl.spawn, C.A, 'A spawns c', 1);
      tick(tl.bstart, C.B, 'B starts', 1);
      tick(tl.bend, C.B, 'B ends', 1);
      tick(tl.edit, C.A, 'a.txt arrives', 2);
      tick(xC, C.A, 'c started', 2);
      // the pin: where this build reads the owner
      var px = stage === 0 ? tl.edit : stage === 1 ? xC : tl.spawn;
      var mv = stage === 1 ? P(t, T.start, T.start + 0.8, E.io) : stage === 2 ? P(t, T.disp, T.disp + 0.8, E.io) : 1;
      var prevX = stage === 1 ? tl.edit : stage === 2 ? lerp(tl.early, tl.late, 1) : px;
      var pinX = lerp(prevX, px, mv), hop = Math.sin(Math.PI * mv) * (PORT ? 30 : 46);
      var pinY = tl.pin - hop, pr = PORT ? 12 : 16;
      var owner = pinX < tl.bstart ? 'A' : 'B', oc = owner === 'A' ? C.A : C.B;
      var settled = mv >= 1;
      line(pinX, pinY + pr, pinX, y - (PORT ? 10 : 12), C.ink, 2, pa);
      glow(pinX, pinY, pr * 2.6, C.ink, 0.35 * pa);
      circle(pinX, pinY, pr, C.ink, pa); circle(pinX, pinY, pr * 0.4, C.bg0, pa);
      if (settled) tag('reads ' + owner, pinX, tl.read, oc, pa * P(t, (stage === 0 ? T.orig + 0.6 : stage === 1 ? T.start + 0.8 : T.disp + 0.8), (stage === 0 ? T.orig + 0.9 : stage === 1 ? T.start + 1.1 : T.disp + 1.1)), { sz: PORT ? 13 : 16, tc: oc });
      // outcome
      var bad = owner === 'B';
      var oa = pa * (settled ? 1 : 0) * P(t, (stage === 0 ? T.orig + 0.9 : stage === 1 ? T.start + 1.1 : T.disp + 1.1), (stage === 0 ? T.orig + 1.3 : stage === 1 ? T.start + 1.5 : T.disp + 1.5));
      var oy = tl.out, lr = PORT ? 15 : 20;
      if (oa > 0) {
        lamp(pn.x + 36 + lr, oy, lr, bad, 1, oa, {});
        txt(bad ? 'a.txt goes into B’s report' : 'a.txt stays out of B’s report', pn.x + 36 + lr * 2 + 14, oy + 1, { sz: PORT ? 16 : 21, w: 650, c: bad ? C.mis : C.ink, a: oa });
        var why = stage === 0 ? 'early start or late, it fails' : stage === 1 ? (cs < 0.5 ? 'c started early: fixed' : 'c started late: still wrong') : 'early start or late, it holds';
        txt(why, pn.x + 36 + lr * 2 + 14, oy + (PORT ? 22 : 30), { sz: PORT ? 13 : 16, c: C.ink3, a: oa });
      }
    }

    function drawCost(t, G) {
      var a1 = P(t, T.cost, T.cost + 0.6, E.out), a2 = P(t, T.claude, T.claude + 0.6, E.out);
      if (a1 <= 0) return;
      var pn = G.pan, gap = PORT ? 12 : 22, h = (pn.h - gap) / 2;
      function card(y, a, accent, big, small, body) {
        var sl = (1 - a) * 30;
        panel(pn.x, y + sl, pn.w, h, null, { a: a });
        fillRR(pn.x, y + sl + 18, 5, h - 36, 3, accent, a);
        txt(big, pn.x + 36, y + sl + (PORT ? 40 : 66), { sz: PORT ? 32 : 52, w: 760, c: accent, a: a });
        var bw = tw(big, PORT ? 32 : 52, 760);
        txt(small, pn.x + 48 + bw, y + sl + (PORT ? 42 : 70), { sz: PORT ? 14 : 18, w: 600, c: C.ink2, a: a });
        para(body, pn.x + 36, y + sl + (PORT ? 80 : 128), pn.w - 72, { sz: PORT ? 14 : 18, c: C.ink2, a: a, lh: PORT ? 19 : 26 });
      }
      card(pn.y, a1, C.miss, '226', 'of 996', 'The price of dispatch-time binding: work it cannot tie to a dispatch is left out, and the report says it may be incomplete. In sibling and grandchild scenarios, B’s own child edit goes missing.');
      if (a2 > 0) card(pn.y + h + gap, a2, C.B, '39 → 0', 'of 111', 'The Claude adapter misattributes in 39 of 111 schedules. Start-time binding removes all 39 there, though it still failed one live run in which the CLI resumed a subagent.');
    }

    function draw(t) {
      var G = geo();
      var ma = P(t, T.build, T.build + 0.8, E.out) * (1 - P(t, T.morph, T.morph + 0.8));
      drawMachine(t, G, ma);
      drawTree(t, G, P(t, T.build, T.build + 0.5) * (1 - P(t, T.morph + 0.4, T.morph + 1.4)));
      drawCells(t, G);
      drawGridLabels(t, G);
      drawBarLabels(t, G);
      drawCounter(t, G);
      drawPanel(t, G);
      drawCost(t, G);
    }
    function over(t) {
      heading(4, 'Turnstile', t, 0.1, T.chap - 0.2);
      heading(5, 'Two fixes', t, T.chap, T.end - 0.3);
    }
    return {
      dur: T.end, draw: draw, over: over,
      chapters: [[0, 'Turnstile'], [T.chap, 'Two fixes']],
      caps: [
        [0.2, 'Turnstile runs the real, unmodified adapter against a scripted Codex and feeds it one message at a time.'],
        [1.6, 'Wherever more than one thread could deliver next, it branches. Each path through this tree is one schedule.'],
        [6.0, 'Each schedule runs in a fresh adapter process. An oracle checks every report against a hidden ledger of who each edit was made for.'],
        [12.4, 'No language model is involved. Every failing schedule is re-run three times and counts only if it fails the same way each time.'],
        [14.6, 'Three Codex scenario groups, with A cancelled, interrupted or completed, give 956 schedules. Each square is one of them, coloured from the final runs.'],
        [17.6, 'On the original adapter, 581 of the 956 put an edit made for A in B’s report.'],
        [21.2, 'Sort them by when c’s edit reaches the adapter: not during B at all, or during B with c started before or after B.'],
        [24.6, 'The original adapter credits the edit when it arrives, so every edit that arrives during B fails, whenever c started.'],
        [29.4, 'Start-time binding ties c to the request that is current when c’s start message arrives.'],
        [31.2, 'If c started before B, that is A, and the edit stays out of B’s report. 407 schedules are fixed.'],
        [34.2, 'But c’s start message can itself arrive after B starts. Then c is tied to B, and 174 schedules still fail.'],
        [38.2, 'Dispatch-time binding reads the spawn item instead. Codex sends it under A’s turn, and it names c’s thread.'],
        [40.8, 'The order no longer matters. In every scenario we ran, no schedule misattributes.'],
        [46.2, 'The price: work it cannot tie to a dispatch is left out, and the report says it may be incomplete. In sibling and grandchild scenarios that drops B’s own child edit in 226 of 996 schedules.'],
        [50.0, 'On the Claude adapter, 39 of 111 schedules misattribute, and start-time binding removes all 39.']
      ]
    };
  })();
  // ======================================================================
  // Scene 4: Theorem 1, and what would fix it
  // ======================================================================
  var S4 = (function () {
    var T = { q: 0.3, s0: 2.4, dt: 1.15, glass: 12.4, merge: 14.0, list: 16.4, leave: 18.4, thm: 21.4, out: 25.6, root: 26.2, split: 27.4, end: 33.4 };
    function sk(k) { return T.s0 + k * T.dt; }
    var LBL = ['spawn c', 'mail item', 'A ended', 'B started', 'mail item', 'c interrupted', 'turn started', 'x edited'];
    var cache = {};
    function geo() {
      var key = PORT ? 'p' : 'l';
      if (cache[key]) return cache[key];
      var G = PORT ? {
        pan: [{ x: 16, y: 66, w: 528, h: 268 }, { x: 16, y: 350, w: 528, h: 268 }], root: 88, child: 160, x0: 128, dx: 52, rowOff: 238, glassH: 206,
        lblX: 20, mergeY: 695, mergeX: 0, ad: { x: 190, y: 806, w: 180, h: 40 }, opt: [[130, 880], [430, 880]], outY: 916, sz: 13, bead: 9, split: 45
      } : {
        pan: [{ x: 60, y: 110, w: 700, h: 420 }, { x: 840, y: 110, w: 700, h: 420 }], root: 150, child: 300, x0: 178, dx: 68, rowOff: 492, glassH: 420,
        lblX: 28, mergeY: 628, mergeX: 800, ad: { x: 710, y: 746, w: 180, h: 46 }, opt: [[470, 832], [1130, 832]], outY: 868, sz: 15, bead: 11, split: 46
      };
      G.X = function (r, k) { return G.pan[r].x + G.x0 + k * G.dx; };
      G.rowY = function (r) { return G.pan[r].y + G.rowOff; };
      G.rowShift = function (r) {   // where each run's row goes when the two are laid on top of each other
        if (PORT) return [0, G.mergeY - G.rowY(r)];
        var mid = (G.X(r, 0) + G.X(r, 7)) / 2;
        return [G.mergeX - mid, G.mergeY - G.rowY(r)];
      };
      cache[key] = G;
      return G;
    }
    function envelope(x, y, task, a, s) {
      s = s || 1;
      var w = 30 * s, h = 21 * s;
      if (a <= 0.004) return;
      if (task) { glow(x, y, 26 * s, C.miss, 0.3 * a); fillRR(x - w / 2, y - h / 2, w, h, 4, C.miss, a); }
      else { fillRR(x - w / 2, y - h / 2, w, h, 4, C.card2, a); strokeRR(x - w / 2, y - h / 2, w, h, 4, C.ink2, 1.6, a); }
      X.beginPath(); X.moveTo(x - w / 2 + 2, y - h / 2 + 2); X.lineTo(x, y + 1 * s); X.lineTo(x + w / 2 - 2, y - h / 2 + 2);
      X.strokeStyle = task ? C.bg0 : C.ink2; X.lineWidth = 1.5; alpha(a); X.stroke();
    }

    function drawRun(t, G, r) {
      var pn = G.pan[r], a = P(t, T.q + 0.2, T.q + 1.0, E.out), rY = pn.y + G.root, cY = pn.y + G.child;
      var taskFirst = r === 0;   // in E the first mail is the task; in E' the second
      var oc = r === 0 ? C.A : C.B;   // owner of x
      var flashBad = r === 0 ? win(t, T.list + 0.3, T.list + 0.6, T.thm - 0.6, T.thm) : win(t, T.leave + 0.3, T.leave + 0.6, T.thm - 0.6, T.thm);
      var hi = flashBad > 0 ? (r === 0 ? C.mis : C.miss) : null;
      panel(pn.x, pn.y, pn.w, pn.h, null, { a: a, hi: hi, hiA: flashBad });
      txt(r === 0 ? 'Run E' : 'Run E′', pn.x + G.lblX, pn.y + (PORT ? 28 : 40), { sz: PORT ? 20 : 26, w: 760, a: a });
      txt('inside Codex', pn.x + G.lblX + (PORT ? 78 : 104), pn.y + (PORT ? 29 : 41), { sz: PORT ? 13 : 15, c: C.ink3, a: a });
      txt('root', pn.x + G.lblX, rY + 1, { sz: G.sz, w: 600, c: C.ink3, a: a });
      txt('subagent c', pn.x + G.lblX, cY + 1, { sz: G.sz, w: 600, c: C.ink3, a: a });
      var lx0 = G.X(r, 0) - 24, lx1 = G.X(r, 7) + 34;
      line(lx0, rY, lx1, rY, C.line, 2, a); line(lx0, cY, lx1, cY, C.line, 2, a, [3, 6]);
      var X0 = G.X(r, 0);
      // A's turn
      if (t > sk(0)) {
        var ae = Math.min(G.X(r, 2), lerp(X0, G.X(r, 2), P(t, sk(0), sk(2), E.lin)));
        line(X0, rY, ae, rY, C.A, 5, a);
        if (t < sk(2)) glow(ae, rY, 16, C.A, 0.7 * a); else line(ae, rY - 9, ae, rY + 9, C.A, 3, a);
        txt('A', X0 - 12, rY - (PORT ? 14 : 18), { sz: G.sz, w: 750, c: C.A, a: a });
        // spawn, and c's first turn v
        var br = P(t, sk(0) + 0.1, sk(0) + 0.6, E.io);
        var bp = new Path(cub([X0, rY], [X0, lerp(rY, cY, 0.6)], [X0 + 14, lerp(cY, rY, 0.4)], [X0 + 14, cY], 20));
        strokePath(bp, 0, br, C.A, 2.5, a);
        if (br >= 1) {
          var ve = Math.min(G.X(r, 5), lerp(X0 + 14, G.X(r, 5), P(t, sk(0) + 0.6, sk(5), E.lin)));
          line(X0 + 14, cY, ve, cY, C.A, 5, a);
          if (t < sk(5)) glow(ve, cY, 16, C.A, 0.7 * a); else { line(ve, cY - 9, ve, cY + 9, C.A, 3, a); }
          txt('v', X0 + 30, cY - (PORT ? 13 : 16), { sz: G.sz, w: 700, c: C.ink2, a: a });
        }
      }
      // B's turn
      if (t > sk(3)) {
        var b0 = G.X(r, 3), be = lerp(b0, G.X(r, 7) + 30, P(t, sk(3), sk(7) + 0.8, E.lin));
        line(b0, rY, be, rY, C.B, 5, a);
        if (t < sk(7) + 0.8) glow(be, rY, 16, C.B, 0.7 * a); else line(be, rY - 9, be, rY + 9, C.B, 3, a);
        txt('B', b0 - 12, rY - (PORT ? 14 : 18), { sz: G.sz, w: 750, c: C.B, a: a });
      }
      // the two mails: same item on the wire, but one is a task and one is a plain message
      [1, 4].forEach(function (k, m) {
        if (t < sk(k)) return;
        var task = (m === 0) === taskFirst, ex = G.X(r, k);
        var u = P(t, sk(k), sk(k) + 0.55, E.io), park = [ex, cY - (PORT ? 30 : 44)];
        var pos = [ex, lerp(rY, park[1], u)];
        var into = P(t, sk(6) + 0.1, sk(6) + 0.65, E.io);
        if (into > 0) { pos = [lerp(park[0], G.X(r, 6), into), lerp(park[1], cY, into) - Math.sin(Math.PI * into) * 22]; }
        var ea = a * (1 - P(t, sk(6) + 0.55, sk(6) + 0.75));
        envelope(pos[0], pos[1], task, ea, PORT ? 0.85 : 1);
        txt(task ? 'task' : 'message', pos[0], pos[1] - (PORT ? 18 : 24), { sz: PORT ? 12 : 14, w: 650, c: task ? C.miss : C.ink2, al: 'center', a: ea * P(t, sk(k) + 0.4, sk(k) + 0.7) });
      });
      // the new turn u takes both mails; its parent is the task's sender
      if (t > sk(6)) {
        var ux = G.X(r, 6), pop = P(t, sk(6), sk(6) + 0.5, E.spring);
        var tx = G.X(r, taskFirst ? 1 : 4);
        var lp = P(t, sk(6) + 0.6, sk(6) + 1.2, E.io);
        var lk = new Path(cub([ux, cY], [ux, lerp(cY, rY, 0.7)], [tx, lerp(rY, cY, 0.5)], [tx, rY], 24));
        strokePath(lk, 0, lp, oc, 2.2, a, [5, 4]);
        if (lp > 0 && lp < 1) { var hp = lk.at(lp); glow(hp.x, hp.y, 14, oc, 0.8 * a); }
        if (lp >= 1) { ring(tx, rY, 9, oc, 2, a); txt('parent', tx + (PORT ? 0 : 0), rY + (PORT ? 18 : 22), { sz: PORT ? 12 : 14, w: 650, c: oc, al: 'center', a: a * P(t, sk(6) + 1.1, sk(6) + 1.4) }); }
        var ue = lerp(ux, G.X(r, 7) + 24, P(t, sk(6) + 0.3, sk(7) + 0.8, E.lin));
        if (ue > ux + 12) line(ux + 12, cY, ue, cY, oc, 5, a);
        circle(ux, cY, 12 * pop, C.card2, a); ring(ux, cY, 12 * pop, oc, 2.4, a);
        txt('u', ux, cY + 1, { sz: 15 * pop, w: 700, al: 'center', a: a });
      }
      // u edits x
      if (t > sk(7)) {
        var xp = P(t, sk(7), sk(7) + 0.5, E.spring);
        fileChip(G.X(r, 7) + 6, cY + (PORT ? 34 : 48), 'x', { truth: oc, s: xp, a: a, sz: PORT ? 15 : 18 });
        txt(r === 0 ? 'x is A’s work' : 'x is B’s work', G.X(r, 7) - (PORT ? 40 : 52), cY + (PORT ? 34 : 48), { sz: PORT ? 13 : 15, w: 650, c: oc, al: 'right', a: a * P(t, sk(7) + 0.4, sk(7) + 0.8) });
      }
      // the frosted glass: what the adapter cannot see
      var g = P(t, T.glass, T.glass + 0.9, E.io), lift = P(t, T.out - 0.2, T.out + 0.6, E.io) * 0.55;
      var gh = G.glassH * g;
      if (g > 0) {
        X.save(); rr(pn.x + 1, pn.y + 1, pn.w - 2, gh - 2, 17); X.clip();
        alpha(0.86 * (1 - lift) * a); X.fillStyle = C.bg0; X.fillRect(pn.x, pn.y, pn.w, gh);
        X.strokeStyle = '#ffffff'; X.lineWidth = 1; alpha(0.035 * a);
        X.beginPath(); for (var hx = pn.x - pn.h; hx < pn.x + pn.w; hx += 12) { X.moveTo(hx, pn.y + G.glassH); X.lineTo(hx + G.glassH, pn.y); } X.stroke();
        X.restore();
        var ga = a * P(t, T.glass + 0.5, T.glass + 1.0) * clamp(1 - lift * 3);
        var gy = pn.y + G.glassH * (PORT ? 0.52 : 0.46);
        var gl = flashBad > 0 ? (r === 0 ? 'x was A’s work: wrong' : 'B’s own edit is missing') : 'hidden from the adapter';
        var gc = flashBad > 0 ? (r === 0 ? C.mis : C.miss) : C.ink2;
        txt(r === 0 ? 'Run E' : 'Run E′', pn.x + pn.w / 2, gy - (PORT ? 24 : 34), { sz: PORT ? 20 : 28, w: 760, al: 'center', a: ga });
        txt(gl, pn.x + pn.w / 2, gy + (PORT ? 6 : 8), { sz: PORT ? 15 : 20, w: 650, c: gc, al: 'center', a: ga });
      }
    }

    // what the adapter sees: the same eight typed messages in both runs
    function drawRows(t, G) {
      var m = P(t, T.merge, T.merge + 1.2, E.io), sp = P(t, T.split, T.split + 1.0, E.io);
      var la = P(t, T.s0, T.s0 + 0.5);
      for (var r = 0; r < 2; r++) {
        var pn = G.pan[r], ry = G.rowY(r), sh = G.rowShift(r), dy = (r === 0 ? -1 : 1) * sp * G.split;
        var ox = sh[0] * m, oy = sh[1] * m + dy;
        if (r === 1) oy += (PORT ? 0 : 0);
        if (!PORT || m < 1) txt(r === 0 ? 'E: the adapter sees' : 'E′: the adapter sees', pn.x + G.lblX, ry - (PORT ? 26 : 34), { sz: G.sz, w: 650, c: C.ink3, a: la * (1 - m) });
        if (!PORT) line(G.X(r, 0) - 24 + ox, ry + oy, G.X(r, 7) + 24 + ox, ry + oy, C.line, 1.5, la * (1 - m * 0.5));
        else line(G.X(r, 0) - 24, ry + oy, G.X(r, 7) + 24, ry + oy, C.line, 1.5, la);
        for (var k = 0; k < 8; k++) {
          var e = P(t, sk(k) + 0.3, sk(k) + 0.7, E.io);
          if (e <= 0) continue;
          var bx = G.X(r, k) + ox, by = lerp(ry - (PORT ? 40 : 60), ry, e) + oy;
          var tagged = k === 6 ? P(t, T.root + r * 0.25, T.root + r * 0.25 + 0.5, E.back) : 0;
          var bc = tagged > 0 ? (r === 0 ? C.A : C.B) : C.ink2;
          circle(bx, by, G.bead, C.card2, e); ring(bx, by, G.bead, bc, 2.2, e);
          if (e < 1) glow(bx, by, 18, C.ink2, 0.5 * (1 - e));
          var labA = e * (r === 0 || m < 0.5 || sp > 0.3 ? 1 : 0);
          if (r === 1 && m > 0.5 && sp < 0.3) labA = 0;
          var below = k % 2 === 0;
          var ly = by + (r === 1 && m > 0.3 && !(sp > 0.3) ? 1 : 1) * (below ? G.bead + 14 : G.bead + 32);
          if (r === 0 && sp > 0.3 && !PORT) ly = by - (below ? G.bead + 12 : G.bead + 30);
          txt(LBL[k], bx, ly, { sz: PORT ? 11 : 13, w: 550, c: C.ink3, al: 'center', a: labA });
          if (tagged > 0) tag(r === 0 ? 'root: A' : 'root: B', bx, by + (PORT ? -21 : (r === 0 ? 1 : -1) * 25), r === 0 ? C.A : C.B, tagged, { sz: PORT ? 11 : 13, tc: r === 0 ? C.A : C.B });
        }
      }
      // identical
      var ia = win(t, T.merge + 1.1, T.merge + 1.5, T.split - 0.2, T.split + 0.2);
      if (ia > 0) {
        var cx = PORT ? 280 : G.mergeX, cy = G.mergeY - (PORT ? 34 : 46);
        tag('identical input in E and E′', cx, cy, C.ink, ia, { sz: PORT ? 13 : 16 });
        var pulse = P(t, T.merge + 1.1, T.merge + 1.9, E.out);
        if (pulse < 1) { var x0 = G.X(0, 0) + G.rowShift(0)[0] - 30, x1 = G.X(0, 7) + G.rowShift(0)[0] + 30; strokeRR(x0 - 20 * pulse, G.mergeY - 22 - 10 * pulse, x1 - x0 + 40 * pulse, 44 + 20 * pulse, 22, C.ink, 2, 1 - pulse); }
      }
    }

    function drawDilemma(t, G) {
      var a = win(t, T.list - 0.3, T.list + 0.2, T.thm - 0.6, T.thm);
      var a2 = win(t, T.split + 0.6, T.split + 1.0, T.end - 0.6, T.end);
      if (a <= 0 && a2 <= 0) return;
      var ad = G.ad, A = Math.max(a, a2);
      line(ad.x + ad.w / 2, G.mergeY + (a2 > 0 ? G.split + (PORT ? 52 : 46) : (PORT ? 48 : 46)), ad.x + ad.w / 2, ad.y, C.line2, 2, A);
      fillRR(ad.x, ad.y, ad.w, ad.h, 12, C.card2, A); strokeRR(ad.x, ad.y, ad.w, ad.h, 12, C.line2, 1.4, A);
      txt(a2 > 0 ? 'adapter + rootTurnId' : 'any adapter', ad.x + ad.w / 2, ad.y + ad.h / 2 + 1, { sz: PORT ? 13 : 16, w: 650, c: C.ink2, al: 'center', a: A });
      var o1 = P(t, T.list, T.list + 0.5) * a, o2 = P(t, T.leave, T.leave + 0.5) * a;
      var y = G.opt[0][1], cx = ad.x + ad.w / 2;
      function opt(i, s, sub, c, oa) {
        if (oa <= 0) return;
        var ox = G.opt[i][0];
        var p = new Path(cub([cx, ad.y + ad.h], [cx, y - 20], [ox, ad.y + ad.h + 10], [ox, y - 22], 20));
        strokePath(p, 0, oa, c, 2, oa);
        tag(s, ox, y, c, oa, { sz: PORT ? 13 : 16 });
        txt(sub, ox, G.outY, { sz: PORT ? 12 : 15, w: 650, c: c, al: 'center', a: oa });
      }
      opt(0, PORT ? 'list x' : 'list x in B’s report', 'wrong in E', C.mis, o1);
      opt(1, PORT ? 'leave x out' : 'leave x out', 'incomplete in E′', C.miss, o2);
      if (a2 > 0) {
        opt(0, PORT ? 'E: leave x out' : 'E: leave x out', 'right', C.A, a2);
        opt(1, PORT ? 'E′: list x' : 'E′: list x in B’s report', 'right', C.B, a2);
      }
    }

    function draw(t) {
      var G = geo();
      drawRun(t, G, 0); drawRun(t, G, 1);
      drawRows(t, G);
      drawDilemma(t, G);
    }
    function over(t) {
      heading(6, 'The limit', t, 0.1, T.end - 0.3);
      var q = win(t, T.q, T.q + 0.4, T.s0 - 0.5, T.s0 - 0.1);
      if (q > 0) {
        alpha(0.9 * q); X.fillStyle = C.bg0; X.fillRect(0, 0, FW, FH);
        kinetic(PORT ? [{ s: 'Could a smarter' }, { s: 'adapter always' }, { s: 'get it right?' }] : [{ s: 'Could a smarter adapter' }, { s: 'always get it right?' }], t, T.q, { a: q, sz: PORT ? 40 : 64 });
      }
      var th = win(t, T.thm, T.thm + 0.5, T.out - 0.6, T.out - 0.1);
      if (th > 0) {
        alpha(0.92 * th); X.fillStyle = C.bg0; X.fillRect(0, 0, FW, FH);
        txt('THEOREM 1', FW / 2, FH / 2 - (PORT ? 110 : 130), { sz: PORT ? 14 : 17, w: 750, c: C.ink3, al: 'center', a: th });
        kinetic(PORT ? [{ s: 'No adapter is' }, { s: 'always exact on' }, { s: 'the Codex 0.160.1', c: C.ink2 }, { s: 'typed wire.', c: C.ink2 }] : [{ s: 'No adapter is always exact' }, { s: 'on the typed Codex 0.160.1 wire.', c: C.ink2 }], t, T.thm + 0.1, { a: th, sz: PORT ? 34 : 58 });
        var sub = 'Under the paper’s conditions. A safe adapter has to mark B’s report as possibly incomplete.';
        var lines = wrap(sub, PORT ? 460 : 980, PORT ? 16 : 21, 500);
        for (var i = 0; i < lines.length; i++) txt(lines[i], FW / 2, FH / 2 + (PORT ? 120 : 120) + i * (PORT ? 22 : 28), { sz: PORT ? 16 : 21, c: C.ink3, al: 'center', a: th * P(t, T.thm + 1.0, T.thm + 1.6) });
      }
    }
    return {
      dur: T.end, draw: draw, over: over,
      chapters: [[0, 'The limit']],
      caps: [
        [0.3, 'Could a smarter adapter always get this right? Under the paper’s conditions, on the typed Codex 0.160.1 wire, no.'],
        [2.4, 'Two runs, E and E′. A spawns c, and A and B each send c some mail. In E, A’s mail is a task and B’s is a plain message. In E′ it is the other way round.'],
        [8.6, 'c’s turn is stopped, and a new turn u picks up both mails. Its parent is whoever sent the task: A in E, B in E′. So x is A’s work in E and B’s work in E′.'],
        [12.4, 'None of that reaches the adapter. Both kinds of mail produce the same item, and u’s parent is not on the typed wire.'],
        [14.0, 'The adapter gets exactly the same messages in both runs, so it must write the same report for B.'],
        [16.4, 'If B’s report lists x, it is wrong in E.'],
        [18.4, 'If it leaves x out, it misses B’s own edit in E′. Either way, one run is wrong.'],
        [21.4, 'That is Theorem 1. The best an adapter can do there is to be safe: leave uncertain work out, and say the report may be incomplete.'],
        [25.6, 'Origin carried on the event stream is enough. Codex 0.162.0 adds a rootTurnId to each turn, and it tells E from E′.'],
        [29.4, 'Neither the pinned nor the current codex-acp reads it yet.']
      ]
    };
  })();
  // ======================================================================
  // Scene 5: takeaways and credits
  // ======================================================================
  var S5 = (function () {
    var T = { chip: 0.2, fix: 1.6, lines: 3.0, credits: 8.6, end: 14.0 };
    function draw(t) {
      var cx = FW / 2, cy = FH / 2;
      var ca = win(t, T.chip, T.chip + 0.5, T.lines - 0.3, T.lines + 0.2), s = P(t, T.chip, T.chip + 0.8, E.spring);
      if (ca > 0) {
        var fx = P(t, T.fix, T.fix + 0.5, E.io);
        var st = fx < 0.5 ? C.B : C.A, tg = fx < 0.5 ? 'B' : 'A';
        glow(cx, cy, 160, fx < 0.5 ? C.mis : C.A, 0.25 * ca);
        X.save(); X.translate(cx, cy); X.scale(1.9, 1.9);
        fileChip(0, 0, 'a.txt', { truth: C.A, stamp: st, tag: tg, tagA: fx < 0.5 ? 1 : (fx - 0.5) * 2, s: s, a: ca, bad: fx < 0.5 ? 1 : 0, cross: fx < 0.3 });
        X.restore();
        txt(fx < 0.5 ? 'credited by arrival' : 'credited by origin', cx, cy + (PORT ? 70 : 80), { sz: PORT ? 18 : 22, w: 650, c: fx < 0.5 ? C.mis : C.A, al: 'center', a: ca * P(t, T.chip + 0.4, T.chip + 0.8) * (fx < 0.5 ? 1 - fx * 2 : fx * 2 - 1) });
      }
      var la = win(t, T.lines, T.lines + 0.4, T.credits - 0.5, T.credits);
      if (la > 0) {
        var L = PORT ? [
          ['Arrival time is the', 'wrong proxy for origin.'],
          ['Bind delegated work', 'to the request that', 'dispatched it.'],
          ['Better: carry the origin', 'on every delegated event.']
        ] : [
          ['Arrival time is the wrong proxy for origin.'],
          ['Bind delegated work to the request that dispatched it.'],
          ['Better: carry the origin on every delegated event.']
        ];
        var sz = PORT ? 30 : 44, lh = sz * 1.25, gap = PORT ? 34 : 40;
        var total = 0; L.forEach(function (b) { total += b.length * lh; }); total += gap * (L.length - 1);
        var y = cy - total / 2 + lh / 2;
        L.forEach(function (b, i) {
          var p = P(t, T.lines + i * 1.3, T.lines + i * 1.3 + 0.8, E.out5);
          b.forEach(function (s, j) { txt(s, cx, y + j * lh + (1 - p) * 24, { sz: sz, w: 720, c: i === 0 ? C.ink : i === 1 ? C.A : C.B, al: 'center', a: la * p }); });
          y += b.length * lh + gap;
        });
      }
      var cr = P(t, T.credits, T.credits + 0.8, E.out);
      if (cr > 0) {
        var title = PORT ? ['Attributing Subagent Work', 'in Coding-Agent', 'Protocol Adapters'] : ['Attributing Subagent Work in', 'Coding-Agent Protocol Adapters'];
        var tsz = PORT ? 32 : 52, tl = tsz * 1.2, ty = cy - (PORT ? 120 : 90);
        title.forEach(function (s, i) { txt(s, cx, ty + i * tl + (1 - cr) * 20, { sz: tsz, w: 760, al: 'center', a: cr }); });
        var ay = ty + title.length * tl + (PORT ? 40 : 46), aa = P(t, T.credits + 0.6, T.credits + 1.3);
        if (PORT) {
          txt('Rajasekhar Josyula', cx, ay, { sz: 20, w: 600, c: C.ink2, al: 'center', a: aa });
          txt('Lakshmi Sravya Vedantham', cx, ay + 30, { sz: 20, w: 600, c: C.ink2, al: 'center', a: aa });
        } else txt('Rajasekhar Josyula  ·  Lakshmi Sravya Vedantham', cx, ay, { sz: 24, w: 600, c: C.ink2, al: 'center', a: aa });
        var ba = P(t, T.credits + 1.2, T.credits + 1.9);
        var by = ay + (PORT ? 88 : 64);
        var bw = tw('turnling', PORT ? 18 : 20, 700) + 40;
        fillRR(cx - bw / 2 - 18, by - 18, bw + 36, 36, 18, C.card2, ba); strokeRR(cx - bw / 2 - 18, by - 18, bw + 36, 36, 18, C.line2, 1.2, ba);
        fillRR(cx - bw / 2 - 2, by - 5, 22, 10, 3, C.ok, ba); fillRR(cx - bw / 2 + 22, by - 5, 10, 10, 3, C.mis, ba);
        txt('turnling', cx - bw / 2 + 42, by + 1, { sz: PORT ? 18 : 20, w: 700, c: C.ink, a: ba });
      }
    }
    return {
      dur: T.end, draw: draw,
      chapters: [[0, 'Takeaways']],
      caps: [
        [0.2, 'Arrival time is the wrong proxy for the request that caused delegated work.'],
        [3.0, 'Per-request bookkeeping cannot follow work that outlives its request. Bind such work to the request that dispatched it, or better, put the origin on every delegated event.'],
        [8.6, 'Attributing Subagent Work in Coding-Agent Protocol Adapters, by Rajasekhar Josyula and Lakshmi Sravya Vedantham.']
      ]
    };
  })();
  // ======================================================================
  // Player
  // ======================================================================
  var SCENES = [S0, S1, S2, S3, S4, S5];
  var XF = 0.55;   // fade length at each cut
  var POSTER = 2.4;
  var starts = [], TOTAL = 0;
  SCENES.forEach(function (s) { starts.push(TOTAL); TOTAL += s.dur; });
  var CAPS = [], CHAPS = [];
  SCENES.forEach(function (s, i) {
    (s.caps || []).forEach(function (c) { CAPS.push([starts[i] + c[0], c[1]]); });
    (s.chapters || []).forEach(function (c) { CHAPS.push({ t: starts[i] + c[0], title: c[1] }); });
  });

  function fmt(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  var noise = null;
  function noiseCanvas() {
    if (noise) return noise;
    noise = document.createElement('canvas'); noise.width = noise.height = 160;
    var g = noise.getContext('2d'), im = g.createImageData(160, 160);
    for (var i = 0; i < im.data.length; i += 4) { var v = Math.floor(hash(i * 0.731) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    return noise;
  }

  function mount(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.innerHTML =
      '<div class="film-stage">' +
        '<canvas class="film-canvas" role="img" aria-label="Animated explainer. The captions below describe each moment."></canvas>' +
        '<button type="button" class="film-big" aria-label="Play the film"><span class="film-big-ic" aria-hidden="true"></span><span class="film-big-t">Play</span><span class="film-big-d">' + fmt(TOTAL) + '</span></button>' +
      '</div>' +
      '<p class="film-cap" aria-live="polite"></p>' +
      '<div class="film-bar">' +
        '<button type="button" class="film-btn film-pp" aria-label="Play"><span class="ic-play" aria-hidden="true"></span></button>' +
        '<div class="film-track"><div class="film-segs"></div><div class="film-knob" aria-hidden="true"></div>' +
          '<input class="film-range" type="range" min="0" max="1000" step="1" value="0" aria-label="Position in the film"></div>' +
        '<span class="film-time">0:00 / ' + fmt(TOTAL) + '</span>' +
        '<button type="button" class="film-btn film-fs" aria-label="Full screen"><span class="ic-fs" aria-hidden="true"></span></button>' +
      '</div>' +
      '<div class="film-chaps" role="group" aria-label="Chapters"></div>';
    var stage = root.querySelector('.film-stage'), cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
    var big = root.querySelector('.film-big'), bigT = root.querySelector('.film-big-t');
    var capEl = root.querySelector('.film-cap'), pp = root.querySelector('.film-pp'), range = root.querySelector('.film-range');
    var segs = root.querySelector('.film-segs'), knob = root.querySelector('.film-knob'), timeEl = root.querySelector('.film-time');
    var fsBtn = root.querySelector('.film-fs'), chapsEl = root.querySelector('.film-chaps');
    var segEls = [], chapBtns = [];
    CHAPS.forEach(function (c, i) {
      var end = i + 1 < CHAPS.length ? CHAPS[i + 1].t : TOTAL;
      var s = document.createElement('div'); s.className = 'film-seg'; s.style.flexGrow = String(end - c.t);
      s.innerHTML = '<i></i>'; s.title = (i + 1) + '. ' + c.title;
      segs.appendChild(s); segEls.push(s);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'film-chap';
      b.innerHTML = '<span class="n">' + (i + 1) + '</span>' + c.title;
      b.addEventListener('click', function () { seek(c.t + 0.01); play(true); });
      chapsEl.appendChild(b); chapBtns.push(b);
    });
    if (!(stage.requestFullscreen || stage.webkitRequestFullscreen)) fsBtn.hidden = true;

    var t = 0, playing = false, userPaused = false, ended = false, last = 0, raf = 0, visible = false;
    var W = 0, H = 0, dpr = 1, vign = null, lastCap = -1, lastChap = -1, started = false;

    function layout() {
      var fs = document.fullscreenElement === root || document.webkitFullscreenElement === root;
      var w = stage.clientWidth;
      var port = !fs && w < 620;
      root.classList.toggle('portrait', port);
      var fw = port ? 560 : 1600, fh = port ? 960 : 900;
      if (fs) w = Math.min(w, stage.clientHeight * fw / fh);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = Math.round(w * dpr), ch = Math.round(w * fh / fw * dpr);
      if (cv.width !== cw || cv.height !== ch || PORT !== port) {
        cv.width = cw; cv.height = ch; cv.style.width = w + 'px'; cv.style.height = (w * fh / fw) + 'px';
        W = cw; H = ch; vign = null;
      }
      PORT = port; FW = fw; FH = fh;
    }

    function background(cam, t) {
      X.setTransform(1, 0, 0, 1, 0, 0);
      X.globalAlpha = 1;
      var g = X.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg0);
      X.fillStyle = g; X.fillRect(0, 0, W, H);
      var s = W / FW, sp = 40, ox = (-(cam.x - FW / 2) * 0.35 * s) % (sp * s), oy = (-(cam.y - FH / 2) * 0.35 * s) % (sp * s);
      X.fillStyle = '#ffffff'; X.globalAlpha = 0.045;
      var d = 1.6 * s;
      for (var x = ox - sp * s; x < W + sp * s; x += sp * s) for (var y = oy - sp * s; y < H + sp * s; y += sp * s) X.fillRect(x, y, d, d);
      // drifting dust, for depth
      X.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 34; i++) {
        var depth = 0.3 + hash(i + 0.5) * 0.7, px = (hash(i * 3.1) * FW + t * 6 * depth - (cam.x - FW / 2) * 0.6 * depth) % FW, py = (hash(i * 7.7) * FH - t * 3 * depth - (cam.y - FH / 2) * 0.6 * depth) % FH;
        if (px < 0) px += FW; if (py < 0) py += FH;
        X.globalAlpha = 0.05 + 0.1 * depth * (0.6 + 0.4 * Math.sin(t * 0.8 + i));
        X.drawImage(glowSprite(i % 3 ? '#8fb0ff' : '#7fe0c8'), px * s - 6 * depth * s, py * s - 6 * depth * s, 12 * depth * s, 12 * depth * s);
      }
      X.globalCompositeOperation = 'source-over';
    }
    function finish(tt) {
      X.setTransform(1, 0, 0, 1, 0, 0);
      if (!vign) {
        vign = X.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        vign.addColorStop(0, 'rgba(0,0,0,0)'); vign.addColorStop(1, 'rgba(0,0,0,0.5)');
      }
      X.globalAlpha = 1; X.fillStyle = vign; X.fillRect(0, 0, W, H);
      var n = noiseCanvas(), f = Math.floor(tt * 24);
      X.globalAlpha = 0.035; X.globalCompositeOperation = 'overlay';
      var pat = X.createPattern(n, 'repeat');
      X.save(); X.translate(-(hash(f) * 160), -(hash(f + 7) * 160)); X.fillStyle = pat; X.fillRect(0, 0, W + 160, H + 160); X.restore();
      X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1;
    }

    function render() {
      layout();
      X = ctx;
      var vt = !started && t === 0 ? POSTER : t;   // before the first play, show the title card
      var i = 0;
      while (i < SCENES.length - 1 && vt >= starts[i + 1]) i++;
      var sc = SCENES[i], lt = vt - starts[i];
      var cam = sc.cam ? sc.cam(lt) : { x: FW / 2, y: FH / 2, z: 1 };
      background(cam, vt);
      var fin = i === 0 ? P(lt, 0, 0.35) : P(lt, 0, XF), fout = i === SCENES.length - 1 ? 1 : 1 - P(lt, sc.dur - XF, sc.dur);
      SA = Math.min(fin, fout);
      var zin = i === 0 ? 1 : lerp(0.965, 1, P(lt, 0, XF * 1.6, E.out)), zout = lerp(1, 1.035, P(lt, sc.dur - XF, sc.dur, E.inn));
      var s = (W / FW) * cam.z * zin * zout;
      X.setTransform(s, 0, 0, s, W / 2 - cam.x * s, H / 2 - cam.y * s);
      X.lineCap = 'butt';
      sc.draw(lt);
      var so = (W / FW) * zin * zout;
      X.setTransform(so, 0, 0, so, W / 2 - FW / 2 * so, H / 2 - FH / 2 * so);
      if (sc.over) sc.over(lt);
      SA = 1;
      finish(vt);
      // UI
      var k = t / TOTAL;
      if (document.activeElement !== range) range.value = String(Math.round(k * 1000));
      root.style.setProperty('--p', String(k));
      knob.style.left = (k * 100) + '%';
      var ci = 0; while (ci < CHAPS.length - 1 && t >= CHAPS[ci + 1].t) ci++;
      segEls.forEach(function (el, j) {
        var a = CHAPS[j].t, b = j + 1 < CHAPS.length ? CHAPS[j + 1].t : TOTAL;
        el.firstChild.style.width = (clamp((t - a) / (b - a)) * 100) + '%';
      });
      if (ci !== lastChap) { chapBtns.forEach(function (b, j) { b.classList.toggle('on', j === ci); b.setAttribute('aria-current', j === ci ? 'true' : 'false'); }); lastChap = ci; }
      var cc = -1; for (var q = 0; q < CAPS.length; q++) if (t >= CAPS[q][0]) cc = q;
      if (cc !== lastCap) { capEl.textContent = cc >= 0 ? CAPS[cc][1] : ''; lastCap = cc; }
      timeEl.textContent = fmt(t) + ' / ' + fmt(TOTAL);
      range.setAttribute('aria-valuetext', fmt(t) + ', chapter ' + (ci + 1) + ': ' + CHAPS[ci].title);
    }

    function frame(now) {
      raf = 0;
      if (!playing) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      if (t >= TOTAL) { t = TOTAL; render(); stop(); ended = true; bigT.textContent = 'Replay'; root.classList.add('ended'); return; }
      render();
      raf = requestAnimationFrame(frame);
    }
    function play(fromUser) {
      if (ended || t >= TOTAL) { t = 0; ended = false; root.classList.remove('ended'); }
      if (fromUser) userPaused = false;
      if (playing) return;
      playing = true; started = true; root.classList.add('playing'); root.classList.add('started');
      pp.setAttribute('aria-label', 'Pause');
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      playing = false; root.classList.remove('playing'); pp.setAttribute('aria-label', 'Play');
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function pause(fromUser) { if (fromUser) userPaused = true; stop(); }
    function seek(nt) {
      t = clamp(nt, 0, TOTAL);
      if (t < TOTAL) { ended = false; root.classList.remove('ended'); bigT.textContent = 'Play'; }
      render();
    }

    pp.addEventListener('click', function () { if (playing) pause(true); else play(true); });
    big.addEventListener('click', function () { play(true); });
    cv.addEventListener('click', function () { if (playing) pause(true); else play(true); });
    range.addEventListener('input', function () { seek(+range.value / 1000 * TOTAL); });
    range.addEventListener('pointerdown', function () { root.classList.add('started'); });
    fsBtn.addEventListener('click', function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    });
    document.addEventListener('fullscreenchange', function () { render(); });
    root.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      var k = e.key;
      if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); if (playing) pause(true); else play(true); }
      else if (k === 'ArrowRight' && e.target !== range) { e.preventDefault(); seek(t + 5); }
      else if (k === 'ArrowLeft' && e.target !== range) { e.preventDefault(); seek(t - 5); }
      else if (k === 'f' || k === 'F') { if (!fsBtn.hidden) fsBtn.click(); }
      else if (/^[1-9]$/.test(k) && +k <= CHAPS.length) { seek(CHAPS[+k - 1].t + 0.01); }
    });
    if (window.ResizeObserver) new ResizeObserver(function () { render(); }).observe(stage);
    else window.addEventListener('resize', render);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visible = e.isIntersecting && e.intersectionRatio >= 0.5;
          if (visible && !userPaused && !reduce && !ended && root.dataset.autoplay !== 'off') play(false);
          else if (!visible && playing) pause(false);
        });
      }, { threshold: [0, 0.5, 0.75] }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden && playing) pause(false); });
    root.tabIndex = -1;
    render();

    // transcript, if the page asks for one
    var tr = document.querySelector('[data-film-transcript]');
    if (tr && !tr.children.length) {
      var html = '';
      CHAPS.forEach(function (c, i) {
        var end = i + 1 < CHAPS.length ? CHAPS[i + 1].t : TOTAL + 1;
        html += '<h3><button type="button" data-t="' + c.t + '">' + (i + 1) + '. ' + c.title + ' <span>' + fmt(c.t) + '</span></button></h3><p>';
        html += CAPS.filter(function (q) { return q[0] >= c.t - 0.2 && q[0] < end - 0.2; }).map(function (q) { return q[1]; }).join(' ');
        html += '</p>';
      });
      tr.innerHTML = html;
    }
    if (tr) {
      tr.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-t]');
        if (b) { seek(+b.dataset.t + 0.01); root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); play(true); }
      });
    }
    if (/filmdebug/.test(location.hash)) window.__film = {
      seek: seek, total: TOTAL, starts: starts, play: play, pause: pause, get t() { return t; },
      bench: function (from, to, n) { var tt = 0, worst = 0; for (var i = 0; i < n; i++) { t = from + (to - from) * i / n; var a = performance.now(); render(); var d = performance.now() - a; tt += d; worst = Math.max(worst, d); } return { avg: tt / n, worst: worst }; }
    };
  }

  if (window.__filmExport) { window.__filmExport.caps = CAPS; window.__filmExport.chaps = CHAPS; window.__filmExport.total = TOTAL; }
  function boot() { var els = document.querySelectorAll('[data-film]'); for (var i = 0; i < els.length; i++) mount(els[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
