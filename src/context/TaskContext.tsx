import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, Dispatch, SetStateAction, ReactNode } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { supabase } from '../lib/supabase';

/** 'holiday' 는 날짜 전체를 휴일로 표시하는 특수 항목 (목록에는 보이지 않음) */
export type TaskKind = 'meeting' | 'deadline' | 'today' | 'release' | 'holiday';

/** date === null 이면 백로그 */
export interface Task {
    id: string;
    text: string;
    date: string | null;
    completed: boolean;
    color?: string;
    note?: string;
    kind?: TaskKind;
}

export type Theme = 'light' | 'blue' | 'dark';
export type ViewMode = 'week' | 'month';

export interface Settings {
    theme: Theme;
    showBacklog: boolean;
    showWeekend: boolean;
    view: ViewMode;
}

const DEFAULT_SETTINGS: Settings = { theme: 'light', showBacklog: true, showWeekend: true, view: 'week' };

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'error';

interface TaskContextType {
    tasks: Task[];
    syncStatus: SyncStatus;
    reload: () => void;
    settings: Settings;
    updateSettings: (patch: Partial<Settings>) => void;
    editingId: string | null;
    setEditingId: Dispatch<SetStateAction<string | null>>;
    tasksFor: (date: string | null) => Task[];
    addTask: (date: string | null, afterId?: string) => string;
    removeTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    moveTask: (id: string, date: string | null, index: number) => void;
    /** 해당 날짜의 모든 할 일을 완료 처리 */
    completeAll: (date: string) => void;
    /** 해당 날짜의 미완료 할 일을 다음날로 넘김 */
    moveIncompleteToNextDay: (date: string) => void;
    /** 휴일로 지정된 날짜(yyyy-MM-dd) 목록 */
    holidays: string[];
    toggleHoliday: (date: string) => void;
}

const TABLE = 'todo_tasks';

interface TaskRow {
    id: string;
    text: string;
    date: string | null;
    completed: boolean;
    color: string | null;
    note: string | null;
    kind: string | null;
    position: number;
}

const fromRow = (r: TaskRow): Task => ({
    id: r.id,
    text: r.text,
    date: r.date,
    completed: r.completed,
    color: r.color ?? undefined,
    note: r.note ?? undefined,
    kind: (r.kind ?? undefined) as TaskKind | undefined,
});

const toRow = (t: Task, position: number) => ({
    id: t.id,
    text: t.text,
    date: t.date,
    completed: t.completed,
    color: t.color ?? null,
    note: t.note ?? null,
    kind: t.kind ?? null,
    position,
});

/** 서버에 마지막으로 반영된 상태와 비교하기 위한 서명 */
const signature = (t: Task, position: number) =>
    JSON.stringify([t.text, t.date, t.completed, t.color ?? null, t.note ?? null, t.kind ?? null, position]);

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error('useTasks must be used within a TaskProvider');
    return ctx;
};

