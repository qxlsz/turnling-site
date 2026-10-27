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
  function strokePath(path, u0, u1, c, lw, a) {
    if (a <= 0.004 || u1 <= u0) return;
    var p0 = path.at(u0), d0 = u0 * path.total, d1 = u1 * path.total;
    X.beginPath(); X.moveTo(p0.x, p0.y);
    for (var i = 1; i < path.p.length; i++) if (path.L[i] > d0 && path.L[i] < d1) X.lineTo(path.p[i][0], path.p[i][1]);
    var p1 = path.at(u1); X.lineTo(p1.x, p1.y);
    X.strokeStyle = c; X.lineWidth = lw; X.lineCap = 'round'; X.lineJoin = 'round'; alpha(a); X.stroke();
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
  function pill(s, x, y, c, a, o) {
    o = o || {};
    if (a <= 0.004) return;
    var sz = o.sz || (PORT ? 16 : 18), w = tw(s, sz, 600, o.mono) + sz * 1.3, h = sz * 1.9;
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

  // One sentence at a time at the top of the frame.
  function head(t, items) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i], ain = P(t, it[0], it[0] + 0.6, E.out), aout = it[1] == null ? 0 : P(t, it[1], it[1] + 0.35, E.inn);
      var a = ain * (1 - aout);
      if (a <= 0.004) continue;
      block(it[2], FW / 2, (PORT ? 112 : 140) + (1 - ain) * 14 - aout * 8, { sz: PORT ? 27 : 42, w: 600, a: a, maxW: PORT ? 480 : 1440, c: it[3] || C.ink });
    }
  }

  // ======================================================================
  // Scene 0: editors, adapters, reports
  // ======================================================================
  var S0 = (function () {
    var D = 10.2;
    function G(t) {
      if (PORT) {
        var dx = -92 * P(t, 5.2, 6.0);
        return { v: true, w: 190, h: 66, n: [[280 + dx, 350], [280 + dx, 505], [280 + dx, 660]], card: [292, 302, 222, 96] };
      }
      return { v: false, w: 240, h: 84, n: [[400, 480], [800, 480], [1200, 480]], card: [285, 600, 230, 104] };
    }
    // Point on the chain from node i to node j, k in [0, 1], between node edges.
    function along(g, i, j, k) {
      var a = g.n[i], b = g.n[j], hx = g.v ? 0 : g.w / 2, hy = g.v ? g.h / 2 : 0, sx = Math.sign(b[0] - a[0]), sy = Math.sign(b[1] - a[1]);
      var x0 = a[0] + (i === 1 ? 0 : sx * hx), y0 = a[1] + (i === 1 ? 0 : sy * hy), x1 = b[0] - (j === 1 ? 0 : sx * hx), y1 = b[1] - (j === 1 ? 0 : sy * hy);
      return [lerp(x0, x1, k), lerp(y0, y1, k)];
    }
    function draw(t) {
      var g = G(t), names = ['Editor', 'Adapter', 'Agent'];
      head(t, [[0.3, 3.9, 'Editors talk to coding agents through adapters.'],
               [4.2, 7.3, 'The adapter tells the editor which files each request changed.'],
               [7.6, null, 'That works, until work outlives its request.']]);
      // connectors
      for (var c = 0; c < 2; c++) {
        var a = g.n[c], b = g.n[c + 1], k = P(t, 1.1 + c * 0.25, 1.7 + c * 0.25);
        if (g.v) lineOn(a[0], a[1] + g.h / 2, b[0], b[1] - g.h / 2, k, C.ink3, 1.5, 1);
        else lineOn(a[0] + g.w / 2, a[1], b[0] - g.w / 2, b[1], k, C.ink3, 1.5, 1);
      }
      // request A goes out
      var ra = vis(t, 2.1, 3.95, 0.25);
      if (ra > 0) {
        var p = t < 3.0 ? along(g, 0, 1, P(t, 2.2, 2.9)) : along(g, 1, 2, P(t, 3.1, 3.75));
        circle(p[0], p[1], PORT ? 8 : 11, C.A, ra);
        if (g.v) txt('request A', p[0] + 20, p[1], { sz: PORT ? 17 : 17, w: 600, c: C.A, a: ra });
        else txt('request A', p[0], p[1] - 34, { sz: 21, w: 600, c: C.A, al: 'center', a: ra });
      }
      // the edit comes back; it passes behind the nodes, then lands in A's report
      var cd = g.card, rowX = cd[0] + (PORT ? 30 : 34), rowY = cd[1] + (PORT ? 66 : 70);
      var ea = P(t, 4.5, 4.8, E.out), es = (PORT ? 14 : 18) * lerp(0.6, 1, ea);
      if (ea > 0 && t < 5.6) {
        var q = t < 4.95 ? along(g, 2, 1, P(t, 4.6, 4.95)) : along(g, 1, 0, P(t, 5.05, 5.6));
        sq(q[0], q[1], es, C.A, ea);
        var la = ea * (1 - P(t, 5.4, 5.6));
        if (g.v) txt('a.txt', q[0] + 18, q[1], { sz: PORT ? 17 : 16, mono: true, c: C.ink2, a: la });
        else txt('a.txt', q[0], q[1] + 30, { sz: 19, mono: true, c: C.ink2, al: 'center', a: la });
      }
      // nodes
      g.n.forEach(function (p, i) {
        var k = P(t, 0.5 + i * 0.15, 1.1 + i * 0.15, E.out), s = lerp(0.94, 1, k);
        X.save(); X.translate(p[0], p[1] + (1 - k) * 10); X.scale(s, s);
        fillRR(-g.w / 2, -g.h / 2, g.w, g.h, g.h / 2, C.card, k);
        strokeRR(-g.w / 2, -g.h / 2, g.w, g.h, g.h / 2, i === 1 ? C.ink : C.line, i === 1 ? 2 : 1.5, k);
        txt(names[i], 0, 1, { sz: PORT ? 21 : 26, w: 600, al: 'center', a: k });
        X.restore();
      });
      var fa = P(t, 5.5, 6.0, E.out);
      card(cd[0], cd[1] + (1 - fa) * 8, cd[2], cd[3], fa);
      txt('A’s report', cd[0] + 22, cd[1] + (PORT ? 30 : 32) + (1 - fa) * 8, { sz: PORT ? 16 : 18, w: 600, c: C.ink3, a: fa });
      if (t >= 5.6) {
        var hq = hop(along(g, 1, 0, 1), [rowX, rowY], g.v ? 24 : 40).at(P(t, 5.6, 6.2));
        sq(hq.x, hq.y, es, C.A, ea);
        txt('a.txt', rowX + (PORT ? 20 : 22), rowY, { sz: PORT ? 20 : 22, mono: true, c: C.ink, a: P(t, 6.1, 6.4) });
      }
    }
    return {
      dur: D, draw: draw,
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
    var D = 24.8;
    // Event positions in landscape units; portrait maps them onto its lanes.
    var xA0 = 375, xSp = 450, xCan = 620, xB0 = 740, xEd = 990, xBt = 1110, xB1 = 1225;
    var PH = [[1.0, xA0], [2.2, xSp], [2.9, xSp], [4.0, xCan], [5.9, xCan], [6.8, xB0], [8.6, xB0], [9.6, xEd], [13.0, xEd], [14.2, xB1]];
    var tBt = 13.55;   // when the playhead passes b.txt
    function G() {
      if (PORT) return { m: function (x) { return 66 + (x - 360) / 880 * 428; }, ry: 384, sy: 496, l0: 54, l1: 506, kx: 50, card: [140, 600, 280, 160] };
      return { m: function (x) { return x; }, ry: 430, sy: 590, l0: 350, l1: 1245, kx: 110, card: [1295, 345, 250, 170] };
    }
    function draw(t) {
      var g = G(), m = g.m, ry = g.ry, sy = g.sy, ph = m(kf(t, PH));
      var base = SA, dim = 1 - 0.88 * P(t, 19.9, 20.5);
      head(t, [[0.3, 3.7, 'Request A starts a subagent.'],
               [4.0, 6.3, 'You cancel A. The subagent keeps running.'],
               [6.6, 9.1, 'Then you send request B.'],
               [9.4, 10.6, 'The subagent edits a.txt.'],
               [10.9, 14.1, 'The adapter credits the edit to the request current now: B.'],
               [14.4, 16.9, 'B’s report lists b.txt and a.txt.'],
               [17.2, 19.8, 'But a.txt was made for A.']]);
      SA = base * dim;
      // lanes
      var la = P(t, 0.4, 1.0);
      line(g.l0, ry, g.l1, ry, C.faint, 2, la); line(g.l0, sy, g.l1, sy, C.faint, 2, la);
      if (PORT) {
        txt('Requests', g.l0, ry - 38, { sz: 17, w: 600, c: C.ink3, a: la });
        txt('Subagent', g.l0, sy + 38, { sz: 17, w: 600, c: C.ink3, a: la });
      } else {
        txt('Requests', 140, ry, { sz: 22, w: 600, c: C.ink3, a: la });
        txt('Subagent', 140, sy, { sz: 22, w: 600, c: C.ink3, a: la });
      }
      // playhead
      var pa = vis(t, 0.9, 14.5, 0.4) * 0.5;
      line(ph, ry - (PORT ? 52 : 70), ph, sy + (PORT ? 22 : 44), C.ink3, 1.4, pa, [3, 6]);
      // A's bar, ended by the cancel
      var lw = PORT ? 5 : 7;
      if (t > 1.0) line(m(xA0), ry, Math.min(ph, m(xCan)), ry, C.A, lw, 1);
      var ca = P(t, 4.0, 4.4, E.out);
      line(m(xCan), ry - 14, m(xCan), ry + 14, C.ink2, 2.5, ca);
      txt('cancelled', m(xCan), ry - (PORT ? 38 : 42), { sz: PORT ? 16 : 19, w: 500, c: C.ink3, al: 'center', a: ca * (1 - P(t, 14.3, 14.6)) });
      // the subagent: spawned from A, running on after A ends
      var sp = sCurve(m(xSp), ry, m(xSp) + g.kx, sy);
      strokePath(sp, 0, P(t, 2.2, 2.9), C.A, PORT ? 3 : 4, 1);
      var subEnd = Math.min(ph, m(xEd));
      if (t > 2.9 && subEnd > m(xSp) + g.kx) line(m(xSp) + g.kx, sy, subEnd, sy, C.A, PORT ? 3 : 4, 1);
      // B's bar
      if (t > 6.8) line(m(xB0), ry, Math.min(ph, m(xB1)), ry, C.B, lw, 1);
      badge(m(xA0), ry, 'A', C.A, P(t, 0.9, 1.2), P(t, 0.9, 1.35, E.back));
      badge(m(xB0), ry, 'B', C.B, P(t, 6.7, 7.0), P(t, 6.7, 7.15, E.back));
      // c edits a.txt during B
      var ek = P(t, 9.55, 9.95, E.back), fly1 = P(t, 15.0, 15.8);
      var ghost = P(t, 15.0, 15.3);
      var es = PORT ? 14 : 22;
      sq(m(xEd), sy, es * ek, C.A, 1 - ghost);
      if (ghost > 0) strokeRR(m(xEd) - es / 2, sy - es / 2, es, es, es * 0.22, C.A, 1.5, ghost * 0.6);
      txt('a.txt', m(xEd), sy + (PORT ? 32 : 38), { sz: PORT ? 17 : 20, mono: true, c: C.ink2, al: 'center', a: P(t, 9.7, 10.1) });
      // the adapter looks up the current request
      var lk = P(t, 11.0, 11.5);
      var lka = 1 - P(t, 12.8, 13.1);
      lineOn(m(xEd), sy - 14, m(xEd), ry + 14, lk, C.ink2, 1.5, lka, [4, 5]);
      ring(m(xEd), ry, (PORT ? 13 : 19) * P(t, 11.45, 11.8, E.back), C.ink, 2.5, lka);
      pill('current: B', m(xEd), ry - (PORT ? 40 : 50), C.ink, P(t, 11.6, 11.9) * lka);
      // B edits b.txt
      var bk = P(t, tBt, tBt + 0.35, E.back), fly0 = P(t, 14.7, 15.4);
      sq(m(xBt), ry, (PORT ? 14 : 22) * bk, C.B, 1 - P(t, 14.7, 15.0));
      txt('b.txt', m(xBt), ry + (PORT ? 30 : 38), { sz: PORT ? 17 : 20, mono: true, c: C.ink2, al: 'center', a: P(t, tBt + 0.1, tBt + 0.4) });
      // B's report
      var cd = g.card, fa = P(t, 14.4, 14.9, E.out), r1 = cd[1] + (PORT ? 78 : 82), r2 = cd[1] + (PORT ? 122 : 128), bx = cd[0] + (PORT ? 32 : 34);
      card(cd[0], cd[1] + (1 - fa) * 8, cd[2], cd[3], fa);
      txt('B’s report', cd[0] + 24, cd[1] + (PORT ? 34 : 36) + (1 - fa) * 8, { sz: PORT ? 16 : 18, w: 600, c: C.ink3, a: fa });
      if (fly0 > 0) { var h0 = hop([m(xBt), ry], [bx, r1], PORT ? 30 : 60).at(fly0); sq(h0.x, h0.y, PORT ? 14 : 18, C.B, 1); }
      if (fly1 > 0) { var h1 = hop([m(xEd), sy], [bx, r2], PORT ? 30 : 80).at(fly1); sq(h1.x, h1.y, PORT ? 14 : 18, C.A, 1); }
      txt('b.txt', bx + (PORT ? 22 : 24), r1, { sz: PORT ? 20 : 22, mono: true, a: P(t, 15.3, 15.6) });
      var bad = P(t, 18.8, 19.2);
      txt('a.txt', bx + (PORT ? 22 : 24), r2, { sz: PORT ? 20 : 22, mono: true, c: mix(C.ink, C.red, bad), a: P(t, 15.7, 16.0) });
      if (bad > 0) lineOn(bx - 14, r2, bx + (PORT ? 22 : 24) + tw('a.txt', PORT ? 20 : 22, 500, true) + 4, r2, bad, C.red, 2.5, 1);
      txt('made for A', cd[0] + cd[2] - 20, r2, { sz: PORT ? 16 : 17, w: 600, c: C.red, al: 'right', a: P(t, 19.0, 19.4) });
      // trace a.txt back to the request that started it
      var tr = P(t, 17.5, 18.7);
      if (tr > 0) {
        var pts = [[m(xEd), sy], [m(xSp) + g.kx, sy]].concat(cub([m(xSp) + g.kx, sy], [m(xSp) + g.kx, (ry + sy) / 2], [m(xSp), (ry + sy) / 2], [m(xSp), ry]).slice(1)).concat([[m(xA0), ry]]);
        var path = new Path(pts), fade = 1 - P(t, 19.2, 19.9);
        strokePath(path, 0, tr, C.A, PORT ? 10 : 16, 0.18 * fade);
        if (tr < 1) { var hd = path.at(tr); circle(hd.x, hd.y, PORT ? 5 : 7, C.A, 1); }
        var pulse = P(t, 18.6, 19.3);
        ring(m(xA0), ry, (PORT ? 13 : 17) + pulse * 20, C.A, 2, (1 - pulse) * (tr >= 1 ? 1 : 0));
      }
      SA = base;
      // the moral
      var ma = P(t, 20.2, 20.9, E.out);
      if (ma > 0) txt('Arrival is not origin.', FW / 2, FH / 2 + (1 - ma) * 16, { sz: PORT ? 42 : 88, w: 650, al: 'center', a: ma });
    }
    return {
      dur: D, draw: draw,
      chapters: [[0, 'The bug']],
      caps: [
        [0.3, 'Request A starts a subagent. A timeline shows requests on the top lane and the subagent below.'],
        [4.0, 'You cancel A. The subagent keeps running.'],
        [6.6, 'Then you send request B.'],
        [9.4, 'The subagent edits a.txt.'],
        [10.9, 'The adapter credits the edit to the request current now: B.'],
        [14.4, 'B’s report lists b.txt, B’s own edit, and a.txt.'],
        [17.2, 'But a.txt was made for A. Its line leads back through the subagent to request A, and a.txt is struck out of B’s report.'],
        [20.2, 'Arrival is not origin.']
      ]
    };
  })();

  // ======================================================================
  // Scene 2: Turnstile, then the two fixes
  // ======================================================================
  var S2 = (function () {
    var D = 28.6, N = COUNTS.late + COUNTS.early + COUNTS.clean, NL = COUNTS.late, NM = COUNTS.late + COUNTS.early;
    // A few orders of the subagent's start (s) and edit (e) against fixed root events, as fractions of the lane.
    var uA0 = 0.02, uSp = 0.07, uCan = 0.25, uB0 = 0.45, uB1 = 0.92;
    var ORD = [[0.15, 0.70], [0.15, 0.36], [0.58, 0.80], [0.30, 0.97]];
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
    function G() {
      if (PORT) return { lx0: 62, lx1: 498, ry: 400, sy: 500, cols: 28, pitch: 14, cell: 10, gx: 86, gy: 296, nx: 86, ny: 234 };
      return { lx0: 340, lx1: 1260, ry: 440, sy: 580, cols: 44, pitch: 20, cell: 14, gx: 190, gy: 296, nx: 1170, ny: 380 };
    }
    function draw(t) {
      var g = G(), U = function (u) { return lerp(g.lx0, g.lx1, u); };
      head(t, [[0.3, 7.9, 'Turnstile runs the adapter under every legal order of these events.'],
               [8.2, 10.6, '956 orders in three scenarios. Each dot is one.'],
               [10.9, 14.2, 'In 581 of them, A’s edit lands in B’s report.'],
               [14.5, 17.8, 'Fix 1: credit the subagent to the request current when it starts.'],
               [18.1, 20.4, 'That fails when the subagent starts after B.'],
               [20.7, 23.8, 'Fix 2: credit it to the request that dispatched it.'],
               [24.1, null, 'None left. If the origin is unclear, it leaves the edit out and says so.']]);
      // --- a few orders, on a small timeline ---
      var base = SA, ma = vis(t, 0.4, 8.4, 0.5);
      if (ma > 0) {
        X.save(); X.translate(0, -26 * P(t, 7.9, 8.4, E.inn));
        SA = base * ma;
        var ry = g.ry, sy = g.sy, lw = PORT ? 4 : 6;
        fillRR(U(uB0) - 12, ry - (PORT ? 36 : 44), U(uB1) - U(uB0) + 24, sy - ry + (PORT ? 72 : 88), 14, C.ink, 0.045);
        txt('while B is current', (U(uB0) + U(uB1)) / 2, ry - (PORT ? 56 : 66), { sz: PORT ? 16 : 18, w: 600, c: C.ink3, al: 'center' });
        line(g.lx0, ry, g.lx1, ry, C.faint, 2, 1); line(g.lx0, sy, g.lx1, sy, C.faint, 2, 1);
        line(U(uA0), ry, U(uCan), ry, C.A, lw, 1);
        line(U(uCan), ry - 13, U(uCan), ry + 13, C.ink2, 2.5, 1);
        line(U(uB0), ry, U(uB1), ry, C.B, lw, 1);
        badge(U(uA0), ry, 'A', C.A, 1); badge(U(uB0), ry, 'B', C.B, 1);
        var s = kf(t, KS), e = kf(t, KE), inB = e > uB0 && e < uB1;
        var sp = sCurve(U(uSp), ry, U(s), sy);
        strokePath(sp, 0, 1, C.A, 2.5, 0.5);
        line(U(s), sy, U(e), sy, C.A, PORT ? 3 : 4, 1);
        ring(U(s), sy, PORT ? 5 : 7, C.A, 2.5, 1); circle(U(s), sy, PORT ? 3.5 : 5, C.bg, 1);
        if (t < 7.9) sq(U(e), sy, PORT ? 14 : 22, inB ? C.red : C.A, 1);
        // the verdict for each of the slow orders
        for (var o = 0; o < 4; o++) {
          var va = vis(t, TS[o] + 0.05, (o < 3 ? TS[o + 1] - 0.55 : 6.6), 0.25);
          if (va <= 0) continue;
          var bad = ORD[o][1] > uB0 && ORD[o][1] < uB1;
          txt(bad ? 'in B’s report' : 'not in B’s report', U(ORD[o][1]), sy + (PORT ? 32 : 40), { sz: PORT ? 16 : 19, w: 600, c: bad ? C.red : C.ink3, al: 'center', a: va });
        }
        SA = base;
        X.restore();
      }
      // --- every order as one dot ---
      var rows = Math.ceil(N / g.cols), colsM = Math.ceil(NM / rows), colsL = Math.ceil(NL / rows);
      // the last example order flies in as the first dot
      if (t >= 7.9 && t < 8.75) {
        var last = ORD[ORD.length - 1], k0 = P(t, 7.9, 8.7);
        var fx = lerp(U(last[1]), g.gx + g.cell / 2, k0), fy = lerp(g.sy - 26 * P(t, 7.9, 8.4, E.inn), g.gy + g.cell / 2, k0);
        var lastIn = last[1] > uB0 && last[1] < uB1;
        sq(fx, fy, lerp(PORT ? 14 : 22, g.cell, k0), mix(lastIn ? C.red : C.A, C.grey, P(t, 8.3, 8.7)), 1);
      }
      for (var i = 0; i < N; i++) {
        var col = Math.floor(i / rows), row = i % rows;
        var ta = 8.5 + 1.5 * col / (g.cols - 1) + 0.18 * hash(i), ka = P(t, ta, ta + 0.35, E.back);
        if (ka <= 0) continue;
        var kr = 0, sc = 1;
        if (i < NM) {
          var tr = 11.0 + 1.1 * col / colsM;
          kr = P(t, tr, tr + 0.3);
          if (i >= NL) { var t1 = 15.2 + 1.0 * (1 - (col - colsL + 1) / (colsM - colsL + 1)); kr *= 1 - P(t, t1, t1 + 0.3); }
          else {
            var tp = 18.3 + 0.5 * col / colsL; sc += 0.35 * Math.sin(Math.PI * clamp((t - tp) / 0.4));
            var t2 = 21.3 + 0.7 * (1 - col / colsL); kr *= 1 - P(t, t2, t2 + 0.3);
          }
        }
        var x = g.gx + col * g.pitch + g.cell / 2, y = g.gy + row * g.pitch + g.cell / 2, z = g.cell * ka * sc;
        fillRR(x - z / 2, y - z / 2, z, z, z * 0.24, kr > 0 ? mix(C.grey, C.red, kr) : C.grey, 1);
      }
      // legend
      var lg = P(t, 9.8, 10.3), ly = g.gy + rows * g.pitch + (PORT ? 22 : 30), lsz = PORT ? 15 : 18;
      sq(g.gx + 7, ly, PORT ? 10 : 14, C.red, lg);
      txt('A’s edit in B’s report', g.gx + 24, ly, { sz: lsz, w: 500, c: C.ink2, a: lg });
      var lx2 = g.gx + 24 + tw('A’s edit in B’s report', lsz, 500) + 30;
      sq(lx2 + 7, ly, PORT ? 10 : 14, C.grey, lg);
      txt('correct', lx2 + 24, ly, { sz: lsz, w: 500, c: C.ink2, a: lg });
      // the count
      var v = t < 11.0 ? 0 : t < 15.2 ? Math.round(lerp(0, NM, P(t, 11.0, 12.3, E.out))) : t < 21.3 ? Math.round(lerp(NM, NL, P(t, 15.2, 16.4, E.out))) : Math.round(lerp(NL, 0, P(t, 21.3, 22.1, E.out)));
      var na = P(t, 10.8, 11.2), ncol = v > 0 ? C.red : C.ink;
      var builds = [['Original adapter', NM, 11.0], ['Start-time binding', NL, 15.0], ['Dispatch-time binding', 0, 21.1]];
      var cur = t < 15.0 ? 0 : t < 21.1 ? 1 : 2;
      if (PORT) {
        txt(String(v), g.nx, g.ny, { sz: 60, w: 650, c: ncol, a: na });
        txt('of ' + N, g.nx + tw(String(v), 60, 650) + 10, g.ny + 12, { sz: 18, w: 500, c: C.ink3, a: na });
        builds.forEach(function (b, j) {
          var ba = vis(t, b[2], j < 2 ? builds[j + 1][2] : D + 1, 0.35);
          txt(b[0], g.gx + (g.cols - 1) * g.pitch + g.cell, g.ny + 8, { sz: 16, w: 600, c: C.ink2, al: 'right', a: ba });
        });
      } else {
        txt(String(v), g.nx - 6, g.ny, { sz: 132, w: 650, c: ncol, a: na });
        txt('of ' + N + ' orders', g.nx, g.ny + 92, { sz: 24, w: 500, c: C.ink3, a: na });
        builds.forEach(function (b, j) {
          var ba = P(t, b[2], b[2] + 0.4), on = j === cur, y = g.ny + 186 + j * 48;
          var c = on ? C.ink : C.ink3;
          txt(b[0], g.nx, y + (1 - ba) * 8, { sz: 21, w: on ? 650 : 500, c: c, a: ba });
          txt(String(b[1]), g.nx + 290, y + (1 - ba) * 8, { sz: 21, w: on ? 650 : 500, c: on && b[1] > 0 ? C.red : c, al: 'right', a: ba });
        });
      }
    }
    return {
      dur: D, draw: draw,
      chapters: [[0, 'Turnstile'], [14.5, 'Two fixes']],
      caps: [
        [0.3, 'Turnstile runs the unmodified adapter under every legal order of these events. The subagent’s start and edit slide to new places; whenever the edit lands while B is current, it ends up in B’s report.'],
        [8.2, '956 orders in three scenarios. Each dot is one.'],
        [10.9, 'In 581 of them, the original adapter puts A’s edit in B’s report.'],
        [14.5, 'Fix 1: credit the subagent to the request current when it starts. 174 remain.'],
        [18.1, 'That fails when the subagent starts after B.'],
        [20.7, 'Fix 2: credit it to the request that dispatched it. None remain.'],
        [24.1, 'If the origin is unclear, it leaves the edit out and says so.']
      ]
    };
  })();

  // ======================================================================
  // Scene 3: the limit
  // ======================================================================
  var S3 = (function () {
    var D = 25.5;
    function G() {
      if (PORT) return { ys: [350, 494], xs: function (i) { return 76 + i * 50; }, xx: 404, eq: 490, lab: 'above', opts: [210, 410], oy: 610, note: 610, foot: 790 };
      return { ys: [410, 590], xs: function (i) { return 350 + i * 118; }, xx: 1090, eq: 1200, lab: 'left', opts: [1330, 1482], oy: 322, note: 714, foot: 800 };
    }
    function draw(t) {
      var g = G();
      head(t, [[0.3, 2.9, 'Could a smarter adapter always get this right?'],
               [3.2, 6.4, 'Here are two runs that send it exactly the same messages.'],
               [6.7, 10.6, 'In run 1, the edit x is A’s work. In run 2, it is B’s.'],
               [10.9, 15.6, 'The adapter must give one answer for both.'],
               [15.9, 19.4, 'Either way, one run gets a wrong or incomplete report.'],
               [19.7, null, 'Put the origin on each event, and the two runs differ.']]);
      var own = P(t, 7.0, 7.5), tag = P(t, 20.0, 20.5, E.out);
      for (var r = 0; r < 2; r++) {
        // run 2 starts as a copy of run 1 that slides down
        var dy = r === 0 ? 0 : (g.ys[0] - g.ys[1]) * (1 - P(t, 3.5, 4.3));
        var ra = r === 0 ? 1 : P(t, 3.4, 3.7);
        var y = g.ys[r] + dy, built = r === 0 ? t : Math.max(t, 3.4) + 10;
        var la = r === 0 ? P(t, 0.6, 1.0) : P(t, 4.1, 4.5);
        if (PORT) txt('Run ' + (r + 1), 60, g.ys[r] - 40, { sz: 17, w: 650, c: C.ink2, a: la });
        else txt('Run ' + (r + 1), 170, g.ys[r], { sz: 24, w: 650, c: C.ink2, a: la });
        line(g.xs(0) - 16, y, g.xx + 16, y, C.faint, 2, ra * P(built, 0.6, 1.2));
        for (var i = 0; i < 6; i++) {
          var k = P(built, 0.9 + i * 0.13, 1.25 + i * 0.13, E.back);
          circle(g.xs(i), y, (PORT ? 8 : 11) * k, C.ink3, ra);
        }
        var xk = P(built, 1.8, 2.2, E.back), xc = mix(C.ink3, r === 0 ? C.A : C.B, own);
        sq(g.xx, y, (PORT ? 30 : 38) * xk, xc, ra);
        txt('x', g.xx, y - 1, { sz: PORT ? 18 : 22, w: 600, mono: true, c: '#ffffff', al: 'center', a: ra * xk });
        txt(r === 0 ? 'A’s work' : 'B’s work', g.xx, y + (PORT ? 36 : 46), { sz: PORT ? 16 : 19, w: 600, c: r === 0 ? C.A : C.B, al: 'center', a: own * (1 - P(t, 19.8, 20.1)) });
        pill(r === 0 ? 'origin: A' : 'origin: B', g.xx, y - (PORT ? 40 : 52), r === 0 ? C.A : C.B, tag);
      }
      // identical, then different
      var eqa = P(t, 4.3, 4.7) * (1 - P(t, 10.6, 10.9)) + P(t, 20.4, 20.8);
      var my = (g.ys[0] + g.ys[1]) / 2, ew = PORT ? 22 : 34;
      line(g.eq - ew / 2, my - 6, g.eq + ew / 2, my - 6, C.ink, 2.5, eqa); line(g.eq - ew / 2, my + 6, g.eq + ew / 2, my + 6, C.ink, 2.5, eqa);
      var ne = P(t, 20.6, 21.0);
      lineOn(g.eq + ew * 0.32, my - 16, g.eq - ew * 0.32, my + 16, ne, C.ink, 2.5, eqa);
      if (!PORT) txt(t < 15 ? 'same input' : 'now they differ', g.eq + 32, my, { sz: 20, w: 600, c: C.ink3, a: eqa });
      // what differs is hidden
      var hn = vis(t, 7.6, 10.7, 0.4);
      block('What differs is hidden from the adapter: which message started x’s turn.', FW / 2, g.note, { sz: PORT ? 17 : 21, w: 500, c: C.ink3, a: hn, maxW: PORT ? 460 : 1000 });
      // one answer for both: list x, or leave it out
      var oa = vis(t, 11.1, 19.9, 0.4);
      if (oa > 0) {
        var heads = ['list x', 'leave x out'];
        var marks = [[[11.7, false, 'wrong'], [12.1, true]], [[13.3, true], [13.7, false, 'incomplete']]];
        for (var c = 0; c < 2; c++) {
          var cx = g.opts[c], ca = P(t, c === 0 ? 11.2 : 12.9, c === 0 ? 11.6 : 13.3);
          if (PORT) txt(heads[c], cx, g.oy, { sz: 18, w: 650, c: C.ink, al: 'center', a: oa * ca });
          else txt(heads[c], cx, g.oy, { sz: 21, w: 650, c: C.ink, al: 'center', a: oa * ca });
          for (var r2 = 0; r2 < 2; r2++) {
            var mk = marks[c][r2], my2 = PORT ? g.oy + 50 + r2 * 64 : g.ys[r2], kk = P(t, mk[0], mk[0] + 0.35);
            if (mk[1]) check(cx, my2, PORT ? 22 : 28, C.ink3, kk, oa);
            else { cross(cx, my2, PORT ? 22 : 28, C.red, kk, oa); txt(mk[2], cx, my2 + (PORT ? 26 : 36), { sz: PORT ? 15 : 18, w: 600, c: C.red, al: 'center', a: oa * P(t, mk[0] + 0.2, mk[0] + 0.5) }); }
          }
        }
        if (PORT) for (var r3 = 0; r3 < 2; r3++) txt('Run ' + (r3 + 1), 60, g.oy + 50 + r3 * 64, { sz: 16, w: 600, c: C.ink3, a: oa * P(t, 11.2, 11.6) });
      }
      var fa = vis(t, 16.2, 19.9, 0.4);
      block('Theorem 1: on the typed Codex 0.160.1 wire, no adapter that meets the paper’s conditions is exact.', FW / 2, g.foot, { sz: PORT ? 16 : 21, w: 500, c: C.ink2, a: fa, maxW: PORT ? 460 : 1300 });
      var ra2 = P(t, 21.4, 21.9);
      block('Codex 0.162.0 adds this origin, as rootTurnId.', FW / 2, g.foot, { sz: PORT ? 16 : 21, w: 500, c: C.ink2, a: ra2, maxW: PORT ? 460 : 1300 });
    }
    return {
      dur: D, draw: draw,
      chapters: [[0, 'The limit']],
      caps: [
        [0.3, 'Could a smarter adapter always get this right?'],
        [3.2, 'Here are two runs that send it exactly the same messages.'],
        [6.7, 'In run 1, the edit x is A’s work. In run 2, it is B’s. What differs is hidden from the adapter: which message started x’s turn.'],
        [10.9, 'The adapter must give one answer for both. Listing x in B’s report is wrong in run 1; leaving it out is incomplete in run 2.'],
        [15.9, 'Either way, one run gets a wrong or incomplete report. Theorem 1: on the typed Codex 0.160.1 wire, no adapter that meets the paper’s conditions is exact.'],
        [19.7, 'Put the origin on each event, and the two runs differ. Codex 0.162.0 adds this origin, as rootTurnId.']
      ]
    };
  })();

  // ======================================================================
  // Scene 4: takeaway and credits
  // ======================================================================
  var S4 = (function () {
    var D = 11.5;
    function draw(t) {
      var la = 1 - P(t, 5.4, 5.9), sz = PORT ? 28 : 44, mw = PORT ? 460 : 1300;
      var a1 = P(t, 0.3, 0.9, E.out), a2 = P(t, 1.8, 2.4, E.out);
      var y1 = PORT ? 360 : 420, y2 = PORT ? 500 : 500;
      block('Bind delegated work to the request that dispatched it.', FW / 2, y1 + (1 - a1) * 14, { sz: sz, w: 600, a: a1 * la, maxW: mw });
      block('Better: carry the origin on every delegated event.', FW / 2, y2 + (1 - a2) * 14, { sz: sz, w: 600, c: C.A, a: a2 * la, maxW: mw });
      var ca = P(t, 6.0, 6.7, E.out), aa = P(t, 6.6, 7.3, E.out);
      var ty = PORT ? 380 : 420;
      block('Attributing Subagent Work in Coding-Agent Protocol Adapters', FW / 2, ty + (1 - ca) * 14, { sz: PORT ? 30 : 50, w: 650, a: ca, maxW: PORT ? 460 : 1100, lh: PORT ? 38 : 62 });
      if (PORT) {
        txt('Rajasekhar Josyula', FW / 2, ty + 120, { sz: 18, w: 500, c: C.ink2, al: 'center', a: aa });
        txt('Lakshmi Sravya Vedantham', FW / 2, ty + 148, { sz: 18, w: 500, c: C.ink2, al: 'center', a: aa });
      } else txt('Rajasekhar Josyula  ·  Lakshmi Sravya Vedantham', FW / 2, ty + 110, { sz: 24, w: 500, c: C.ink2, al: 'center', a: aa });
    }
    return {
      dur: D, draw: draw,
      chapters: [[0, 'Takeaway']],
      caps: [
        [0.3, 'Bind delegated work to the request that dispatched it.'],
        [1.8, 'Better: carry the origin on every delegated event.'],
        [6.0, 'Attributing Subagent Work in Coding-Agent Protocol Adapters, by Rajasekhar Josyula and Lakshmi Sravya Vedantham.']
      ]
    };
  })();

  // ======================================================================
  // Player
  // ======================================================================
  var SCENES = [S0, S1, S2, S3, S4];
  var XF = 0.45;   // fade at each cut
  var starts = [], TOTAL = 0;
  SCENES.forEach(function (s) { starts.push(TOTAL); TOTAL += s.dur; });
  var CAPS = [], CHAPS = [];
  SCENES.forEach(function (s, i) {
    s.caps.forEach(function (c) { CAPS.push([starts[i] + c[0], c[1]]); });
    s.chapters.forEach(function (c) { CHAPS.push({ t: starts[i] + c[0], title: c[1] }); });
  });
  function fmt(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  function poster() {
    if (PORT) block('A subagent outlives its request. Who gets the credit?', FW / 2, FH * 0.36, { sz: 32, w: 650, maxW: 440 });
    else { txt('A subagent outlives its request.', FW / 2, FH * 0.36, { sz: 56, w: 650, al: 'center' }); txt('Who gets the credit?', FW / 2, FH * 0.36 + 72, { sz: 56, w: 650, al: 'center', c: C.A }); }
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
    var W = 0, H = 0, lastCap = -1;

    function layout() {
      var fs = document.fullscreenElement === root || document.webkitFullscreenElement === root;
      var w = stage.clientWidth, port = !fs && w < 620;
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
      if (!started && t === 0) { SA = 1; poster(); }
      else {
        var i = 0;
        while (i < SCENES.length - 1 && t >= starts[i + 1]) i++;
        var sc = SCENES[i], lt = t - starts[i];
        SA = Math.min(i === 0 ? P(lt, 0, 0.3) : P(lt, 0, XF), i === SCENES.length - 1 ? 1 : 1 - P(lt, sc.dur - XF, sc.dur));
        var base = SA;
        X.save(); sc.draw(lt); X.restore();
        SA = base;
      }
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
    function frame(now) {
      raf = 0;
      if (!playing) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      if (t >= TOTAL) { t = TOTAL; render(); stop(); ended = true; root.classList.add('ended'); big.setAttribute('aria-label', 'Replay the film'); return; }
      render();
      raf = requestAnimationFrame(frame);
    }
    function play(fromUser) {
      if (ended || t >= TOTAL) { t = 0; ended = false; root.classList.remove('ended'); }
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
    function pause(fromUser) { if (fromUser) userPaused = true; stop(); }
    function seek(nt) {
      started = true; root.classList.add('started');
      t = clamp(nt, 0, TOTAL);
      if (t < TOTAL) { ended = false; root.classList.remove('ended'); }
      render();
    }

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
      else if (/^[1-9]$/.test(k) && +k <= CHAPS.length) seek(CHAPS[+k - 1].t + 0.01);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { render(); }).observe(stage);
    else window.addEventListener('resize', render);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var on = e.isIntersecting && e.intersectionRatio >= 0.5;
          if (on && !userPaused && !reduce && !ended && root.dataset.autoplay !== 'off') play(false);
          else if (!on && playing) pause(false);
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
        html += '<h3><button type="button" data-t="' + c.t + '">' + c.title + ' <span>' + fmt(c.t) + '</span></button></h3><p>';
        html += CAPS.filter(function (q) { return q[0] >= c.t - 0.2 && q[0] < end - 0.2; }).map(function (q) { return q[1]; }).join(' ');
        html += '</p>';
      });
      tr.innerHTML = html;
    }
    if (tr) tr.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (b) { seek(+b.dataset.t + 0.01); root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); play(true); }
    });
    if (/filmdebug/.test(location.hash)) window.__film = {
      seek: seek, total: TOTAL, starts: starts, play: play, pause: pause, get t() { return t; },
      bench: function (from, to, n) { var tt = 0, worst = 0; for (var i = 0; i < n; i++) { t = from + (to - from) * i / n; var a = performance.now(); render(); var d = performance.now() - a; tt += d; worst = Math.max(worst, d); } return { avg: tt / n, worst: worst }; }
    };
  }

  if (window.__filmExport) { window.__filmExport.caps = CAPS; window.__filmExport.chaps = CHAPS; window.__filmExport.total = TOTAL; }
  function boot() { var els = document.querySelectorAll('[data-film]'); for (var i = 0; i < els.length; i++) mount(els[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
