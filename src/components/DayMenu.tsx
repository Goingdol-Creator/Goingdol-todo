import { useEffect, useRef, useState } from 'react';
import { ArrowRightToLine, CalendarOff, CalendarCheck, CheckCheck, MoreHorizontal } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

/** 요일 컬럼 우측 상단의 ⋯ 메뉴 */
const DayMenu = ({ date }: { date: string }) => {
    const { completeAll, moveIncompleteToNextDay, holidays, toggleHoliday } = useTasks();
    const isHoliday = holidays.includes(date);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const run = (fn: (d: string) => void) => {
        fn(date);
        setOpen(false);
    };

    return (
        <div className={`day-menu${open ? ' open' : ''}`} ref={ref}>
            <button className="icon-btn day-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="이 날짜 메뉴">
                <MoreHorizontal size={18} />
            </button>
            {open && (
                <div className="day-menu-pop">
                    <button onClick={() => run(completeAll)}>
                        <CheckCheck size={15} /> 모든 할 일 완료 처리
                    </button>
                    <button onClick={() => run(moveIncompleteToNextDay)}>
                        <ArrowRightToLine size={15} /> 미완료 할 일 다음날로 넘기기
                    </button>
                    <button onClick={() => run(toggleHoliday)}>
                        {isHoliday ? <CalendarCheck size={15} /> : <CalendarOff size={15} />}
                        {isHoliday ? '휴일 해제' : '휴일로 지정'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DayMenu;
