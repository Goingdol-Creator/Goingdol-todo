import { Droppable } from '@hello-pangea/dnd';
import { useTasks } from '../context/TaskContext';
import TaskItem from './TaskItem';

interface Props {
    /** yyyy-MM-dd 또는 null(백로그) */
    date: string | null;
    /** 최소 줄 수 (줄 높이 42px 기준) */
    minLines?: number;
}

/** 줄 노트 형태의 할 일 목록. 아래 빈 줄을 클릭하면 새 할 일이 생깁니다. */
const TaskList = ({ date, minLines = 5 }: Props) => {
    const { tasksFor, addTask } = useTasks();
    const list = tasksFor(date);

    return (
        <Droppable droppableId={date ?? 'backlog'}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`task-list${snapshot.isDraggingOver ? ' over' : ''}`}
                    style={{ minHeight: `calc(${minLines} * var(--row-h))` }}
                >
                    {list.map((task, i) => (
                        <TaskItem key={task.id} task={task} index={i} listId={date} />
                    ))}
                    {provided.placeholder}
                    <div className="fill" onClick={() => addTask(date)} />
                </div>
            )}
        </Droppable>
    );
};

export default TaskList;
