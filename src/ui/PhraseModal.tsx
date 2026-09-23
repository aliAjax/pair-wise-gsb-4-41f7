import { useState } from 'react';
import { X } from 'lucide-react';
import type { Phrase } from '../lab/types';
import { currentVersion } from '../lab/rules';

type Props = {
  phrase?: Phrase;
  creating?: boolean;
  onClose: () => void;
  onSubmit: (text: string, translation: string) => string | null;
};

/** 添加 / 修改句子；修改复评中的句子会提示“生成新版本并重新计数” */
export function PhraseModal({ phrase, creating, onClose, onSubmit }: Props) {
  const cur = phrase ? currentVersion(phrase) : undefined;
  const [text, setText] = useState(cur?.text ?? '');
  const [translation, setTranslation] = useState(cur && cur.translation !== '待补充译文' ? cur.translation : '');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{creating ? '添加练习句子' : `修改句子（将生成 v${(cur?.version ?? 1) + 1}）`}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {phrase?.status === 'review' && (
          <div className="rubric-note warn">
            该句正在待复评：保存后生成新版本，复评进度清零，需要在当前口径下对新版本连续两次达到 85 分。旧版本成绩保留。
          </div>
        )}
        <label>英文句子
          <textarea
            autoFocus value={text}
            onChange={e => { setText(e.target.value); setError(null); }}
            placeholder="例如：I can make this happen."
          />
        </label>
        <label className="translate-field">中文译文
          <input
            value={translation}
            onChange={e => setTranslation(e.target.value)}
            placeholder="可选，留空记为待补充译文"
          />
        </label>
        <div className="modal-actions">
          {error && <span className="form-error">{error}</span>}
          <button className="secondary" onClick={onClose}>取消</button>
          <button className="primary" onClick={() => {
            const err = onSubmit(text, translation);
            if (err) setError(err);
            else onClose();
          }}>{creating ? '加入句子库' : '生成新版本并保存'}</button>
        </div>
      </div>
    </div>
  );
}
