import { ClipboardList, History } from 'lucide-react';
import type { LabState } from '../data/types';
import { PASS_SCORE, PASS_TIMES } from '../data/constants';
import { formatTime } from '../lib/format';

export default function RecordsView({ state, onSelect }: { state: LabState; onSelect: (id: number) => void }) {
  const records = [...state.records].reverse();
  const phraseById = (id: number) => state.phrases.find(p => p.id === id);
  const rubricById = (id: string) => state.rubrics.find(r => r.id === id);

  return (
    <div className="page-wide">
      <section className="card-block">
        <div className="section-head">
          <div><h2>待复评队列</h2><p>已掌握句子需在当前口径连续 {PASS_TIMES} 次达到 {PASS_SCORE} 分才恢复</p></div>
          <span className="count-pill">{state.queue.length} 句</span>
        </div>
        {state.queue.length === 0 && <div className="empty">队列为空，没有等待复评的句子</div>}
        {state.queue.length > 0 && (
          <div className="queue-list">
            {state.queue.map(q => {
              const p = phraseById(q.phraseId);
              const rubric = rubricById(q.rubricId);
              const latest = [...state.records].reverse().find(r => r.phraseId === q.phraseId);
              return (
                <button key={q.phraseId} className="queue-row" onClick={() => p && onSelect(p.id)}>
                  <div className="queue-icon"><ClipboardList size={15} /></div>
                  <div className="queue-copy">
                    <strong>{p ? p.text : `句子 #${q.phraseId}（已删除）`}</strong>
                    <span>
                      按 {rubric ? `${rubric.id} · ${rubric.name}` : q.rubricId} 复评 · 句子 v{q.phraseVersion}
                      {p && p.version !== q.phraseVersion && <i className="old-tag"> 当前 v{p.version}，需重算</i>}
                    </span>
                  </div>
                  <div className="queue-streak">
                    <div className="dots">{Array.from({ length: PASS_TIMES }, (_, i) => <i key={i} className={i < q.streak ? 'on' : ''} />)}</div>
                    <small>连续 {q.streak}/{PASS_TIMES} 次 ≥{PASS_SCORE}</small>
                  </div>
                  <div className="queue-score">
                    <strong className={latest && latest.total >= PASS_SCORE ? 'green' : 'red'}>{latest ? latest.total : '—'}</strong>
                    <small>最近成绩</small>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-block">
        <div className="section-head">
          <div><h2><History size={17} className="inline-ico" />练习记录</h2><p>每条成绩永久挂靠当时的口径版本与句子版本</p></div>
          <span className="count-pill">{records.length} 条</span>
        </div>
        {records.length === 0 && <div className="empty">还没有练习成绩，去录一次音吧</div>}
        {records.length > 0 && (
          <div className="record-table">
            <div className="record-table-head"><div>句子</div><div>口径版本</div><div>听清度</div><div>重音</div><div>总分</div><div>时间</div></div>
            {records.map(r => {
              const p = phraseById(r.phraseId);
              const rubric = rubricById(r.rubricId);
              const outdated = r.rubricId !== state.currentRubricId;
              return (
                <div key={r.id} className="record-table-row">
                  <div className="rt-phrase">
                    <b>{p ? p.text : `#${r.phraseId}`}</b>
                    <span>句子 v{r.phraseVersion}{p && p.version !== r.phraseVersion && '（已改版）'}</span>
                  </div>
                  <div><span className="ver-tag">{r.rubricId}</span><span className="rubric-name">{rubric?.name ?? '未知口径'}{rubric?.status === 'retired' && '（已停用）'}</span></div>
                  <div>{r.clarity}</div>
                  <div>{r.stress}</div>
                  <div><b className={r.total >= PASS_SCORE ? 'green' : 'red'}>{r.total}</b>{r.total >= PASS_SCORE && <small>达标</small>}</div>
                  <div className="rt-time">{formatTime(r.at)}{outdated && <i className="old-tag">按原口径保存</i>}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
