import { Check, ChevronRight, Clock3, Mic, RotateCcw, Volume2 } from 'lucide-react';

export type ViewKey = 'library' | 'records' | 'mastered' | 'review';

type Props = {
  view: ViewKey;
  onView: (v: ViewKey) => void;
  total: number;
  mastered: number;
  review: number;
};

export function Sidebar({ view, onView, total, mastered, review }: Props) {
  const links: { key: ViewKey; icon: typeof Mic; label: string; count?: number }[] = [
    { key: 'library', icon: Mic, label: '练习库', count: total },
    { key: 'records', icon: Clock3, label: '练习记录' },
    { key: 'mastered', icon: Check, label: '已掌握', count: mastered },
    { key: 'review', icon: RotateCcw, label: '待复评', count: review },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Volume2 size={19} /></div>
        <div><strong>声线练习室</strong><span>Pronounce / practice</span></div>
      </div>
      <div className="side-label">我的练习</div>
      <nav>
        {links.map(({ key, icon: Icon, label, count }) => (
          <button
            key={key}
            className={view === key ? 'side-link active' : 'side-link'}
            onClick={() => onView(key)}
          >
            <Icon size={17} />
            {label}
            {count != null && <b className={key === 'review' && count > 0 ? 'count-warn' : undefined}>{count}</b>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="streak">
          <span>连续练习</span>
          <strong>5 <small>天</small></strong>
          <i>↗ +2</i>
        </div>
        <div className="profile">
          <div className="avatar">YL</div>
          <div><strong>Yuki Lin</strong><span>普通计划</span></div>
          <ChevronRight size={16} />
        </div>
      </div>
    </aside>
  );
}
