import { format, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import TaskList from './TaskList';
import DayMenu from './DayMenu';
import { useTasks } from '../context/TaskContext';

interface Props {
    date: Date;
    compact?: boolean;
}

const DayColumn = ({ date, compact }: Props) => {
    const key = format(date, 'yyyy-MM-dd');
    const { holidays } = useTasks();
    const holiday = holidays.includes(key);
    const today = isToday(date);

    return (
        <section className={`day${today ? ' today' : ''}${holiday ? ' holiday' : ''}`}>
            <header className="day-head">
                <span className="day-num">{format(date, 'd')}일</span>
                <span className="day-name">{today ? '오늘' : format(date, 'EEEE', { locale: ko })}</span>
                {holiday && <span className="holiday-tag">휴일</span>}
                <DayMenu date={key} />
            </header>
            <TaskList date={key} minLines={compact ? 4 : 5} />
        </section>
    );
};

export default DayColumn;
