// 判定层：评分口径的登记、启用规则
import type { LabState, RubricDraft, RubricVersion } from '../data/types';
import { PASS_SCORE } from '../data/constants';

export interface DraftInput {
  name: string;
  clarity: number;
  stress: number;
}

/** 草稿校验：名称非空、权重为整数且和为 100 */
export function validateDraft(input: DraftInput): string | null {
  const name = input.name.trim();
  if (!name) return '请填写口径登记名称';
  if (!Number.isInteger(input.clarity) || !Number.isInteger(input.stress)) return '权重须为整数';
  if (input.clarity < 0 || input.stress < 0 || input.clarity > 100 || input.stress > 100) return '权重须在 0 至 100 之间';
  if (input.clarity + input.stress !== 100) return `权重和须为 100，当前为 ${input.clarity + input.stress}`;
  return null;
}

/**
 * 登记新草稿。已有草稿不能并存——返回错误而非覆盖，
 * 页面应先提示“放弃旧草稿 / 取消”。
 */
export function registerDraft(state: LabState, input: DraftInput, nowIso: string): { ok: true; draft: RubricDraft } | { ok: false; error: string } {
  if (state.draft) {
    return { ok: false, error: `已存在草稿「${state.draft.name}」，请先启用或放弃，不能并存` };
  }
  const error = validateDraft(input);
  if (error) return { ok: false, error };
  return {
    ok: true,
    draft: { name: input.name.trim(), clarity: input.clarity, stress: input.stress, createdAt: nowIso },
  };
}

export interface ActivationImpact {
  masteredToRevisit: number; // 已掌握 → 待复评 的句子数
  resetInQueue: number;      // 队列中进度清零的句子数
}

/** 预览启用口径的影响（供确认弹窗展示） */
export function previewActivation(state: LabState, draft: RubricDraft): ActivationImpact {
  const masteredCount = state.phrases.filter(
    p => p.status === 'mastered' && p.masteredRubricId === state.currentRubricId,
  ).length;
  // 启用后所有队列条目都按新口径重新计数
  return { masteredToRevisit: masteredCount, resetInQueue: state.queue.length };
}

/**
 * 启用草稿口径：
 * - 旧口径置为 retired，新口径成为当前口径（只影响此后练习）
 * - 旧成绩不变，仍按原口径保存
 * - 已掌握句子转入待复评；队列既有条目进度清零，统一挂到新口径
 */
export function activateDraft(state: LabState, nowIso: string): LabState {
  const draft = state.draft;
  if (!draft) return state;
  const seq = state.seqRubric + 1;
  const newId = `v${seq}`;
  const newRubric: RubricVersion = {
    id: newId,
    name: draft.name,
    clarity: draft.clarity,
    stress: draft.stress,
    status: 'active',
    activatedAt: nowIso,
  };
  const rubrics: RubricVersion[] = state.rubrics.map(r =>
    r.id === state.currentRubricId ? { ...r, status: 'retired', retiredAt: nowIso } : r,
  );
  rubrics.push(newRubric);

  // 已掌握句子转入待复评（旧口径下已掌握、且尚未在队列中的）
  const queuedIds = new Set(state.queue.map(q => q.phraseId));
  const newEntries = state.phrases
    .filter(p => p.status === 'mastered' && p.masteredRubricId === state.currentRubricId && !queuedIds.has(p.id))
    .map(p => ({ phraseId: p.id, phraseVersion: p.version, rubricId: newId, streak: 0 }));

  // 队列已有条目：重置到新口径、当前版本，连续计数归零
  const queue = [
    ...state.queue.map(q => {
      const phrase = state.phrases.find(p => p.id === q.phraseId);
      return { phraseId: q.phraseId, phraseVersion: phrase ? phrase.version : q.phraseVersion, rubricId: newId, streak: 0 };
    }),
    ...newEntries,
  ];

  const phrases = state.phrases.map(p =>
    p.status === 'mastered' && p.masteredRubricId === state.currentRubricId && !queuedIds.has(p.id)
      ? { ...p, status: 'practice' as const }
      : p,
  );

  return {
    ...state,
    phrases,
    rubrics,
    draft: null,
    currentRubricId: newId,
    queue,
    seqRubric: seq,
  };
}

export function discardDraft(state: LabState): LabState {
  return { ...state, draft: null };
}

export function getRubric(state: LabState, id: string): RubricVersion | undefined {
  return state.rubrics.find(r => r.id === id);
}

export function currentRubric(state: LabState): RubricVersion {
  return getRubric(state, state.currentRubricId) ?? state.rubrics[0];
}

/** 复评提示文案 */
export function revisitRuleText(): string {
  return `当前口径下连续 ${PASS_SCORE} 分满两次方可恢复已掌握`;
}
