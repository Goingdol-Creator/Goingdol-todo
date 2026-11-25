import { Fragment } from 'react';
import { AlarmClock, Pin, Rocket, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TaskKind } from './context/TaskContext';

/** 시간: "2시", "오후 2시 30분", "2시 반", "14:30", "2pm", "2:30 pm" */
const TIME_RE =
    /((?:오전|오후|아침|점심|저녁|밤|낮)\s*)?\d{1,2}\s*시(?:\s*(?:\d{1,2}\s*분|반))?|\d{1,2}:\d{2}(?:\s*[ap]m)?|\d{1,2}\s*[ap]m\b/gi;

/** 출시 키워드: "정식 출시", "통합 출시", "프리오픈" */
const RELEASE_RE = /정식\s*출시|통합\s*출시|프리\s*오픈/g;

export interface KindDef {
    key: TaskKind;
    label: string;
    /** 슬래시 뒤에 입력해서 고를 수 있는 값들 (초성·한글·영문) */
    aliases: string[];
    /** 메뉴에 보여줄 입력 힌트 */
    hint: string;
    icon: LucideIcon;
    /** 아이콘 색 = 강조되는 글자 색 */
    color: string;
}

/** 배열 순서 = 메뉴/버튼에 보이는 순서 */
export const KINDS: KindDef[] = [
    { key: 'today', label: '오늘 할 일', aliases: ['ㅇ', '오늘', 'today', 't'], hint: '/ㅇ', icon: Pin, color: '#ff9a3d' },
    { key: 'meeting', label: '회의', aliases: ['ㅎ', '회의', 'meeting', 'm'], hint: '/ㅎ', icon: Users, color: '#1fa463' },
    { key: 'release', label: '출시', aliases: ['ㅊ', '출시', 'release', 'r'], hint: '/ㅊ', icon: Rocket, color: '#ee4f98' },
    { key: 'deadline', label: '마감', aliases: ['ㅁ', '마감', 'due', 'd'], hint: '/ㅁ', icon: AlarmClock, color: '#df525f' },
];

export const kindOf = (key?: TaskKind) => KINDS.find((k) => k.key === key);

/** "/" 뒤의 입력(query)에 맞는 구분 목록 */
export const matchKinds = (query: string) => {
    const q = query.trim().toLowerCase();
    return KINDS.filter((k) => k.aliases.some((a) => a.startsWith(q)));
};

/** 구분과 상관없이 모든 할 일에서 자동 강조하는 글자 패턴 */
const HIGHLIGHT_RE = new RegExp(`${TIME_RE.source}|${RELEASE_RE.source}`, 'gi');

/** 패턴에 걸리는 부분을 굵게 바꿔서 돌려줌. color(구분 아이콘 색)가 없으면 글자색은 그대로 */
export const renderHighlighted = (text: string, color?: string) => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(HIGHLIGHT_RE)) {
        const start = m.index ?? 0;
        parts.push(<Fragment key={last}>{text.slice(last, start)}</Fragment>);
        parts.push(<span key={`hit-${start}`} className="time" style={{ color }}>{m[0]}</span>);
        last = start + m[0].length;
    }
    parts.push(<Fragment key={last}>{text.slice(last)}</Fragment>);
    return parts;
};
