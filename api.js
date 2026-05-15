// Central API client — reads JWT from localStorage, prefixes all calls with /api
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export function getToken() {
  return localStorage.getItem('cgoe_token');
}

async function req(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    (email, password)              => req('POST', '/auth/login',    { email, password }),
  register: (email, password, name, program) => req('POST', '/auth/register', { email, password, name, program }),
  me:       ()                             => req('GET',  '/auth/me'),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  list:       ()            => req('GET',    '/users'),
  get:        (id)          => req('GET',    `/users/${id}`),
  update:     (id, data)    => req('PUT',    `/users/${id}`, data),
  updateRole: (id, role)    => req('PATCH',  `/users/${id}/role`, { role }),
  delete:     (id)          => req('DELETE', `/users/${id}`),
  enroll:     (id, classId) => req('POST',   `/users/${id}/classes/${classId}`),
  unenroll:   (id, classId) => req('DELETE', `/users/${id}/classes/${classId}`),
  savedPosts: (id)          => req('GET',    `/users/${id}/saved-posts`),
};

// ── Classes ──────────────────────────────────────────────────────────────────
export const classesAPI = {
  create:       (data)             => req('POST',   '/classes', data),
  list:         (program)          => req('GET',    `/classes${program ? `?program=${encodeURIComponent(program)}` : ''}`),
  get:          (id)               => req('GET',    `/classes/${id}`),
  remove:       (id)               => req('DELETE', `/classes/${id}`),
  chats:        (classId)          => req('GET',    `/classes/${classId}/chats`),
  createChat:   (classId, data)    => req('POST',   `/classes/${classId}/chats`, data),
  reviews:      (classId)          => req('GET',    `/classes/${classId}/reviews`),
  createReview: (classId, data)    => req('POST',   `/classes/${classId}/reviews`, data),
};

// ── Chats ─────────────────────────────────────────────────────────────────────
export const chatsAPI = {
  general:    ()        => req('GET',  '/chats/general'),
  get:        (id)      => req('GET',  `/chats/${id}`),
  messages:   (chatId)  => req('GET',  `/chats/${chatId}/messages`),
  postMessage:(chatId, data) => req('POST', `/chats/${chatId}/messages`, data),
  remove:     (id)      => req('DELETE', `/chats/${id}`),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesAPI = {
  react:   (id, emoji)    => req('POST',   `/messages/${id}/reactions`, { emoji }),
  unreact: (id, emoji)    => req('DELETE', `/messages/${id}/reactions`, { emoji }),
  helpful: (id)           => req('POST',   `/messages/${id}/helpful`),
  flag:    (id, reason)   => req('POST',   `/messages/${id}/flag`, { reason }),
  vote:    (id, optionId) => req('POST',   `/messages/${id}/vote`, { optionId }),
  attend:  (id)           => req('POST',   `/messages/${id}/attend`),
  remove:  (id)           => req('DELETE', `/messages/${id}`),
};

// ── Posts ─────────────────────────────────────────────────────────────────────
export const postsAPI = {
  feed:    ()            => req('GET',  '/posts'),
  create:  (data)        => req('POST', '/posts', data),
  remove:  (id)          => req('DELETE', `/posts/${id}`),
  upvote:  (id)          => req('POST', `/posts/${id}/upvote`),
  save:    (id)          => req('POST', `/posts/${id}/save`),
  flag:    (id, reason)  => req('POST', `/posts/${id}/flag`, { reason }),
  comments:(id)          => req('GET',  `/posts/${id}/comments`),
  comment: (id, content) => req('POST', `/posts/${id}/comments`, { content }),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsAPI = {
  helpful: (id)          => req('POST',   `/reviews/${id}/helpful`),
  flag:    (id, reason)  => req('POST',   `/reviews/${id}/flag`, { reason }),
  remove:  (id)          => req('DELETE', `/reviews/${id}`),
};

// ── Comments ──────────────────────────────────────────────────────────────────
export const commentsAPI = {
  flag:   (id, reason) => req('POST',   `/comments/${id}/flag`, { reason }),
  remove: (id)         => req('DELETE', `/comments/${id}`),
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const resourcesAPI = {
  list:   (classId)       => req('GET',    `/classes/${classId}/resources`),
  create: (classId, data) => req('POST',   `/classes/${classId}/resources`, data),
  remove: (classId, id)   => req('DELETE', `/classes/${classId}/resources/${id}`),
};

// ── Flags ─────────────────────────────────────────────────────────────────────
export const flagsAPI = {
  list:    (resolved) => req('GET',   `/flags${resolved !== undefined ? `?resolved=${resolved}` : ''}`),
  resolve: (id)       => req('PATCH', `/flags/${id}/resolve`),
};

// ── Normalize API user → camelCase shape expected by the frontend ─────────────
export function normalizeUser(u) {
  return {
    id:                 u.id,
    email:              u.email,
    name:               u.name,
    bio:                u.bio ?? '',
    profilePic:         u.profile_pic ?? '',
    program:            u.program,
    role:               u.role,
    classes:            u.classes ?? [],
    agreedToGuidelines: u.agreed_to_guidelines ?? false,
    identityTags:       u.identity_tags ?? [],
    studentStatus:      u.student_status ?? '',
    modalityTags:       u.modality_tags ?? [],
    timezone:           u.timezone ?? '',
    customClasses:      [],
    savedPosts:         [],
  };
}
