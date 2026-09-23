import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Mic, Plus, RotateCcw, Search } from 'lucide-react';
import type { Phrase } from '../lab/types';
import { currentVersion } from '../lab/rules';

export type ListFilter = '全部' | '待练' | '已掌握' | '待复评';

type Props = {
  phrases: Phrase[];
  selectedId: number;
  forcedFilter?: ListFilter;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onExitFilter?: () => void;
};

const statusChip: Partial<Record<Phrase['status'], string>> = {
  mastered: '已掌握',
  review: '待复评',
};

const headings: Record<ListFilter, string> = {
  '全部': '句子库',
  '待练': '待练句子',
  '已掌握': '已掌握句子',
  '待复评': '待复评队列',
};

export function LibraryView({ phrases, selectedId, forcedFilter, onSelect, onAdd, onExitFilter }: Props) {
  const [filter, setFilter] = useState<ListFilter>('全部');
  const [tag, setTag] = useState<string>('全部');
  const [query, setQuery] = useState('');
  const effective = forcedFilter ?? filter;
  const tags = useMemo(() => Array.from(new Set(phrases.map(p => p.tag))), [phrases]);

  const filtered = phrases.filter(p => {
    if (effective === '待练' && (p.status === 'mastered' || p.status === 'review')) return false;
    if (effective === '已掌握' && p.status !== 'mastered') return false;
    if (effective === '待复评' && p.status !== 'review') return false;
    if (tag !== '全部' && p.tag !== tag) return false;
    const cur = currentVersion(p);
    return cur.text.toLowerCase().includes(query.toLowerCase()) || cur.translation.includes(query);
  });

  const chips: ListFilter[] = ['全部', '待练', '待复评', '已掌握'];

  return (
    <section className="library">
      <div className="section-head">
        <div>
          {forcedFilter ? (
            <button className="back-link" onClick={onExitFilter}><ChevronLeft size={14} /> {headings[forcedFilter]}</button>
          ) : (
            <>
              <h2>句子库</h2>
              <p>选择一句开始你的声音训练</p>
            </>
          )}
        </div>
        <button className="primary small" onClick={onAdd}><Plus size={15} /> 添加句子</button>
      </div>
      <div className="search inline">
        <Search size={15} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索句子 / 译文" />
      </div>
      {!forcedFilter && (
        <div className="filters">
          {chips.map(c => (
            <button key={c} className={effective === c ? 'chip active' : 'chip'} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      )}
      <div className="filters tags">
        <button className={tag === '全部' ? 'chip active' : 'chip'} onClick={() => setTag('全部')}>全部分类</button>
        {tags.map(t => (
          <button key={t} className={tag === t ? 'chip active' : 'chip'} onClick={() => setTag(t)}>{t}</button>
        ))}
      </div>
      {forcedFilter === '待复评' && (
        <p className="queue-hint">须在当前启用口径下，对当前版本连续两次达到 85 分，句子才恢复为已掌握；修改句子会先生成新版本。</p>
      )}
      <div className="phrase-list">
        {filtered.map(p => {
          const cur = currentVersion(p);
          return (
            <button key={p.id} onClick={() => onSelect(p.id)}
              className={p.id === selectedId ? 'phrase selected' : 'phrase'}>
              <div className={`phrase-icon ${p.status}`}>
                {p.status === 'mastered' ? <Check size={15} /> : p.status === 'review' ? <RotateCcw size={14} /> : <Mic size={15} />}
              </div>
              <div className="phrase-copy">
                <strong>{cur.text}{cur.version > 1 && <i className="version-tag">v{cur.version}</i>}</strong>
                <span>{cur.translation}</span>
                <div className="phrase-meta">
                  <i>{p.tag}</i><i>{p.level}</i>
                  {statusChip[p.status] && <i className={`status-tag ${p.status}`}>{statusChip[p.status]}</i>}
                  {p.status === 'review' && <small>连续达标 {p.qualifying ?? 0}/2</small>}
                  {p.attempts > 0 && <small>{p.attempts} 次练习</small>}
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
