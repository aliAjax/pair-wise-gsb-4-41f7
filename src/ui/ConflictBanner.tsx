import { AlertTriangle, X } from 'lucide-react';
import type { Conflict, Phrase, Rubric } from '../lab/types';

type Props = {
  conflicts: Conflict[];
  phrases: Phrase[];
  rubrics: Rubric[];
  onDismiss: () => void;
};

/** 重开一致性检查不通过时，逐条列出：句子、分值、违反的规则 */
export function ConflictBanner({ conflicts, phrases, rubrics, onDismiss }: Props) {
  if (conflicts.length === 0) return null;
  const phraseText = (id?: number) => {
    if (id == null) return '—';
    const p = phrases.find(x => x.id === id);
    if (!p) return `句子 #${id}（已不存在）`;
    const cur = p.versions.reduce((a, v) => (v.version > a.version ? v : a), p.versions[0]);
    return cur.text;
  };
  const rubricName = (id?: number) =>
    id == null ? '—' : rubrics.find(r => r.id === id)?.name ?? `口径 #${id}`;
  return (
    <div className="conflict-banner">
      <div className="conflict-head">
        <span><AlertTriangle size={15} /> 检测到 {conflicts.length} 处数据不一致（记录 × 口径版本 × 待复评队列）</span>
        <button className="icon-btn" onClick={onDismiss} title="暂时关闭"><X size={16} /></button>
      </div>
      <table className="conflict-table">
        <thead>
          <tr><th>句子</th><th>口径</th><th>分值</th><th>规则</th></tr>
        </thead>
        <tbody>
          {conflicts.map((c, i) => (
            <tr key={i}>
              <td title={phraseText(c.phraseId)}>{phraseText(c.phraseId)}</td>
              <td>{rubricName(c.rubricId)}</td>
              <td>{c.score != null ? `${c.score}` : '—'}</td>
              <td>{c.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
