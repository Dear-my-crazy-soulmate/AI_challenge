# PLAN.md — 단계별 개발 계획

규칙: 위에서부터 한 단계씩 진행한다. 각 단계는 **실행해서 확인**하고 커밋한 뒤 체크한다.
일정 기준: 오늘 10/12(월) → 기능 동결 10/25 → 제출 10/26~30

## Step 0. 프로젝트 초기화 (10/12~13)
- [x] Next.js(App Router, TypeScript, Tailwind) 프로젝트 생성
- [x] `.gitignore`에 `.env.local`, `data/raw/` 포함 확인, `.env.example` 작성
- [x] Vitest 설치, 샘플 테스트 1개 통과
- [x] `git init`, 첫 커밋, GitHub 연결
- [x] Vercel에 연결해 빈 화면 배포, URL 확인
- 확인: `npm run dev`, `npm test`, 배포 URL 접속
- 결과: 배포 URL https://ai-challenge-ivory.vercel.app/ (기본 Next.js 화면 확인)

## Step 1. LLM 인터페이스와 mock (10/13)
- [ ] `src/lib/llm/types.ts`: `generate`, `generateJson`, `embed` 인터페이스
- [ ] `mock.ts`: 고정 응답을 돌려주는 구현
- [ ] ChatKHU API 방식이 확인되면 `chatkhu.ts` 추가(확인 전에는 만들지 않음)
- [ ] `docs/prompt-log.md` 틀 만들기
- 확인: mock으로 단위 테스트 통과

## Step 2. 데이터 모델과 규칙 엔진 (10/14~15)
- [ ] `data/curated/` 스키마 정의: 전공, MD, 이수요건 (`source_url`, `as_of` 필수)
- [ ] 소수 샘플(전공 2개, MD 1개)로 시작, 값은 사용자가 원문 확인 후 입력
- [ ] `src/lib/rules/`: 선택 가능한 조합과 필요 학점 계산 순수 함수 + 테스트
- 확인: 테스트 통과, 잘못된 입력 처리

# 교육과정 데이터화 파이프라인 구현 (PLAN.md 사이 단계: "Step 2a")

먼저 CLAUDE.md, PLAN.md, README.md를 읽어라. 그 규칙(한 번에 한 단계, 만들 파일 3~5줄로 먼저 말하고 OK 받기, 실행해서 확인 후 3줄 요약, 새 패키지는 허락받기, 커밋 접두사)을 **그대로 따른다**. 아래와 충돌하면 구현 전에 알려라.

## 배경
- 경희대 학과별 교육과정 PDF(`data/raw/<학과명>.pdf`, git 제외)에서 "본전공 + 다전공"을 골랐을 때 들어야 할 과목을 계산하는 기능 1의 데이터를 만든다.
- 이 파이프라인은 **오프라인 데이터 준비 도구**다. Python으로 `scripts/pipeline/`에 두고, 앱 런타임에는 쓰지 않는다. 앱이 쓰는 계산(plan)은 마지막 단계에서 TypeScript(`src/lib/rules/`)로 만든다.
- PDF는 이미 4개 있다: 인공지능학과, 철학과, 컴퓨터공학과, 소프트웨어융합학과. 모두 텍스트 추출 가능(OCR 불필요)하다. `pdftotext -layout`으로 페이지별 텍스트를 얻는다(`\f`로 페이지 분리).
- 설계 원칙: ① 학점·과목 계산은 코드만 한다(LLM 금지) ② LLM(또는 사람)은 구조화만 하고, 결과는 코드가 원문과 대조해 검증한다 ③ 검증을 못 통과한 데이터는 앱 데이터에 넣지 않는다 ④ 모호하거나 모순된 원문은 임의로 해결하지 말고 경고로 남긴다 ⑤ 조용한 실패 금지(try/except로 삼키지 않는다).

