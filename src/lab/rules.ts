// 判定层：评分口径、成绩计算、掌握复评与一致性校验（全部为纯函数）

import type {
  Conflict, DimensionScores, LabState, Phrase, PracticeRecord, Rubric, Weights,
} from './types';
import { PASS_SCORE, PASS_STREAK } from './types';

export type Result = { ok: true; state: LabState } | { ok: false; error: string };

const sum = (w: Weights) => w.clarity + w.stress + w.fluency;

export const validWeight = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;

export const weightError = (w: Weights): string | null =>
  (!validWeight(w.clarity) || !validWeight(w.stress) || !validWeight(w.fluency))
    ? '权重需为 0 到 100 之间的整数'
    : sum(w) !== 100 ? '权重和须为 100' : null;

export const activeRubric = (s: LabState): Rubric | undefined =>
  s.rubrics.find(r => r.status === 'active');

export const currentVersion = (p: Phrase) =>
  p.versions.reduce((a, v) => (v.version > a.version ? v : a), p.versions[0]);

/** 按指定口径的权重计算加权总分（四舍五入） */
export const scoreTotal = (w: Weights, d: DimensionScores) =>
  Math.round((d.clarity * w.clarity + d.stress * w.stress + d.fluency * w.fluency) / 100);

const nextId = (s: LabState, key: 'phrases' | 'records' | 'rubrics') =>
  (s[key] as { id: number }[]).reduce((m, x) => Math.max(m, x.id), 0) + 1;

// ---------- 评分口径 ----------

/** 登记新草稿；权重和必须为 100，且同时只能存在一个草稿 */
export function registerDraft(s: LabState, name: string, w: Weights, now: string): Result {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: '请填写口径名称' };
  const we = weightError(w);
  if (we) return { ok: false, error: we };
  if (s.rubrics.some(r => r.status === 'draft')) {
    return { ok: false, error: '已有草稿口径，请先启用或删除该草稿（草稿不能并存）' };
  }
  const rubric: Rubric = {
    id: nextId(s, 'rubrics'),
    name: trimmed,
    weights: { ...w },
    status: 'draft',
    createdAt: now,
  };
  return { ok: true, state: { ...s, rubrics: [...s.rubrics, rubric] } };
}

export function updateDraft(s: LabState, id: number, name: string, w: Weights): Result {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: '请填写口径名称' };
  const we = weightError(w);
  if (we) return { ok: false, error: we };
  if (!s.rubrics.some(r => r.id === id && r.status === 'draft')) {
    return { ok: false, error: '只能修改草稿口径' };
  }
  return {
    ok: true,
    state: { ...s, rubrics: s.rubrics.map(r => (r.id === id ? { ...r, name: trimmed, weights: { ...w } } : r)) },
  };
}

export function deleteDraft(s: LabState, id: number): Result {
  if (!s.rubrics.some(r => r.id === id && r.status === 'draft')) {
    return { ok: false, error: '只能删除草稿口径' };
  }
  return { ok: true, state: { ...s, rubrics: s.rubrics.filter(r => r.id !== id) } };
}

/**
 * 启用草稿：旧启用口径归档（其成绩仍按原口径保存），此后练习按新口径评分；
 * 所有已掌握句子转入待复评，在新口径下连续两次达标后恢复。
 */
export function activateDraft(s: LabState, id: number, now: string): Result {
  const draft = s.rubrics.find(r => r.id === id && r.status === 'draft');
  if (!draft) return { ok: false, error: '只能启用草稿口径' };
  const we = weightError(draft.weights);
  if (we) return { ok: false, error: we };
  const rubrics = s.rubrics.map(r => {
    if (r.id === id) return { ...r, status: 'active' as const, activatedAt: now };
    if (r.status === 'active') return { ...r, status: 'archived' as const, archivedAt: now };
    return r;
  });
  const phrases = s.phrases.map(p =>
    p.status === 'mastered'
      ? { ...p, status: 'review' as const, reviewSince: now, reviewVersion: currentVersion(p).version, qualifying: 0 }
      : p,
  );
  return { ok: true, state: { ...s, rubrics, phrases } };
}

