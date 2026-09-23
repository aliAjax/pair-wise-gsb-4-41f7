// 资料层：声线练习室的核心数据结构（不含任何行为）

export type Level = '入门' | '进阶' | '挑战';

/** 句子本身的掌握状态；是否处于待复评以 queue 为准 */
export type PhraseStatus = 'new' | 'practice' | 'mastered';

/** 评分口径版本：登记即留痕，启用后不可改，只能被新版本取代 */
export interface RubricVersion {
  id: string; // v1、v2……
  name: string;
  /** 听清度权重（0-100） */
  clarity: number;
  /** 重音权重（0-100），与听清度之和恒为 100 */
  stress: number;
  status: 'active' | 'retired';
  activatedAt: string;
  retiredAt?: string;
}

/** 未启用的草稿口径；同一时间最多一份 */
export interface RubricDraft {
  name: string;
  clarity: number;
  stress: number;
  createdAt: string;
}

export interface Phrase {
  id: number;
  text: string;
  translation: string;
  tag: string;
  level: Level;
  status: PhraseStatus;
  attempts: number;
  /** 内容版本号：每次修改句子先生成新版本，旧成绩仍挂靠旧版本 */
  version: number;
  /** 最近一次授予“已掌握”的口径版本 */
  masteredRubricId?: string;
  last?: string;
}

/** 一次练习成绩：永久挂靠当时的句子版本与口径版本 */
export interface ScoreRecord {
  id: number;
  phraseId: number;
  phraseVersion: number;
  rubricId: string;
  /** 听清度原始分（0-100） */
  clarity: number;
  /** 重音原始分（0-100） */
  stress: number;
  /** 按当版口径权重折算的总分 */
  total: number;
  at: string;
}

/** 待复评队列条目：须在当前口径、当前句子版本上连续达标 */
export interface RevisitEntry {
  phraseId: number;
  phraseVersion: number;
  rubricId: string;
  /** 当前口径下连续 ≥ 达标线的次数 */
  streak: number;
}

/** 重开后的一致性冲突，页面需列出：句子、分值、规则 */
export interface ConflictRow {
  key: string;
  phrase?: string;
  score?: string;
  rule: string;
  detail: string;
}

export interface LabState {
  phrases: Phrase[];
  rubrics: RubricVersion[];
  draft: RubricDraft | null;
  currentRubricId: string;
  records: ScoreRecord[];
  queue: RevisitEntry[];
  seqRubric: number;
  seqRecord: number;
}
