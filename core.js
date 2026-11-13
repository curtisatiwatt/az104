export const STORAGE_KEY = 'az104-studio-v1';
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function addDays(date, n) { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return localDate(d); }
export function defaultState() {
  return { version: 1, profile: { startDate: localDate(), weeklyHours: 11 }, tasks: {}, lessons: {}, steps: {}, notes: {}, favorites: [], attempts: [], exams: [], activity: {}, session: null };
}
export function isCorrect(answers, selected = []) { return answers.length === selected.length && [...answers].sort().every((v, i) => v === [...selected].sort()[i]); }
export function shuffle(items, random = Math.random) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function examQuestions(questions) {
  const quotas = { identity: 11, storage: 10, compute: 12, network: 10, monitor: 7 };
  return shuffle(Object.entries(quotas).flatMap(([domain, count]) => shuffle(questions.filter(q => q.domain === domain)).slice(0, count))).map(q => q.id);
}
export function latestAttempts(attempts) { const result = {}; for (const a of attempts) if (a.selected?.length) result[a.questionId] = a; return result; }
export function domainStats(questions, attempts) {
  const latest = latestAttempts(attempts);
  return Object.fromEntries(['identity', 'storage', 'compute', 'network', 'monitor'].map(domain => {
    const pool = questions.filter(q => q.domain === domain), answered = pool.filter(q => latest[q.id]);
    const correct = answered.filter(q => latest[q.id].correct).length;
    return [domain, { total: pool.length, answered: answered.length, correct, accuracy: answered.length ? Math.round(correct / answered.length * 100) : 0 }];
  }));
}
export function readiness(questions, state, labs) {
  const stats = domainStats(questions, state.attempts);
  const recent = state.exams.slice(-2);
  return [
    { label: '五个领域各完成至少 15 道题，最近答案正确率 ≥ 80%', met: Object.values(stats).every(s => s.answered >= 15 && s.accuracy >= 80) },
    { label: '12 个实验完成全部步骤与资源清理确认', met: labs.every(l => l.steps.every((_, i) => state.steps[`${l.id}:${i}`]) && state.steps[`${l.id}:cleanup`]) },
    { label: '连续两次 50 题计时模考 ≥ 80%', met: recent.length === 2 && recent.every(e => e.total === 50 && e.score >= 80) }
  ];
}
export function normalizeState(raw, catalog) {
  if (!raw || raw.version !== 1 || typeof raw !== 'object') throw new Error('备份版本无效，请选择本站导出的 JSON 文件。');
  const state = defaultState();
  const qMap = new Map(catalog.questions.map(q => [q.id, q]));
  const taskIds = new Set(catalog.weeks.flatMap(w => w.tasks.map(t => t.id)));
  const lessonIds = new Set(catalog.lessons.map(l => l.id));
  const labIds = new Set(catalog.labs.map(l => l.id));
  const stepIds = new Set(catalog.labs.flatMap(l => [...l.steps.map((_, i) => `${l.id}:${i}`), `${l.id}:cleanup`]));
  const boolMap = (obj, ids) => Object.fromEntries(Object.entries(obj || {}).filter(([k, v]) => ids.has(k) && typeof v === 'boolean'));
  state.tasks = boolMap(raw.tasks, taskIds); state.lessons = boolMap(raw.lessons, lessonIds); state.steps = boolMap(raw.steps, stepIds);
  state.notes = Object.fromEntries(Object.entries(raw.notes || {}).filter(([k, v]) => (lessonIds.has(k) || labIds.has(k)) && typeof v === 'string').map(([k, v]) => [k, v.slice(0, 20000)]));
  state.favorites = [...new Set((Array.isArray(raw.favorites) ? raw.favorites : []).filter(id => qMap.has(id)))];
  const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().startsWith(d);
  if (validDate(raw.profile?.startDate)) state.profile.startDate = raw.profile.startDate;
  if (Number.isFinite(raw.profile?.weeklyHours)) state.profile.weeklyHours = Math.min(20, Math.max(4, raw.profile.weeklyHours));
  const validSelection = (id, list) => Array.isArray(list) && list.length <= 4 && new Set(list).size === list.length && list.every(n => Number.isInteger(n) && n >= 0 && n < qMap.get(id).options.length);
  state.attempts = (Array.isArray(raw.attempts) ? raw.attempts : []).filter(a => a && qMap.has(a.questionId) && validSelection(a.questionId, a.selected) && Number.isFinite(a.at)).slice(-20000).map(a => ({ questionId: a.questionId, selected: a.selected, correct: isCorrect(qMap.get(a.questionId).answers, a.selected), at: a.at, mode: a.mode === 'exam' ? 'exam' : 'practice' }));
  state.exams = (Array.isArray(raw.exams) ? raw.exams : []).filter(e => e && Number.isFinite(e.at) && Number.isFinite(e.score) && e.score >= 0 && e.score <= 100 && Number.isInteger(e.correct) && e.correct >= 0 && e.correct <= 50 && e.score === e.correct * 2 && e.total === 50).slice(-200).map(e => ({ at: e.at, score: e.score, total: 50, correct: Math.round(e.score / 2) }));
  state.activity = Object.fromEntries(Object.entries(raw.activity || {}).filter(([k, v]) => validDate(k) && Number.isInteger(v) && v >= 0).slice(-730));
  const s = raw.session;
  if (s && ['practice', 'exam'].includes(s.mode) && Array.isArray(s.ids) && s.ids.length > 0 && s.ids.length <= 100 && new Set(s.ids).size === s.ids.length && s.ids.every(id => qMap.has(id)) && Number.isFinite(s.startedAt) && (s.mode !== 'exam' || (s.ids.length === 50 && Number.isFinite(s.deadline) && s.deadline === s.startedAt + 100 * 60 * 1000))) {
    state.session = { id: String(s.id).slice(0, 50), mode: s.mode, ids: s.ids, index: Math.max(0, Math.min(s.ids.length - 1, Number.isInteger(s.index) ? s.index : 0)), selections: Object.fromEntries(Object.entries(s.selections || {}).filter(([id, list]) => s.ids.includes(id) && validSelection(id, list))), graded: boolMap(s.graded, new Set(s.ids)), startedAt: s.startedAt, deadline: s.mode === 'exam' ? s.deadline : null, finished: s.finished === true };
  }
  if (state.session && !state.session.finished) {
    const session = state.session;
    session.graded = session.mode === 'exam' ? {} : Object.fromEntries(Object.entries(session.graded).filter(([id, graded]) => graded && session.selections[id]?.length === qMap.get(id).answers.length));
  }
  return state;
}
