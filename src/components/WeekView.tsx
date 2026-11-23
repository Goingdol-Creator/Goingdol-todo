import { addDays, startOfWeek } from 'date-fns';
import DayColumn from './DayColumn';
import Backlog from './Backlog';
import { useTasks } from '../context/TaskContext';

const WeekView = ({ currentDate }: { currentDate: Date }) => {
    const { settings } = useTasks();
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
        <div className="stage">
            <div className="week-area">
                <div className={`week${settings.showWeekend ? '' : ' no-weekend'}`}>
                    {days.slice(0, 5).map((d) => (
                        <DayColumn key={d.toISOString()} date={d} />
                    ))}
                    {settings.showWeekend && (
                        <div className="weekend">
                            <DayColumn date={days[5]} compact />
                            <DayColumn date={days[6]} compact />
                        </div>
                    )}
                </div>
            </div>
            <Backlog />
        </div>
    );
};

export default WeekView;