// ---------- 练习成绩与掌握复评 ----------

/** 当前口径下，复评版本连续达标次数（按时间顺序取末尾连续段） */
export function qualifyingStreak(records: PracticeRecord[], active: Rubric, phraseId: number, reviewVersion: number) {
  let streak = 0;
  for (const r of records) {
    if (r.phraseId !== phraseId || r.rubricId !== active.id || r.version !== reviewVersion) continue;
    streak = r.total >= PASS_SCORE ? streak + 1 : 0;
  }
  return streak;
}

/**
 * 提交一次练习：成绩绑定当前启用口径与当前句子版本。
 * 待复评句子：当前口径、同版本连续两次 ≥85 即恢复已掌握；
 * 期间改句子会生成新版本（见 editPhrase），旧版本成绩不再计入。
 */
export function submitScore(s: LabState, phraseId: number, dims: DimensionScores, now: string): Result {
  const active = activeRubric(s);
  if (!active) return { ok: false, error: '没有启用的评分口径' };
  const phrase = s.phrases.find(p => p.id === phraseId);
  if (!phrase) return { ok: false, error: '句子不存在' };
  const total = scoreTotal(active.weights, dims);
  const record: PracticeRecord = {
    id: nextId(s, 'records'),
    phraseId,
    rubricId: active.id,
    version: currentVersion(phrase).version,
    dims: { ...dims },
    total,
    at: now,
  };
  const state: LabState = { ...s, records: [...s.records, record] };
  state.phrases = state.phrases.map(p => {
    if (p.id !== phraseId) return p;
    const base: Phrase = { ...p, attempts: p.attempts + 1 };
    if (p.status !== 'review' || p.reviewVersion == null) return { ...base, status: 'practice' };
    const streak = qualifyingStreak(state.records, active, phraseId, p.reviewVersion);
    if (streak >= PASS_STREAK) {
      return { ...base, status: 'mastered', qualifying: PASS_STREAK, reviewSince: undefined, reviewVersion: undefined };
    }
    return { ...base, status: 'review', qualifying: streak };
  });
  return { ok: true, state };
}

/**
 * 修改句子：始终生成新版本。复评期间修改会重置复评进度，
 * 复评改在新版本上重新计数；旧版本及旧成绩保留不动。
 */
export function editPhrase(s: LabState, id: number, text: string, translation: string, now: string): Result {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: '句子内容不能为空' };
  let found = false;
  const phrases = s.phrases.map(p => {
    if (p.id !== id) return p;
    found = true;
    const version = currentVersion(p).version + 1;
    const base: Phrase = {
      ...p,
      versions: [...p.versions, { version, text: trimmed, translation: translation.trim() || '待补充译文', createdAt: now }],
    };
    if (p.status === 'review') {
      return { ...base, reviewSince: now, reviewVersion: version, qualifying: 0 };
    }
    return base;
  });
  if (!found) return { ok: false, error: '句子不存在' };
  return { ok: true, state: { ...s, phrases } };
}

export function addPhrase(s: LabState, text: string, translation: string, now: string): Result {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: '句子内容不能为空' };
  const id = nextId(s, 'phrases');
  const phrase: Phrase = {
    id,
    tag: '自定义',
    level: '入门',
    versions: [{ version: 1, text: trimmed, translation: translation.trim() || '待补充译文', createdAt: now }],
    status: 'new',
    attempts: 0,
  };
  return { ok: true, state: { ...s, phrases: [...s.phrases, phrase] } };
}

export function removePhrase(s: LabState, id: number): LabState {
  return {
    ...s,
    phrases: s.phrases.filter(p => p.id !== id),
    records: s.records.filter(r => r.phraseId !== id),
  };
}