## 폴더와 경로 (하드코딩 금지, 저장소 루트 기준 상대 경로)
```
scripts/pipeline/   paths.py, ingest.py, detect.py, parse_table.py, schema.py, build.py, plan.py
scripts/batch_check.py
tests/pipeline/     test_pipeline.py
data/raw/           PDF (git 제외)
data/work/          중간 산출물: 페이지 텍스트, 과목 마스터 원본 (git 제외)
data/extracted/     LLM/사람이 만든 구조화 JSON (커밋)
data/curated/       검증 통과분 출력: courses.json, requirements/<학과>.json, status.json, conflicts.json
```
`paths.py`에 ROOT를 한 번만 정의하고 모든 스크립트가 이를 쓴다. `.gitignore`에 `data/work/`, `out/`, `__pycache__/`를 추가한다. Python 코드는 `python -I`로 실행해도 import가 되게 `sys.path`를 명시적으로 다룬다.

## 단계 (각 단계 끝에 멈추고 보고, 내가 OK 하면 다음으로)
### A. ingest + detect
- `ingest.py`: `pdftotext -layout`로 페이지 텍스트를 `data/work/<학과>.pages.json`에 저장. pdftotext가 없으면 설치 방법을 알려 주고, 대체 라이브러리 사용은 허락받는다.
- `detect.py`: 페이지 역할 탐지. 키워드 + 구조 신호 + 인접 페이지 연속성으로 판정한다.
  - `grad_structure`: "교육과정 기본구조표"가 있고 "교양교육과정 기본구조표"만 있는 페이지는 제외, "전공학점" 포함.
  - `double_table`: "다전공 전공과목 편성표". `double_rule`: "다전공과정" 또는 "다전공으로 이수".
  - `minor_table`: "부전공 전공과목 편성표". `minor_rule`: "부전공과정" 또는 "부전공이수학점" 또는 "부전공 이수".
  - `microdegree`: "마이크로디그리"가 3회 이상 + ("이수체계도" 또는 "마이크로디그리명").
  - `course_table`(별표1): 학수번호 정규식 `\b[A-Z]{2,6}\d{3,4}\b`이 8개 이상이고, 제목("교육과정 편성표"+"학수번호")으로 시작하거나 직전 페이지가 과목표일 때 이어짐. "경과조치, 대체인정, 대체과목, 폐지, 선수과목, 교과목 해설"가 들어간 페이지와 마이크로디그리 페이지는 제외.
- 검증 기준(정답 페이지, 1-based): 인공지능학과 구조표[2], 다전공표[4], 다전공규정[2,3,5], 과목표[7,8], MD[24~31]. 철학과 구조표[1], 다전공규정[1,3,4], 부전공규정[1,4], 과목표[7,8], MD[19,20,21]. 이 정답과 비교해 정밀도·재현율을 출력하는 `--eval` 옵션을 만든다(목표: 재현율 1.0).
- 철학과는 "다전공 전공과목 편성표" 제목이 없는 서식(규정이 시행세칙 조문+기본구조표에만 있음)이다. 이것도 잡혀야 한다.

### B. parse_table (별표1 → 과목 마스터, LLM 없음)
- 입력: course_table 페이지. 출력: `[{row, code, name, credits, page}]`.
- 레이아웃 함정: 과목명이 두 줄로 쪼개져 위/아래 줄에 있다(예: "모바일/웹서비스" / "프로그래밍", "인공지능과" / "게임프로그래밍"); 행번호만 있고 코드가 다음 줄에 있는 행(몰입심화학습(AI데이터클 / · 라우드디자인)); 이수구분 단어(전공, 필수, 선택, 기초, (교직))와 세로쓰기 한 글자("학/부/과/정")가 이름에 섞인다. 이들을 제거하고, **행번호가 1..N으로 연속**인지 스스로 검증한다.
- 정답: 인공지능학과 67행(CSE438은 2학점), 철학과 45행(HUMAN1001은 1학점, 졸업논문(철학) PHIL4004는 0학점).

### C. schema + 구조화 JSON
- `schema.py`(pydantic, 설치 허락 요청): Group{category, sub, rule(all|choose_credits|choose_n), required_credits, choose_n, courses[원문 표기 이름], pool_rows[start,end], coded[{code,name,credits}], declared_count, declared_credits, page, evidence}, Stated{기초,필수,선택,계,page,evidence}, Requirement{kind(single|double|minor|microdegree), name, total_credits, stated, groups, extra_rules[{id,text,page,evidence,applies_if,status,why}]}, DeptFile{dept, college, source_pdf, graduation_credits, table_pages, requirements, notes}.
- 모든 값은 **원문 페이지를 읽고** 만든다. `evidence`는 원문에서 그대로 옮긴 한 줄이다. `source_url`, `as_of`는 내가 모르는 값이므로 TODO로 두고 나한테 알려라.
- 인공지능학과(단일, 다전공)와 철학과(단일, 다전공, 부전공, 마이크로디그리 3개)를 `data/extracted/<학과>.json`으로 작성한다. 아래 "원문에서 확인된 사실"을 정답으로 쓴다.

