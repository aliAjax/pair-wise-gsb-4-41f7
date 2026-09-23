import { useEffect, useRef, useState } from 'react';
import { Check, Mic, Pause, Play, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { DimensionScores, Phrase, PracticeRecord, Rubric } from '../lab/types';
import { currentVersion, scoreTotal } from '../lab/rules';
import { PASS_SCORE } from '../lab/types';
import { bars, fmtDate } from './format';

type Props = {
  phrase: Phrase;
  activeRubric: Rubric;
  records: PracticeRecord[];
  rubricName: (id: number) => string;
  onScore: (phraseId: number, dims: DimensionScores) => string | null;
  onEdit: () => void;
  onDelete: () => void;
};

const dimLabels = [
  ['clarity', '听清度'],
  ['stress', '重音'],
  ['fluency', '流利度'],
] as const;

export function PracticeView({ phrase, activeRubric, records, rubricName, onScore, onEdit, onDelete }: Props) {
  const cur = currentVersion(phrase);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dims, setDims] = useState<DimensionScores>({ clarity: 80, stress: 80, fluency: 80 });
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const mine = records
    .filter(r => r.phraseId === phrase.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const liveTotal = scoreTotal(activeRubric.weights, dims);

  const stopRecord = () => {
    setRecording(false);
    window.clearInterval(timer.current);
    setRecorded(true);
  };
  const toggleRecord = () => {
    if (recording) { stopRecord(); return; }
    setSeconds(0);
    setError(null);
    setRecording(true);
    timer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const submit = () => {
    const err = onScore(phrase.id, dims);
    if (err) { setError(err); return; }
    setError(null);
    setRecorded(false);
    setDims({ clarity: 80, stress: 80, fluency: 80 });
  };

  return (
    <section className="practice">
      <div className="practice-head">
        <div>
          <span className="label">CURRENT PHRASE · v{cur.version}</span>
          <h2>跟着感觉读</h2>
        </div>
        <div className="head-btns">
          <button className="icon-btn" onClick={onEdit} title="修改句子（生成新版本）"><Pencil size={16} /></button>
          <button className="icon-btn" onClick={onDelete} title="删除句子"><Trash2 size={17} /></button>
        </div>
      </div>

      {phrase.status === 'review' && (
        <div className="review-banner">
          <RotateCcw size={14} />
          待复评 · 当前口径「{activeRubric.name}」下连续达标 {phrase.qualifying ?? 0}/2 次
          （每次 ≥ {PASS_SCORE} 分；已在 v{phrase.reviewVersion ?? cur.version} 上累计）
        </div>
      )}
      {phrase.status === 'mastered' && (
        <div className="mastered-banner"><Check size={14} /> 已掌握</div>
      )}

      <div className="focus-card">
        <div className="focus-tag">{phrase.tag} · {phrase.level}</div>
        <p className="focus-text">{cur.text}</p>
        <p className="focus-translation">{cur.translation}</p>
        <div className="audio-sample">
          <button className="round-btn" onClick={() => setPlaying(p => !p)}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <div className="sample-wave">
            {bars.map((h, i) => <i key={i} style={{ height: `${h * (playing ? 1.15 : 0.72)}%` }} />)}
          </div>
          <span>0:08</span>
        </div>
      </div>

      <div className="record-card">
        <div className="record-top">
          <div>
            <span className="label">YOUR RECORDING · 按「{activeRubric.name}」评分</span>
            <h3>{recording ? '正在录音…' : recorded ? '录音已保存，按维度打分后提交' : '准备好后开始录音'}</h3>
          </div>
          <span className="record-time">
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="record-wave">
          {bars.slice(5, 58).map((h, i) => (
            <i key={i} className={recording ? 'live' : ''}
              style={{ height: `${h * (recording ? (0.4 + ((i % 5) / 7)) : 0.4)}%` }} />
          ))}
        </div>
        <div className="record-actions">
          <button className={recording ? 'record-button recording' : 'record-button'} onClick={toggleRecord}>
            <span>{recording ? <Pause size={16} /> : <Mic size={16} />}</span>
            {recording ? '结束录音' : recorded ? '重新录音' : '开始录音'}
          </button>
          {recorded && <button className="secondary" onClick={() => setPlaying(p => !p)}>
            {playing ? <Pause size={15} /> : <Play size={15} />} 回放
          </button>}
        </div>

        {recorded && (
          <div className="score-entry">
            <div className="score-dims">
              {dimLabels.map(([key, label]) => (
                <label key={key} className="score-dim">
                  <span>{label}<small>权重 {activeRubric.weights[key]}%</small></span>
                  <input
                    type="range" min={0} max={100} step={1} value={dims[key]}
                    onChange={e => setDims(d => ({ ...d, [key]: Number(e.target.value) }))}
                  />
                  <b>{dims[key]}</b>
                </label>
              ))}
            </div>
            <div className={`score-total ${liveTotal >= PASS_SCORE ? 'pass' : 'fail'}`}>
              <small>加权总分（{activeRubric.name}）</small>
              <strong>{liveTotal}</strong>
              <em>{liveTotal >= PASS_SCORE ? `达到 ${PASS_SCORE} 分线` : `未达 ${PASS_SCORE} 分线`}</em>
            </div>
            <div className="score-submit">
              {error && <span className="form-error">{error}</span>}
              <button className="primary" onClick={submit}>提交本次成绩</button>
            </div>
          </div>
        )}
      </div>

      <div className="score-history">
        <div className="tip"><span>本句成绩</span><p>旧成绩始终按当时口径保存；仅当前口径、当前版本的连续达标计入复评。</p></div>
        {mine.length === 0 && <div className="empty">还没有练习记录</div>}
        {mine.map(r => (
          <div key={r.id} className={`history-row ${r.total >= PASS_SCORE ? 'pass' : ''}`}>
            <strong>{r.total}</strong>
            <span className="hist-dims">听清 {r.dims.clarity} · 重音 {r.dims.stress} · 流利 {r.dims.fluency}</span>
            <span className="hist-rubric">
              v{r.version} · {rubricName(r.rubricId)}
              {r.rubricId !== activeRubric.id && <i className="archived-tag">旧口径</i>}
            </span>
            <small>{fmtDate(r.at)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
