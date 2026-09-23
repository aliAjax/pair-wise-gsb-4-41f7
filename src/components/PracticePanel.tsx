import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardList, Mic, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { LabState, Phrase, RubricVersion, ScoreRecord } from '../data/types';
import { PASS_SCORE, PASS_TIMES } from '../data/constants';

const bars = Array.from({ length: 68 }, (_, i) => 18 + ((i * 29) % 44));

interface LastResult {
  record: ScoreRecord;
  streak: number;
  revived: boolean;
  mastered: boolean;
}

function RevisitPill({ queue, rubric }: { queue: { streak: number } | undefined; rubric: RubricVersion }) {
  if (!queue) return null;
  const remain = PASS_TIMES - queue.streak;
  return (
    <div className="revisit-pill">
      <ClipboardList size={13} />
      <span>待复评 · {rubric.name} · 已连续达标 {queue.streak}/{PASS_TIMES} 次</span>
      {remain > 0 && <small>再连续 {remain} 次 ≥{PASS_SCORE} 分即恢复</small>}
    </div>
  );
}

export default function PracticePanel({
  state,
  phrase,
  onScore,
  onDelete,
  onEdit,
}: {
  state: LabState;
  phrase: Phrase;
  onScore: (phraseId: number, seed: number) => LastResult | null;
  onDelete: (phraseId: number) => void;
  onEdit: (phrase: Phrase) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<LastResult | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // 切换句子：重置录音/评分的本地展示状态
  useEffect(() => {
    setRecording(false);
    setPlaying(false);
    setRecorded(false);
    setSeconds(0);
    setResult(null);
    window.clearInterval(timer.current);
  }, [phrase.id, phrase.version]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const rubric = state.rubrics.find(r => r.id === state.currentRubricId) ?? state.rubrics[0];
  const queue = state.queue.find(q => q.phraseId === phrase.id);
  const lastRecords = state.records.filter(r => r.phraseId === phrase.id).slice(-3).reverse();

  const toggleRecord = () => {
    if (recording) {
      setRecording(false);
      window.clearInterval(timer.current);
      setRecorded(true);
      // 模拟评测：以结束时刻为种子，出分后按当前口径判定
      const r = onScore(phrase.id, Date.now());
      if (r) setResult(r);
      return;
    }
    setResult(null);
    setSeconds(0);
    setRecording(true);
    timer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };

  return (
    <section className="practice">
      <div className="practice-head">
        <div>
          <span className="label">CURRENT PHRASE{phrase.version > 1 ? ` · 句子 v${phrase.version}` : ''}</span>
          <h2>跟着感觉读</h2>
        </div>
        <div className="head-actions">
          <button className="text-btn" onClick={() => onEdit(phrase)}>修改句子（生成新版本）</button>
          <button className="icon-btn" onClick={() => onDelete(phrase.id)} title="删除句子"><Trash2 size={17} /></button>
        </div>
      </div>

      <div className="focus-card">
        <div className="focus-meta">
          <span className="focus-tag">{phrase.tag} · {phrase.level}</span>
          <span className="rubric-chip">{rubric.id} · {rubric.name}（听清度 {rubric.clarity} / 重音 {rubric.stress}）</span>
        </div>
        <p className="focus-text">{phrase.text}</p>
        <p className="focus-translation">{phrase.translation}</p>
        <div className="audio-sample">
          <button className="round-btn" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <div className="sample-wave">{bars.map((h, i) => <i key={i} style={{ height: `${h * (playing ? 1.15 : 0.72)}%` }} />)}</div>
          <span>0:08</span>
        </div>
      </div>

      <RevisitPill queue={queue} rubric={rubric} />

      <div className="record-card">
        <div className="record-top">
          <div>
            <span className="label">YOUR RECORDING</span>
            <h3>{recording ? '正在录音…' : recorded ? '录音已保存，本次按「' + rubric.name + '」评分' : '准备好后开始录音'}</h3>
          </div>
          <span className="record-time">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
        </div>
        <div className="record-wave">{bars.slice(5, 58).map((h, i) => (
          <i key={i} className={recording ? 'live' : ''} style={{ height: `${h * (recording ? (0.4 + ((i % 5) / 7)) : 0.4)}%` }} />
        ))}</div>
        <div className="record-actions">
          <button className={recording ? 'record-button recording' : 'record-button'} onClick={toggleRecord}>
            <span>{recording ? <Pause size={16} /> : <Mic size={16} />}</span>
            {recording ? '结束录音并评分' : recorded ? '重新录音' : '开始录音'}
          </button>
          {recorded && <button className="secondary" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15} /> : <Play size={15} />} 回放</button>}
        </div>
      </div>

      {result && (
        <div className={`score-card ${result.record.total >= PASS_SCORE ? 'pass' : 'fail'}`}>
          <div className="score-total">
            <strong>{result.record.total}</strong><span>分 · {rubric.name}</span>
            <em className={result.record.total >= PASS_SCORE ? 'green' : 'red'}>{result.record.total >= PASS_SCORE ? `达标（≥${PASS_SCORE}）` : `未达 ${PASS_SCORE}，连击中断`}</em>
          </div>
          <div className="score-bars">
            <div className="score-line"><span>听清度（权重 {rubric.clarity}）</span><div className="meter"><i style={{ width: `${result.record.clarity}%` }} /></div><b>{result.record.clarity}</b></div>
            <div className="score-line"><span>重音（权重 {rubric.stress}）</span><div className="meter"><i style={{ width: `${result.record.stress}%` }} /></div><b>{result.record.stress}</b></div>
          </div>
          <p className="score-note">
            {result.revived
              ? <><Check size={14} /> 已在「{rubric.name}」下连续 {PASS_TIMES} 次达标，恢复已掌握，退出待复评队列。</>
              : result.mastered
                ? <><Check size={14} /> 连续 {PASS_TIMES} 次达标，新达成已掌握（授掌口径：{rubric.name}）。</>
                : queue
                  ? <>复评连续达标 {result.streak}/{PASS_TIMES} 次；成绩按当前口径保存，句子版本或口径变化后连击重新计算。</>
                  : <>当前口径连续达标 {result.streak}/{PASS_TIMES} 次。</>}
          </p>
        </div>
      )}

      {lastRecords.length > 0 && (
        <div className="recent-scores">
          <span className="label">RECENT</span>
          {lastRecords.map(r => {
            const rb = state.rubrics.find(x => x.id === r.rubricId);
            return (
              <div key={r.id} className="recent-row">
                <b className={r.total >= PASS_SCORE ? 'green' : 'red'}>{r.total}</b>
                <span>{rb ? `${rb.id} · ${rb.name}` : r.rubricId}</span>
                {r.phraseVersion !== phrase.version && <i className="old-tag">旧版本 v{r.phraseVersion}</i>}
                {r.rubricId !== state.currentRubricId && <i className="old-tag">旧口径成绩</i>}
              </div>
            );
          })}
        </div>
      )}

      <div className="tip"><span>练习小贴士</span><p>放慢速度，先把每个音节读清楚，再自然地连起来。</p><RotateCcw size={15} /></div>
    </section>
  );
}
