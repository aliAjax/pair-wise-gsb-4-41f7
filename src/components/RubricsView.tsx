import { useState } from 'react';
import { CheckCircle2, CircleDashed, FilePlus2, History, PlayCircle } from 'lucide-react';
import type { LabState, RubricDraft } from '../data/types';
import type { ActivationImpact } from '../domain/rubric';
import { validateDraft } from '../domain/rubric';
import { PASS_SCORE, PASS_TIMES } from '../data/constants';
import { formatTime } from '../lib/format';
import { Modal } from './Common';

interface DraftForm {
  name: string;
  clarity: number;
  stress: number;
}

function emptyForm(): DraftForm {
  return { name: '', clarity: 50, stress: 50 };
}

export default function RubricsView({
  state,
  onRegister,
  onDiscardDraft,
  onPreviewActivation,
  onConfirmActivation,
}: {
  state: LabState;
  onRegister: (draft: RubricDraft) => string | null;
  onDiscardDraft: () => void;
  onPreviewActivation: () => ActivationImpact;
  onConfirmActivation: () => void;
}) {
  const [form, setForm] = useState<DraftForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [impact, setImpact] = useState<ActivationImpact | null>(null);

  const sum = form.clarity + form.stress;
  const current = state.rubrics.find(r => r.id === state.currentRubricId) ?? state.rubrics[0];

  const submit = () => {
    const error = validateDraft(form);
    if (error) { setFormError(error); return; }
    const err = onRegister({ ...form, createdAt: new Date().toISOString() });
    if (err) { setFormError(err); return; }
    setFormError(null);
    setForm(emptyForm());
  };

  const openConfirm = () => {
    setImpact(onPreviewActivation());
    setConfirming(true);
  };

  return (
    <div className="page-wide rubrics-page">
      <section className="card-block">
        <div className="section-head">
          <div><h2>当前评分口径</h2><p>启用新口径只影响此后的练习；旧成绩仍按原口径保存</p></div>
        </div>
        <div className="current-rubric">
          <div className="cr-id">{current.id}</div>
          <div className="cr-body">
            <strong>{current.name}</strong>
            <span>启用时间 {formatTime(current.activatedAt)}</span>
            <div className="weight-row">
              <div className="weight-pill clarity"><i style={{ width: `${current.clarity}%` }} /><b>听清度 {current.clarity}</b></div>
              <div className="weight-pill stress"><i style={{ width: `${current.stress}%` }} /><b>重音 {current.stress}</b></div>
            </div>
          </div>
          <span className="status-tag active">使用中</span>
        </div>
        <p className="rule-hint">复评规则：已掌握句子在口径启用时转入待复评队列，须在当前口径连续 {PASS_TIMES} 次达到 {PASS_SCORE} 分才恢复；期间修改句子先生成新版本并重新计数。</p>
      </section>

      {state.draft ? (
        <section className="card-block draft-card">
          <div className="section-head">
            <div><h2><CircleDashed size={16} className="inline-ico" />草稿口径（未启用）</h2><p>同一时间只允许一份草稿；启用前不影响任何练习与成绩</p></div>
          </div>
          <div className="current-rubric draft">
            <div className="cr-id">草稿</div>
            <div className="cr-body">
              <strong>{state.draft.name}</strong>
              <span>登记时间 {formatTime(state.draft.createdAt)}</span>
              <div className="weight-row">
                <div className="weight-pill clarity"><i style={{ width: `${state.draft.clarity}%` }} /><b>听清度 {state.draft.clarity}</b></div>
                <div className="weight-pill stress"><i style={{ width: `${state.draft.stress}%` }} /><b>重音 {state.draft.stress}</b></div>
              </div>
            </div>
            <span className="status-tag draft">待启用</span>
          </div>
          <div className="draft-actions">
            <button className="primary" onClick={openConfirm}><PlayCircle size={16} />启用此口径</button>
            <button className="secondary" onClick={onDiscardDraft}>放弃草稿</button>
          </div>
        </section>
      ) : (
        <section className="card-block">
          <div className="section-head">
            <div><h2><FilePlus2 size={16} className="inline-ico" />登记新口径草稿</h2><p>填写登记名称、听清度与重音权重；权重和须为 100</p></div>
          </div>
          <div className="draft-form">
            <label>口径登记名称
              <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(null); }} placeholder="例如：重音强化口径" maxLength={20} />
            </label>
            <label>听清度权重（0-100）
              <input type="number" min={0} max={100} value={form.clarity}
                onChange={e => setForm(f => ({ ...f, clarity: Number(e.target.value) }))} />
              <input className="range" type="range" min={0} max={100} step={1} value={form.clarity}
                onChange={e => setForm(f => ({ ...f, clarity: Number(e.target.value), stress: 100 - Number(e.target.value) }))} />
            </label>
            <label>重音权重（0-100）
              <input type="number" min={0} max={100} value={form.stress}
                onChange={e => setForm(f => ({ ...f, stress: Number(e.target.value) }))} />
              <input className="range" type="range" min={0} max={100} step={1} value={form.stress}
                onChange={e => setForm(f => ({ ...f, stress: Number(e.target.value), clarity: 100 - Number(e.target.value) }))} />
            </label>
            <div className={`weight-sum ${sum === 100 ? 'ok' : 'bad'}`}>权重和：{sum} / 100 {sum === 100 && <CheckCircle2 size={14} />}</div>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <div className="draft-actions">
            <button className="primary" onClick={submit}>登记为草稿</button>
          </div>
        </section>
      )}

      <section className="card-block">
        <div className="section-head">
          <div><h2><History size={16} className="inline-ico" />口径版本履历</h2><p>停用版本保留登记，旧成绩仍可溯源</p></div>
        </div>
        <div className="rubric-timeline">
          {[...state.rubrics].reverse().map(r => (
            <div key={r.id} className={`timeline-row ${r.status}`}>
              <div className="tl-id">{r.id}</div>
              <div className="tl-body">
                <strong>{r.name}</strong>
                <span>听清度 {r.clarity} · 重音 {r.stress} · 启用 {formatTime(r.activatedAt)}{r.retiredAt ? ` · 停用 ${formatTime(r.retiredAt)}` : ''}</span>
              </div>
              {r.status === 'active'
                ? <span className="status-tag active">使用中</span>
                : <span className="status-tag retired">已停用</span>}
            </div>
          ))}
        </div>
      </section>

      {confirming && state.draft && impact && (
        <Modal title="启用新评分口径？" onClose={() => setConfirming(false)}>
          <div className="confirm-body">
            <p>即将启用草稿口径 <b>「{state.draft.name}」</b>（听清度 {state.draft.clarity} / 重音 {state.draft.stress}），旧口径「{current.name}」将停用。</p>
            <ul>
              <li>仅影响此后的练习评分；已有 {state.records.length} 条旧成绩不变，仍按原口径保存。</li>
              <li>{impact.masteredToRevisit} 句已掌握句子将转入待复评。</li>
              <li>{impact.resetInQueue} 句已在复评队列的进度清零，全部按新口径重新计数。</li>
              <li>恢复条件：新口径下连续 {PASS_TIMES} 次 ≥ {PASS_SCORE} 分。</li>
            </ul>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setConfirming(false)}>再想想</button>
              <button className="primary danger" onClick={() => { onConfirmActivation(); setConfirming(false); }}>确认启用</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
