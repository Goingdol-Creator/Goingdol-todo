import { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSavedEmail, saveEmail, supabase } from '../lib/supabase';

const Login = () => {
    const [email, setEmail] = useState(getSavedEmail);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
            setError('이메일 또는 비밀번호가 맞지 않아요.');
            setBusy(false);
        } else {
            saveEmail(email.trim()); // 다음부터는 비밀번호만 입력
        }
    };

    return (
        <div className="login">
            <form className="login-card" onSubmit={submit}>
                <h1 className="login-title">Week Todo</h1>
                <input
                    className="login-input"
                    type="email"
                    autoComplete="username"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className="login-input"
                    type="password"
                    autoComplete="current-password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={!!email}
                    required
                />
                {error && <p className="login-error">{error}</p>}
                <button className="login-btn" type="submit" disabled={busy}>
                    {busy ? '확인 중…' : '들어가기'}
                </button>
            </form>
        </div>
    );
};

/** 로그인한 경우에만 children(앱)을 보여줍니다 */
const AuthGate = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null | undefined>(undefined);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
        return () => data.subscription.unsubscribe();
    }, []);

    if (session === undefined) return <div className="login" />;
    if (!session) return <Login />;
    return <>{children}</>;
};

export default AuthGate;
