const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('./index');

// Deterministic UUIDs so seed is idempotent
const U = {
  u1: '00000000-0000-0000-0000-000000000001',
  u2: '00000000-0000-0000-0000-000000000002',
  u3: '00000000-0000-0000-0000-000000000003',
  u4: '00000000-0000-0000-0000-000000000004',
};
const C = {
  ch1: '00000000-0000-0000-0001-000000000001',
  ch2: '00000000-0000-0000-0001-000000000002',
  ch3: '00000000-0000-0000-0001-000000000003',
  ch4: '00000000-0000-0000-0001-000000000004',
  general: '00000000-0000-0000-0001-000000000005',
};
const M = {
  m1:  '00000000-0000-0000-0002-000000000001',
  m2:  '00000000-0000-0000-0002-000000000002',
  m3:  '00000000-0000-0000-0002-000000000003',
  m4:  '00000000-0000-0000-0002-000000000004',
  m5:  '00000000-0000-0000-0002-000000000005',
  m6:  '00000000-0000-0000-0002-000000000006',
  m7:  '00000000-0000-0000-0002-000000000007',
  m8:  '00000000-0000-0000-0002-000000000008',
  m9:  '00000000-0000-0000-0002-000000000009',
  m10: '00000000-0000-0000-0002-000000000010',
  mg1: '00000000-0000-0000-0002-000000000011',
  mg2: '00000000-0000-0000-0002-000000000012',
  mg3: '00000000-0000-0000-0002-000000000013',
  mg4: '00000000-0000-0000-0002-000000000014',
};
const P = {
  p1: '00000000-0000-0000-0003-000000000001',
  p2: '00000000-0000-0000-0003-000000000002',
  p3: '00000000-0000-0000-0003-000000000003',
  p4: '00000000-0000-0000-0003-000000000004',
};
const CMT = {
  c1: '00000000-0000-0000-0004-000000000001',
  c2: '00000000-0000-0000-0004-000000000002',
  c3: '00000000-0000-0000-0004-000000000003',
};
const R = {
  r1: '00000000-0000-0000-0005-000000000001',
  r2: '00000000-0000-0000-0005-000000000002',
};
const POLL = { m6: '00000000-0000-0000-0007-000000000001' };
const OPT  = {
  o1: '00000000-0000-0000-0008-000000000001',
  o2: '00000000-0000-0000-0008-000000000002',
  o3: '00000000-0000-0000-0008-000000000003',
};
const SCHED = { m7: '00000000-0000-0000-0009-000000000001' };

async function ins(client, sql, params) {
  await client.query(sql + ' ON CONFLICT DO NOTHING', params);
}

