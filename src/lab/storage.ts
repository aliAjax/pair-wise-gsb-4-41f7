// 存储层：localStorage 持久化与旧版数据迁移（唯一接触浏览器存储的模块）

import type { LabState, Phrase } from './types';
import { seedState } from './seed';

const STORAGE_KEY = 'sound-lab-state-v2';
const LEGACY_KEY = 'sound-lab-phrases';

/** 旧版（仅有句子数组）数据迁移：句子按 v1 版本入库 */
function migrateLegacy(raw: string): LabState | null {
  try {
    const old = JSON.parse(raw) as Array<{
      id?: number; text?: string; translation?: string; tag?: string;
      level?: Phrase['level']; status?: Phrase['status']; attempts?: number; last?: string;
    }>;
    if (!Array.isArray(old) || old.length === 0) return null;
    const phrases: Phrase[] = old.map((p, i) => ({
      id: typeof p.id === 'number' ? p.id : i + 1,
      tag: p.tag || '自定义',
      level: p.level || '入门',
      versions: [{ version: 1, text: p.text || '', translation: p.translation || '待补充译文', createdAt: '2026-09-12T00:00:00.000Z' }],
      status: p.status === 'mastered' ? 'mastered' : 'practice',
      attempts: typeof p.attempts === 'number' ? p.attempts : 0,
    }));
    if (!phrases.some(p => p.versions[0].text)) return null;
    return { ...seedState, phrases };
  } catch {
    return null;
  }
}

function isLabState(x: unknown): x is LabState {
  const s = x as LabState;
  return !!s && Array.isArray(s.rubrics) && Array.isArray(s.phrases) && Array.isArray(s.records);
}

export function loadState(): LabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isLabState(parsed)) return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(legacy);
      if (migrated) return migrated;
    }
  } catch {
    // 数据损坏时回落到种子数据
  }
  return seedState;
}

export function saveState(state: LabState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储空间不足等情况静默失败，不影响本次练习
  }
}
