import { AlarmClock, Pin, Rocket, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TaskKind } from './context/TaskContext';

/** 회의: "2시", "오후 2시 30분", "2시 반", "14:30", "2pm", "2:30 pm" */
const TIME_RE =
    /((?:오전|오후|아침|점심|저녁|밤|낮)\s*)?\d{1,2}\s*시(?:\s*(?:\d{1,2}\s*분|반))?|\d{1,2}:\d{2}(?:\s*[ap]m)?|\d{1,2}\s*[ap]m\b/gi;

/** 출시: "정식 출시", "통합 출시", "프리오픈" */
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
    /** 이 구분에서 자동으로 색을 입힐 글자 패턴 */
    pattern?: RegExp;
}

/** 배열 순서 = 메뉴/버튼에 보이는 순서 */
export const KINDS: KindDef[] = [
    { key: 'today', label: '오늘 할 일', aliases: ['ㅇ', '오늘', 'today', 't'], hint: '/ㅇ', icon: Pin, color: '#ff9a3d' },
    { key: 'meeting', label: '회의', aliases: ['ㅎ', '회의', 'meeting', 'm'], hint: '/ㅎ', icon: Users, color: '#1fa463', pattern: TIME_RE },
    { key: 'release', label: '출시', aliases: ['ㅊ', '출시', 'release', 'r'], hint: '/ㅊ', icon: Rocket, color: '#ee4f98', pattern: RELEASE_RE },
    { key: 'deadline', label: '마감', aliases: ['ㅁ', '마감', 'due', 'd'], hint: '/ㅁ', icon: AlarmClock, color: '#df525f' },
];

export const kindOf = (key?: TaskKind) => KINDS.find((k) => k.key === key);

/** "/" 뒤의 입력(query)에 맞는 구분 목록 */
export const matchKinds = (query: string) => {
    const q = query.trim().toLowerCase();
    return KINDS.filter((k) => k.aliases.some((a) => a.startsWith(q)));
};

export interface TextPart {
    text: string;
    hit: boolean;
}

/** 텍스트를 패턴에 걸리는 부분(hit)과 나머지로 나눔 */
export const splitByPattern = (text: string, pattern: RegExp): TextPart[] => {
    const parts: TextPart[] = [];
    let last = 0;
    for (const m of text.matchAll(pattern)) {
        const start = m.index ?? 0;
        if (start > last) parts.push({ text: text.slice(last, start), hit: false });
        parts.push({ text: m[0], hit: true });
        last = start + m[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), hit: false });
    return parts;
};
