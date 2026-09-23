import type { LabState, Phrase } from './types';
import { DEFAULT_RUBRIC } from './constants';

// 初始句子：与旧版界面一致，补齐版本字段
export function seedPhrases(): Phrase[] {
  return [
    { id: 1, text: 'The morning light feels different today.', translation: '今天的晨光感觉不一样。', tag: '日常', level: '入门', status: 'practice', attempts: 3, version: 1, last: '今天 09:24' },
    { id: 2, text: 'Could you walk me through the next step?', translation: '你能带我了解下一步吗？', tag: '工作', level: '进阶', status: 'new', attempts: 0, version: 1 },
    { id: 3, text: 'I appreciate your patience and thoughtful feedback.', translation: '感谢你的耐心和细致反馈。', tag: '表达', level: '挑战', status: 'mastered', attempts: 8, version: 1, masteredRubricId: 'v1', last: '昨天 18:10' },
    { id: 4, text: 'Let’s make room for a little curiosity.', translation: '给好奇心留一点空间。', tag: '灵感', level: '入门', status: 'new', attempts: 0, version: 1 },
  ];
}

export function initialState(nowIso: string): LabState {
  return {
    phrases: seedPhrases(),
    rubrics: [
      {
        id: DEFAULT_RUBRIC.id,
        name: DEFAULT_RUBRIC.name,
        clarity: DEFAULT_RUBRIC.clarity,
        stress: DEFAULT_RUBRIC.stress,
        status: 'active',
        activatedAt: nowIso,
      },
    ],
    draft: null,
    currentRubricId: DEFAULT_RUBRIC.id,
    records: [],
    queue: [],
    seqRubric: 1,
    seqRecord: 1,
  };
}
