import { useEffect, useRef, useState } from 'react';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { signOut } from '../lib/supabase';

interface Props {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

const Header = ({ currentDate, onPrev, onNext, onToday }: Props) => {
    const { settings, updateSettings, syncStatus, reload } = useTasks();
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

    let title: { main: string; sub: string };
    if (settings.view === 'month') {
        title = { main: format(currentDate, 'M월'), sub: format(currentDate, 'yyyy년') };
    } else {
        const s = startOfWeek(currentDate, { weekStartsOn: 1 });
        const e = endOfWeek(currentDate, { weekStartsOn: 1 });
        title = {
            main: s.getMonth() === e.getMonth() ? format(s, 'M월') : `${format(s, 'M월')} – ${format(e, 'M월')}`,
            sub: format(e, 'yyyy년'),
        };
    }

    return (
        <header className="topbar">
            <div className="nav">
                <h1 className="title">
                    {title.main}
                    {title.sub && <span className="title-sub"> {title.sub}</span>}
                </h1>
                <button className="icon-btn" onClick={onPrev} aria-label="이전"><ChevronLeft size={20} /></button>
                <button className="icon-btn" onClick={onNext} aria-label="다음"><ChevronRight size={20} /></button>
                <button className="pill" onClick={onToday}>오늘</button>
            </div>

            <div className="actions">
                {syncStatus === 'saving' && <span className="sync">저장 중…</span>}
                {syncStatus === 'loading' && <span className="sync">불러오는 중…</span>}
                {syncStatus === 'error' && (
                    <button className="sync error" onClick={reload} title="다시 시도">저장 실패 · 다시 시도</button>
                )}
                <div className="segmented" role="tablist">
                    <button className={settings.view === 'week' ? 'on' : ''} onClick={() => updateSettings({ view: 'week' })}>주</button>
                    <button className={settings.view === 'month' ? 'on' : ''} onClick={() => updateSettings({ view: 'month' })}>월</button>
                </div>
                <div className="menu-wrap" ref={ref}>
                    <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="설정"><SettingsIcon size={18} /></button>
                    {open && (
                        <div className="settings">
                            <div className="switch-row">
                                <span>'언젠가 할 일' 표시</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={settings.showBacklog}
                                    aria-label="'언젠가 할 일' 표시"
                                    className={`switch${settings.showBacklog ? ' on' : ''}`}
                                    onClick={() => updateSettings({ showBacklog: !settings.showBacklog })}
                                />
                            </div>
                            <div className="switch-row">
                                <span>주말 표시</span>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={settings.showWeekend}
                                    aria-label="주말 표시"
                                    className={`switch${settings.showWeekend ? ' on' : ''}`}
                                    onClick={() => updateSettings({ showWeekend: !settings.showWeekend })}
                                />
                            </div>
                            <button className="logout" onClick={() => signOut()}>로그아웃</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
