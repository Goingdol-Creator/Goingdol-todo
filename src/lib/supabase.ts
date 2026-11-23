import { createClient } from '@supabase/supabase-js';

// 공개되어도 안전한 값입니다. (anon/publishable key — 실제 보호는 DB의 RLS 규칙이 담당)
const SUPABASE_URL = 'https://pdmgoddpjwhxofmnmfvh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CqzUz0lOKiLE0GX_33wFHg_4y9zsLGx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TASK_CACHE_KEY = 'tweek-tasks';
const EMAIL_KEY = 'tweek-login-email';

export const getSavedEmail = () => {
    try {
        return localStorage.getItem(EMAIL_KEY) ?? '';
    } catch {
        return '';
    }
};

export const saveEmail = (email: string) => {
    try {
        localStorage.setItem(EMAIL_KEY, email);
    } catch {
        /* 무시 */
    }
};

/** 로그아웃: 이 브라우저에 남은 일정 캐시도 함께 지웁니다 */
export const signOut = async () => {
    await supabase.auth.signOut();
    try {
        localStorage.removeItem(TASK_CACHE_KEY);
    } catch {
        /* 무시 */
    }
};
