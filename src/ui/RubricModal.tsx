import { useState } from 'react';
import { Scale, X } from 'lucide-react';
import type { LabState, Rubric, Weights } from '../lab/types';

type Props = {
  state: LabState;
  onClose: () => void;
  onRegister: (name: string, w: Weights) => string | null;
  onUpdate: (id: number, name: string, w: Weights) => string | null;
  onDelete: (id: number) => string | null;
  onActivate: (id: number) => string | null;
};

const statusLabel: Record<Rubric['status'], string> = {
  draft: '草稿',
  active: '启用中',
  archived: '已归档',
};

function WeightField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="weight-field">
      <span>{label}</span>
      <div className="weight-input">
        <input
          type="number" min={0} max={100} step={1}
          value={Number.isFinite(value) ? value : 0}
          onChange={e => onChange(Number(e.target.value))}
        />
        <em>%</em>
      </div>
    </label>
  );
}

/** 评分口径管理：登记草稿（权重和 100、草稿唯一）、启用只影响此后练习 */
export function RubricModal({ state, onClose, onRegister, onUpdate, onDelete, onActivate }: Props) {
  const draft = state.rubrics.find(r => r.status === 'draft');
  const [name, setName] = useState(draft?.name ?? '');
  const [w, setW] = useState<Weights>(draft?.weights ?? { clarity: 40, stress: 30, fluency: 30 });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const total = (w.clarity || 0) + (w.stress || 0) + (w.fluency || 0);
  const masteredCount = state.phrases.filter(p => p.status === 'mastered').length;
  const ordered = [...state.rubrics].sort((a, b) => (b.activatedAt ?? b.createdAt).localeCompare(a.activatedAt ?? a.createdAt));

  const handle = (fn: () => string | null) => {
    const err = fn();
    setError(err);
    setNotice(err ? null : '已保存');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2><Scale size={18} /> 评分口径版本</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="rubric-note">
          启用新口径只影响此后的练习；旧成绩按原口径保存。启用时{masteredCount > 0 ? `，${masteredCount} 句已掌握句子将全部转入待复评` : '暂无已掌握句子'}，需在新口径连续两次达到 85 分才恢复。
        </div>

        <div className="rubric-list">
          {ordered.map(r => (
            <div key={r.id} className={`rubric-row ${r.status}`}>
              <div className="rubric-row-main">
                <strong>{r.name}</strong>
                <span className={`rubric-status ${r.status}`}>{statusLabel[r.status]}</span>
                <small>
                  听清度 {r.weights.clarity}% · 重音 {r.weights.stress}% · 流利度 {r.weights.fluency}%
                </small>
              </div>
              <span className="rubric-date">{r.activatedAt ? `启用 ${r.activatedAt.slice(0, 10)}` : `登记 ${r.createdAt.slice(0, 10)}`}</span>
              {r.status === 'draft' && (
                <button className="danger-link" onClick={() => handle(() => onDelete(r.id))}>删除草稿</button>
              )}
              {r.status === 'draft' && (
                <button className="primary small" onClick={() => onActivate(r.id)}>
                  启用{masteredCount > 0 ? `并转入 ${masteredCount} 句复评` : '此口径'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="draft-editor">
          <h3>{draft ? '编辑草稿（同一时间只允许一个草稿）' : '登记新口径草稿'}</h3>
          <label className="draft-name">
            <span>口径名称</span>
            <input
              value={name}
              disabled={!!draft}
              placeholder="例如：v2 重音强化口径"
              onChange={e => { setName(e.target.value); setNotice(null); }}
            />
          </label>
          <div className="weight-row">
            <WeightField label="听清度" value={w.clarity} onChange={n => { setW(s => ({ ...s, clarity: n })); setNotice(null); }} />
            <WeightField label="重音" value={w.stress} onChange={n => { setW(s => ({ ...s, stress: n })); setNotice(null); }} />
            <WeightField label="流利度" value={w.fluency} onChange={n => { setW(s => ({ ...s, fluency: n })); setNotice(null); }} />
            <div className={total === 100 ? 'weight-sum ok' : 'weight-sum bad'}>
              权重和<b>{total}</b>
              <small>{total === 100 ? '= 100 ✓' : '须为 100'}</small>
            </div>
          </div>
          <div className="modal-actions">
            {error && <span className="form-error">{error}</span>}
            {notice && !error && <span className="form-ok">{notice}</span>}
            <button className="secondary" onClick={onClose}>关闭</button>
            {draft ? (
              <button className="primary" onClick={() => handle(() => onUpdate(draft.id, name, w))}>保存草稿</button>
            ) : (
              <button className="primary" onClick={() => {
                const err = onRegister(name, w);
                setError(err);
                if (!err) { onClose(); }
              }}>登记草稿</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