### D. build (검증·병합·상태·export)
- 과목명→학수번호 매칭: 공백·`·`·학과 태그 `(CSE|SWCON|EE)` 제거 후 정확 일치, 안 되면 유사도 0.8 이상을 FUZZY_MATCH 경고, 아니면 UNRESOLVED_COURSE(필수 그룹이면 error, 선택 풀이면 warn).
- 검증 코드: NO_EVIDENCE(근거 문장이 해당 페이지에 공백 무시하고 존재), CREDIT_MISMATCH(필수 그룹 학점합≠요구), POOL_TOO_SMALL, STRUCT_MISMATCH/STRUCT_SUM(기본구조표 숫자와 그룹합), TOTAL_MISMATCH, COUNT_MISMATCH·POOL_CREDIT_MISMATCH(경고), CODE_NAME_MISMATCH·CODE_NOT_IN_OWN_MASTER(마이크로디그리 표의 학수번호가 별표1과 다르면 error), AMBIGUOUS_RULE(경고).
- 상태: error가 있으면 `needs_review`, 없으면 `auto_pass`. `verified`는 사람이 승인했을 때만. `data/curated/`에는 auto_pass 이상만 export. 학과 간 같은 학수번호인데 이름/학점이 다르면 `conflicts.json`.

### E. plan → TypeScript
- Python `plan.py`로 먼저 동작을 확인한 뒤, `src/lib/rules/`에 순수 함수로 옮기고 Vitest 테스트를 쓴다. 입력은 (본전공, 두 번째 전공, kind, name). 출력: 본전공을 단일→다전공 체계로 전환한 요건, 두 번째 전공 요건, 학점 합계와 절감 학점, 단일에서 필수였다가 빠지는 과목, 두 전공의 중복 학수번호, 경고 목록. 데이터가 없거나 검증 미통과면 "제공 불가" 사유를 돌려준다. `applies_if`(예: 문과대학)가 본전공 단과대와 다르면 "해당 없을 가능성, 확인 권장"으로 안내한다.

### F. 일괄 점검기
- `scripts/batch_check.py <폴더> <출력폴더>`: ingest+detect+parse_table만 돌려(LLM 없음) 학과별 GREEN/YELLOW/RED와 `report.md/.csv`를 만든다. 판정: 스캔본 의심(텍스트 없는 페이지 30% 초과), 기본구조표/다전공 근거/과목표 미탐지, 과목 행번호 불연속, 학점 이상(없거나 6 초과), 학수번호 중복 과다, 과목표 후보 페이지 8개 초과, 기본구조표에서 `기초+필수+선택=계`가 되는 연속 4개 정수 후보를 못 찾음. 한 학과가 실패해도 나머지는 계속 처리한다.

## 원문에서 확인된 사실 (테스트 정답)
- 인공지능학과(소프트웨어융합대학, 졸업 130): 단일 기초12/필수42/선택27=81, 다전공 12/30/9=51.
  - 단일: 기초 4과목; SW필수 21(웹/파이선, 객체지향, 자료구조, 운영체제, 알고리즘, 캡스톤, 졸업프로젝트, 졸업논문(인공지능)=0학점); AI필수 21(인공지능개론, 인공지능프로그래밍, 딥러닝, 실전기계학습, 기계학습, 인공지능과윤리, 고급딥러닝); SW선택 9(풀 17과목); AI선택 18(풀 34과목).
  - 다전공: 기초 12(4과목); SW필수 12(자료구조, 알고리즘, 캡스톤, 졸업프로젝트, 졸업논문(인공지능)); AI필수 18(인공지능프로그래밍, 기계학습, 딥러닝, 실전기계학습, 고급딥러닝, 인공지능과윤리); SW선택 3(풀 13); AI선택 6(풀 34). AI선택 풀의 "단기현장실습/장기현장실습"은 2과목으로 센다.
  - 규칙: 산학필수 9학점(제6조, 단일·다전공 모두 적용; 다전공에서 충족 방식 불명 → ambiguous), 졸업논문(인공지능) 수강신청 필요, 졸업을 위해 다전공/부전공/마이크로디그리 중 1개 필수. 부전공 학점 기준은 원문에 없음(pending), 마이크로디그리(p24~31)는 이번 범위 밖.
  - 원문 표기 오류: 별표1 "메타버스테이터처리"(CSE430), "컴퓨터비젼"(CSE441)은 편성표 표기와 다르다(FUZZY 경고). 창업현장실습·단기/장기현장실습은 별표1에 코드·학점이 없다(UNRESOLVED 경고).
