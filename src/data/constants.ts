// 资料层：固定规则常量

/** 复评 / 授掌达标线 */
export const PASS_SCORE = 85;
/** 恢复已掌握所需的连续达标次数 */
export const PASS_TIMES = 2;

/** 首个内置口径：登记名“基础口径”，听清度、重音各占一半 */
export const DEFAULT_RUBRIC = {
  id: 'v1',
  name: '基础口径',
  clarity: 50,
  stress: 50,
} as const;
