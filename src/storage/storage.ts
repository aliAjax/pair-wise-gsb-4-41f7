// 存储层：localStorage 的唯一出入口；与判定、页面解耦。
// 旧版（sound-lab-phrases，仅句子数组）首次打开时迁移，旧键保留作备份。
import type { LabState, Phrase, RevisitEntry, RubricDraft, RubricVersion, ScoreRecord } from '../data/types';
import { initialState } from '../data/seed';
import { DEFAULT_RUBRIC } from '../data/constants';

const STATE_KEY = 'sound-lab-state-v2';
const LEGACY_KEY = 'sound-lab-phrases';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizePhrase(raw: unknown): Phrase | null {
  if (!isObject(raw)) return null;
  const id = num(raw.id, NaN);
  const text = str(raw.text);
  if (!Number.isFinite(id) || !text) return null;
  const level = ['入门', '进阶', '挑战'].includes(str(raw.level)) ? str(raw.level) as Phrase['level'] : '入门';
  const status = ['new', 'practice', 'mastered'].includes(str(raw.status)) ? str(raw.status) as Phrase['status'] : 'new';
  return {
    id,
    text,
    translation: str(raw.translation, '待补充译文'),
    tag: str(raw.tag, '自定义'),
    level,
    status,
    attempts: num(raw.attempts),
    version: num(raw.version, 1) >= 1 ? Math.floor(num(raw.version, 1)) : 1,
    masteredRubricId: typeof raw.masteredRubricId === 'string' ? raw.masteredRubricId : undefined,
    last: typeof raw.last === 'string' ? raw.last : undefined,
  };
}

function normalizeRubric(raw: unknown): RubricVersion | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  const name = str(raw.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    clarity: num(raw.clarity, 50),
    stress: num(raw.stress, 50),
    status: str(raw.status) === 'retired' ? 'retired' : 'active',
    activatedAt: str(raw.activatedAt),
    retiredAt: typeof raw.retiredAt === 'string' ? raw.retiredAt : undefined,
  };
}

function normalizeDraft(raw: unknown): RubricDraft | null {
  if (!isObject(raw)) return null;
  const name = str(raw.name);
  if (!name) return null;
  return { name, clarity: num(raw.clarity), stress: num(raw.stress), createdAt: str(raw.createdAt) };
}

function normalizeRecord(raw: unknown): ScoreRecord | null {
  if (!isObject(raw)) return null;
  const id = num(raw.id, NaN);
  const phraseId = num(raw.phraseId, NaN);
  const rubricId = str(raw.rubricId);
  if (!Number.isFinite(id) || !Number.isFinite(phraseId) || !rubricId) return null;
  return {
    id,
    phraseId,
    phraseVersion: Math.max(1, Math.floor(num(raw.phraseVersion, 1))),
    rubricId,
    clarity: num(raw.clarity),
    stress: num(raw.stress),
    total: num(raw.total),
    at: str(raw.at),
  };
}

function normalizeQueue(raw: unknown): RevisitEntry | null {
  if (!isObject(raw)) return null;
  const phraseId = num(raw.phraseId, NaN);
  const rubricId = str(raw.rubricId);
  if (!Number.isFinite(phraseId) || !rubricId) return null;
  return {
    phraseId,
    phraseVersion: Math.max(1, Math.floor(num(raw.phraseVersion, 1))),
    rubricId,
    streak: Math.max(0, Math.floor(num(raw.streak))),
  };
}

/** 宽松校验结构完整性；语义冲突交给 domain/diagnose 在页面列出 */
export function isValidState(raw: unknown): raw is LabState {
  if (!isObject(raw) || !Array.isArray(raw.phrases) || !Array.isArray(raw.rubrics) || !Array.isArray(raw.records) || !Array.isArray(raw.queue)) return false;
  if (typeof raw.currentRubricId !== 'string') return false;
  if (raw.rubrics.length === 0 || !raw.rubrics.some((r: unknown) => isObject(r) && r.id === raw.currentRubricId)) return false;
  return true;
}

function sanitize(raw: LabState): LabState {
  const phrases = raw.phrases.map(normalizePhrase).filter((p): p is Phrase => p !== null);
  const rubrics = raw.rubrics.map(normalizeRubric).filter((r): r is RubricVersion => r !== null);
  const records = raw.records.map(normalizeRecord).filter((r): r is ScoreRecord => r !== null);
  const queue = raw.queue.map(normalizeQueue).filter((q): q is RevisitEntry => q !== null);
  return {
    phrases,
    rubrics,
    draft: raw.draft ? normalizeDraft(raw.draft) : null,
    currentRubricId: str(raw.currentRubricId, DEFAULT_RUBRIC.id),
    records,
    queue,
    seqRubric: Math.max(rubrics.length, Math.floor(num(raw.seqRubric, rubrics.length))),
    seqRecord: records.reduce((max, r) => Math.max(max, r.id), 0) + 1,
  };
}

/** 旧版仅存句子数组：挂到内置 v1 口径下，已掌握句子的授掌口径记为 v1 */
function migrateLegacy(raw: unknown, nowIso: string): LabState | null {
  if (!Array.isArray(raw)) return null;
  const phrases = raw.map(normalizePhrase).filter((p): p is Phrase => p !== null);
  if (phrases.length === 0) return null;
  const base = initialState(nowIso);
  return { ...base, phrases: phrases.map(p => p.status === 'mastered' ? { ...p, masteredRubricId: p.masteredRubricId ?? DEFAULT_RUBRIC.id } : p) };
}

export function loadState(nowIso: string): LabState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) return sanitize(parsed);
    }
  } catch {
    // 落库损坏时继续尝试旧键
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(JSON.parse(legacy), nowIso);
      if (migrated) {
        // 旧键保留作备份，新键接管
        localStorage.setItem(STATE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // 旧键同样不可读，回落种子数据
  }
  return initialState(nowIso);
}

export function saveState(state: LabState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默：应用内存态仍可正常使用
  }
}