// ---------- 重开一致性校验：记录 × 口径版本 × 待复评队列 ----------

export function validate(s: LabState): Conflict[] {
  const conflicts: Conflict[] = [];
  const push = (c: Omit<Conflict, 'rule'>, rule: string) => conflicts.push({ ...c, rule });

  const actives = s.rubrics.filter(r => r.status === 'active');
  if (actives.length === 0) {
    push({ kind: 'no-active' }, '必须有一个启用口径');
  }
  if (actives.length > 1) {
    push({ kind: 'multiple-active' }, '同时只能有一个启用口径');
  }
  const drafts = s.rubrics.filter(r => r.status === 'draft');
  if (drafts.length > 1) {
    push({ kind: 'draft-conflict' }, '草稿口径不能并存');
  }
  for (const r of s.rubrics) {
    const we = weightError(r.weights);
    if (we) push({ kind: 'weights', rubricId: r.id }, `口径「${r.name}」权重无效：${we}`);
  }

  const phraseById = new Map(s.phrases.map(p => [p.id, p]));
  const rubricById = new Map(s.rubrics.map(r => [r.id, r]));
  const active = actives[0];

  for (const rec of s.records) {
    const rub = rubricById.get(rec.rubricId);
    const phrase = phraseById.get(rec.phraseId);
    if (!rub) {
      push({ kind: 'record-rubric', phraseId: rec.phraseId, recordId: rec.id, score: rec.total },
        `成绩引用了不存在的口径版本（id=${rec.rubricId}）`);
      continue;
    }
    if (!phrase) {
      push({ kind: 'record-phrase', rubricId: rub.id, recordId: rec.id, score: rec.total },
        '成绩引用了已删除的句子');
      continue;
    }
    const pv = phrase.versions.find(v => v.version === rec.version);
    if (!pv) {
      push({ kind: 'record-version', phraseId: phrase.id, rubricId: rub.id, recordId: rec.id, score: rec.total },
        '成绩绑定的句子版本不存在');
      continue;
    }
    const expected = scoreTotal(rub.weights, rec.dims);
    if (expected !== rec.total) {
      push({ kind: 'record-score', phraseId: phrase.id, rubricId: rub.id, recordId: rec.id, score: rec.total },
        `成绩 ${rec.total} 分与口径「${rub.name}」权重不符，应为 ${expected} 分`);
    }
  }

  for (const p of s.phrases) {
    const inQueue = p.status === 'review';
    const hasReviewMeta = p.reviewSince != null || p.reviewVersion != null;
    if (!inQueue && hasReviewMeta) {
      push({ kind: 'review-state', phraseId: p.id }, '非复评句子带有复评队列字段');
    }
    if (inQueue) {
      if (!active) continue;
      const rv = p.reviewVersion;
      const expectedVersion = currentVersion(p).version;
      if (rv == null || p.reviewSince == null) {
        push({ kind: 'review-state', phraseId: p.id }, '待复评句子缺少复评起点或目标版本');
        continue;
      }
      if (rv !== expectedVersion) {
        push({ kind: 'review-state', phraseId: p.id },
          `复评针对版本 v${rv}，但句子当前为 v${expectedVersion}；修改句子应先生成新版本`);
      }
      const expected = qualifyingStreak(s.records, active, p.id, rv);
      if ((p.qualifying ?? 0) !== expected) {
        push({ kind: 'review-count', phraseId: p.id, rubricId: active.id, score: expected },
          `复评进度 ${p.qualifying ?? 0} 次与记录中当前口径连续达标的 ${expected} 次不一致`);
      }
      if (expected >= PASS_STREAK) {
        push({ kind: 'review-done', phraseId: p.id, rubricId: active.id, score: PASS_SCORE },
          `已在当前口径连续 ${expected} 次达到 ${PASS_SCORE} 分，应恢复为已掌握`);
      }
    }
  }

  return conflicts;
}
