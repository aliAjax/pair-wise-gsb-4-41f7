// 判定层：练习评分、连续两次达标的复评规则、句子改版
import type { LabState, Phrase, ScoreRecord } from '../data/types';
import { PASS_SCORE, PASS_TIMES } from '../data/constants';
import { currentRubric } from './rubric';

/** 按口径权重折算总分（四舍五入，与页面展示一致） */
export function totalOf(clarity: number, stress: number, rubric: { clarity: number; stress: number }): number {
  return Math.round((clarity * rubric.clarity + stress * rubric.stress) / 100);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 模拟发音评分：浏览器无真实评测，按时间种子给出可复现的听清度/重音原始分 */
export function simulateScores(seed: number): { clarity: number; stress: number } {
  const rand = mulberry32(seed);
  const clarity = Math.round(66 + rand() * 31); // 66-97
  const stress = Math.max(60, Math.min(98, clarity + Math.round((rand() - 0.45) * 18)));
  return { clarity, stress };
}

/**
 * 从成绩记录推导“某句子在某口径、某版本上”的连续达标次数：
 * 倒序扫描，最近一次在该口径/版本的成绩不达标即断；跨口径、跨版本不计入。
 */
export function streakFromRecords(
  records: ScoreRecord[],
  phraseId: number,
  rubricId: string,
  phraseVersion: number,
): number {
  let streak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.phraseId !== phraseId) continue;
    if (r.rubricId !== rubricId || r.phraseVersion !== phraseVersion) continue;
    if (r.total >= PASS_SCORE) streak += 1;
    else break;
  }
  return streak;
}

export interface ScoreResult {
  state: LabState;
  record: ScoreRecord;
  /** 评分后该句子在当前口径下的连续达标次数 */
  streak: number;
  revived: boolean;   // 本次成绩使句子恢复“已掌握”
  mastered: boolean;  // 本次成绩让普通练习句子新达成“已掌握”
}

/**
 * 完成一次练习：
 * - 成绩按当前口径、当前句子版本保存，旧成绩永不改写
 * - 待复评句子须在当前口径连续两次 ≥85 才恢复已掌握
 * - 普通练习句子同样按“连续两次 ≥85”授掌
 */
export function scorePhrase(state: LabState, phraseId: number, raw: { clarity: number; stress: number }, nowIso: string): ScoreResult | null {
  const phrase = state.phrases.find(p => p.id === phraseId);
  if (!phrase) return null;
  const rubric = currentRubric(state);
  const id = state.seqRecord;
  const record: ScoreRecord = {
    id,
    phraseId,
    phraseVersion: phrase.version,
    rubricId: rubric.id,
    clarity: raw.clarity,
    stress: raw.stress,
    total: totalOf(raw.clarity, raw.stress, rubric),
    at: nowIso,
  };
  const records = [...state.records, record];
  const streak = streakFromRecords(records, phraseId, rubric.id, phrase.version);

  const queued = state.queue.find(q => q.phraseId === phraseId);
  let queue = state.queue;
  let phrases = state.phrases;
  let revived = false;
  let mastered = false;

  if (queued) {
    if (streak >= PASS_TIMES) {
      // 连续达标：恢复已掌握并退出复评队列
      revived = true;
      queue = state.queue.filter(q => q.phraseId !== phraseId);
      phrases = state.phrases.map(p =>
        p.id === phraseId
          ? { ...p, attempts: p.attempts + 1, status: 'mastered', masteredRubricId: rubric.id, last: '刚刚' }
          : p,
      );
    } else {
      // 继续留在队列，刷新连续计数（口径切换或改版后记录可能不匹配，以记录推导为准）
      queue = state.queue.map(q =>
        q.phraseId === phraseId
          ? { ...q, phraseVersion: phrase.version, rubricId: rubric.id, streak }
          : q,
      );
      phrases = state.phrases.map(p =>
        p.id === phraseId ? { ...p, attempts: p.attempts + 1, status: 'practice', last: '刚刚' } : p,
      );
    }
  } else {
    const becomesMastered = streak >= PASS_TIMES;
    mastered = becomesMastered && phrase.status !== 'mastered';
    phrases = state.phrases.map(p =>
      p.id === phraseId
        ? {
            ...p,
            attempts: p.attempts + 1,
            status: becomesMastered ? ('mastered' as const) : ('practice' as const),
            masteredRubricId: becomesMastered ? rubric.id : p.masteredRubricId,
            last: '刚刚',
          }
        : p,
    );
  }

  return {
    state: { ...state, records, phrases, queue, seqRecord: id + 1 },
    record,
    streak,
    revived,
    mastered,
  };
}

export interface PhraseEdit {
  text: string;
  translation: string;
  tag: string;
  level: Phrase['level'];
}

/**
 * 修改句子：先生成新版本号。
 * 待复评期间改句——复评进度作废，按新版本重新计数；
 * 已掌握句子改句则回到练习态并进入待复评。
 */
export function editPhrase(state: LabState, phraseId: number, edit: PhraseEdit): LabState {
  const phrase = state.phrases.find(p => p.id === phraseId);
  if (!phrase) return state;
  const nextVersion = phrase.version + 1;
  const inQueue = state.queue.some(q => q.phraseId === phraseId);

  const phrases = state.phrases.map(p =>
    p.id === phraseId
      ? {
          ...p,
          text: edit.text.trim(),
          translation: edit.translation.trim() || '待补充译文',
          tag: edit.tag.trim() || p.tag,
          level: edit.level,
          version: nextVersion,
        }
      : p,
  );

  let queue = state.queue;
  if (inQueue) {
    queue = state.queue.map(q =>
      q.phraseId === phraseId
        ? { ...q, phraseVersion: nextVersion, rubricId: state.currentRubricId, streak: 0 }
        : q,
    );
  } else if (phrase.status === 'mastered') {
    queue = [
      ...state.queue,
      { phraseId, phraseVersion: nextVersion, rubricId: state.currentRubricId, streak: 0 },
    ];
    const idx = phrases.findIndex(p => p.id === phraseId);
    phrases[idx] = { ...phrases[idx], status: 'practice', masteredRubricId: phrase.masteredRubricId };
  }
  return { ...state, phrases, queue };
}

export function addPhrase(state: LabState, edit: PhraseEdit): { state: LabState; id: number } {
  const id = state.phrases.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const phrase: Phrase = {
    id,
    text: edit.text.trim(),
    translation: edit.translation.trim() || '待补充译文',
    tag: edit.tag.trim() || '自定义',
    level: edit.level,
    status: 'new',
    attempts: 0,
    version: 1,
  };
  return { state: { ...state, phrases: [...state.phrases, phrase] }, id };
}

/** 删除句子：连带清理其成绩与队列条目，避免悬挂引用 */
export function removePhrase(state: LabState, phraseId: number): LabState {
  return {
    ...state,
    phrases: state.phrases.filter(p => p.id !== phraseId),
    records: state.records.filter(r => r.phraseId !== phraseId),
    queue: state.queue.filter(q => q.phraseId !== phraseId),
  };
}
