import { Check, ChevronRight, ClipboardList, Clock3, Mic, Ruler, Volume2 } from 'lucide-react';

export type View = 'practice' | 'records' | 'rubrics';

interface SidebarProps {
  view: View;
  onNavigate: (v: View) => void;
  phraseCount: number;
  masteredCount: number;
  revisitCount: number;
}

export default function Sidebar({ view, onNavigate, phraseCount, masteredCount, revisitCount }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Volume2 size={19} /></div>
        <div><strong>声线练习室</strong><span>PRONOUNCE / PRACTICE</span></div>
      </div>
      <div className="side-label">我的练习</div>
      <nav>
        <button className={view === 'practice' ? 'side-link active' : 'side-link'} onClick={() => onNavigate('practice')}>
          <Mic size={17} />练习库 <b>{phraseCount}</b>
        </button>
        <button className={view === 'records' ? 'side-link active' : 'side-link'} onClick={() => onNavigate('records')}>
          <Clock3 size={17} />练习记录
        </button>
        <button className={view === 'rubrics' ? 'side-link active' : 'side-link'} onClick={() => onNavigate('rubrics')}>
          <Ruler size={17} />评分口径
          {revisitCount > 0 && <b className="badge-warn">{revisitCount}</b>}
        </button>
        <button className="side-link static" onClick={() => onNavigate('practice')}>
          <Check size={17} />已掌握 <b>{masteredCount}</b>
        </button>
        <button className="side-link static" onClick={() => onNavigate('practice')}>
          <ClipboardList size={17} />待复评 <b className={revisitCount > 0 ? 'badge-warn' : ''}>{revisitCount}</b>
        </button>
      </nav>
      <div className="sidebar-foot">
        <div className="streak"><span>连续练习</span><strong>5 <small>天</small></strong><i>↗ +2</i></div>
        <div className="profile">
          <div className="avatar">YL</div>
          <div><strong>Yuki Lin</strong><span>普通计划</span></div>
          <ChevronRight size={16} />
        </div>
      </div>
    </aside>
  );
}
