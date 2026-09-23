import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { LabState, Phrase, RubricDraft } from './data/types';
import { PASS_SCORE, PASS_TIMES } from './data/constants';
import { activateDraft, currentRubric, discardDraft, previewActivation, registerDraft } from './domain/rubric';
import { addPhrase, editPhrase, removePhrase, scorePhrase, simulateScores } from './domain/scoring';
import type { ScoreResult } from './domain/scoring';
import { diagnose } from './domain/diagnose';
import { loadState, saveState } from './storage/storage';
import Sidebar from './components/Sidebar';
import type { View } from './components/Sidebar';
import LibraryView from './components/LibraryView';
import PracticePanel from './components/PracticePanel';
import RecordsView from './components/RecordsView';
import RubricsView from './components/RubricsView';
import PhraseModal from './components/PhraseModal';
import { ConflictBanner } from './components/Common';
import type { PhraseEdit } from './domain/scoring';

const headings: Record<View, { eyebrow: string; title: string }> = {
  practice: { eyebrow: 'WEDNESDAY, SEP 23', title: '今天练什么？' },
  records: { eyebrow: 'PRACTICE LOG', title: '练习记录与待复评' },
  rubrics: { eyebrow: 'SCORING RUBRICS', title: '评分口径' },
};

export default function App() {
  // 存储层：唯一加载入口；判定层对内存态做纯函数变换
  const [state, setState] = useState<LabState>(() => loadState(new Date().toISOString()));
  const [view, setView] = useState<View>('practice');
  const [selectedId, setSelectedId] = useState<number>(() => state.phrases[0]?.id ?? 0);
  const [filter, setFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ kind: 'add' } | { kind: 'edit'; phrase: Phrase } | null>(null);
  const [bannerKey, setBannerKey] = useState<string | null>(null);

  useEffect(() => { saveState(state); }, [state]);

  const conflicts = useMemo(() => diagnose(state), [state]);
  const conflictKey = conflicts.length ? conflicts.map(c => c.key).join('|') : null;
  const bannerVisible = conflictKey !== null && conflictKey !== bannerKey;

  const current = state.phrases.find(p => p.id === selectedId) ?? state.phrases[0];
  const rubric = currentRubric(state);

  const bestScore = useMemo(() => {
    const today = state.records.filter(r => r.rubricId === state.currentRubricId);
    return today.reduce((max, r) => Math.max(max, r.total), 0);
  }, [state.records, state.currentRubricId]);

  const masteredCount = state.phrases.filter(p => p.status === 'mastered').length;
  const totalAttempts = state.phrases.reduce((sum, p) => sum + p.attempts, 0);

  // ---- 判定层动作 ----
  const handleScore = (phraseId: number, seed: number): ScoreResult | null => {
    // 直接对当前状态做纯函数判定（一次点击只出一次分，闭包状态即最新）
    const outcome = scorePhrase(state, phraseId, simulateScores(seed), new Date().toISOString());
    if (outcome) setState(outcome.state);
    return outcome;
  };

  const handleDelete = (phraseId: number) => {
    const nextId = state.phrases.find(p => p.id !== phraseId)?.id ?? 0;
    setState(s => removePhrase(s, phraseId));
    setSelectedId(prev => (prev === phraseId ? nextId : prev));
  };

  const handleSubmitPhrase = (edit: PhraseEdit) => {
    if (modal?.kind === 'edit') {
      setState(s => editPhrase(s, modal.phrase.id, edit));
    } else {
      setState(s => {
        const { state: next, id } = addPhrase(s, edit);
        setSelectedId(id);
        return next;
      });
    }
    setModal(null);
  };

  const handleRegisterDraft = (draft: RubricDraft): string | null => {
    const res = registerDraft(state, draft, draft.createdAt);
    if (!res.ok) return res.error;
    setState(s => ({ ...s, draft: res.draft }));
    return null;
  };

  const handleActivate = () => setState(s => activateDraft(s, new Date().toISOString()));
  const handleDiscardDraft = () => setState(s => discardDraft(s));

  const heading = headings[view];

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNavigate={setView}
        phraseCount={state.phrases.length}
        masteredCount={masteredCount}
        revisitCount={state.queue.length}
      />
      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{heading.eyebrow}</p>
            <h1>{heading.title}</h1>
          </div>
          {view === 'practice' && (
            <div className="top-actions">
              <div className="search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索句子" /></div>
              <button className="primary" onClick={() => setModal({ kind: 'add' })}><Plus size={17} />添加句子</button>
            </div>
          )}
        </header>

        {bannerVisible && (
          <ConflictBanner conflicts={conflicts} onDismiss={() => setBannerKey(conflictKey)} />
        )}

        {view === 'practice' && (
          <>
            <section className="stats">
              <div><span>累计练习</span><strong>{totalAttempts} <em>次</em></strong><div className="progress"><i style={{ width: `${Math.min(100, totalAttempts * 4)}%` }} /></div></div>
              <div><span>待复评</span><strong>{state.queue.length} <em>句</em></strong><small>当前口径连续 {PASS_TIMES} 次 ≥ {PASS_SCORE} 分恢复</small></div>
              <div><span>当前口径最佳</span><strong>{bestScore || '—'} <em>分</em></strong><small className="green">{rubric.id} · {rubric.name}</small></div>
            </section>
            <div className="content-grid">
              <LibraryView
                state={state}
                selectedId={current?.id ?? 0}
                filter={filter}
                setFilter={setFilter}
                query={query}
                callbacks={{
                  onSelect: id => setSelectedId(id),
                  onAdd: () => setModal({ kind: 'add' }),
                }}
              />
              {current && (
                <PracticePanel
                  state={state}
                  phrase={current}
                  onScore={handleScore}
                  onDelete={handleDelete}
                  onEdit={p => setModal({ kind: 'edit', phrase: p })}
                />
              )}
            </div>
          </>
        )}

        {view === 'records' && (
          <RecordsView state={state} onSelect={id => { setSelectedId(id); setView('practice'); }} />
        )}

        {view === 'rubrics' && (
          <RubricsView
            state={state}
            onRegister={handleRegisterDraft}
            onDiscardDraft={handleDiscardDraft}
            onPreviewActivation={() => (state.draft ? previewActivation(state, state.draft) : { masteredToRevisit: 0, resetInQueue: 0 })}
            onConfirmActivation={handleActivate}
          />
        )}
      </main>

      {modal && (
        <PhraseModal
          phrase={modal.kind === 'edit' ? modal.phrase : null}
          onClose={() => setModal(null)}
          onSubmit={handleSubmitPhrase}
        />
      )}
    </div>
  );
}
