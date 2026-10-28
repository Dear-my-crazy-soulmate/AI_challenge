# CLAUDE.md

다전공(다전공·부전공·마이크로디그리) 탐색 서비스. 2026 KHU AI Challenge 출품작이며, 목표는 **끝까지 실행되는 시연**이다.
일정: 제출 10/30 17시 · 예선 서면 심사 11/2~6 · 본선 11/10

## 작업 방식
- 한 번에 한 단계만 한다. 현재 단계는 PLAN.md의 첫 번째 미완료 항목이다. 요청하지 않은 범위로 넓히지 않는다.
- 코드를 쓰기 전에 어떤 파일을 만들고 바꿀지 3~5줄로 먼저 말한다.
- 끝나면 직접 실행하거나 테스트해서 확인하고, 결과와 "무엇을 왜 했는지"를 3줄로 요약한다. 사용자는 코드를 차근차근 이해하며 진행하길 원한다.
- 새 패키지는 추가하기 전에 이유를 말하고 허락을 받는다.
- 작은 단위로 커밋한다. 메시지는 `feat:` / `fix:` / `docs:` 접두사를 쓴다.
- 설명은 한국어로, 코드·식별자·커밋 메시지는 영어로 쓴다.
- 흥미·체험 기능(체험 퀴즈 등)은 팀원 담당이다. 요청이 없으면 그 파일(`QuizApp`, `quiz*`)은 고치지 않는다.

## 스택과 명령어
Next.js(App Router, TypeScript strict) + Tailwind + Supabase(Postgres, Auth) + Vitest. 배포는 Vercel. LLM은 ChatKHU(BAZE API).
- `npm run dev` / `npm run build` / `npm run lint` / `npm test`

## 구조 원칙
- 폴더 구조는 README.md의 "폴더 구조"를 따른다.
- LLM 호출은 `src/lib/llm/`에서만 한다. 공급자(ChatKHU 등)를 바꿔도 나머지 코드가 바뀌지 않게 인터페이스로 감싼다.
- 학점·조합 판정은 `src/lib/rules/`의 순수 함수로 구현하고 테스트를 쓴다.
- 프롬프트는 `src/lib/llm/prompts/`에 버전 파일(`name.v1.ts`)로 저장한다. 수정하면 기존 파일을 덮지 않고 새 버전을 만든다.

## 절대 규칙
1. LLM에게 계산·판정을 시키지 않는다. 학점·과목·조합 판정은 이미 있는 `src/lib/rules/` 코드가 하고, LLM에는 학점 숫자를 보내지도 쓰게 하지도 않는다. LLM(ChatKHU)은 조합 설명(강점·진로 방향)·요약·용어 풀이만 한다.
2. RAG 답변에는 출처와 기준일을 붙인다. 근거를 못 찾으면 추측하지 말고 "공식 확인 필요"로 답한다.
3. 학교 규정·학점·과목 같은 사실을 지어내지 않는다. 값은 `data/curated/`에만 두고 모든 항목에 `source_url`과 `as_of`를 붙인다. 모르면 `TODO`로 남기고 사용자에게 알린다.
4. 이름·학번은 사용자가 입력한 경우에만 이 기기/본인 프로필에 저장하고 LLM에는 보내지 않는다(`forLlm()` 사용). 연락처는 받지 않는다. 사용자 입력은 `src/lib/safety/`를 거친다.
5. API 키는 서버 코드에서만 쓴다. `NEXT_PUBLIC_` 변수에 비밀 값을 넣지 않는다. `.env.local`은 커밋하지 않는다.
6. 가상·예시 데이터에는 `is_sample: true`를 붙이고 화면에 "예시 데이터"로 표기한다.
7. AI가 만든 체험 문제는 `draft → verified → approved` 상태를 거치고, `approved`만 사용자에게 보여 준다.
8. 프롬프트를 바꾸면 `docs/prompt-log.md`에 버전, 바꾼 이유, 결과를 한 줄 남긴다(대회 서식4 증빙).

## 주의할 점
- ChatKHU는 BAZE API Gateway로 호출한다(10/28 확인). OpenAI 호환 `POST {CHATKHU_BASE_URL}/chat/completions`, 헤더 `Authorization: Bearer {CHATKHU_API_KEY}`. 두 변수는 서버 전용이고 `.env.local`과 Vercel(Sensitive)에만 둔다. 문서(https://docs.mindlogic.ai)에 없는 엔드포인트는 만들어 내지 않는다.
- 크레딧이 한정돼 있다(약 9,600, 10/28 기준). 같은 조합은 캐시하고, 하루 호출 상한을 두고, 시험 호출은 필요한 만큼만 한다. 테스트는 `mock.ts`로 하고 실제 API를 부르지 않는다.
- 시연 안정성이 우선이다. 외부 호출이 실패해도 화면이 멈추지 않도록 캐시와 폴백을 둔다.