async function seed() {
  const hash = await bcrypt.hash('password123', 10);
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // ── Users ────────────────────────────────────────────────────────────────
    const userRows = [
      [U.u1, 'aisha@example.com',  hash, 'Aisha Patel',   "MS CS '25 | ML enthusiast | ex-Google",          'https://i.pravatar.cc/150?img=1', 'CGOE', 'student'],
      [U.u2, 'james@example.com',  hash, 'James Wu',      'HCP student | Healthcare + AI',                   'https://i.pravatar.cc/150?img=2', 'HCP',  'moderator'],
      [U.u3, 'sofia@example.com',  hash, 'Sofia Reyes',   'MS EE | Signal processing nerd',                  'https://i.pravatar.cc/150?img=3', 'MS',   'student'],
      [U.u4, 'derek@example.com',  hash, 'Derek Okafor',  'CGOE | Full-stack dev | Building cool things',    'https://i.pravatar.cc/150?img=4', 'CGOE', 'student'],
    ];
    for (const [id, email, pw, name, bio, pic, program, role] of userRows) {
      await ins(client,
        `INSERT INTO users (id, email, password_hash, name, bio, profile_pic, program, role, agreed_to_guidelines)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
        [id, email, pw, name, bio, pic, program, role]);
    }

    // ── Classes ───────────────────────────────────────────────────────────────
    const classRows = [
      ['cs103',  'CS 103 — Mathematical Foundations of Computing',           ['CGOE','MS','Certificate']],
      ['cs106a', 'CS 106A — Programming Methodology',                        ['CGOE','Certificate','Professional Ed']],
      ['cs106b', 'CS 106B — Programming Abstractions',                       ['CGOE','Certificate','Professional Ed']],
      ['cs107',  'CS 107 — Computer Organization & Systems',                 ['CGOE','MS','Certificate']],
      ['cs109',  'CS 109 — Probability for Computer Scientists',             ['CGOE','MS','Certificate']],
      ['cs111',  'CS 111 — Operating Systems Principles',                    ['CGOE','MS','Certificate']],
      ['cs140e', 'CS 140E — Operating Systems Design & Implementation',      ['CGOE','MS']],
      ['cs142',  'CS 142 — Web Applications',                                ['CGOE','Professional Ed','Certificate']],
      ['cs144',  'CS 144 — Introduction to Computer Networking',             ['CGOE','MS','Certificate']],
      ['cs145',  'CS 145 — Introduction to Databases',                       ['CGOE','Professional Ed','Certificate']],
      ['cs147',  'CS 147 — Introduction to Human-Computer Interaction Design', ['CGOE','HCP','MS','Certificate']],
      ['cs149',  'CS 149 — Parallel Computing',                              ['CGOE','MS']],
      ['cs153',  'CS 153 — AI/startup-focused seminar course',               ['CGOE','NDO']],
      ['cs154',  'CS 154 — Introduction to Automata and Complexity Theory',  ['CGOE','MS','Certificate']],
      ['cs161',  'CS 161 — Design and Analysis of Algorithms',               ['CGOE','MS','Certificate']],
      ['cs168',  'CS 168 — The Modern Algorithmic Toolbox',                  ['CGOE','MS']],
      ['cs193x', 'CS 193X — Web Programming Fundamentals',                   ['CGOE','Professional Ed','Certificate']],
      ['cs221',  'CS 221 — Artificial Intelligence: Principles and Techniques', ['CGOE','MS','NDO','Certificate']],
      ['cs224n', 'CS 224N — NLP with Deep Learning',                         ['CGOE','HCP','MS','NDO']],
      ['cs229',  'CS 229 — Machine Learning',                                ['CGOE','MS','NDO','Certificate']],
      ['cs231n', 'CS 231N — Deep Learning for Computer Vision',              ['CGOE','MS','Professional Ed','Certificate']],
      ['cs234',  'CS 234 — Reinforcement Learning',                          ['CGOE','MS','NDO']],
      ['cs238',  'CS 238 — Decision Making Under Uncertainty',               ['CGOE','MS','HCP']],
      ['cs244c', 'CS 244C — Advanced Networking and Distributed Systems',    ['CGOE','MS']],
      ['cs247',  'CS 247 — Human-Computer Interaction Seminar',              ['CGOE','HCP','MS']],
      ['cs255',  'CS 255 — Introduction to Cryptography',                    ['CGOE','MS','Certificate']],
      ['cs261',  'CS 261 — Combinatorial Optimization',                      ['CGOE','MS']],
      ['cs265',  'CS 265 — Randomized Algorithms and Probabilistic Analysis', ['CGOE','MS']],
      ['cs278',  'CS 278 — Social Computing',                                 ['CGOE','MS','HCP']],
      ['cs347',  'CS 347 — Human-Computer Interaction: Foundations and Frontiers', ['CGOE','HCP','MS']],
      ['cs520',  'CS 520 — Knowledge Graphs',                                ['CGOE','MS','NDO','Professional Ed']],
      ['ee364a', 'EE 364A — Convex Optimization',                            ['MS','Certificate','Professional Ed']],
    ];
    for (const [id, name, programs] of classRows) {
      await ins(client,
        'INSERT INTO classes (id, name, programs) VALUES ($1,$2,$3)',
        [id, name, programs]);
    }

    // ── User-class enrollments ────────────────────────────────────────────────
    const enrollments = [
      [U.u1,'cs229'], [U.u1,'cs231n'],
      [U.u2,'cs224n'],
      [U.u3,'cs229'], [U.u3,'ee364a'],
      [U.u4,'cs231n'], [U.u4,'cs224n'],
    ];
    for (const [uid, cid] of enrollments) {
      await ins(client, 'INSERT INTO user_classes (user_id, class_id) VALUES ($1,$2)', [uid, cid]);
    }

    // ── Chats ─────────────────────────────────────────────────────────────────
    const chatRows = [
      [C.ch1,     'cs229',  'HW1 – Linear Regression',      ['HW'],      U.u1, U.u2, true,  '2026-04-01T10:00:00Z'],
      [C.ch2,     'cs229',  'Midterm Study Group',           ['Test'],    U.u3, null, false, '2026-04-10T14:00:00Z'],
      [C.ch3,     'cs231n', 'Assignment 2 – CNNs',           ['HW'],      U.u4, U.u2, false, '2026-04-15T09:00:00Z'],
      [C.ch4,     'cs224n', 'Yapping about transformers',    ['Yap'],     U.u2, null, false, '2026-04-20T16:30:00Z'],
      [C.general, null,     '#introductions',                ['General'], U.u2, U.u2, true,  '2026-04-01T09:00:00Z'],
    ];
    for (const [id, classId, title, tags, createdBy, modId, pinned, createdAt] of chatRows) {
      await ins(client,
        `INSERT INTO chats (id, class_id, title, tags, created_by, moderator_id, pinned, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, classId, title, tags, createdBy, modId, pinned, createdAt]);
    }

    // ── Messages ──────────────────────────────────────────────────────────────
    const msgRows = [
      [M.m1,  C.ch1,     U.u1, 'Has anyone started Q3 yet? The math is tripping me up.', null, '2026-04-02T11:00:00Z'],
      [M.m2,  C.ch1,     U.u3, 'Yeah, check the lecture 3 slides — gradient derivation is on slide 22. The key is to vectorize the loss before taking the derivative.', null, '2026-04-02T11:15:00Z'],
      [M.m3,  C.ch2,     U.u4, 'Anyone want to do a Zoom session this weekend?', null, '2026-04-11T10:00:00Z'],
      [M.m4,  C.ch1,     U.u2, 'For Q3, remember to vectorize your gradient computation — a for-loop over training examples will time out on the autograder. numpy broadcasting is your friend here.', null, '2026-04-02T12:00:00Z'],
      [M.m5,  C.ch1,     U.u3, "Here's a diagram I sketched of the gradient flow for the vectorized form. Should make Q3b clearer.", 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=700&q=80', '2026-04-02T13:00:00Z'],
      [M.m6,  C.ch1,     U.u1, 'When should we do an office hours session together?', null, '2026-04-02T14:00:00Z'],
      [M.m7,  C.ch2,     U.u1, "Study group locked in — details below. DM me if you can't make it and I'll share notes.", null, '2026-04-11T12:00:00Z'],
      [M.m8,  C.ch4,     U.u2, 'Hot take: attention is NOT all you need. Positional encodings are doing at least 30% of the heavy lifting and nobody talks about it.', null, '2026-04-20T17:00:00Z'],
      [M.m9,  C.ch4,     U.u1, "I mean... the paper literally says it in the title 😅. But you're not wrong — RoPE embeddings are arguably the most underrated innovation of the past 5 years.", null, '2026-04-20T17:30:00Z'],
      [M.m10, C.ch4,     U.u4, "Can we also talk about how nobody actually reads the full Methods section of the original paper? Everyone's working off blog post summaries.", null, '2026-04-20T18:00:00Z'],
      [M.mg1, C.general, U.u2, 'Welcome to CGOEConnect! 👋 This is the #introductions channel. Share your name, program, and what you\'re working on this quarter.', null, '2026-04-01T09:00:00Z'],
      [M.mg2, C.general, U.u1, "Hey everyone! I'm Aisha — CGOE MS CS student based in NYC. Taking CS229 and CS231N this quarter. Really excited to connect with you all! 🎉", null, '2026-04-01T10:00:00Z'],
      [M.mg3, C.general, U.u3, 'Sofia here — MS EE, signal processing background. Trying to branch into ML this quarter. Any tips for someone coming from EE into CS229?', null, '2026-04-01T11:00:00Z'],
      [M.mg4, C.general, U.u4, 'Derek from CGOE! Full-stack background, now going deep on deep learning 😄. Happy to pair on projects — hit me up if you want to collaborate.', null, '2026-04-01T12:00:00Z'],
    ];
    for (const [id, chatId, authorId, content, imageUrl, createdAt] of msgRows) {
      await ins(client,
        'INSERT INTO messages (id, chat_id, author_id, content, image_url, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, chatId, authorId, content, imageUrl, createdAt]);
    }

    // ── Reactions ─────────────────────────────────────────────────────────────
    const reactions = [
      [M.m1, '😅', U.u3], [M.m1, '😅', U.u4],
      [M.m2, '🙏', U.u1], [M.m2, '💡', U.u1], [M.m2, '💡', U.u4],
      [M.m4, '💯', U.u1], [M.m4, '💯', U.u3], [M.m4, '👍', U.u4],
      [M.m5, '🔥', U.u1], [M.m5, '🔥', U.u2], [M.m5, '🔥', U.u4],
      [M.m7, '🙌', U.u3], [M.m7, '🙌', U.u4],
      [M.m8, '😂', U.u1], [M.m8, '💯', U.u3],
      [M.m9, '😅', U.u2], [M.m9, '😅', U.u4], [M.m9, '🤔', U.u3],
      [M.m10,'💀', U.u1], [M.m10,'💀', U.u2],
      [M.mg1,'👋', U.u1], [M.mg1,'👋', U.u3], [M.mg1,'👋', U.u4],
      [M.mg2,'❤️', U.u2], [M.mg2,'❤️', U.u3], [M.mg2,'🎉', U.u4],
      [M.mg3,'🙏', U.u1],
      [M.mg4,'🤝', U.u1], [M.mg4,'🤝', U.u2],
    ];
    for (const [msgId, emoji, userId] of reactions) {
      await ins(client,
        'INSERT INTO message_reactions (message_id, emoji, user_id) VALUES ($1,$2,$3)',
        [msgId, emoji, userId]);
    }

    // ── Helpful votes ─────────────────────────────────────────────────────────
    const helpfuls = [
      [M.m1, U.u3], [M.m1, U.u4],
      [M.m2, U.u1], [M.m2, U.u2], [M.m2, U.u4],
      [M.m4, U.u1], [M.m4, U.u3], [M.m4, U.u4],
      [M.m5, U.u1], [M.m5, U.u2], [M.m5, U.u4],
      [M.m7, U.u3], [M.m7, U.u4],
      [M.m8, U.u3],
      [M.m10,U.u1], [M.m10,U.u2],
      [M.mg1,U.u1], [M.mg1,U.u3], [M.mg1,U.u4],
      [M.mg2,U.u2], [M.mg2,U.u3],
      [M.mg3,U.u1],
      [M.mg4,U.u1], [M.mg4,U.u2],
    ];
    for (const [msgId, userId] of helpfuls) {
      await ins(client,
        'INSERT INTO message_helpful (message_id, user_id) VALUES ($1,$2)',
        [msgId, userId]);
    }

    // ── Poll for m6 ───────────────────────────────────────────────────────────
    await ins(client, 'INSERT INTO polls (id, message_id, question) VALUES ($1,$2,$3)',
      [POLL.m6, M.m6, 'Best time for an informal office hours?']);
    await ins(client, 'INSERT INTO poll_options (id, poll_id, text, display_order) VALUES ($1,$2,$3,$4)',
      [OPT.o1, POLL.m6, 'Thursday 5–6 pm', 0]);
    await ins(client, 'INSERT INTO poll_options (id, poll_id, text, display_order) VALUES ($1,$2,$3,$4)',
      [OPT.o2, POLL.m6, 'Friday 3–4 pm', 1]);
    await ins(client, 'INSERT INTO poll_options (id, poll_id, text, display_order) VALUES ($1,$2,$3,$4)',
      [OPT.o3, POLL.m6, 'Saturday 10 am–noon', 2]);
    // u2 → o1, u3 → o1, u4 → o3
    for (const [userId, optId] of [[U.u2, OPT.o1],[U.u3, OPT.o1],[U.u4, OPT.o3]]) {
      await ins(client,
        'INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)',
        [POLL.m6, optId, userId]);
    }

    // ── Scheduler for m7 ──────────────────────────────────────────────────────
    await ins(client,
      'INSERT INTO schedulers (id, message_id, title, date, time, location) VALUES ($1,$2,$3,$4,$5,$6)',
      [SCHED.m7, M.m7, 'CS229 Midterm Study Group', '2026-05-03', '14:00', 'Gates B12']);
    for (const uid of [U.u1, U.u3, U.u4]) {
      await ins(client,
        'INSERT INTO scheduler_attendees (scheduler_id, user_id) VALUES ($1,$2)',
        [SCHED.m7, uid]);
    }

    // ── Posts ─────────────────────────────────────────────────────────────────
    const postRows = [
      [P.p1, U.u1, 'cs229',  C.ch2,    'Just finished the final project — used transformers for time-series. Happy to share notes!', '2026-04-21T08:00:00Z'],
      [P.p2, U.u3, 'cs231n', C.ch3,    'Pro tip: use Google Colab Pro for A2. Local GPU was not cutting it.', '2026-04-22T12:00:00Z'],
      [P.p3, U.u2, null,     null,     'Welcome to the CGOE community! Introduce yourself below 👋', '2026-04-01T09:00:00Z'],
      [P.p4, U.u4, 'cs224n', C.ch4,    'Anyone else think the attention mechanism section of the lectures could use more examples?', '2026-04-23T15:00:00Z'],
    ];
    for (const [id, authorId, classId, chatId, content, createdAt] of postRows) {
      await ins(client,
        'INSERT INTO posts (id, author_id, class_id, chat_id, content, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, authorId, classId, chatId, content, createdAt]);
    }

    // ── Post upvotes ──────────────────────────────────────────────────────────
    const upvotes = [
      [P.p1,U.u2],[P.p1,U.u3],[P.p1,U.u4],
      [P.p2,U.u1],[P.p2,U.u4],
      [P.p3,U.u1],[P.p3,U.u3],[P.p3,U.u4],
      [P.p4,U.u1],
    ];
    for (const [postId, userId] of upvotes) {
      await ins(client, 'INSERT INTO post_upvotes (post_id, user_id) VALUES ($1,$2)', [postId, userId]);
    }

    // ── Saved posts ───────────────────────────────────────────────────────────
    const saved = [[U.u1,P.p2],[U.u1,P.p4],[U.u3,P.p1]];
    for (const [userId, postId] of saved) {
      await ins(client, 'INSERT INTO saved_posts (user_id, post_id) VALUES ($1,$2)', [userId, postId]);
    }

    // ── Comments ──────────────────────────────────────────────────────────────
    const commentRows = [
      [CMT.c1, P.p1, U.u3, 'Would love to see those notes! DM me.', '2026-04-21T09:00:00Z'],
      [CMT.c2, P.p1, U.u4, 'Same — this is super helpful context for my project idea.', '2026-04-21T10:00:00Z'],
      [CMT.c3, P.p3, U.u1, 'Hey everyone! CGOE MS CS student here, based in NYC 🗽', '2026-04-01T10:00:00Z'],
    ];
    for (const [id, postId, authorId, content, createdAt] of commentRows) {
      await ins(client,
        'INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES ($1,$2,$3,$4,$5)',
        [id, postId, authorId, content, createdAt]);
    }

    // ── Reviews ───────────────────────────────────────────────────────────────
    await ins(client,
      'INSERT INTO reviews (id, class_id, author_id, rating, content, cgoe_specific, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [R.r1, 'cs229', U.u1, 4, 'Great course — lectures are dense but rewarding. Workload is heavy.', true, '2026-03-15T10:00:00Z']);
    await ins(client,
      'INSERT INTO reviews (id, class_id, author_id, rating, content, cgoe_specific, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [R.r2, 'cs231n', U.u4, 5, "Best ML course I've taken. A2 is brutal but worth it.", false, '2026-03-20T10:00:00Z']);

    // ── Flag for m1 ───────────────────────────────────────────────────────────
    await ins(client,
      `INSERT INTO flags (id, target_type, target_id, reported_by, reason, created_at)
       VALUES ($1,'message',$2,$3,'Off-topic','2026-04-02T12:00:00Z')`,
      ['00000000-0000-0000-0006-000000000001', M.m1, U.u2]);

    await client.query('COMMIT');
    console.log('✓ Database seeded successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    db.end();
  }
}

seed();