export const TaskProvider = ({ children }: { children: ReactNode }) => {
    const [tasks, setTasks] = useLocalStorage<Task[]>('tweek-tasks', []);
    const [settings, setSettings] = useLocalStorage<Settings>('tweek-settings', DEFAULT_SETTINGS);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
    const [retryTick, setRetryTick] = useState(0);
    const synced = useRef<Map<string, string>>(new Map()); // id → 서버에 반영된 서명
    const seq = useRef(0);

    // 서버에서 일정 불러오기
    const load = useCallback(async () => {
        setSyncStatus('loading');
        const { data, error } = await supabase.from(TABLE).select('*').order('position', { ascending: true });
        if (error) {
            setSyncStatus('error');
            return;
        }
        const rows = (data ?? []) as TaskRow[];
        synced.current = new Map(rows.map((r) => [r.id, signature(fromRow(r), r.position)]));
        // 서버가 비어 있으면 이 브라우저의 기존 일정을 그대로 두고 올려보냄(최초 이전)
        if (rows.length > 0) setTasks(rows.map(fromRow));
        setLoaded(true);
        setSyncStatus('idle');
    }, [setTasks]);

    useEffect(() => {
        load();
    }, [load]);

    // 변경 사항을 0.5초 뒤 서버에 반영 (바뀐 항목만 upsert, 사라진 항목은 delete)
    useEffect(() => {
        if (!loaded) return;
        const timer = setTimeout(async () => {
            const current = tasks.filter((t) => t.text.trim());
            const next = new Map<string, string>();
            const changed: ReturnType<typeof toRow>[] = [];
            current.forEach((t, i) => {
                const sig = signature(t, i);
                next.set(t.id, sig);
                if (synced.current.get(t.id) !== sig) changed.push(toRow(t, i));
            });
            const removed = [...synced.current.keys()].filter((id) => !next.has(id));
            if (!changed.length && !removed.length) return;

            const mySeq = ++seq.current;
            setSyncStatus('saving');
            const results = await Promise.all([
                changed.length ? supabase.from(TABLE).upsert(changed) : null,
                removed.length ? supabase.from(TABLE).delete().in('id', removed) : null,
            ]);
            if (mySeq !== seq.current) return; // 더 최신 저장이 진행 중
            if (results.some((r) => r?.error)) {
                setSyncStatus('error');
                setTimeout(() => setRetryTick((n) => n + 1), 5000); // 5초 뒤 자동 재시도
                return;
            }
            synced.current = next;
            setSyncStatus('idle');
        }, 500);
        return () => clearTimeout(timer);
    }, [tasks, loaded, retryTick]);

    // 저장된 설정에 새 필드가 없을 때를 대비
    const merged = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);

    const updateSettings = useCallback(
        (patch: Partial<Settings>) => setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, ...patch })),
        [setSettings]
    );

    // 테마 적용
    useEffect(() => {
        document.documentElement.dataset.theme = merged.theme;
    }, [merged.theme]);

    // 내용이 빈 할 일은 편집 중일 때만 존재 — 편집이 끝났거나 저장돼 있던 빈 항목은 제거
    useEffect(() => {
        setTasks((prev) =>
            prev.some((t) => !t.text.trim() && t.id !== editingId) ? prev.filter((t) => t.text.trim() || t.id === editingId) : prev
        );
    }, [editingId, setTasks]);

    // 형광펜 단일 색(노랑) 전환: 기존 연두/분홍은 노랑으로, 그 밖의 옛 색 키는 제거
    useEffect(() => {
        setTasks((prev) =>
            prev.some((t) => t.color && t.color !== 'yellow')
                ? prev.map((t) =>
                      t.color && t.color !== 'yellow'
                          ? { ...t, color: t.color === 'green' || t.color === 'pink' ? 'yellow' : undefined }
                          : t
                  )
                : prev
        );
    }, [setTasks]);

    const tasksFor = useCallback((date: string | null) => tasks.filter((t) => t.date === date && t.kind !== 'holiday'), [tasks]);

    const holidays = useMemo(() => tasks.filter((t) => t.kind === 'holiday' && t.date).map((t) => t.date as string), [tasks]);

    const addTask = useCallback(
        (date: string | null, afterId?: string) => {
            const id = uuidv4();
            const task: Task = { id, text: '', date, completed: false };
            setTasks((prev) => {
                const idx = afterId ? prev.findIndex((t) => t.id === afterId) : -1;
                if (idx === -1) return [...prev, task];
                const next = [...prev];
                next.splice(idx + 1, 0, task);
                return next;
            });
            setEditingId(id);
            return id;
        },
        [setTasks]
    );

    const removeTask = useCallback((id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)), [setTasks]);

    const updateTask = useCallback(
        (id: string, updates: Partial<Task>) =>
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t))),
        [setTasks]
    );

    const moveTask = useCallback(
        (id: string, date: string | null, index: number) =>
            setTasks((prev) => {
                const task = prev.find((t) => t.id === id);
                if (!task) return prev;
                const rest = prev.filter((t) => t.id !== id);
                const moved = { ...task, date };
                const list = rest.filter((t) => t.date === date);
                if (index >= list.length) {
                    const last = list[list.length - 1];
                    if (!last) return [...rest, moved];
                    rest.splice(rest.indexOf(last) + 1, 0, moved);
                } else {
                    rest.splice(rest.indexOf(list[index]), 0, moved);
                }
                return rest;
            }),
        [setTasks]
    );

    const completeAll = useCallback(
        (date: string) =>
            setTasks((prev) => prev.map((t) => (t.date === date && !t.completed && t.kind !== 'holiday' ? { ...t, completed: true } : t))),
        [setTasks]
    );

    const moveIncompleteToNextDay = useCallback(
        (date: string) =>
            setTasks((prev) => {
                const next = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
                const isMoving = (t: Task) => t.date === date && !t.completed && t.kind !== 'holiday' && t.text.trim() !== '';
                if (!prev.some(isMoving)) return prev;
                // 다음날 목록의 맨 아래에 이어 붙임
                return [...prev.filter((t) => !isMoving(t)), ...prev.filter(isMoving).map((t) => ({ ...t, date: next }))];
            }),
        [setTasks]
    );

    /** 휴일 지정/해제: 그 날짜에 kind === 'holiday' 항목을 추가/삭제 */
    const toggleHoliday = useCallback(
        (date: string) =>
            setTasks((prev) =>
                prev.some((t) => t.date === date && t.kind === 'holiday')
                    ? prev.filter((t) => !(t.date === date && t.kind === 'holiday'))
                    : [...prev, { id: uuidv4(), text: '휴일', date, completed: false, kind: 'holiday' }]
            ),
        [setTasks]
    );

    return (
        <TaskContext.Provider
            value={{ tasks, syncStatus, reload: load, settings: merged, updateSettings, editingId, setEditingId, tasksFor, addTask, removeTask, updateTask, moveTask, completeAll, moveIncompleteToNextDay, holidays, toggleHoliday }}
        >
            {children}
        </TaskContext.Provider>
    );
};
