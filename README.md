# Goingdol Todo

[Tweek](https://tweek.so/) 스타일의 주간 할 일 플래너. React + TypeScript + Vite, 저장은 Supabase.

## 기능
- 주간 뷰(월~금 + 토/일 2단) / 월간 뷰, 하단 '언젠가 할 일' 패널
- 줄 노트 입력: 빈 줄 클릭 또는 Enter로 추가, 드래그 앤 드롭으로 이동·정렬
- `/` 로 구분 선택: `/ㅇ` 오늘 할 일 · `/ㅎ` 회의 · `/ㅊ` 출시 · `/ㅁ` 마감
- 모든 할 일에서 시간(`2시`, `14:30`)과 출시 키워드(`정식 출시`, `통합 출시`, `프리오픈`)를 구분 아이콘 색의 굵은 글씨로 자동 강조 (구분이 없으면 굵게만)
- 노랑 형광펜, 메모, 삭제
- 요일별 메뉴: 모두 완료 / 미완료 다음날로 넘기기 / 휴일 지정
- 설정: '언젠가 할 일' 표시, 주말 표시
- 비밀번호 로그인(Supabase Auth) 후 일정은 Supabase DB에 저장

## 개발
```bash
npm install
npm run dev
npm run build
```

## Supabase 설정
1. 프로젝트를 만들고 `supabase/schema.sql` 을 SQL Editor에서 실행
2. Authentication에서 사용자 1명 추가, 새 가입(sign up)은 끄기
3. `src/lib/supabase.ts` 의 URL / publishable key 를 본인 프로젝트 값으로 교체

## 배포
`main` 브랜치에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 GitHub Pages로 자동 배포합니다.
저장소 Settings → Pages → Source 를 **GitHub Actions** 로 설정하세요.
