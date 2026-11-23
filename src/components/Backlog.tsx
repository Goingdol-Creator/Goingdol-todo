import TaskList from './TaskList';
import { useTasks } from '../context/TaskContext';

/** 화면 하단 1/3을 차지하는 '언젠가 할 일' 패널 (표시 여부는 설정에서 조절) */
const Backlog = () => {
    const { settings } = useTasks();
    if (!settings.showBacklog) return null;

    return (
        <section className="backlog">
            <header className="day-head">
                <span className="day-num">언젠가 할 일</span>
            </header>
            <div className="backlog-body">
                <TaskList date={null} minLines={3} />
            </div>
        </section>
    );
};

export default Backlog;
