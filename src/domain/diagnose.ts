// 判定层：重开后的一致性校验。只读，不自动改写任何数据；
// 冲突统一列出“句子 / 分值 / 规则”，由页面呈现给用户。
import type { ConflictRow, LabState, RubricVersion, ScoreRecord } from '../data/types';
import { PASS_SCORE } from '../data/constants';

function phraseName(s: LabState, id: number): string {
  const p = s.phrases.find(x => x.id === id);
  return p ? p.text : `#${id}`;
}

function weightSumOk(r: Pick<RubricVersion, 'clarity' | 'stress'>): boolean {
  return (
    Number.isInteger(r.clarity) &&
    Number.isInteger(r.stress) &&
    r.clarity >= 0 &&
    r.stress >= 0 &&
    r.clarity + r.stress === 100
  );
}

function expectedTotal(r: ScoreRecord, rubric: RubricVersion): number {
  return Math.round((r.clarity * rubric.clarity + r.stress * rubric.stress) / 100);
}

/** 从记录倒序推导某句子在指定口径/版本上的连续达标次数 */
function deriveStreak(s: LabState, phraseId: number, rubricId: string, phraseVersion: number): number {
  let streak = 0;
  for (let i = s.records.length - 1; i >= 0; i--) {
    const r = s.records[i];
    if (r.phraseId !== phraseId) continue;
    if (r.rubricId !== rubricId || r.phraseVersion !== phraseVersion) continue;
    if (r.total >= PASS_SCORE) streak += 1;
    else break;
  }
  return streak;
}

export function diagnose(s: LabState): ConflictRow[] {
  const rows: ConflictRow[] = [];

  // —— 口径版本链 ——
  const current = s.rubrics.find(r => r.id === s.currentRubricId);
  if (!current) {
    rows.push({ key: `rubric-current-${s.currentRubricId}`, score: s.currentRubricId, rule: '当前口径必须存在', detail: `当前指向的口径 ${s.currentRubricId} 在版本登记中缺失` });
  } else if (current.status !== 'active') {
    rows.push({ key: `rubric-current-${current.id}`, phrase: current.name, score: current.id, rule: '当前口径须为启用状态', detail: `口径「${current.name}」状态为 ${current.status}，却被标记为当前口径` });
  }

  const active = s.rubrics.filter(r => r.status === 'active');
  if (active.length !== 1) {
    rows.push({ key: 'rubric-active-single', rule: '恰有一个启用口径', detail: `现有 ${active.length} 个启用口径：${active.map(r => r.id).join('、') || '无'}` });
  }

  for (const r of s.rubrics) {
    if (!weightSumOk(r)) {
      rows.push({ key: `rubric-weights-${r.id}`, phrase: r.name, score: `${r.clarity}/${r.stress}`, rule: '听清度 + 重音权重须为 100', detail: `口径「${r.name}」权重为 听清度 ${r.clarity} + 重音 ${r.stress}` });
    }
  }
  if (s.draft && !weightSumOk(s.draft)) {
    rows.push({ key: 'rubric-weights-draft', phrase: s.draft.name, score: `${s.draft.clarity}/${s.draft.stress}`, rule: '听清度 + 重音权重须为 100', detail: `草稿「${s.draft.name}」权重和为 ${s.draft.clarity + s.draft.stress}` });
  }

  // —— 成绩记录：口径、句子、折算分值 ——
  for (const r of s.records) {
    const rubric = s.rubrics.find(x => x.id === r.rubricId);
    if (!rubric) {
      rows.push({ key: `record-rubric-${r.id}`, phrase: phraseName(s, r.phraseId), score: `${r.total} 分`, rule: '成绩须挂靠已登记口径', detail: `成绩引用了不存在的口径 ${r.rubricId}` });
      continue;
    }
    if (expectedTotal(r, rubric) !== r.total) {
      rows.push({ key: `record-total-${r.id}`, phrase: phraseName(s, r.phraseId), score: `${r.total} 分`, rule: '总分须按原口径权重折算', detail: `按 ${r.rubricId} 口径（${rubric.clarity}/${rubric.stress}）折算应为 ${expectedTotal(r, rubric)} 分` });
    }
    if (!s.phrases.some(p => p.id === r.phraseId)) {
      rows.push({ key: `record-phrase-${r.id}`, phrase: phraseName(s, r.phraseId), score: `${r.total} 分`, rule: '成绩须归属存在的句子', detail: `句子 ${phraseName(s, r.phraseId)} 已不存在，成绩成为悬挂记录` });
    }
  }

  // —— 待复评队列 ——
  const seen = new Set<number>();
  for (const q of s.queue) {
    const p = s.phrases.find(x => x.id === q.phraseId);
    if (!p) {
      rows.push({ key: `queue-orphan-${q.phraseId}`, phrase: phraseName(s, q.phraseId), rule: '待复评队列须归属存在的句子', detail: `队列中的句子 #${q.phraseId} 已不存在` });
      continue;
    }
    if (q.rubricId !== s.currentRubricId) {
      rows.push({ key: `queue-current-${q.phraseId}`, phrase: p.text, score: q.rubricId, rule: '复评须按当前口径进行', detail: `队列条目仍挂在旧口径 ${q.rubricId}，当前为 ${s.currentRubricId}` });
    }
    if (q.phraseVersion !== p.version) {
      rows.push({ key: `queue-version-${q.phraseId}`, phrase: p.text, score: `v${q.phraseVersion}→v${p.version}`, rule: '改版后复评须按新版本重新计数', detail: `队列挂在句子 v${q.phraseVersion}，当前已是 v${p.version}` });
    }
    if (p.status === 'mastered') {
      rows.push({ key: `queue-status-${q.phraseId}`, phrase: p.text, rule: '队列与掌握状态互斥', detail: '句子已在队列中却仍标记为已掌握' });
    }
    if (seen.has(q.phraseId)) {
      rows.push({ key: `queue-dup-${q.phraseId}`, phrase: p.text, rule: '一句在队列中至多一条', detail: '待复评队列中出现重复条目' });
    }
    seen.add(q.phraseId);

    const derived = deriveStreak(s, q.phraseId, q.rubricId, q.phraseVersion);
    if (derived !== q.streak) {
      rows.push({ key: `revive-threshold-${q.phraseId}`, phrase: p.text, score: `${q.streak} 次`, rule: '连续达标次数须与成绩记录一致', detail: `队列记录连续 ${q.streak} 次，按记录推导为 ${derived} 次（规则：当前口径连续两次 ≥ ${PASS_SCORE} 才恢复）` });
    }
  }

  // —— 已掌握句子的授掌口径来源 ——
  for (const p of s.phrases) {
    if (p.status === 'mastered' && (!p.masteredRubricId || !s.rubrics.some(r => r.id === p.masteredRubricId))) {
      rows.push({ key: `mastered-rubric-${p.id}`, phrase: p.text, score: p.masteredRubricId ?? '缺失', rule: '已掌握句子须记录授掌口径', detail: '掌握状态缺少有效的口径版本来源' });
    }
  }

  return rows;
}
