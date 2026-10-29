/* turnling film: a short animated explainer of "Attributing Subagent Work in
   Coding-Agent Protocol Adapters". Drawn by hand from the paper; it does not
   run an adapter. In the Turnstile scene each dot is one of the 956 schedules
   behind Table I's first three Codex rows, grouped by outcome; gen_cells.py
   checks the COUNTS line against the runs. Every frame is a pure function of
   time, so the film can be scrubbed. */
(function () {
  'use strict';
  var FW = 1600, FH = 900, PORT = false;   // landscape frame; portrait is 560 x 860
  var COUNTS = { late: 174, early: 407, clean: 375 };

  // ---------- math ----------
  function clamp(x, a, b) { if (a === undefined) { a = 0; b = 1; } return x < a ? a : x > b ? b : x; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  var E = {
    lin: function (k) { return k; },
    io: function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    out: function (k) { return 1 - Math.pow(1 - k, 3); },
    inn: function (k) { return k * k * k; },
    back: function (k) { if (k <= 0) return 0; if (k >= 1) return 1; var c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  };
  // Eased progress of t through [a, b].
  function P(t, a, b, e) { return (e || E.io)(clamp((t - a) / (b - a))); }
  // Visible over [a, b], fading in and out over f seconds.
  function vis(t, a, b, f) { f = f || 0.4; if (t <= a || t >= b) return 0; return Math.min(E.out(clamp((t - a) / f)), E.out(clamp((b - t) / f))); }
  // Piecewise keyframes [[t, v], ...], eased between neighbours.
  function kf(t, K) {
    if (t <= K[0][0]) return K[0][1];
    for (var i = 1; i < K.length; i++) if (t < K[i][0]) return lerp(K[i - 1][1], K[i][1], E.io((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0])));
    return K[K.length - 1][1];
  }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mix(h1, h2, k) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round(lerp(a >> 16, b >> 16, k)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  // ---------- palette and type ----------
  var C = {
    bg: '#f5f5f3', card: '#ffffff', ink: '#17191e', ink2: '#5c616b', ink3: '#9a9fa8', line: '#d6d9de', faint: '#e6e8eb',
    A: '#2f62f5', B: '#17191e', red: '#e0464b', grey: '#dcdfe3'
  };
  // ink3 is for shapes (playhead, connectors, message dots); text uses ink or ink2.
  var SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif';
  var MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  // ---------- drawing ----------
  var X = null, SA = 1;
  function alpha(a) { X.globalAlpha = clamp(a) * SA; }
  function font(sz, w, mono) { X.font = (w || 500) + ' ' + sz + 'px ' + (mono ? MONO : SANS); }
  function tw(s, sz, w, mono) { font(sz, w, mono); return X.measureText(s).width; }
  function txt(s, x, y, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a;
    if (a <= 0.004 || !s) return;
    font(o.sz || 20, o.w || 500, o.mono);
    X.fillStyle = o.c || C.ink; X.textAlign = o.al || 'left'; X.textBaseline = 'middle';
    alpha(a); X.fillText(s, x, y);
  }
  function wrap(s, maxW, sz, w) {
    var words = s.split(' '), lines = [], cur = '';
    font(sz, w);
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (X.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // Text wrapped to maxW with balanced lines, centred vertically on y.
  var wrapCache = {};
  function balanced(s, maxW, sz, w) {
    var key = s + '|' + maxW + '|' + sz + '|' + w;
    if (wrapCache[key]) return wrapCache[key];
    var lines = wrap(s, maxW, sz, w);
    if (lines.length > 1) {
      var lo = maxW / 2, hi = maxW;
      for (var i = 0; i < 14; i++) { var mid = (lo + hi) / 2; if (wrap(s, mid, sz, w).length > lines.length) lo = mid; else hi = mid; }
      lines = wrap(s, hi, sz, w);
    }
    return (wrapCache[key] = lines);
  }
  function block(s, x, y, o) {
    var lines = balanced(s, o.maxW, o.sz, o.w), lh = o.lh || o.sz * 1.26, y0 = y - (lines.length - 1) * lh / 2;
    for (var i = 0; i < lines.length; i++) txt(lines[i], x, y0 + i * lh, { sz: o.sz, w: o.w, c: o.c, a: o.a, al: o.al || 'center', mono: o.mono });
  }
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    X.beginPath(); X.moveTo(x + r, y);
    X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r);
    X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath();
  }
  function fillRR(x, y, w, h, r, c, a) { if (a <= 0.004) return; rr(x, y, w, h, r); X.fillStyle = c; alpha(a); X.fill(); }
  function strokeRR(x, y, w, h, r, c, lw, a) { if (a <= 0.004) return; rr(x, y, w, h, r); X.strokeStyle = c; X.lineWidth = lw; alpha(a); X.stroke(); }
  function circle(x, y, r, c, a) { if (a <= 0.004 || r <= 0) return; X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fillStyle = c; alpha(a); X.fill(); }
  function ring(x, y, r, c, lw, a) { if (a <= 0.004 || r <= 0) return; X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.strokeStyle = c; X.lineWidth = lw; alpha(a); X.stroke(); }
  function line(x1, y1, x2, y2, c, lw, a, dash) {
    if (a <= 0.004) return;
    X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2);
    X.strokeStyle = c; X.lineWidth = lw; X.lineCap = 'round'; alpha(a);
    if (dash) X.setLineDash(dash);
    X.stroke();
    if (dash) X.setLineDash([]);
  }
  // A line drawn on from (x1, y1) towards (x2, y2), k in [0, 1].
  function lineOn(x1, y1, x2, y2, k, c, lw, a, dash) { if (k > 0) line(x1, y1, lerp(x1, x2, k), lerp(y1, y2, k), c, lw, a, dash); }

  // Polyline with arc-length lookup.
  function Path(pts) {
    this.p = pts; this.L = [0];
    for (var i = 1; i < pts.length; i++) this.L.push(this.L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.total = this.L[this.L.length - 1] || 1;
  }
  Path.prototype.at = function (u) {
    u = clamp(u); var d = u * this.total, L = this.L, lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (L[m] < d) lo = m; else hi = m; }
    var k = (d - L[lo]) / ((L[hi] - L[lo]) || 1), a = this.p[lo], b = this.p[hi];
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k };
  };
  function cub(p0, p1, p2, p3, n) {
    var out = []; n = n || 32;
    for (var i = 0; i <= n; i++) {
      var t = i / n, m = 1 - t;
      out.push([m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
                m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  function strokePath(path, u0, u1, c, lw, a, dash) {
    if (a <= 0.004 || u1 <= u0) return;
    var p0 = path.at(u0), d0 = u0 * path.total, d1 = u1 * path.total;
    X.beginPath(); X.moveTo(p0.x, p0.y);
    for (var i = 1; i < path.p.length; i++) if (path.L[i] > d0 && path.L[i] < d1) X.lineTo(path.p[i][0], path.p[i][1]);
    var p1 = path.at(u1); X.lineTo(p1.x, p1.y);
    X.strokeStyle = c; X.lineWidth = lw; X.lineCap = 'round'; X.lineJoin = 'round'; alpha(a);
    if (dash) X.setLineDash(dash);
    X.stroke();
    if (dash) X.setLineDash([]);
  }
  // A smooth S-curve from (x0, y0) down or up to (x1, y1).
  function sCurve(x0, y0, x1, y1) { var my = (y0 + y1) / 2; return new Path(cub([x0, y0], [x0, my], [x1, my], [x1, y1])); }
  // An arc from a to b that bows upward by h.
  function hop(a, b, h) { var mx = (a[0] + b[0]) / 2, top = Math.min(a[1], b[1]) - h; return new Path(cub(a, [lerp(a[0], mx, 0.6), top], [lerp(b[0], mx, 0.6), top], b)); }

  // ---------- marks ----------
  function badge(x, y, s, c, a, k) {
    if (a <= 0.004) return;
    var r = (PORT ? 14 : 17) * (k === undefined ? 1 : k);
    circle(x, y, r, c, a);
    txt(s, x, y + 0.5, { sz: PORT ? 15 : 18, w: 700, c: '#ffffff', al: 'center', a: a * clamp(k === undefined ? 1 : k) });
  }
  function sq(x, y, sz, c, a) { if (sz > 0) fillRR(x - sz / 2, y - sz / 2, sz, sz, sz * 0.22, c, a); }
  function pillW(s, sz) { sz = sz || (PORT ? 16 : 20); return tw(s, sz, 600) + sz * 1.3; }
  // o.dy offsets the pill (callers use it to let a pill rise as it fades in).
  function pill(s, x, y, c, a, o) {
    o = o || {};
    if (a <= 0.004) return;
    var sz = o.sz || (PORT ? 16 : 20), w = tw(s, sz, 600, o.mono) + sz * 1.3, h = sz * 1.9;
    y += o.dy || 0;
    fillRR(x - w / 2, y - h / 2, w, h, h / 2, o.fill || C.card, a);
    strokeRR(x - w / 2, y - h / 2, w, h, h / 2, c, 1.5, a);
    txt(s, x, y + 0.5, { sz: sz, w: 600, c: c, al: 'center', a: a, mono: o.mono });
  }
  function card(x, y, w, h, a) { fillRR(x, y, w, h, 14, C.card, a); strokeRR(x + 0.5, y + 0.5, w - 1, h - 1, 14, C.faint, 1, a); }
  function check(x, y, s, c, k, a) {
    if (k <= 0 || a <= 0.004) return;
    var p = new Path([[x - s * 0.5, y], [x - s * 0.15, y + s * 0.36], [x + s * 0.55, y - s * 0.4]]);
    strokePath(p, 0, k, c, PORT ? 2.4 : 3, a);
  }
  function cross(x, y, s, c, k, a) {
    if (k <= 0 || a <= 0.004) return;
    var h = s * 0.42;
    lineOn(x - h, y - h, x + h, y + h, clamp(k * 2), c, PORT ? 2.4 : 3, a);
    lineOn(x + h, y - h, x - h, y + h, clamp(k * 2 - 1), c, PORT ? 2.4 : 3, a);
  }

  // One sentence at a time at the top of the frame. items: [start, end, text, colour].
  function head(t, items) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i], ain = P(t, it[0], it[0] + 0.6, E.out), aout = it[1] == null ? 0 : P(t, it[1], it[1] + 0.35, E.inn);
      var a = ain * (1 - aout);
      if (a <= 0.004) continue;
      block(it[2], FW / 2, (PORT ? 112 : 140) + (1 - ain) * 14 - aout * 8, { sz: PORT ? 30 : 42, w: 600, a: a, maxW: PORT ? 500 : 1440, c: it[3] || C.ink });
    }
  }
  // Landscape x of an event on the bug scene's timeline, mapped onto the portrait lanes.
  // Shared with the Turnstile scene so its first order is that timeline exactly.
  function laneX(x) { return PORT ? 66 + (x - 360) / 880 * 428 : x; }

  // ======================================================================
  // Scene 0: editors, adapters, reports
  // ======================================================================
  var S0 = (function () {
    var D = 10.4;
    var heads = [[0.3, 3.9, 'Editors talk to coding agents through adapters.'],
                 [4.2, 7.3, 'The adapter tells the editor which files each request changed.'],
                 [7.6, D - 0.5, 'That works, until work outlives its request.']];
    function G(t) {
      if (PORT) {
        var dx = -108 * P(t, 5.2, 6.0);
        return { v: true, w: 190, h: 66, n: [[280 + dx, 350], [280 + dx, 505], [280 + dx, 660]], card: [292, 302, 222, 96] };
      }
      return { v: false, w: 240, h: 84, n: [[400, 480], [800, 480], [1200, 480]], card: [285, 600, 230, 104] };
    }
    // Point between the facing edges of nodes i and j, k in [0, 1].
    function along(g, i, j, k) {
      var a = g.n[i], b = g.n[j], hx = g.v ? 0 : g.w / 2, hy = g.v ? g.h / 2 : 0, sx = Math.sign(b[0] - a[0]), sy = Math.sign(b[1] - a[1]);
      return [lerp(a[0] + sx * hx, b[0] - sx * hx, k), lerp(a[1] + sy * hy, b[1] - sy * hy, k)];
    }
    // The poster is this scene's first frame; it dissolves into the first sentence.
    function poster(t) {
      var a = 1 - P(t, 0.1, 0.6, E.inn), dy = -10 * (1 - a);
      if (a <= 0.004) return;
      if (PORT) block('A subagent outlives its request. Who gets the credit?', FW / 2, FH * 0.36 + dy, { sz: 32, w: 650, maxW: 440, a: a });
      else {
        txt('A subagent outlives its request.', FW / 2, FH * 0.36 + dy, { sz: 56, w: 650, al: 'center', a: a });
        txt('Who gets the credit?', FW / 2, FH * 0.36 + 72 + dy, { sz: 56, w: 650, al: 'center', c: C.A, a: a });
      }
    }
    function draw(t) {
      var g = G(t), names = ['Editor', 'Adapter', 'Agent'];
      poster(t);
      head(t, heads);
      // connectors
      for (var c = 0; c < 2; c++) {
        var a = g.n[c], b = g.n[c + 1], k = P(t, 1.1 + c * 0.25, 1.7 + c * 0.25);
        if (g.v) lineOn(a[0], a[1] + g.h / 2, b[0], b[1] - g.h / 2, k, C.ink3, 1.5, 1);
        else lineOn(a[0] + g.w / 2, a[1], b[0] - g.w / 2, b[1], k, C.ink3, 1.5, 1);
      }
      // the adapter takes each traveller in and hands it on; its outline tints while it holds one
      var hold = Math.max(vis(t, 2.7, 3.3, 0.15), vis(t, 4.9, 5.35, 0.15));
      g.n.forEach(function (p, i) {
        var k = P(t, 0.5 + i * 0.15, 1.1 + i * 0.15, E.out), s = lerp(0.94, 1, k);
        X.save(); X.translate(p[0], p[1] + (1 - k) * 10); X.scale(s, s);
        fillRR(-g.w / 2, -g.h / 2, g.w, g.h, g.h / 2, C.card, k);
        strokeRR(-g.w / 2, -g.h / 2, g.w, g.h, g.h / 2, i === 1 ? mix(C.ink, C.A, hold) : C.line, i === 1 ? 2 : 1.5, k);
        txt(names[i], 0, 1, { sz: PORT ? 21 : 26, w: 600, al: 'center', a: k });
        X.restore();
      });
      // request A goes out: edge to edge, into the adapter, out again towards the agent
      var ra = vis(t, 2.1, 3.95, 0.25);
      if (ra > 0) {
        var s1 = (1 - P(t, 2.75, 2.9)) + P(t, 3.05, 3.25, E.back);
        var p = t < 2.95 ? along(g, 0, 1, P(t, 2.2, 2.75)) : along(g, 1, 2, P(t, 3.05, 3.65));
        circle(p[0], p[1], (PORT ? 8 : 11) * s1, C.A, ra);
        var l1 = ra * clamp(s1);
        if (g.v) txt('request A', p[0] + 20, p[1], { sz: 19, w: 600, c: C.A, a: l1 });
        else txt('request A', p[0], p[1] - 52, { sz: 21, w: 600, c: C.A, al: 'center', a: l1 });
      }
      // A's report
      var cd = g.card, rowX = cd[0] + (PORT ? 30 : 34), rowY = cd[1] + (PORT ? 66 : 70), tsz = PORT ? 18 : 20;
      var fa = P(t, 5.5, 6.0, E.out), ty = cd[1] + (PORT ? 30 : 32) + (1 - fa) * 8;
      card(cd[0], cd[1] + (1 - fa) * 8, cd[2], cd[3], fa);
      txt('A’s report', cd[0] + 22, ty, { sz: tsz, w: 600, c: C.ink2, a: fa });
      txt('· closed', cd[0] + 22 + tw('A’s report', tsz, 600) + 6, ty, { sz: tsz, w: 500, c: C.ink2, a: fa * P(t, 7.5, 7.9, E.out) });
      // the edit comes back the same way, then drops out of the editor into the report
      var ea = P(t, 4.5, 4.8, E.out), es = (PORT ? 14 : 18) * lerp(0.6, 1, ea);
      if (ea > 0 && t < 5.8) {
        var s2 = (1 - P(t, 4.95, 5.1)) + P(t, 5.1, 5.3, E.back) - P(t, 5.65, 5.8);
        var q = t < 5.1 ? along(g, 2, 1, P(t, 4.6, 4.95, E.out)) : along(g, 1, 0, P(t, 5.1, 5.65));
        sq(q[0], q[1], es * s2, C.A, ea);
        var l2 = ea * clamp(s2);
        if (g.v) txt('a.txt', q[0] + 18, q[1], { sz: 19, mono: true, c: C.ink2, a: l2 });
        else txt('a.txt', q[0], q[1] + 30, { sz: 20, mono: true, c: C.ink2, al: 'center', a: l2 });
      }
      if (t >= 5.8) {
        var n0 = g.n[0], f0 = g.v ? [n0[0] + g.w / 2, n0[1]] : [n0[0], n0[1] + g.h / 2];
        var hp = g.v ? new Path(cub(f0, [(f0[0] + rowX) / 2, f0[1]], [(f0[0] + rowX) / 2, rowY], [rowX, rowY])) : sCurve(f0[0], f0[1], rowX, rowY);
        var hk = P(t, 5.8, 6.35), hq = hp.at(hk), hs = P(t, 5.8, 6.0, E.back), lk = P(t, 6.1, 6.35);
        sq(hq.x, hq.y, es * hs, C.A, ea);
        // its name rides along and becomes the report row
        txt('a.txt', hq.x + (PORT ? 20 : 22), hq.y, { sz: lerp(PORT ? 19 : 20, PORT ? 20 : 22, lk), mono: true, c: mix(C.ink2, C.ink, lk), a: clamp(hs) });
      }
      // the request has closed, but more of its work comes back and stops at the adapter
      var wa = P(t, 7.9, 8.2, E.out);
      if (wa > 0) { var w2 = along(g, 2, 1, P(t, 7.9, 8.7, E.out)); sq(w2[0], w2[1], PORT ? 14 : 18, C.A, wa); }
      var qa = P(t, 8.8, 9.2, E.out), n1 = g.n[1];
      if (qa > 0) {
        if (g.v) pill('which request?', n1[0] + g.w / 2 + 12 + pillW('which request?') / 2, n1[1], C.ink, qa, { dy: -10 * (1 - qa) });
        else pill('which request?', n1[0] + g.w / 2, n1[1] - 60, C.ink, qa, { dy: -10 * (1 - qa) });
      }
    }
    return {
      dur: D, draw: draw, heads: heads,
      chapters: [[0, 'Setup']],
      caps: [
        [0.3, 'Editors talk to coding agents through adapters. An editor, an adapter and an agent sit in a row, and request A travels from the editor to the agent.'],
        [4.2, 'The adapter tells the editor which files each request changed: the agent’s edit of a.txt comes back and lands in A’s report.'],
        [7.6, 'That works, until work outlives its request.']
      ]
    };
  })();

  // ======================================================================
  // Scene 1: the bug
  // ======================================================================
  var S1 = (function () {
    var D = 25.3;
    // Event positions in landscape units; portrait maps them onto its lanes.
    var xA0 = 375, xSp = 450, xCan = 620, xB0 = 740, xEd = 990, xBt = 1110, xB1 = 1225;
    var PH = [[1.0, xA0], [1.7, xSp], [2.3, xSp], [4.0, xCan], [4.5, xCan], [6.4, xB0], [6.9, xB0], [9.3, xEd], [13.5, xEd], [14.8, xBt], [15.5, xB1]];
    var tBt = 14.8;   // when the playhead passes b.txt
    var heads = [[0.3, 3.7, 'Request A starts a subagent.'],
                 [4.0, 6.3, 'You cancel A. The subagent keeps running.'],
                 [6.6, 9.1, 'Then you send request B.'],
                 [9.4, 11.1, 'The subagent edits a.txt.'],
                 [11.4, 14.6, 'The adapter credits the edit to the request current now: B.'],
                 [14.9, 17.4, 'B’s report lists b.txt and a.txt.'],
                 [17.7, 20.3, 'But a.txt was made for A.']];
    function G() {
      if (PORT) return { m: laneX, ry: 384, sy: 496, l0: laneX(350), l1: laneX(1245), kx: 50, card: [140, 600, 280, 160] };
      return { m: laneX, ry: 430, sy: 590, l0: 350, l1: 1245, kx: 110, card: [1265, 345, 290, 170] };
    }
    function draw(t) {
      var g = G(), m = g.m, ry = g.ry, sy = g.sy, ph = m(kf(t, PH));
      var base = SA;
      // the timeline dims under the moral, then brightens again to be handed to the next scene
      var dim = 1 - 0.95 * P(t, 20.4, 21.0) * (1 - P(t, 24.6, 25.3));
      // annotations that do not survive into the next scene
      var keep = 1 - P(t, 23.5, 24.1);
      head(t, heads);
      SA = base * dim;
      // lanes draw on from the left while the setup scene is still fading
      var la = P(t, -0.45, 0.3, E.out), lab = P(t, -0.2, 0.4, E.out) * keep;
      lineOn(g.l0, ry, g.l1, ry, la, C.faint, 2, 1); lineOn(g.l0, sy, g.l1, sy, la, C.faint, 2, 1);
      if (PORT) {
        txt('Requests', g.l1, ry - 92, { sz: 20, w: 600, c: C.ink2, al: 'right', a: lab });
        txt('Subagent', g.l1, sy + 60, { sz: 20, w: 600, c: C.ink2, al: 'right', a: lab });
      } else {
        txt('Requests', 318, ry, { sz: 24, w: 600, c: C.ink2, al: 'right', a: lab });
        txt('Subagent', 318, sy, { sz: 24, w: 600, c: C.ink2, al: 'right', a: lab });
      }
      // playhead: a short marker between the lanes; it yields while the lookup line is drawn
      var pa = vis(t, 0.9, 15.7, 0.4) * 0.5 * (1 - vis(t, 11.4, 13.7, 0.3));
      line(ph, ry - (PORT ? 20 : 24), ph, sy + (PORT ? 20 : 24), C.ink3, 1.4, pa, [3, 6]);
      // the request that is current rides above the playhead
      var py = ry - (PORT ? 46 : 50), iA = P(t, 1.2, 1.5, E.out), iB = P(t, 6.7, 6.95, E.out);
      pill('current: A', ph, py, C.A, iA * (1 - P(t, 3.75, 4.0)), { dy: -10 * (1 - iA) });
      pill('current: B', ph, py, C.ink, iB * (1 - P(t, 14.9, 15.2)), { dy: -10 * (1 - iB) });
      // A's bar, ended by the cancel
      var lw = PORT ? 5 : 7;
      if (t > 1.0) line(m(xA0), ry, Math.min(ph, m(xCan)), ry, C.A, lw, 1);
      var ca = P(t, 4.0, 4.4, E.out);
      line(m(xCan), ry - 14, m(xCan), ry + 14, C.ink2, 2.5, ca);
      txt('cancelled', m(xCan), ry + (PORT ? 30 : -42), { sz: PORT ? 19 : 20, w: 500, c: C.ink2, al: 'center', a: ca * (1 - P(t, 14.8, 15.1)) });
      // the subagent: spawned from A, running on after A ends
      var sp = sCurve(m(xSp), ry, m(xSp) + g.kx, sy);
      strokePath(sp, 0, P(t, 1.7, 2.4), C.A, PORT ? 3 : 4, 1);
      var subEnd = Math.min(ph, m(xEd));
      if (t > 2.4 && subEnd > m(xSp) + g.kx) line(m(xSp) + g.kx, sy, subEnd, sy, C.A, PORT ? 3 : 4, 1);
      // B's bar
      if (t > 6.9) line(m(xB0), ry, Math.min(ph, m(xB1)), ry, C.B, lw, 1);
      badge(m(xA0), ry, 'A', C.A, P(t, 0.9, 1.2), P(t, 0.9, 1.35, E.back));
      badge(m(xB0), ry, 'B', C.B, P(t, 6.7, 7.0), P(t, 6.7, 7.15, E.back));
      // the subagent edits a.txt during B
      var ek = P(t, 9.55, 9.95, E.back), fly1 = P(t, 15.8, 16.6);
      var ghost = P(t, 15.8, 16.1) * (1 - P(t, 24.6, 25.3));   // refilled for the hand-over
      var es = PORT ? 14 : 22;
      sq(m(xEd), sy, es * ek, C.A, 1 - ghost);
      if (ghost > 0) strokeRR(m(xEd) - es / 2, sy - es / 2, es, es, es * 0.22, C.A, 1.5, ghost * 0.6);
      txt('a.txt', m(xEd), sy + (PORT ? 32 : 38), { sz: PORT ? 19 : 20, mono: true, c: C.ink2, al: 'center', a: P(t, 9.7, 10.1) * keep });
      // the adapter looks up the current request: a line rises from the edit to the pill
      var lk = P(t, 11.5, 12.0), lka = 1 - P(t, 13.3, 13.6);
      lineOn(m(xEd), sy - 14, m(xEd), ry + 14, lk, C.ink2, 1.5, lka);
      ring(m(xEd), ry, (PORT ? 13 : 19) * P(t, 11.95, 12.3, E.back), C.ink, 2.5, lka);
      // B edits b.txt
      var bk = P(t, tBt, tBt + 0.35, E.back), fly0 = P(t, 15.4, 16.1), g0 = P(t, 15.4, 15.7);
      sq(m(xBt), ry, es * bk, C.B, (1 - g0) * keep);
      if (g0 > 0) strokeRR(m(xBt) - es / 2, ry - es / 2, es, es, es * 0.22, C.B, 1.5, g0 * 0.6 * keep);
      txt('b.txt', m(xBt), ry + (PORT ? 30 : 38), { sz: PORT ? 19 : 20, mono: true, c: C.ink2, al: 'center', a: P(t, tBt + 0.1, tBt + 0.4) * keep });
      // B's report
      var cd = g.card, fin = P(t, 14.9, 15.4, E.out), fa = fin * keep, r1 = cd[1] + (PORT ? 78 : 82), r2 = cd[1] + (PORT ? 122 : 128), bx = cd[0] + (PORT ? 32 : 34);
      card(cd[0], cd[1] + (1 - fin) * 8, cd[2], cd[3], fa);
      txt('B’s report', cd[0] + 24, cd[1] + (PORT ? 34 : 36) + (1 - fin) * 8, { sz: PORT ? 18 : 20, w: 600, c: C.ink2, a: fa });
      if (fly0 > 0) { var h0 = hop([m(xBt), ry], [bx, r1], PORT ? 30 : 60).at(fly0); sq(h0.x, h0.y, PORT ? 14 : 18, C.B, keep); }
      if (fly1 > 0) { var h1 = hop([m(xEd), sy], [bx, r2], PORT ? 30 : 80).at(fly1); sq(h1.x, h1.y, PORT ? 14 : 18, C.A, keep); }
      var rsz = PORT ? 20 : 22;
      txt('b.txt', bx + (PORT ? 22 : 24), r1, { sz: rsz, mono: true, a: P(t, 16.0, 16.3) * keep });
      var bad = P(t, 19.3, 19.7);
      txt('a.txt', bx + (PORT ? 22 : 24), r2, { sz: rsz, mono: true, c: mix(C.ink, C.red, bad), a: P(t, 16.4, 16.7) * keep });
      if (bad > 0) lineOn(bx - 14, r2, bx + (PORT ? 22 : 24) + tw('a.txt', rsz, 500, true) + 4, r2, bad, C.red, 2.5, keep);
      txt('made for A', cd[0] + cd[2] - 20, r2, { sz: 19, w: 600, c: C.red, al: 'right', a: P(t, 19.5, 19.9) * keep });
      // trace a.txt back to the request that started it
      var tr = P(t, 18.0, 19.2);
      if (tr > 0) {
        var pts = [[m(xEd), sy], [m(xSp) + g.kx, sy]].concat(cub([m(xSp) + g.kx, sy], [m(xSp) + g.kx, (ry + sy) / 2], [m(xSp), (ry + sy) / 2], [m(xSp), ry]).slice(1)).concat([[m(xA0), ry]]);
        var path = new Path(pts), fade = 1 - P(t, 19.7, 20.4);
        strokePath(path, 0, tr, C.A, PORT ? 10 : 16, 0.18 * fade);
        if (tr < 1) { var hd = path.at(tr); circle(hd.x, hd.y, PORT ? 5 : 7, C.A, 1); }
        var pulse = P(t, 19.1, 19.8);
        ring(m(xA0), ry, (PORT ? 13 : 17) + pulse * 20, C.A, 2, (1 - pulse) * (tr >= 1 ? 1 : 0));
      }
      SA = base;
      // the moral, once the timeline has dimmed
      var mi = P(t, 21.0, 21.7, E.out), ma = mi * (1 - P(t, 24.1, 24.6));
      if (ma > 0) txt('Arrival is not origin.', FW / 2, FH / 2 + (1 - mi) * 16, { sz: PORT ? 42 : 88, w: 650, al: 'center', a: ma });
    }
    return {
      dur: D, draw: draw, heads: heads, also: [[21.0, 24.1, 'Arrival is not origin.']],
      chapters: [[0, 'The bug']],
      caps: [
        [0.3, 'Request A starts a subagent. A timeline shows requests on the top lane and the subagent below.'],
        [4.0, 'You cancel A. The subagent keeps running.'],
        [6.6, 'Then you send request B.'],
        [9.4, 'The subagent edits a.txt.'],
        [11.4, 'The adapter credits the edit to the request current now: B.'],
        [14.9, 'B’s report lists b.txt, B’s own edit, and a.txt.'],
        [17.7, 'But a.txt was made for A. Its line leads back through the subagent to request A, and a.txt is struck out of B’s report.'],
        [21.0, 'Arrival is not origin.']
      ]
    };
  })();

  // ======================================================================
  // Scene 2: Turnstile, then the two fixes
  // ======================================================================
  var S2 = (function () {
    var D = 29.3, N = COUNTS.late + COUNTS.early + COUNTS.clean, NL = COUNTS.late, NM = COUNTS.late + COUNTS.early;
    // Root events as fractions of the lane, placed so the first order is the bug scene's timeline.
    var uA0 = 0.0279, uSp = 0.1117, uCan = 0.3017, uB0 = 0.4358, uB1 = 0.92;
    // A few orders of the subagent's start (s) and edit (e).
    var ORD = [[0.2346, 0.7151], [0.15, 0.36], [0.58, 0.80], [0.30, 0.97]];
    var TS = [1.2, 2.8, 4.3, 5.8];
    for (var f = 0; f < 10; f++) {
      var s = 0.1 + hash(f + 3) * 0.5, e = Math.min(0.99, s + 0.06 + hash(f + 17) * 0.5);
      ORD.push([s, e]); TS.push(6.75 + f * 0.16);
    }
    var KS = [[0, ORD[0][0]]], KE = [[0, ORD[0][1]]];
    for (var k = 1; k < ORD.length; k++) {
      var mv = k < 4 ? 0.55 : 0.12;
      KS.push([TS[k] - mv, ORD[k - 1][0]], [TS[k], ORD[k][0]]);
      KE.push([TS[k] - mv, ORD[k - 1][1]], [TS[k], ORD[k][1]]);
    }
    var heads = [[0.3, 7.9, 'Turnstile runs the adapter under every order of these events the provider model allows.'],
                 [8.2, 11.2, '956 orders in three scenario groups. Each dot is one.'],
                 [11.5, 14.8, 'In 581 of them, A’s edit lands in B’s report.'],
                 [15.1, 19.0, 'Fix 1: credit the subagent to the request current when it starts.'],
                 [19.3, 21.6, 'That fails when the subagent starts after B.'],
                 [21.9, 25.0, 'Fix 2: credit it to the request that dispatched it.'],
                 [25.3, D - 0.5, 'None remain in these orders. Uncertain origins are left out and flagged.']];
    // the three builds: label, cells still wrong, when the row appears, when its sweep ends
    var builds = [['Original adapter', NM, 11.6, 13.0], ['Fix 1: start-time binding', NL, 15.2, 16.7], ['Fix 2: dispatch-time binding', 0, 22.0, 24.5]];
    function G() {
      if (PORT) return { lx0: laneX(350), lx1: laneX(1245), ry: 384, sy: 496, cols: 28, pitch: 14, cell: 10, gx: 86, gy: 296, nx: 86, ny: 234 };
      return { lx0: laneX(350), lx1: laneX(1245), ry: 430, sy: 590, cols: 44, pitch: 20, cell: 14, gx: 190, gy: 296, nx: 1170, ny: 380 };
    }
    function draw(t) {
      var g = G(), U = function (u) { return lerp(g.lx0, g.lx1, u); };
      head(t, heads);
      // --- a few orders, on the timeline carried over from the bug scene ---
      var base = SA, ma = vis(t, -1, 8.4, 0.5);
      if (ma > 0) {
        X.save(); X.translate(0, -26 * P(t, 7.9, 8.4, E.inn));
        SA = base * ma;
        var ry = g.ry, sy = g.sy, k = P(t, 0, 0.7);   // the bug scene's marks settle into this scene's weights
        var lw = lerp(PORT ? 5 : 7, PORT ? 4 : 6, k), tk = lerp(14, 13, k), xB1 = lerp(laneX(1225), U(uB1), k);
        var ba = P(t, 0.3, 0.8);
        fillRR(U(uB0) - 12, ry - (PORT ? 36 : 44), U(uB1) - U(uB0) + 24, sy - ry + (PORT ? 72 : 88), 14, C.ink, 0.045 * ba);
        txt('while B is current', (U(uB0) + U(uB1)) / 2, ry - (PORT ? 56 : 66), { sz: PORT ? 19 : 20, w: 500, c: C.ink2, al: 'center', a: ba });
        line(g.lx0, ry, g.lx1, ry, C.faint, 2, 1); line(g.lx0, sy, g.lx1, sy, C.faint, 2, 1);
        line(U(uA0), ry, U(uCan), ry, C.A, lw, 1);
        line(U(uCan), ry - tk, U(uCan), ry + tk, C.ink2, 2.5, 1);
        line(U(uB0), ry, xB1, ry, C.B, lw, 1);
        badge(U(uA0), ry, 'A', C.A, 1); badge(U(uB0), ry, 'B', C.B, 1);
        var s = kf(t, KS), e = kf(t, KE), inB = e > uB0 && e < uB1;
        var sp = sCurve(U(uSp), ry, U(s), sy);
        strokePath(sp, 0, 1, C.A, lerp(PORT ? 3 : 4, 2.5, k), lerp(1, 0.5, k));
        line(U(s), sy, U(e), sy, C.A, PORT ? 3 : 4, 1);
        ring(U(s), sy, PORT ? 5 : 7, C.A, 2.5, k); circle(U(s), sy, PORT ? 3.5 : 5, C.bg, k);
        if (t < 7.9) sq(U(e), sy, PORT ? 14 : 22, inB ? mix(C.A, C.red, P(t, 0.9, 1.3)) : C.A, 1);
        // the two events that move, named on the first order
        var nl = vis(t, 0.8, 2.6, 0.3), nsz = PORT ? 17 : 19;
        txt('start', U(s), sy + (PORT ? 32 : 40), { sz: nsz, w: 600, c: C.ink2, al: 'center', a: nl });
        txt('edit', U(e), sy - 22, { sz: nsz, w: 600, c: C.ink2, al: 'center', a: nl });
        // the verdict for each of the slow orders
        for (var o = 0; o < 4; o++) {
          var va = vis(t, TS[o] + 0.05, (o < 3 ? TS[o + 1] - 0.55 : 6.6), 0.25);
          if (va <= 0) continue;
          var bad = ORD[o][1] > uB0 && ORD[o][1] < uB1;
          txt(bad ? 'in B’s report' : 'not in B’s report', U(ORD[o][1]), sy + (PORT ? 32 : 40), { sz: PORT ? 19 : 20, w: 600, c: bad ? C.red : C.ink2, al: 'center', a: va });
        }
        SA = base;
        X.restore();
      }
      // --- every order as one dot ---
      var rows = Math.ceil(N / g.cols), colsM = Math.ceil(NM / rows), colsL = Math.ceil(NL / rows);
      // the last example order flies in and becomes the first dot
      if (t >= 7.9 && t < 8.3) {
        var last = ORD[ORD.length - 1], k0 = P(t, 7.9, 8.3);
        var fx = lerp(U(last[1]), g.gx + g.cell / 2, k0), fy = lerp(g.sy - 26 * P(t, 7.9, 8.4, E.inn), g.gy + g.cell / 2, k0);
        var lastIn = last[1] > uB0 && last[1] < uB1;
        sq(fx, fy, lerp(PORT ? 14 : 22, g.cell, k0), mix(lastIn ? C.red : C.A, C.grey, P(t, 7.95, 8.3)), 1);
      }
      var red = 0;   // the count of red cells on screen, which the counter and ledger report
      for (var i = 0; i < N; i++) {
        var col = Math.floor(i / rows), row = i % rows;
        var ta = 8.3 + 1.5 * col / (g.cols - 1) + 0.18 * hash(i), ka = i === 0 ? (t >= 8.3 ? 1 : 0) : P(t, ta, ta + 0.35, E.back);
        if (ka <= 0) continue;
        var kr = 0, sc = 1;
        if (i < NM) {
          var tr = 11.6 + 1.1 * col / colsM;
          kr = P(t, tr, tr + 0.3);
          if (i >= NL) { var t1 = 15.4 + 1.0 * (1 - (col - colsL + 1) / (colsM - colsL + 1)); kr *= 1 - P(t, t1, t1 + 0.3); }
          else {
            sc += 0.2 * Math.sin(Math.PI * clamp((t - 19.7) / 1.0));   // one breath: these start after B
            var t2 = 22.2 + 2.0 * (1 - col / colsL); kr *= 1 - P(t, t2, t2 + 0.3);
          }
        }
        red += kr;
        var x = g.gx + col * g.pitch + g.cell / 2, y = g.gy + row * g.pitch + g.cell / 2, z = g.cell * ka * sc;
        fillRR(x - z / 2, y - z / 2, z, z, z * 0.24, kr > 0 ? mix(C.grey, C.red, kr) : C.grey, 1);
      }
      red = Math.round(red);
      // the remaining red block, named while the sentence is up
      var bra = vis(t, 19.5, 21.8, 0.3), bw = colsL * g.pitch - (g.pitch - g.cell);
      if (bra > 0) {
        if (PORT) txt('subagent started after B', g.gx, g.gy - 14, { sz: 14, w: 600, c: C.red, a: bra });
        else {
          lineOn(g.gx, g.gy - 18, g.gx + bw, g.gy - 18, P(t, 19.5, 20.0, E.out), C.ink2, 1.5, bra);
          txt('subagent started after B', g.gx + bw / 2, g.gy - 40, { sz: 18, w: 600, c: C.red, al: 'center', a: bra });
        }
      }
      // legend
      var lg = P(t, 10.4, 10.9), ly = g.gy + rows * g.pitch + (PORT ? 22 : 30), lsz = PORT ? 19 : 20;
      sq(g.gx + 7, ly, PORT ? 10 : 14, C.red, lg);
      txt('A’s edit in B’s report', g.gx + 24, ly, { sz: lsz, w: 500, c: C.ink2, a: lg });
      var lx2 = g.gx + 24 + tw('A’s edit in B’s report', lsz, 500) + 30;
      sq(lx2 + 7, ly, PORT ? 10 : 14, C.grey, lg);
      txt('not misattributed', lx2 + 24, ly, { sz: lsz, w: 500, c: C.ink2, a: lg });
      // the count: the total counts up in ink as the dots land, then hands itself to the small line
      // while the red count takes its place
      var up = Math.round(N * clamp((t - 8.3) / 1.5)), na0 = P(t, 8.6, 9.0, E.out);
      var hk = P(t, 11.5, 11.9), ra = P(t, 11.65, 11.95, E.out), ofa = P(t, 11.7, 11.95);
      var ncol = red > 0 ? C.red : C.ink, cur = t < 15.2 ? 0 : t < 22.0 ? 1 : 2;
      if (PORT) {
        txt(String(red), g.nx, g.ny, { sz: 60, w: 650, c: ncol, a: ra });
        var ofx = g.nx + tw(String(red), 60, 650) + 10, upx = g.nx + tw(String(up), 60, 650) + 10;
        txt('of', ofx, g.ny + 12, { sz: 20, w: 500, c: C.ink2, a: ofa });
        txt(String(up), lerp(g.nx, ofx + tw('of ', 20, 500), hk), lerp(g.ny, g.ny + 12, hk), { sz: lerp(60, 20, hk), w: hk < 0.5 ? 650 : 500, c: mix(C.ink, C.ink2, hk), a: na0 });
        txt('orders', upx, g.ny + 12, { sz: 20, w: 500, c: C.ink2, a: na0 * (1 - P(t, 11.5, 11.7)) });
        builds.forEach(function (b, j) {
          var ba = vis(t, b[2], j < 2 ? builds[j + 1][2] : D + 1, 0.35);
          txt(b[0], g.gx + (g.cols - 1) * g.pitch + g.cell, g.ny - 30, { sz: 16, w: 600, c: C.ink2, al: 'right', a: ba });
        });
      } else {
        txt(String(red), g.nx - 6, g.ny, { sz: 132, w: 650, c: ncol, a: ra });
        var ofw = tw('of ', 24, 500);
        txt('of', g.nx, g.ny + 92, { sz: 24, w: 500, c: C.ink2, a: ofa });
        txt(String(up), lerp(g.nx - 6, g.nx + ofw, hk), lerp(g.ny, g.ny + 92, hk), { sz: lerp(132, 24, hk), w: hk < 0.5 ? 650 : 500, c: mix(C.ink, C.ink2, hk), a: na0 });
        txt('orders', lerp(g.nx, g.nx + ofw + tw(N + ' ', 24, 500), hk), g.ny + 92, { sz: 24, w: 500, c: C.ink2, a: na0 * (1 - vis(t, 11.5, 11.95, 0.15)) });
        // the ledger: each row's label arrives with its headline, its value when the sweep ends
        builds.forEach(function (b, j) {
          var ba = P(t, b[2], b[2] + 0.4, E.out), va = P(t, b[3] - 0.1, b[3] + 0.3, E.out), on = j === cur, y = g.ny + 186 + j * 48;
          var c = on ? C.ink : C.ink2, al = on ? 1 : 0.6;
          txt(b[0], g.nx, y + (1 - ba) * 8, { sz: 21, w: on ? 650 : 500, c: c, a: ba * al });
          txt(String(b[1]), g.nx + 330, y + (1 - va) * 8, { sz: 21, w: on ? 650 : 500, c: on && b[1] > 0 ? C.red : c, al: 'right', a: va * al });
        });
      }
    }
    return {
      dur: D, draw: draw, heads: heads, hardIn: true,
      chapters: [[0, 'Turnstile'], [15.1, 'Two fixes']],
      caps: [
        [0.3, 'Turnstile runs the unmodified adapter under every order of these events the provider model allows. The subagent’s start and edit slide to new places; whenever the edit lands while B is current, it ends up in B’s report.'],
        [8.2, '956 orders in three scenario groups. Each dot is one.'],
        [11.5, 'In 581 of them, the original adapter puts A’s edit in B’s report.'],
        [15.1, 'Fix 1: credit the subagent to the request current when it starts. 174 remain.'],
        [19.3, 'That fails when the subagent starts after B.'],
        [21.9, 'Fix 2: credit it to the request that dispatched it. None remain in these 956 orders.'],
        [25.3, 'If the origin is unclear, it leaves the edit out and says so.']
      ]
    };
  })();

  // ======================================================================
  // Scene 3: the limit
  // ======================================================================
  var S3 = (function () {
    var D = 25.5;
    var heads = [[0.1, 2.9, 'Could a smarter adapter always get this right?'],
                 [3.2, 6.4, 'Here are two runs that send it exactly the same messages.'],
                 [6.7, 11.5, 'In run 1, the edit x is A’s work. In run 2, it is B’s.'],
                 [11.8, 16.5, 'The adapter must give one answer for both.'],
                 [16.8, 20.3, 'Either way, one run gets a wrong or incomplete report.'],
                 [20.6, D - 0.5, 'Expose the turn’s origin, and the two runs differ.']];
    function G() {
      if (PORT) return { ys: [330, 470], xs: function (i) { return 76 + i * 50; }, xx: 404, eq: 490, opts: [210, 410], oy: 586, note: 586, foot: 806 };
      return { ys: [410, 590], xs: function (i) { return 350 + i * 118; }, xx: 1090, eq: 1200, opts: [1330, 1482], oy: 322, note: 714, foot: 800 };
    }
    function draw(t) {
      var g = G();
      head(t, heads);
      var own = P(t, 7.0, 7.5), tag = P(t, 20.9, 21.4, E.out), arcF = 1 - P(t, 11.5, 11.8);
      for (var r = 0; r < 2; r++) {
        // run 2 starts as a copy of run 1 that slides down
        var dy = r === 0 ? 0 : (g.ys[0] - g.ys[1]) * (1 - P(t, 3.5, 4.3));
        var ra = r === 0 ? 1 : P(t, 3.4, 3.7);
        var y = g.ys[r] + dy, built = r === 0 ? t : Math.max(t, 3.4) + 10;
        var la = r === 0 ? P(t, 0.6, 1.0) : P(t, 4.1, 4.5);
        if (PORT) txt('Run ' + (r + 1), 60, g.ys[r] - 40, { sz: 20, w: 600, c: C.ink2, a: la });
        else txt('Run ' + (r + 1), 318, g.ys[r], { sz: 24, w: 600, c: C.ink2, al: 'right', a: la });
        // the lane draws on while the previous scene is still fading
        lineOn(g.xs(0) - 16, y, g.xx + 16, y, P(built, -0.3, 0.4, E.out), C.faint, 2, ra);
        for (var i = 0; i < 6; i++) {
          var k = P(built, -0.1 + i * 0.13, 0.25 + i * 0.13, E.back);
          circle(g.xs(i), y, (PORT ? 8 : 11) * k, C.ink3, ra);
        }
        var xk = P(built, 1.8, 2.2, E.back), xc = mix(C.ink3, r === 0 ? C.A : C.B, own);
        sq(g.xx, y, (PORT ? 30 : 38) * xk, xc, ra);
        txt('x', g.xx, y - 1, { sz: PORT ? 18 : 22, w: 600, mono: true, c: '#ffffff', al: 'center', a: ra * xk });
        txt(r === 0 ? 'A’s work' : 'B’s work', g.xx, y + (PORT ? 36 : 46), { sz: PORT ? 19 : 20, w: 600, c: r === 0 ? C.A : C.B, al: 'center', a: own * (1 - P(t, 20.7, 21.0)) });
        // what differs: the message that started x's turn, visible to us, hidden on the wire
        if (arcF > 0 && t > 7.2) {
          var arc = hop([g.xs(r === 0 ? 1 : 4), y], [g.xx - (PORT ? 15 : 19), y], PORT ? 30 : 46);
          strokePath(arc, 0, P(t, 7.2 + r * 0.2, 7.9 + r * 0.2, E.out), r === 0 ? C.A : C.B, 1.5, 0.55 * arcF, [4, 5]);
        }
        pill(r === 0 ? 'origin: A' : 'origin: B', g.xx, y - (PORT ? 40 : 52), r === 0 ? C.A : C.B, tag, { dy: -10 * (1 - tag) });
      }
      // identical, then different
      var eqa = P(t, 4.3, 4.7);
      var my = (g.ys[0] + g.ys[1]) / 2, ew = PORT ? 30 : 48;
      line(g.eq - ew / 2, my - 7, g.eq + ew / 2, my - 7, C.ink, 3, eqa); line(g.eq - ew / 2, my + 7, g.eq + ew / 2, my + 7, C.ink, 3, eqa);
      var ne = P(t, 21.5, 21.9);
      lineOn(g.eq + ew * 0.28, my - 20, g.eq - ew * 0.28, my + 20, ne, C.ink, 3, eqa);
      if (!PORT) {
        txt('same input', g.eq + ew / 2 + 14, my, { sz: 20, w: 500, c: C.ink2, a: eqa * (1 - P(t, 21.1, 21.4)) });
        txt('now they differ', g.eq + ew / 2 + 14, my, { sz: 20, w: 500, c: C.ink2, a: eqa * P(t, 21.5, 21.9, E.out) });
      }
      // what differs is hidden
      var hn = vis(t, 7.6, 11.6, 0.4);
      block('What differs is hidden from the adapter: which message started x’s turn.', FW / 2, g.note, { sz: PORT ? 18 : 24, w: 500, c: C.ink2, a: hn, maxW: PORT ? 480 : 1000 });
      // one answer for both: list x, or leave it out
      var oa = vis(t, 12.0, 20.8, 0.4);
      if (oa > 0) {
        var heads2 = ['list x', 'leave x out'];
        var marks = [[[12.6, false, 'wrong'], [13.15, true]], [[14.2, true], [14.75, false, 'incomplete']]];
        for (var c = 0; c < 2; c++) {
          var cx = g.opts[c], ca = P(t, c === 0 ? 12.1 : 13.75, c === 0 ? 12.5 : 14.15);
          txt(heads2[c], cx, g.oy, { sz: PORT ? 20 : 21, w: 650, c: C.ink, al: 'center', a: oa * ca });
          for (var r2 = 0; r2 < 2; r2++) {
            var mk = marks[c][r2], my2 = PORT ? g.oy + 50 + r2 * 64 : g.ys[r2], kk = P(t, mk[0], mk[0] + 0.35);
            if (mk[1]) check(cx, my2, PORT ? 22 : 28, C.ink3, kk, oa);
            else { cross(cx, my2, PORT ? 22 : 28, C.red, kk, oa); txt(mk[2], cx, my2 + (PORT ? 26 : 36), { sz: PORT ? 19 : 20, w: 600, c: C.red, al: 'center', a: oa * P(t, mk[0] + 0.2, mk[0] + 0.5) }); }
          }
        }
        if (PORT) for (var r3 = 0; r3 < 2; r3++) txt('Run ' + (r3 + 1), 60, g.oy + 50 + r3 * 64, { sz: 19, w: 600, c: C.ink2, a: oa * P(t, 12.1, 12.5) });
      }
      var fa = vis(t, 17.1, 20.8, 0.4);
      block('Theorem 1: on the typed Codex 0.160.1 wire, no adapter that meets the paper’s conditions is exact.', FW / 2, g.foot, { sz: PORT ? 18 : 24, w: 500, c: C.ink2, a: fa, maxW: PORT ? 480 : 1300 });
      var ra2 = P(t, 22.3, 22.8);
      block('Codex 0.162.0 exposes turn lineage as rootTurnId.', FW / 2, g.foot, { sz: PORT ? 18 : 24, w: 500, c: C.ink2, a: ra2, maxW: PORT ? 480 : 1300 });
    }
    return {
      dur: D, draw: draw, heads: heads,
      chapters: [[0, 'The limit']],
      caps: [
        [0.1, 'Could a smarter adapter always get this right?'],
        [3.2, 'Here are two runs that send it exactly the same messages.'],
        [6.7, 'In run 1, the edit x is A’s work. In run 2, it is B’s. What differs is hidden from the adapter: which message started x’s turn.'],
        [11.8, 'The adapter must give one answer for both. Listing x in B’s report is wrong in run 1; leaving it out is incomplete in run 2.'],
        [16.8, 'Either way, one run gets a wrong or incomplete report. Theorem 1: on the typed Codex 0.160.1 wire, no adapter that meets the paper’s conditions is exact.'],
        [20.6, 'Expose the turn’s origin, and the two runs differ. Codex 0.162.0 exposes turn lineage as rootTurnId.']
      ]
    };
  })();

  // ======================================================================
  // Scene 4: takeaway and credits
  // ======================================================================
  var S4 = (function () {
    var D = 11.5;
    var lines = ['Bind delegated work to the request that dispatched it.', 'Better: carry the origin on every delegated event.'];
    function draw(t) {
      var la1 = 1 - P(t, 5.4, 5.8), la2 = 1 - P(t, 5.5, 5.9), sz = PORT ? 28 : 44, mw = PORT ? 460 : 1300;
      var a1 = P(t, -0.2, 0.5, E.out), a2 = P(t, 1.8, 2.4, E.out);
      var y1 = PORT ? 360 : 420, y2 = PORT ? 500 : 500;
      block(lines[0], FW / 2, y1 + (1 - a1) * 14, { sz: sz, w: 600, a: a1 * la1, maxW: mw });
      block(lines[1], FW / 2, y2 + (1 - a2) * 14, { sz: sz, w: 600, c: C.A, a: a2 * la2, maxW: mw });
      // the title rises while the takeaway is still leaving
      var ca = P(t, 5.7, 6.4, E.out), aa = P(t, 6.3, 7.0, E.out);
      var ty = PORT ? 380 : 420;
      block('Attributing Subagent Work in Coding-Agent Protocol Adapters', FW / 2, ty + (1 - ca) * 20, { sz: PORT ? 30 : 50, w: 650, a: ca, maxW: PORT ? 460 : 1100, lh: PORT ? 38 : 62 });
      if (PORT) {
        txt('Rajasekhar Josyula', FW / 2, ty + 120, { sz: 20, w: 500, c: C.ink2, al: 'center', a: aa });
        txt('Lakshmi Sravya Vedantham', FW / 2, ty + 148, { sz: 20, w: 500, c: C.ink2, al: 'center', a: aa });
      } else txt('Rajasekhar Josyula  ·  Lakshmi Sravya Vedantham', FW / 2, ty + 110, { sz: 24, w: 500, c: C.ink2, al: 'center', a: aa });
    }
    return {
      dur: D, draw: draw,
      also: [[0.3, 5.4, lines[0]], [1.8, 5.5, lines[1]], [5.7, D, 'Attributing Subagent Work in Coding-Agent Protocol Adapters']],
      chapters: [[0, 'Takeaway']],
      caps: [
        [0.3, lines[0]],
        [1.8, lines[1]],
        [5.7, 'Attributing Subagent Work in Coding-Agent Protocol Adapters, by Rajasekhar Josyula and Lakshmi Sravya Vedantham.']
      ]
    };
  })();

  // ======================================================================
  // Player
  // ======================================================================
  var SCENES = [S0, S1, S2, S3, S4];
  var XF = 0.45;   // hand-over at each cut: the next scene draws on while the last one fades
  var starts = [], TOTAL = 0;
  SCENES.forEach(function (s) { starts.push(TOTAL); TOTAL += s.dur; });
  var CAPS = [], CHAPS = [], HEADS = [];
  SCENES.forEach(function (s, i) {
    s.caps.forEach(function (c) { CAPS.push([starts[i] + c[0], c[1]]); });
    s.chapters.forEach(function (c) { CHAPS.push({ t: starts[i] + c[0], title: c[1] }); });
    (s.heads || []).forEach(function (h) { HEADS.push([starts[i] + h[0], starts[i] + (h[1] == null ? s.dur - XF : h[1]), h[2]]); });
    (s.also || []).forEach(function (h) { HEADS.push([starts[i] + h[0], starts[i] + h[1], h[2]]); });
  });
  function fmt(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }
  var DEBUG = /filmdebug/.test(location.hash);
  if (DEBUG) {
    HEADS.forEach(function (h) { var w = h[2].split(' ').length, hold = h[1] - h[0]; if (hold < 0.5 + w / 3.5) console.warn('short hold ' + hold.toFixed(1) + 's: ' + h[2]); });
    CAPS.forEach(function (c) { if (!HEADS.some(function (h) { return Math.abs(h[0] - c[0]) < 0.01; })) console.warn('caption without headline', c[0], c[1]); });
    console.assert(TOTAL >= 100.5 && TOTAL <= 110, 'TOTAL ' + TOTAL);
  }

  function mount(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.innerHTML =
      '<div class="film-stage">' +
        '<canvas class="film-canvas" role="img" aria-label="Animated explainer. Its narration is read out as it plays."></canvas>' +
        '<button type="button" class="film-big" aria-label="Play the film, ' + fmt(TOTAL) + '"></button>' +
      '</div>' +
      '<div class="film-bar">' +
        '<button type="button" class="film-btn film-pp" aria-label="Play"><span class="ic-play" aria-hidden="true"></span></button>' +
        '<div class="film-track"><div class="film-segs"></div>' +
          '<input class="film-range" type="range" min="0" max="1000" step="1" value="0" aria-label="Position in the film"></div>' +
        '<span class="film-time">0:00 / ' + fmt(TOTAL) + '</span>' +
        '<button type="button" class="film-btn film-fs" aria-label="Full screen"><span class="ic-fs" aria-hidden="true"></span></button>' +
      '</div>' +
      '<p class="film-cap" aria-live="polite"></p>';
    var stage = root.querySelector('.film-stage'), cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
    var big = root.querySelector('.film-big'), capEl = root.querySelector('.film-cap'), pp = root.querySelector('.film-pp');
    var range = root.querySelector('.film-range'), segs = root.querySelector('.film-segs'), timeEl = root.querySelector('.film-time');
    var fsBtn = root.querySelector('.film-fs'), segEls = [];
    CHAPS.forEach(function (c, i) {
      var end = i + 1 < CHAPS.length ? CHAPS[i + 1].t : TOTAL;
      var s = document.createElement('div'); s.className = 'film-seg'; s.style.flexGrow = String(end - c.t);
      s.innerHTML = '<i></i>'; s.title = (i + 1) + '. ' + c.title;
      segs.appendChild(s); segEls.push(s);
    });
    if (!(root.requestFullscreen || root.webkitRequestFullscreen)) fsBtn.hidden = true;

    var t = 0, playing = false, userPaused = false, ended = false, last = 0, raf = 0, started = false;
    var inView = false, autoPaused = false;
    var W = 0, H = 0, lastCap = -1;

    function layout() {
      var fs = document.fullscreenElement === root || document.webkitFullscreenElement === root;
      var w = stage.clientWidth, port = fs ? stage.clientHeight > stage.clientWidth : w < 620;
      root.classList.toggle('portrait', port);
      var fw = port ? 560 : 1600, fh = port ? 860 : 900;
      if (fs) w = Math.min(w, stage.clientHeight * fw / fh);
      var dpr = Math.min(window.devicePixelRatio || 1, 2), cw = Math.round(w * dpr), ch = Math.round(w * fh / fw * dpr);
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; cv.style.width = w + 'px'; cv.style.height = (w * fh / fw) + 'px'; }
      W = cw; H = ch; PORT = port; FW = fw; FH = fh;
    }

    function render() {
      layout();
      X = ctx;
      X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1;
      X.fillStyle = C.bg; X.fillRect(0, 0, W, H);
      var s = W / FW;
      X.setTransform(s, 0, 0, s, 0, 0);
      var i = 0;
      while (i < SCENES.length - 1 && t >= starts[i + 1]) i++;
      var sc = SCENES[i], lt = t - starts[i], nx = SCENES[i + 1];
      // the outgoing scene fades over its last XF while the next one is already drawn at negative
      // local time, so the alphas sum to one and no frame is bare; a hardIn scene cuts instead
      var xo = nx && !nx.hardIn ? XF : 0;
      var out = xo > 0 ? 1 - P(lt, sc.dur - xo, sc.dur) : 1;
      SA = out; X.save(); sc.draw(lt); X.restore();
      if (nx && xo > 0 && lt > sc.dur - xo) { SA = 1 - out; X.save(); nx.draw(lt - sc.dur); X.restore(); }
      SA = 1;
      // controls
      var k = t / TOTAL;
      if (document.activeElement !== range) range.value = String(Math.round(k * 1000));
      segEls.forEach(function (el, j) {
        var a = CHAPS[j].t, b = j + 1 < CHAPS.length ? CHAPS[j + 1].t : TOTAL;
        el.firstChild.style.width = (clamp((t - a) / (b - a)) * 100) + '%';
      });
      var ci = 0; while (ci < CHAPS.length - 1 && t >= CHAPS[ci + 1].t) ci++;
      var cc = -1; for (var q = 0; q < CAPS.length; q++) if (t >= CAPS[q][0]) cc = q;
      if (cc !== lastCap) { capEl.textContent = cc >= 0 && started ? CAPS[cc][1] : ''; lastCap = cc; }
      timeEl.textContent = fmt(t) + ' / ' + fmt(TOTAL);
      range.setAttribute('aria-valuetext', fmt(t) + ', ' + CHAPS[ci].title);
    }
    function finish() {
      t = TOTAL; render(); stop(); ended = true; root.classList.add('ended'); big.setAttribute('aria-label', 'Replay the film');
    }
    function frame(now) {
      raf = 0;
      if (!playing) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      if (t >= TOTAL) { finish(); return; }
      render();
      raf = requestAnimationFrame(frame);
    }
    function play(fromUser) {
      autoPaused = false;
      if (ended || t >= TOTAL) { t = 0; ended = false; root.classList.remove('ended'); big.setAttribute('aria-label', 'Play the film, ' + fmt(TOTAL)); }
      if (fromUser) userPaused = false;
      if (playing) return;
      playing = true; started = true; root.classList.add('playing', 'started');
      pp.setAttribute('aria-label', 'Pause');
      last = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      playing = false; root.classList.remove('playing'); pp.setAttribute('aria-label', 'Play');
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function pause(fromUser) { if (fromUser) { userPaused = true; autoPaused = false; } stop(); }
    // a pause the film took on its own (tab hidden, scrolled away) is undone when it is back in view
    function autoPause() { if (playing) { autoPaused = true; stop(); } }
    function seek(nt) {
      started = true; root.classList.add('started');
      t = clamp(nt, 0, TOTAL);
      if (t >= TOTAL) finish();
      else { ended = false; root.classList.remove('ended'); render(); }
    }
    // a chapter jump lands on the chapter's first fully visible frame
    function seekChapter(k) { seek(k <= 0 ? 0 : CHAPS[k].t + XF); }

    pp.addEventListener('click', function () { if (playing) pause(true); else play(true); });
    big.addEventListener('click', function () { play(true); });
    cv.addEventListener('click', function () { if (playing) pause(true); else play(true); });
    range.addEventListener('input', function () { seek(+range.value / 1000 * TOTAL); });
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
      else if (/^[1-9]$/.test(k) && +k <= CHAPS.length) seekChapter(+k - 1);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { render(); }).observe(stage);
    else window.addEventListener('resize', render);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var on = e.isIntersecting && e.intersectionRatio >= 0.5;
          inView = on;
          if (on && !userPaused && !reduce && !ended && root.dataset.autoplay !== 'off') play(false);
          else if (!on) autoPause();
        });
      }, { threshold: [0, 0.5, 0.75] }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) autoPause();
      else if (autoPaused && inView && !userPaused && !ended) play(false);
    });
    root.tabIndex = -1;
    render();

    // transcript, if the page asks for one
    var tr = document.querySelector('[data-film-transcript]');
    if (tr && !tr.children.length) {
      var html = '';
      CHAPS.forEach(function (c, i) {
        var end = i + 1 < CHAPS.length ? CHAPS[i + 1].t : TOTAL + 1;
        html += '<h3><button type="button" data-t="' + c.t + '">' + c.title + ' <span>' + fmt(c.t) + '</span></button></h3><p>';
        html += CAPS.filter(function (q) { return q[0] >= c.t - 0.2 && q[0] < end - 0.2; }).map(function (q) { return q[1]; }).join(' ');
        html += '</p>';
      });
      tr.innerHTML = html;
    }
    if (tr) tr.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (b) {
        var tt = +b.dataset.t, k = 0;
        for (var j = 0; j < CHAPS.length; j++) if (Math.abs(CHAPS[j].t - tt) < 0.5) k = j;
        seekChapter(k); root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); play(true);
      }
    });
    if (DEBUG) window.__film = {
      seek: seek, total: TOTAL, starts: starts, heads: HEADS, play: play, pause: pause, get t() { return t; },
      bench: function (from, to, n) { var tt = 0, worst = 0; for (var i = 0; i < n; i++) { t = from + (to - from) * i / n; var a = performance.now(); render(); var d = performance.now() - a; tt += d; worst = Math.max(worst, d); } return { avg: tt / n, worst: worst }; }
    };
  }

  window.__filmExport = { caps: CAPS, chaps: CHAPS, heads: HEADS, starts: starts, total: TOTAL };
  function boot() { var els = document.querySelectorAll('[data-film]'); for (var i = 0; i < els.length; i++) mount(els[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
