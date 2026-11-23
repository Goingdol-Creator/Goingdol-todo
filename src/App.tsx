import { useState } from 'react';
import { addMonths, addWeeks, subMonths, subWeeks } from 'date-fns';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import Header from './components/Header';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import { TaskProvider, useTasks } from './context/TaskContext';
import AuthGate from './components/AuthGate';

function Planner() {
    const { moveTask, settings, updateSettings } = useTasks();
    const [currentDate, setCurrentDate] = useState(new Date());
    const month = settings.view === 'month';

    const prev = () => setCurrentDate((d) => (month ? subMonths(d, 1) : subWeeks(d, 1)));
    const next = () => setCurrentDate((d) => (month ? addMonths(d, 1) : addWeeks(d, 1)));
    const today = () => setCurrentDate(new Date());

    const onDragEnd = ({ destination, draggableId }: DropResult) => {
        if (!destination) return;
        moveTask(draggableId, destination.droppableId === 'backlog' ? null : destination.droppableId, destination.index);
    };

    return (
        <div className="app">
            <Header currentDate={currentDate} onPrev={prev} onNext={next} onToday={today} />
            <main className="main">
                {month ? (
                    <MonthView
                        currentDate={currentDate}
                        onPickDay={(d) => {
                            setCurrentDate(d);
                            updateSettings({ view: 'week' });
                        }}
                    />
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <WeekView currentDate={currentDate} />
                    </DragDropContext>
                )}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthGate>
            <TaskProvider>
                <Planner />
            </TaskProvider>
        </AuthGate>
    );
}

