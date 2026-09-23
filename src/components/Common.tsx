import type { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ConflictRow } from '../data/types';

export function Modal({ title, onClose, children, width = 460 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: `min(${width}px, 100%)` }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 重开后的一致性冲突：列出句子、分值与违反的规则 */
export function ConflictBanner({ conflicts, onDismiss }: { conflicts: ConflictRow[]; onDismiss: () => void }) {
  if (conflicts.length === 0) return null;
  return (
    <div className="conflict-banner">
      <div className="conflict-head">
        <div className="conflict-title"><AlertTriangle size={16} /><strong>检测到 {conflicts.length} 处记录与口径不一致</strong></div>
        <button className="icon-btn" onClick={onDismiss} aria-label="收起"><X size={16} /></button>
      </div>
      <p className="conflict-sub">以下冲突在本次打开时检出，系统未改动任何旧成绩；请按“句子 / 分值 / 规则”核对：</p>
      <div className="conflict-table">
        {conflicts.map(c => (
          <div className="conflict-row" key={c.key}>
            <div className="conflict-cell phrase">{c.phrase ?? '—'}</div>
            <div className="conflict-cell score">{c.score ?? '—'}</div>
            <div className="conflict-cell rule"><b>{c.rule}</b><span>{c.detail}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
