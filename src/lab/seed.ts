// 资料层：初始种子数据（v1 口径 + 句子 + 按原口径保存的历史成绩）

import type { LabState, Rubric, Phrase, PracticeRecord } from './types';

const V1_AT = '2026-09-08T09:00:00.000Z';

const v1: Rubric = {
  id: 1,
  name: 'v1 标准口径',
  weights: { clarity: 40, stress: 30, fluency: 30 },
  status: 'active',
  createdAt: V1_AT,
  activatedAt: V1_AT,
};

const phrases: Phrase[] = [
  {
    id: 1,
    tag: '日常',
    level: '入门',
    versions: [{ version: 1, text: 'The morning light feels different today.', translation: '今天的晨光感觉不一样。', createdAt: '2026-09-09T01:24:00.000Z' }],
    status: 'practice',
    attempts: 3,
  },
  {
    id: 2,
    tag: '工作',
    level: '进阶',
    versions: [{ version: 1, text: 'Could you walk me through the next step?', translation: '你能带我了解下一步吗？', createdAt: '2026-09-09T02:10:00.000Z' }],
    status: 'new',
    attempts: 0,
  },
  {
    id: 3,
    tag: '表达',
    level: '挑战',
    versions: [{ version: 1, text: 'I appreciate your patience and thoughtful feedback.', translation: '感谢你的耐心和细致反馈。', createdAt: '2026-09-09T03:10:00.000Z' }],
    status: 'mastered',
    attempts: 8,
  },
  {
    id: 4,
    tag: '灵感',
    level: '入门',
    versions: [{ version: 1, text: 'Let’s make room for a little curiosity.', translation: '给好奇心留一点空间。', createdAt: '2026-09-10T05:00:00.000Z' }],
    status: 'new',
    attempts: 0,
  },
];

// 历史成绩都保存在 v1 口径下；句子 3 曾连续两次达标（新口径启用后需重新复评）
const records: PracticeRecord[] = [
  { id: 1001, phraseId: 1, rubricId: 1, version: 1, dims: { clarity: 74, stress: 70, fluency: 72 }, total: 72, at: '2026-09-20T09:24:00.000Z' },
  { id: 1002, phraseId: 1, rubricId: 1, version: 1, dims: { clarity: 80, stress: 76, fluency: 74 }, total: 77, at: '2026-09-21T09:31:00.000Z' },
  { id: 1003, phraseId: 1, rubricId: 1, version: 1, dims: { clarity: 84, stress: 78, fluency: 80 }, total: 81, at: '2026-09-22T09:40:00.000Z' },
  { id: 1004, phraseId: 3, rubricId: 1, version: 1, dims: { clarity: 88, stress: 84, fluency: 86 }, total: 86, at: '2026-09-21T10:05:00.000Z' },
  { id: 1005, phraseId: 3, rubricId: 1, version: 1, dims: { clarity: 92, stress: 90, fluency: 88 }, total: 90, at: '2026-09-22T10:10:00.000Z' },
];

export const seedState: LabState = { rubrics: [v1], phrases, records };