- 철학과(문과대학, 졸업 120): 단일 6/6/52=64, 다전공 6/6/27=39, 부전공 필수6+선택15=21(부전공은 전공이수로 인정 안 됨). 트랙(철학-문학/사학)은 단일 전용이라 제외.
  - 별표1 행: 1~3은 전공필수(졸업논문(철학) PHIL4004=0학점, 논리와 사고 PHIL1035, 이야기와 철학 PHIL3036), 4~5는 전공기초(소크라테스 PHIL1038, 유가철학 PHIL2040), 6~42는 전공선택(37과목, HUMAN1001 인문학과진로탐색=1학점, 나머지 3학점), 43~45는 전공선택(교직)으로 풀에서 제외.
  - 부전공 필수: 논리와 사고, 이야기와 철학(졸업논문은 단일/다전공만 해당, 제10조).
  - 마이크로디그리: 문명과 철학(PHIL1038, 2040, 2001, 4053; 12학점), 과학과 철학(PHIL3009, PHIL0000 인지과학, PHIL4002 심리철학, PHIL3055; 12학점), 인지과학(4과목 중 3과목 9학점: PHIL3059, PHIL3058, ENGLI3016, ENGLI4017).
  - 규칙: 졸업논문(철학) 수강신청(단일·다전공, p4), 인문학과진로탐색은 문과대학 소속 졸업요건(applies_if), 영어강의 3과목(다전공 학생 적용 여부 불명 → ambiguous).
  - 원문 불일치(경고로 남길 것): 과학과 철학 MD의 PHIL0000/PHIL4002는 별표1의 PHIL3059/PHIL4022와 다르다 → 그 마이크로디그리는 needs_review로 export 제외. 요약표의 전공선택 "37과목 111학점"은 별표1 합 109학점과 다르다(HUMAN1001이 1학점). 요약표의 전공필수 "2과목"은 별표1의 3과목(졸업논문 0학점 포함)과 다르다.

## 완료 조건 (테스트로 증명)
1. 인공지능학과(본전공) + 철학과(다전공): 본전공 단일81→다전공51, 철학 39, 합계 90, 절감 30, 학수번호 중복 없음, 필수에서 빠지는 과목은 {AI1001, CSE103, CSE301, SWCON104}, 철학 필수 5과목 {PHIL1038, 2040, 1035, 3036, 4004}, 인공지능 다전공 필수 15과목, 인문학과진로탐색은 "해당 없을 가능성"으로 안내, 졸업논문 안내 2건 이상.
2. 철학 부전공 21학점·문명과 철학 12학점은 계산 가능, 과학과 철학 마이크로디그리와 존재하지 않는 학과는 "제공 불가".
3. 고장 주입 테스트(선택학점 27→24, 근거 문장 조작, 전공기초에 3과목 포함, 없는 과목을 필수에 추가)에서 검증기가 각각 STRUCT/TOTAL_MISMATCH, NO_EVIDENCE, CREDIT_MISMATCH, UNRESOLVED_COURSE를 낸다.
4. detect 재현율 1.0, parse_table 행 수 일치, batch_check가 4개 학과에서 오류 없이 끝난다.
5. 각 단계 끝에 변경 요약과 남은 위험 3줄을 보고하고 커밋(`feat:` 접두사). 기존 테스트를 약화하지 않는다.

시작하기 전에 A단계에서 만들 파일 목록을 3~5줄로 알려 줘.

