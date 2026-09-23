import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { useLab } from './lab/useLab';
import { activeRubric } from './lab/rules';
import type { DimensionScores } from './lab/types';
import { Sidebar, type ViewKey } from './ui/Sidebar';
import { ConflictBanner } from './ui/ConflictBanner';
import { LibraryView, type ListFilter } from './ui/LibraryView';
import { PracticeView } from './ui/PracticeView';
import { RecordsView } from './ui/RecordsView';
import { RubricModal } from './ui/RubricModal';
import { PhraseModal } from './ui/PhraseModal';
import { PASS_SCORE } from './lab/types';

export default function App() {
  const lab = useLab();
  const { state, conflicts, conflictsDismissed } = lab;
  const [view, setView] = useState<ViewKey>('library');
  const [selected, setSelected] = useState<number | undefined>(state.phrases[0]?.id);
  const [showRubric, setShowRubric] = useState(false);
  const [phraseModal, setPhraseModal] = useState<'create' | number | null>(null);

  const active = activeRubric(state);
  const current = state.phrases.find(p => p.id === selected) ?? state.phrases[0];
  const masteredCount = state.phrases.filter(p => p.status === 'mastered').length;
  const reviewCount = state.phrases.filter(p => p.status === 'review').length;

  const stats = useMemo(() => {
    const best = state.records.reduce((m, r) => Math.max(m, r.total), 0);
    return { best, count: state.records.length };
  }, [state.records]);

  const forcedFilter: ListFilter | undefined =
    view === 'mastered' ? '已掌握' : view === 'review' ? '待复评' : undefined;

  const rubricName = (id: number) => state.rubrics.find(r => r.id === id)?.name ?? `口径 #${id}`;

  const selectPhrase = (id: number) => {
    setSelected(id);
    setView('library');
  };

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onView={setView}
        total={state.phrases.length}
        mastered={masteredCount}
        review={reviewCount}
      />
      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">WEDNESDAY, SEP 23</p>
            <h1>{view === 'records' ? '练习记录' : view === 'review' ? '待复评队列' : view === 'mastered' ? '已掌握句子' : '今天练什么？'}</h1>
          </div>
          <div className="top-actions">
            <button className="secondary" onClick={() => setShowRubric(true)}>
              <Scale size={15} /> 评分口径
              {state.rubrics.some(r => r.status === 'draft') && <i className="draft-dot" title="有草稿口径" />}
            </button>
            <button className="primary" onClick={() => setPhraseModal('create')}>添加句子</button>
          </div>
        </header>

        <section className="stats">
          <div>
            <span>累计练习</span>
            <strong>{stats.count} <em>次</em></strong>
            <div className="progress"><i style={{ width: `${Math.min(100, (stats.count / 20) * 100)}%` }} /></div>
          </div>
          <div>
            <span>待复评句子</span>
            <strong>{reviewCount} <em>句</em></strong>
            <small>当前口径连续两次 ≥ {PASS_SCORE} 分即恢复</small>
          </div>
          <div>
            <span>最佳成绩</span>
            <strong>{stats.count > 0 ? stats.best : '—'}{stats.count > 0 && <em> 分</em>}</strong>
            <small className="green">按各成绩提交时的口径计算</small>
          </div>
        </section>

        {!conflictsDismissed && conflicts.length > 0 && (
          <ConflictBanner
            conflicts={conflicts}
            phrases={state.phrases}
            rubrics={state.rubrics}
            onDismiss={lab.dismissConflicts}
          />
        )}

        {view === 'records' ? (
          <div className="content-grid wide-grid">
            <RecordsView state={state} onSelectPhrase={selectPhrase} />
          </div>
        ) : (
          <div className="content-grid">
            <LibraryView
              phrases={state.phrases}
              selectedId={current?.id ?? -1}
              forcedFilter={forcedFilter}
              onSelect={id => { setSelected(id); }}
              onAdd={() => setPhraseModal('create')}
              onExitFilter={() => setView('library')}
            />
            {current && active && (
              <PracticeView
                key={current.id}
                phrase={current}
                activeRubric={active}
                records={state.records}
                rubricName={rubricName}
                onScore={(phraseId: number, dims: DimensionScores) => lab.submitScore(phraseId, dims)}
                onEdit={() => setPhraseModal(current.id)}
                onDelete={() => {
                  lab.removePhrase(current.id);
                  const rest = state.phrases.filter(p => p.id !== current.id);
                  setSelected(rest[0]?.id);
                }}
              />
            )}
            {(!active) && (
              <section className="practice">
                <div className="empty">没有启用的评分口径，请先在「评分口径」中登记并启用一个口径。</div>
              </section>
            )}
          </div>
        )}
      </main>

      {showRubric && (
        <RubricModal
          state={state}
          onClose={() => setShowRubric(false)}
          onRegister={(name, w) => lab.registerDraft(name, w)}
          onUpdate={(id, name, w) => lab.updateDraft(id, name, w)}
          onDelete={id => lab.deleteDraft(id)}
          onActivate={id => lab.activateDraft(id)}
        />
      )}

      {phraseModal === 'create' ? (
        <PhraseModal
          creating
          onClose={() => setPhraseModal(null)}
          onSubmit={(text, translation) => {
            const r = lab.addPhrase(text, translation);
            if (!r.ok) return r.error;
            setSelected(r.id);
            return null;
          }}
        />
      ) : phraseModal != null ? (
        <PhraseModal
          phrase={state.phrases.find(p => p.id === phraseModal)}
          onClose={() => setPhraseModal(null)}
          onSubmit={(text, translation) => lab.editPhrase(phraseModal, text, translation)}
        />
      ) : null}
    </div>
  );
}
