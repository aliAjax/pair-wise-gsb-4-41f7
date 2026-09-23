// 资料层：领域类型定义（评分口径、句子版本、练习记录、整体状态）

/** 评分维度权重：听清度、重音、流利度，和为 100 */
export type Weights = {
  clarity: number;
  stress: number;
  fluency: number;
};

/** 一次练习在三个维度上的得分（0-100） */
export type DimensionScores = {
  clarity: number;
  stress: number;
  fluency: number;
};

export type RubricStatus = 'draft' | 'active' | 'archived';

/** 评分口径版本 */
export type Rubric = {
  id: number;
  name: string;
  weights: Weights;
  status: RubricStatus;
  createdAt: string;
  activatedAt?: string;
  archivedAt?: string;
};

/** 句子的一个文本版本（修改句子会生成新版本，旧成绩仍指向旧版本） */
export type PhraseVersion = {
  version: number;
  text: string;
  translation: string;
  createdAt: string;
};

export type PhraseStatus = 'new' | 'practice' | 'mastered' | 'review';

export type Phrase = {
  id: number;
  tag: string;
  level: '入门' | '进阶' | '挑战';
  versions: PhraseVersion[];
  status: PhraseStatus;
  attempts: number;
  /** 转入待复评的时间（启用新口径或复评期间生成新版本时写入） */
  reviewSince?: string;
  /** 复评针对的句子版本；旧版本成绩不计入连续达标 */
  reviewVersion?: number;
  /** 当前口径下连续达标的次数（0-2，2 次即恢复已掌握） */
  qualifying?: number;
};

/** 一条练习成绩，永久绑定当时使用的口径与句子版本 */
export type PracticeRecord = {
  id: number;
  phraseId: number;
  rubricId: number;
  version: number;
  dims: DimensionScores;
  total: number;
  at: string;
};

export type LabState = {
  rubrics: Rubric[];
  phrases: Phrase[];
  records: PracticeRecord[];
};

/** 重开后的一致性冲突：列出句子、分值与违反的规则 */
export type Conflict = {
  kind:
    | 'no-active'
    | 'multiple-active'
    | 'draft-conflict'
    | 'weights'
    | 'record-rubric'
    | 'record-phrase'
    | 'record-version'
    | 'record-score'
    | 'review-state'
    | 'review-count'
    | 'review-done';
  rule: string;
  phraseId?: number;
  rubricId?: number;
  recordId?: number;
  score?: number;
};

/** 复评通过分数线 */
export const PASS_SCORE = 85;
/** 恢复已掌握所需的连续达标次数 */
export const PASS_STREAK = 2;
