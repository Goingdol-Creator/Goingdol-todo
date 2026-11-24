import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Highlighter, MoreHorizontal, StickyNote, Trash2 } from 'lucide-react';
import { Task, TaskKind, useTasks } from '../context/TaskContext';
import { KINDS, kindOf, matchKinds, splitByPattern } from '../kinds';

/** 형광펜 하이라이트 색 (노랑 하나). task.color === 'yellow' 이면 켜짐 */
export const HIGHLIGHT_COLOR = '#ffe94d';

/** 완료 순간 튀어나가는 가루 입자: [x 이동, y 이동, 크기] */
const DUST: [number, number, number][] = [
    [14, -12, 1], [22, -2, 0.8], [16, 10, 1.1], [6, -16, 0.7], [8, 14, 0.8], [28, -9, 0.6], [26, 8, 0.7],
];

/**
 * 팝업을 document.body 로 꺼내 화면 기준(fixed)으로 띄움.
 * 스크롤 영역(overflow)이나 아래 섹션('언젠가 할일' 등)에 가려지지 않고 항상 최상단에 표시됨.
 * 아래 공간이 모자라면 위쪽으로 뒤집어서 보여줌.
 */
const Floating = ({
    anchor, align, top, className, innerRef, children, ...rest
}: {
    anchor: React.RefObject<HTMLElement | null>;
    align: 'left' | 'right';
    top: number;
    className: string;
    innerRef?: React.MutableRefObject<HTMLDivElement | null>;
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
    // 상태로 노드를 받아야 마운트 직후에도 위치 계산이 확실히 실행됨
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    const setRef = useCallback(
        (n: HTMLDivElement | null) => {
            setEl(n);
            if (innerRef) innerRef.current = n;
        },
        [innerRef]
    );
    const [pos, setPos] = useState<React.CSSProperties>({ visibility: 'hidden' });

    useLayoutEffect(() => {
        const update = () => {
            const a = anchor.current;
            if (!a || !el) return;
            const r = a.getBoundingClientRect();
            const h = el.offsetHeight;
            let y = r.top + top;
            if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h + 4); // 아래가 모자라면 위로
            const next: React.CSSProperties =
                align === 'left'
                    ? { top: y, left: r.left }
                    : { top: y, right: Math.max(8, window.innerWidth - r.right - 4) };
            // 값이 같으면 상태를 바꾸지 않아 무한 렌더 방지
            setPos((p) => (p.top === next.top && p.left === next.left && p.right === next.right && !p.visibility ? p : next));
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    });

    return createPortal(
        <div
            {...rest}
            ref={setRef}
            className={className}
            style={{ position: 'fixed', zIndex: 3000, ...pos }}
        >
            {children}
        </div>,
        document.body
    );
};

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
    const popRef = useRef<HTMLDivElement | null>(null);
    const [sel, setSel] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const [completing, setCompleting] = useState(false);
    const completingTimer = useRef<number>();
    useEffect(() => () => window.clearTimeout(completingTimer.current), []);

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
            const t = e.target as Node;
            // 팝업은 body 로 빠져 있으므로 팝업 안쪽 클릭도 '안쪽'으로 취급
            if (rowRef.current && !rowRef.current.contains(t) && !popRef.current?.contains(t)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const kind = kindOf(task.kind);
    /** 목록 첫 줄은 부모가 없으므로 들여쓰기 무시 */
    const child = task.indent === 1 && index > 0;
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
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                if (child) updateTask(task.id, { indent: undefined });
            } else if (index > 0 && !child) {
                updateTask(task.id, { indent: 1 }); // 위에 할 일이 있을 때만
            }
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (task.text.trim()) addTask(task.date, task.id);
            else finishEditing();
        } else if (e.key === 'Escape') {
            taRef.current?.blur();
        } else if (e.key === 'Backspace' && task.text === '') {
            e.preventDefault();
            if (child) {
                updateTask(task.id, { indent: undefined }); // 들여쓰기 먼저 해제
                return;
            }
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
                    className={`task${task.completed ? ' done' : ''}${task.completed && completing ? ' completing' : ''}${child ? ' child' : ''}${snapshot.isDragging ? ' dragging' : ''}${editing ? ' editing' : ''}`}
                    style={provided.draggableProps.style}
                    data-list={listId ?? 'backlog'}
                >
                    <button
                        className="check"
                        aria-label={task.completed ? '완료 취소' : '완료'}
                        aria-pressed={task.completed}
                        onClick={() => {
                            if (!task.completed) {
                                // 완료로 바뀌는 순간에만 모션 재생 (취소선 → 회색 + 흔들림)
                                setCompleting(true);
                                window.clearTimeout(completingTimer.current);
                                completingTimer.current = window.setTimeout(() => setCompleting(false), 1300);
                            } else {
                                setCompleting(false);
                            }
                            updateTask(task.id, { completed: !task.completed });
                        }}
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
                            <span className="txt">
                                {highlight(renderText(task.text))}
                                {completing && task.completed && (
                                    <span className="dust" aria-hidden="true">
                                        {DUST.map((d, i) => (
                                            <i key={i} style={{ '--dx': `${d[0]}px`, '--dy': `${d[1]}px`, '--s': d[2] } as React.CSSProperties} />
                                        ))}
                                    </span>
                                )}
                            </span>
                            {task.note && <StickyNote size={12} className="note-badge" />}
                        </div>
                    )}

                    {slashOpen && (
                        <Floating anchor={rowRef} align="left" top={40} className="slash-menu" onMouseDown={(e) => e.preventDefault()}>
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
                        </Floating>
                    )}

                    <button className="del" aria-label="삭제" title="삭제" onClick={() => removeTask(task.id)}>
                        <Trash2 size={13} />
                    </button>

                    <button className="more" aria-label="더보기" onClick={() => setMenuOpen((o) => !o)}>
                        <MoreHorizontal size={14} />
                    </button>

                    {menuOpen && (
                        <Floating anchor={rowRef} align="right" top={38} className="popover" innerRef={popRef} onMouseDown={(e) => e.stopPropagation()}>
                            <div className="kinds">
                                {KINDS.map((k) => (
                                    <button
                                        key={k.key}
                                        className={task.kind === k.key ? 'sel' : ''}
                                        onClick={() => updateTask(task.id, { kind: task.kind === k.key ? undefined : k.key })}
                                    >
                                        <span className="kind-dot"><k.icon size={16} strokeWidth={2.2} style={{ color: k.color }} /></span>
                                        <span>{k.label}</span>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className={`hl-btn${highlighted ? ' sel' : ''}`}
                                    aria-pressed={highlighted}
                                    aria-label="형광펜"
                                    title="형광펜"
                                    onClick={() => updateTask(task.id, { color: highlighted ? undefined : 'yellow' })}
                                >
                                    <Highlighter size={14} strokeWidth={2.2} />
                                </button>
                            </div>
                            <textarea
                                className="note-input"
                                placeholder="메모 추가…"
                                value={task.note ?? ''}
                                onChange={(e) => updateTask(task.id, { note: e.target.value })}
                                rows={3}
                            />
                        </Floating>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default TaskItem;
