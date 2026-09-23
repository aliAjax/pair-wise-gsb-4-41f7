import { Check, ChevronRight, ClipboardList, Mic, Plus } from 'lucide-react';
import type { LabState, Phrase } from '../data/types';

export interface PracticeCallbacks {
  onSelect: (id: number) => void;
  onAdd: () => void;
}

function PhraseIcon({ phrase, inQueue }: { phrase: Phrase; inQueue: boolean }) {
  if (inQueue) return <ClipboardList size={15} />;
  if (phrase.status === 'mastered') return <Check size={15} />;
  return <Mic size={15} />;
}

export default function LibraryView({
  state,
  selectedId,
  filter,
  setFilter,
  query,
  callbacks,
}: {
  state: LabState;
  selectedId: number;
  filter: string;
  setFilter: (f: string) => void;
  query: string;
  callbacks: PracticeCallbacks;
}) {
  const queuedIds = new Set(state.queue.map(q => q.phraseId));
  const tags = ['全部', '待练', '待复评', ...Array.from(new Set(state.phrases.map(p => p.tag)))];
  const filtered = state.phrases.filter(p => {
    if (filter === '待练' && p.status === 'mastered') return false;
    if (filter === '待复评' && !queuedIds.has(p.id)) return false;
    if (filter !== '全部' && filter !== '待练' && filter !== '待复评' && p.tag !== filter) return false;
    return p.text.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <section className="library">
      <div className="section-head">
        <div><h2>句子库</h2><p>选择一句开始你的声音训练</p></div>
        <button className="ghost" onClick={callbacks.onAdd}><Plus size={14} /> 添加句子</button>
      </div>
      <div className="filters">{tags.map(t => (
        <button key={t} className={filter === t ? 'chip active' : 'chip'} onClick={() => setFilter(t)}>
          {t === '待复评' && queuedIds.size > 0 ? `待复评 ${queuedIds.size}` : t}
        </button>
      ))}</div>
      <div className="phrase-list">
        {filtered.map(p => {
          const inQueue = queuedIds.has(p.id);
          return (
            <button key={p.id} onClick={() => callbacks.onSelect(p.id)} className={p.id === selectedId ? 'phrase selected' : 'phrase'}>
              <div className={`phrase-icon ${inQueue ? 'revisit' : ''}`}><PhraseIcon phrase={p} inQueue={inQueue} /></div>
              <div className="phrase-copy">
                <strong>{p.text}</strong>
                <span>{p.translation}</span>
                <div className="phrase-meta">
                  <i>{p.tag}</i><i>{p.level}</i>{p.version > 1 && <i className="ver">v{p.version}</i>}
                  {p.attempts > 0 && <small>{p.attempts} 次练习</small>}
                  {inQueue && <small className="revisit-text">待复评</small>}
                </div>
              </div>
              <ChevronRight size={17} />
            </button>
          );
        })}
        {filtered.length === 0 && <div className="empty">没有找到匹配句子</div>}
      </div>
    </section>
  );
}
