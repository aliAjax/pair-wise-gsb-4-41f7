import { useState } from 'react';
import { Search } from 'lucide-react';
import type { LabState } from '../lab/types';
import { currentVersion } from '../lab/rules';
import { PASS_SCORE } from '../lab/types';
import { fmtDate } from './format';

type Props = {
  state: LabState;
  onSelectPhrase: (id: number) => void;
};

/** 练习记录：每条成绩同时标注句子版本与口径版本，旧成绩永不改写 */
export function RecordsView({ state, onSelectPhrase }: Props) {
  const [query, setQuery] = useState('');
  const [onlyCurrent, setOnlyCurrent] = useState(false);
  const active = state.rubrics.find(r => r.status === 'active');
  const rubricName = (id: number) => state.rubrics.find(r => r.id === id)?.name ?? `口径 #${id}`;
  const phraseOf = (id: number) => state.phrases.find(p => p.id === id);

  const rows = state.records
    .filter(r => {
      const p = phraseOf(r.phraseId);
      if (!p) return false;
      if (onlyCurrent && r.rubricId !== active?.id) return false;
      const text = currentVersion(p).text.toLowerCase();
      return text.includes(query.toLowerCase());
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="records-view">
      <div className="section-head">
        <div>
          <h2>练习记录</h2>
          <p>共 {state.records.length} 条成绩，均按提交时的口径与句子版本保存</p>
        </div>
      </div>
      <div className="records-toolbar">
        <div className="search inline">
          <Search size={15} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索句子" />
        </div>
        <label className="toggle-check">
          <input type="checkbox" checked={onlyCurrent} onChange={e => setOnlyCurrent(e.target.checked)} />
          只看当前口径「{active?.name ?? '—'}」
        </label>
      </div>
      <div className="records-table-wrap">
        <table className="records-table">
          <thead>
            <tr><th>句子</th><th>版本</th><th>口径</th><th>听清</th><th>重音</th><th>流利</th><th>总分</th><th>时间</th></tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const p = phraseOf(r.phraseId)!;
              const isCurrent = r.rubricId === active?.id;
              return (
                <tr key={r.id} onClick={() => onSelectPhrase(r.phraseId)} className="record-row">
                  <td className="rec-text" title={currentVersion(p).text}>
                    {p.versions.find(v => v.version === r.version)?.text ?? currentVersion(p).text}
                  </td>
                  <td>v{r.version}</td>
                  <td>
                    {rubricName(r.rubricId)}
                    {!isCurrent && <i className="archived-tag">旧</i>}
                  </td>
                  <td>{r.dims.clarity}</td>
                  <td>{r.dims.stress}</td>
                  <td>{r.dims.fluency}</td>
                  <td><b className={r.total >= PASS_SCORE ? 'score-pass' : ''}>{r.total}</b></td>
                  <td className="rec-date">{fmtDate(r.at)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="empty">没有匹配的练习记录</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
