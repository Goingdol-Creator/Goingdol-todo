import { addDays, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { Task, useTasks } from '../context/TaskContext';
import { kindOf, renderHighlighted } from '../kinds';
import { HIGHLIGHT_COLOR } from './TaskItem';

interface Props {
    currentDate: Date;
    onPickDay: (d: Date) => void;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/** 주간 뷰와 동일: 구분 아이콘 + 글자(자동 강조·형광펜), 배경 칩 없음 */
const MonthTask = ({ task, child }: { task: Task; child: boolean }) => {
    const kind = kindOf(task.kind);
    const text = renderHighlighted(task.text, kind?.color);

    return (
        <span className={`month-task${task.completed ? ' done' : ''}${child ? ' child' : ''}`}>
            {kind && (
                <span className="month-kind" style={{ color: kind.color }}>
                    <kind.icon size={12} strokeWidth={2.2} />
                </span>
            )}
            {task.color === 'yellow' ? (
                <span className="label month-label" style={{ '--hl': HIGHLIGHT_COLOR } as React.CSSProperties}>{text}</span>
            ) : (
                <span className="month-label">{text}</span>
            )}
        </span>
    );
};

const MonthView = ({ currentDate, onPickDay }: Props) => {
    const { tasksFor, holidays, settings } = useTasks();
    const weekend = settings.showWeekend;
    const first = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) {
        if (weekend || (d.getDay() !== 0 && d.getDay() !== 6)) days.push(d);
    }

    return (
        <div className={`month${weekend ? '' : ' no-weekend'}`}>
            {(weekend ? WEEKDAYS : WEEKDAYS.slice(0, 5)).map((w) => (
                <div key={w} className="month-dow">{w}</div>
            ))}
            {days.map((d) => {
                const key = format(d, 'yyyy-MM-dd');
                const list = tasksFor(key);
                const holiday = holidays.includes(key);
                return (
                    <button
                        key={d.toISOString()}
                        className={`month-cell${isToday(d) ? ' today' : ''}${isSameMonth(d, currentDate) ? '' : ' other'}${holiday ? ' holiday' : ''}`}
                        onClick={() => onPickDay(d)}
                    >
                        <span className="month-head">
                            <span className="month-num">{format(d, 'd')}</span>
                            {holiday && <span className="holiday-tag">휴일</span>}
                        </span>
                        {list.slice(0, 4).map((t, i) => (
                            <MonthTask key={t.id} task={t} child={t.indent === 1 && i > 0} />
                        ))}
                        {list.length > 4 && <span className="month-more">+{list.length - 4}</span>}
                    </button>
                );
            })}
        </div>
    );
};

export default MonthView;
