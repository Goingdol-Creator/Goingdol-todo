import { Fragment, useEffect, useRef, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, StickyNote, Trash2 } from 'lucide-react';
import { Task, TaskKind, useTasks } from '../context/TaskContext';
import { KINDS, kindOf, matchKinds, splitByPattern } from '../kinds';

/** 형광펜 하이라이트 색 (노랑 하나). task.color === 'yellow' 이면 켜짐 */
export const HIGHLIGHT_COLOR = '#ffe94d';

interface Props {
    task: Task;
    index: number;
    listId: string | null;
}

const TaskItem = ({ task, index, listId }: Props) => {
    const { updateTask, removeTask, addTask, editingId, setEditingId } = useTasks();
    const editing = editingId === task.id;
    const [menuOpen, setMenuOpen] = useState(false);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const rowRef = useRef<HTMLDivElement | null>(null);
    const [sel, setSel] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    // 슬래시 메뉴: 편집 중 "/"로 시작하면 구분 목록을 보여줌
    const slashQuery = editing && task.text.startsWith('/') ? task.text.slice(1) : null;
    const matches = slashQuery === null ? [] : matchKinds(slashQuery);
    const slashOpen = matches.length > 0 && !dismissed;
    useEffect(() => {
        setSel(0);
        setDismissed(false);
    }, [slashQuery]);

    // 편집 시작 시 포커스 + 커서를 끝으로
    useEffect(() => {
        if (editing && taRef.current) {
            const el = taRef.current;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        }
    }, [editing]);

    // 메뉴 바깥 클릭 시 닫기
    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (rowRef.current && !rowRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const kind = kindOf(task.kind);
    const highlighted = task.color === 'yellow';

    /** 형광펜 하이라이트 (글자 뒤에만 깔림) */
    const highlight = (node: React.ReactNode) =>
        highlighted ? (
            <span className="label" style={{ '--hl': HIGHLIGHT_COLOR } as React.CSSProperties}>{node}</span>
        ) : (
            node
        );

    /** 구분별 자동 강조: 회의는 시간, 출시는 특정 단어를 아이콘과 같은 색으로 */
    const renderText = (text: string) =>
        kind?.pattern
            ? splitByPattern(text, kind.pattern).map((p, i) =>
                  p.hit ? (
                      <span key={i} className="time" style={{ color: kind.color }}>{p.text}</span>
                  ) : (
                      <Fragment key={i}>{p.text}</Fragment>
                  )
              )
            : text;

    const finishEditing = () => {
        if (!task.text.trim()) removeTask(task.id);
        // 다른 줄이 이미 편집 상태로 넘어간 경우(Enter로 새 줄 생성 등)에는 그 상태를 지우지 않음
        setEditingId((cur) => (cur === task.id ? null : cur));
    };

    const chooseKind = (kind: TaskKind) => {
        updateTask(task.id, { kind, text: '' });
        // 한글 조합이 끝나면서 남은 글자가 다시 들어오는 경우를 대비
        setTimeout(() => updateTask(task.id, { text: '' }), 0);
    };

    const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value.replace(/\n/g, ' ');
        // "/ㅎ " 처럼 슬래시 명령 뒤에 스페이스를 치면 바로 확정 (한글 조합 중에도 동작)
        const m = /^\/(\S+) $/.exec(value);
        if (m) {
            const found = matchKinds(m[1]);
            const exact = found.find((k) => k.aliases.includes(m[1].toLowerCase()));
            const pick = exact ?? (found.length === 1 ? found[0] : undefined);
            if (pick) {
                chooseKind(pick.key);
                return;
            }
        }
        updateTask(task.id, { text: value });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (slashOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((i) => (i + 1) % matches.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((i) => (i - 1 + matches.length) % matches.length);
                return;
            }
            if ((e.key === 'Enter' || e.key === 'Tab') && !e.nativeEvent.isComposing) {
                e.preventDefault();
                chooseKind(matches[sel].key);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setDismissed(true);
                return;
            }
        }
        if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 무시
        if (e.key === 'Enter') {
            e.preventDefault();
            if (task.text.trim()) addTask(task.date, task.id);
            else finishEditing();
        } else if (e.key === 'Escape') {
            taRef.current?.blur();
        } else if (e.key === 'Backspace' && task.text === '') {
            e.preventDefault();
            if (task.kind) {
                updateTask(task.id, { kind: undefined }); // 먼저 구분 아이콘만 해제
                return;
            }
            removeTask(task.id);
            setEditingId(null);
        }
    };

    return (
        <Draggable draggableId={task.id} index={index} isDragDisabled={editing}>
            {(provided, snapshot) => (
                <div
                    ref={(node) => {
                        provided.innerRef(node);
                        rowRef.current = node;
                    }}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`task${task.completed ? ' done' : ''}${snapshot.isDragging ? ' dragging' : ''}${editing ? ' editing' : ''}`}
                    style={provided.draggableProps.style}
                    data-list={listId ?? 'backlog'}
                >
                    <button
                        className="check"
                        aria-label={task.completed ? '완료 취소' : '완료'}
                        aria-pressed={task.completed}
                        onClick={() => updateTask(task.id, { completed: !task.completed })}
                    >
                        {task.completed && (
                            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                                <path d="M2.5 6.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>

                    {kind && (
                        <span className="kind-icon" style={{ color: kind.color }} title={kind.label}>
                            <kind.icon size={15} strokeWidth={2.2} />
                        </span>
                    )}

                    {editing ? (
                        <div className="input-wrap">
                            <div className="mirror" aria-hidden="true">{highlight(renderText(task.text))}{'\u200b'}</div>
                            <textarea
                                ref={taRef}
                                className="task-input"
                                rows={1}
                                value={task.text}
                                onChange={onChange}
                                placeholder={task.kind ? '' : "'/'로 구분 선택"}
                                onKeyDown={onKeyDown}
                                onBlur={finishEditing}
                            />
                        </div>
                    ) : (
                        <div className="task-text" onClick={() => setEditingId(task.id)}>
                            <span className="txt">{highlight(renderText(task.text))}</span>
                            {task.note && <StickyNote size={12} className="note-badge" />}
                        </div>
                    )}

                    {slashOpen && (
                        <div className="slash-menu" onMouseDown={(e) => e.preventDefault()}>
                            {matches.map((k, i) => (
                                <button
                                    key={k.key}
                                    className={i === sel ? 'sel' : ''}
                                    onMouseEnter={() => setSel(i)}
                                    onClick={() => chooseKind(k.key)}
                                >
                                    <span className="slash-icon" style={{ color: k.color }}><k.icon size={16} strokeWidth={2.2} /></span>
                                    <span className="slash-label">{k.label}</span>
                                    <span className="slash-hint">{k.hint}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <button className="del" aria-label="삭제" title="삭제" onClick={() => removeTask(task.id)}>
                        <Trash2 size={15} />
                    </button>

                    <button className="more" aria-label="더보기" onClick={() => setMenuOpen((o) => !o)}>
                        <MoreHorizontal size={16} />
                    </button>

                    {menuOpen && (
                        <div className="popover" onMouseDown={(e) => e.stopPropagation()}>
                            <div className="kinds">
                                {KINDS.map((k) => (
                                    <button
                                        key={k.key}
                                        className={task.kind === k.key ? 'sel' : ''}
                                        onClick={() => updateTask(task.id, { kind: task.kind === k.key ? undefined : k.key })}
                                    >
                                        <k.icon size={14} strokeWidth={2.2} style={{ color: k.color }} /> {k.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                className={`hl-toggle${highlighted ? ' on' : ''}`}
                                aria-pressed={highlighted}
                                onClick={() => updateTask(task.id, { color: highlighted ? undefined : 'yellow' })}
                            >
                                <span className="hl-sample" style={{ '--hl': HIGHLIGHT_COLOR } as React.CSSProperties}>형광펜</span>
                                <span className="hl-state">{highlighted ? '켜짐' : '꺼짐'}</span>
                            </button>
                            <textarea
                                className="note-input"
                                placeholder="메모 추가…"
                                value={task.note ?? ''}
                                onChange={(e) => updateTask(task.id, { note: e.target.value })}
                                rows={3}
                            />
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default TaskItem;
