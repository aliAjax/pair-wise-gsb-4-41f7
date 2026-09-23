// 页面层胶水：统一持有状态、持久化，并把操作转发给判定层

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DimensionScores, LabState } from './types';
import { loadState, saveState } from './storage';
import {
  activateDraft, addPhrase, deleteDraft, editPhrase, registerDraft, removePhrase,
  submitScore, updateDraft, validate, type Result,
} from './rules';

const nowIso = () => new Date().toISOString();

export function useLab() {
  const [state, setState] = useState<LabState>(loadState);
  const [conflictsDismissed, setConflictsDismissed] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  // 每次状态变化（含重开加载）都重新核对：记录 × 口径版本 × 待复评队列
  const conflicts = useMemo(() => validate(state), [state]);

  const apply = useCallback((r: Result) => {
    if (r.ok) {
      setState(r.state);
      setConflictsDismissed(false);
      return null;
    }
    return r.error;
  }, []);

  const api = useMemo(() => ({
    registerDraft: (name: string, w: { clarity: number; stress: number; fluency: number }) =>
      apply(registerDraft(state, name, w, nowIso())),
    updateDraft: (id: number, name: string, w: { clarity: number; stress: number; fluency: number }) =>
      apply(updateDraft(state, id, name, w)),
    deleteDraft: (id: number) => apply(deleteDraft(state, id)),
    activateDraft: (id: number) => apply(activateDraft(state, id, nowIso())),
    submitScore: (phraseId: number, dims: DimensionScores) =>
      apply(submitScore(state, phraseId, dims, nowIso())),
    editPhrase: (id: number, text: string, translation: string) =>
      apply(editPhrase(state, id, text, translation, nowIso())),
    addPhrase: (text: string, translation: string) => {
      const r = addPhrase(state, text, translation, nowIso());
      if (!r.ok) return { ok: false as const, error: r.error };
      setState(r.state);
      setConflictsDismissed(false);
      const created = r.state.phrases[r.state.phrases.length - 1];
      return { ok: true as const, id: created.id };
    },
    removePhrase: (id: number) => setState(removePhrase(state, id)),
    dismissConflicts: () => setConflictsDismissed(true),
  }), [state, apply]);

  return { state, conflicts, conflictsDismissed, ...api };
}
