import { useEffect, useState } from 'react';
import type { Level, Phrase } from '../data/types';
import type { PhraseEdit as PhraseEditData } from '../domain/scoring';
import { Modal } from './Common';

const levels: Level[] = ['入门', '进阶', '挑战'];

interface FormState {
  text: string;
  translation: string;
  tag: string;
  level: Level;
}

export default function PhraseModal({
  phrase,
  onClose,
  onSubmit,
}: {
  phrase: Phrase | null; // null = 新增
  onClose: () => void;
  onSubmit: (edit: PhraseEditData) => void;
}) {
  const [form, setForm] = useState<FormState>({
    text: phrase?.text ?? '',
    translation: phrase?.translation === '待补充译文' ? '' : phrase?.translation ?? '',
    tag: phrase?.tag && phrase.tag !== '自定义' ? phrase.tag : '',
    level: phrase?.level ?? '入门',
  });

  useEffect(() => {
    setForm({
      text: phrase?.text ?? '',
      translation: phrase?.translation === '待补充译文' ? '' : phrase?.translation ?? '',
      tag: phrase?.tag && phrase.tag !== '自定义' ? phrase.tag : '',
      level: phrase?.level ?? '入门',
    });
  }, [phrase]);

  const submit = () => {
    if (!form.text.trim()) return;
    onSubmit({ text: form.text, translation: form.translation, tag: form.tag || '自定义', level: form.level });
  };

  return (
    <Modal title={phrase ? `修改句子（当前 v${phrase.version}，保存后生成 v${phrase.version + 1}）` : '添加练习句子'} onClose={onClose}>
      <div className="phrase-form">
        <label>英文句子
          <textarea autoFocus value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="例如：I can make this happen." />
        </label>
        <label>中文译文
          <input value={form.translation} onChange={e => setForm(f => ({ ...f, translation: e.target.value }))} placeholder="待补充译文" />
        </label>
        <div className="form-row">
          <label>标签
            <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="日常 / 工作…" maxLength={8} />
          </label>
          <label>难度
            <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as Level }))}>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        {phrase && (
          <p className="form-warn">
            {phrase.status === 'mastered'
              ? '已掌握句子修改后生成新版本，进入待复评队列，须在当前口径连续两次达标才恢复。'
              : '修改将生成新版本；若句子在待复评队列中，连续达标进度清零，旧成绩仍挂靠旧版本。'}
          </p>
        )}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>{phrase ? '生成新版本' : '加入句子库'}</button>
        </div>
      </div>
    </Modal>
  );
}