## Step 3. Supabase 연결 (10/15~16)
- [ ] Supabase 프로젝트와 `supabase/migrations/` 초기 스키마(Major, Requirement, Challenge, Attempt, Post, Comment, SourceDoc)
- [ ] 클라이언트 생성, 환경변수 연결, curated 데이터 적재 스크립트
- 확인: 앱에서 전공 목록 조회

## Step 3a. 로그인과 프로필 (임시 구현, Step 3 사이)
- [x] `src/lib/auth/`: `AuthService` 인터페이스 + 브라우저 저장 임시 구현(`mock.ts`), 입력 검증 `src/lib/safety/input.ts`
- [x] `/login`, `/signup`(2단계: 계정 → 본전공·관심 전공), `/profile`, 홈 계정 버튼, 계산기에서 내 본전공 바로 시작·관심 전공 우선 표시
- [ ] Step 3에서 Supabase Auth로 `AuthService` 교체(화면 코드는 그대로), 프로필은 RLS 적용 테이블에 저장
- [ ] 학과별 캐릭터 PDF를 받으면 이미지로 변환해 `public/avatars/`에 넣고 `src/lib/avatars.ts`에 학과명과 연결
- [x] 디자인 v2 적용(10/24): 4개 탭(홈·계산기·체험·MY), 홈 "내 목표" 카드(계산 결과를 목표로 저장, 이 기기에만 저장), MY 탭, 계산기가 내 본전공으로 바로 시작
- [x] 체험 문제 화면(`/experience`): 시안의 4개 전공×3문제를 `data/seed/quiz_sample.json`에 `is_sample: true`로 저장, 채점은 `src/lib/quiz.ts`(코드). AI 생성·검수(Step 6)는 아직 없음
- 개인정보: 사용자 결정으로 프로필에 이름·학번(선택 입력)·학년을 저장한다(CLAUDE.md 규칙 4의 예외). LLM에는 `forLlm()`이 학과·학년만 넘긴다. 연락처는 받지 않는다. 임시 로그인은 화면에 "예시 로그인"으로 표시한다.
- 시안의 시간표·들은 과목·과목 추천은 범위에서 제외(미구현).

## Step 4. 온보딩과 제도 가이드 화면 (기능 1) (10/16~18)
- [ ] 본전공 입력 화면 → 선택 가능한 조합 결과 화면(규칙 엔진 연결)
- [ ] 다전공·부전공·MD 비교표(출처·기준일 표시)
- 확인: 모바일 폭에서 흐름이 끊기지 않음

## Step 5. RAG Q&A (기능 1) (10/18~20)
- [ ] 청킹·임베딩·pgvector 검색 (`src/lib/rag/`)
- [ ] "근거로만 답하고 출처 표기, 없으면 공식 확인 안내" 프롬프트 v1
- [ ] 골든셋 20개 작성(`docs/eval/`), 정확도·출처 일치율 측정, v1→v2 개선 기록
- 확인: 근거 없는 질문에 답을 거부함

## Step 6. 체험 챌린지 (기능 2) (10/19~22)
- [ ] 문제 JSON 스키마, 생성 프롬프트 v1, 자체 검증 프롬프트
- [ ] 상태 `draft → verified → approved`, 검수 화면(간단)
- [ ] 출제 → 풀이 → 객관식 코드 채점 → 서술형 루브릭 피드백 → 리포트
- [ ] 적합도는 "참고 지표"로 표기
- 확인: 승인된 문제만 노출, 생성 실패 시 캐시 폴백

## Step 7. 커뮤니티 최소판 (기능 3) (10/22~24)
- [ ] 후기 작성(구조화 필드)·조회·질문·댓글, RLS
- [ ] 작성 시 개인정보·욕설 검사, 후기 AI 요약(출처 연결)
- [ ] 시드 후기는 동의받은 실제 후기 또는 `is_sample` 표기
- 확인: 본인 글만 수정 가능

## Step 8. 마무리와 동결 (10/24~25)
- [ ] 사용자 테스트 5~8명, 결과 기록
- [ ] 시연 폴백, 오류 화면, 모바일 점검
- [ ] 시연 영상 녹화, **10/25 기능 동결**

## 병행: 매 단계 끝에
- [ ] `docs/prompt-log.md` 갱신 (AI가 틀렸고 사람이 고친 사례 포함)
- [ ] 커밋, `/clear`
