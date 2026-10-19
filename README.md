# 다전공 탐색 서비스 (가칭)

2026학번부터 다전공·부전공·마이크로디그리(MD)가 졸업요건이 되면서, 신입생이 **정보를 찾고, 전공을 체험하고, 경험자 후기를 확인해 결정**할 수 있도록 돕는 웹 서비스입니다.
2026 KHU AI Challenge 출품작이며, 부문은 AI 문제해결 솔루션입니다(팀 확정 필요).

> 상태: 기능 1의 "본전공 + 다전공/부전공 → 필요 학점과 과목" 화면(`/onboarding`)이 동작합니다(국제캠퍼스 2026학년도 기준). 진행 순서는 [PLAN.md](./PLAN.md)를 따릅니다.

## 세 가지 기능

| 기능 | 설명 | 핵심 기술 |
|---|---|---|
| 1. 정보 통합 | 본전공을 입력하면 선택 가능한 조합과 필요 학점을 계산하고, 제도 질문에 출처를 붙여 답변 | 규칙 엔진(코드) + RAG |
| 2. AI 전공 체험 | 관심 전공의 입문 문제를 풀고 AI 피드백과 적합도 참고 리포트를 받음 | 문제 생성 → 자체 검증 → 사람 검수 → 캐시 |
| 3. 커뮤니티 | 전공별 구조화된 후기, 질문, AI 후기 요약 | Supabase + RLS, LLM 요약·필터 |

## 설계 원칙

- **계산은 코드, 설명은 LLM.** 학점·조합 판정은 LLM에 맡기지 않습니다.
- **출처 없으면 답하지 않음.** 모든 규정 답변에 출처와 기준일을 붙입니다.
- **사람이 검수한 문제만 노출.** AI 생성 문제는 `approved` 상태만 사용자에게 보입니다.
- **개인정보 미수집·미전송.** 학번, 이름, 연락처는 저장하지 않고 LLM에도 보내지 않습니다(ChatKHU 이용 가이드 준수).
- **가상 데이터는 표기.** 예시 데이터는 화면에 "예시 데이터"로 표시합니다.

## 기술 스택

Next.js (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, pgvector) · Vitest · Vercel

LLM은 ChatKHU를 우선 사용합니다. API 연동 방식은 확인 중이므로, 처음에는 mock 구현으로 개발하고 `src/lib/llm/`의 인터페이스 뒤에서 교체합니다.

## 폴더 구조

```
.
├── CLAUDE.md                 # Claude Code가 매 세션 읽는 규칙
├── README.md
├── PLAN.md                   # 단계별 개발 계획 (체크리스트)
├── .env.example              # 필요한 환경변수 이름만 (값 없음)
├── .gitignore
├── package.json
├── data/
│   ├── curated/              # 사람이 검증한 규정·전공·MD 데이터 (source_url, as_of 필수)
│   ├── raw/                  # 수집한 원문 (git 제외 권장)
│   └── seed/                 # 시연용 후기·문제 시드 (is_sample 표기)
├── docs/
│   ├── prompt-log.md         # 프롬프트 버전 로그 (서식4 증빙)
│   ├── eval/                 # 골든셋, 평가 결과
│   └── decisions.md          # 결정 기록
├── supabase/
│   └── migrations/           # DB 스키마 SQL
├── scripts/                  # 임베딩 적재, 문제 생성 배치 등 1회성 스크립트
├── src/
│   ├── app/                  # 화면과 API 라우트
│   │   ├── page.tsx          # 홈
│   │   ├── onboarding/       # 본전공 입력
│   │   ├── guide/            # 제도 비교 + Q&A (기능 1)
│   │   ├── experience/       # 체험 챌린지 (기능 2)
│   │   ├── community/        # 후기·질문 (기능 3)
│   │   └── api/              # chat, challenge, posts 등
│   ├── components/           # 공용 UI
│   ├── lib/
│   │   ├── llm/              # LLM 인터페이스, ChatKHU·mock 구현, prompts/
│   │   ├── rag/              # 청킹, 임베딩, 검색
│   │   ├── rules/            # 학점·조합 판정 (순수 함수)
│   │   ├── safety/           # 개인정보 마스킹, 입력 검사
│   │   └── supabase/         # 클라이언트 생성
│   └── types/                # 공용 타입
└── tests/                    # rules, rag, safety 테스트
```

## 시작하기

### 1. 앱 실행 (화면만 볼 때)

필요한 것: Git, Node.js(LTS). Python 가상환경은 필요 없습니다. 앱이 쓰는 데이터(`data/curated/`)는 저장소에 들어 있습니다.

```bash
git clone https://github.com/Dear-my-crazy-soulmate/AI_challenge.git
cd AI_challenge
npm install
npm run dev     # 터미널에 Local / Network 주소가 나옵니다
npm test        # Vitest 테스트
```

브라우저에서 **http://localhost:3000/onboarding** 을 엽니다. 홈(`/`)은 아직 Next.js 기본 화면이라 `next.svg`, `vercel.svg` 404 로그가 보여도 정상입니다.

### 2. 팀원과 함께 확인하는 방법

| 방법 | 언제 | 주소 |
|---|---|---|
| A. 각자 실행 | 코드를 같이 고치며 확인할 때 (권장) | 각자 PC의 `http://localhost:3000/onboarding` |
| B. 내 PC 서버를 같이 보기 | 같은 Wi-Fi에서 바로 보여 줄 때 | 서버 켠 사람의 `Network` 주소 + `/onboarding` |
| C. 배포 주소 | 다른 장소에서 보거나 시연할 때 | https://ai-challenge-ivory.vercel.app/onboarding (main에 push된 내용) |

**A. 각자 실행**: 위 1번을 각자 하고, 변경은 `git pull`로 받습니다.

**B. 같은 네트워크에서 한 사람의 서버를 같이 보기**

1. 서버를 켠 사람의 터미널에 나온 `Network: http://192.168.x.x:3000` 주소를 팀원에게 공유합니다(주소는 PC·Wi-Fi마다 다릅니다).
2. 팀원은 그 주소 뒤에 `/onboarding` 을 붙여 엽니다.
3. Windows 방화벽 창이 뜨면 **개인 네트워크**에서 Node.js 허용을 선택합니다. 학교·공용 Wi-Fi는 기기 간 접속이 막혀 있을 수 있어서, 그때는 A나 C를 씁니다.
4. 터미널에 `Blocked cross-origin request to Next.js dev resource /_next/hmr from "192.168.x.x"` 경고가 나오면: 페이지는 열리지만 코드 수정이 화면에 자동 반영(HMR)되지 않습니다. 필요하면 `next.config.ts`에 그 주소를 추가하고 서버를 다시 켭니다. 주소는 PC마다 달라서 저장소에는 커밋하지 않습니다.

   ```ts
   const nextConfig: NextConfig = {
     allowedDevOrigins: ["192.168.x.x"], // 터미널 경고에 나온 주소
     // ...기존 설정
   };
   ```

**C. 배포 주소**: Vercel에 연결된 `main`의 최신 내용입니다. push 후 반영되는 데 몇 분 걸릴 수 있습니다.

**같이 확인할 시나리오** (`/onboarding`)

1. 본전공 `컴퓨터공학과` → 다전공 → `소프트웨어융합학과`: 합계 102학점, 두 전공 모두 "학점 검증 완료", 기초·필수 과목 목록이 나오는지
2. 본전공 `체육학과` → 다전공 → `응용수학과`: "일부 선택 이수"와 "아래 과목 중 선택", 학과 규정 원문이 보이는지
3. 본전공 `컴퓨터공학과` → 부전공 → `전자공학과`: 검증 미통과 안내가 나오는지
4. 본전공 `체육학과` → 다전공 → `인공지능학과`: 학점은 나오고 과목은 "과목 정보 없음"으로 나오는지

화면이 이상하면 주소, 선택한 조합, 화면 캡처를 함께 공유합니다.

### 3. 데이터 파이프라인 실행 (데이터를 다시 만들 때만)

교육과정 PDF에서 `data/curated/`를 다시 만드는 Python 스크립트입니다. Windows에서는 `pdftotext`가 들어 있는 **Git Bash**에서 실행합니다(macOS: `brew install poppler`).

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # macOS/Linux: .venv/bin/python
```

원본 PDF는 저장소에 없습니다(`data/raw/`는 git 제외). 팀 채널에서 `2026경희대 교육과정.pdf`를 받아 `data/raw/`에 넣은 뒤 실행합니다.

```bash
.venv/Scripts/python -I scripts/pipeline/overview.py                       # 학점 개요 검증
PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/book.py        # 책을 학과별로 분리
PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/programs.py    # 과목 데이터 생성
PIPELINE_YEAR=2026 .venv/Scripts/python -I tests/pipeline/test_book.py     # 파이프라인 테스트
```

`(.venv)` 활성화는 필요 없습니다. 위처럼 `.venv/Scripts/python`을 직접 쓰면 됩니다. 앱(`npm run dev`)은 가상환경과 관계없이 실행됩니다.

## Claude Code로 개발하기

1. 프로젝트 루트에서 `claude`를 실행합니다. CLAUDE.md는 자동으로 읽힙니다.
2. 복잡한 단계는 계획 모드(Shift+Tab을 눌러 plan mode)로 먼저 계획을 받고 승인한 뒤 구현시킵니다.
3. 지시는 한 번에 한 단계씩, 이 형식으로 합니다.

   ```
   PLAN.md의 Step N을 진행해 줘.
   먼저 만들 파일과 이유를 알려 주고, 내가 OK 하면 구현해 줘.
   끝나면 실행해서 확인한 결과를 보여 줘.
   ```

4. 단계가 끝나면 커밋하고 `/clear`로 컨텍스트를 비운 뒤 다음 단계를 시작합니다.
5. Claude가 같은 실수를 반복하면 CLAUDE.md에 규칙을 한 줄 추가합니다. 길어지면 줄입니다.

## AI 활용 기록 (대회 서식4)

프롬프트를 쓰거나 바꿀 때마다 `docs/prompt-log.md`에 기록합니다: 단계, 모델, 프롬프트 버전, 문제점, 사람의 수정, 결과. API 키와 개인정보는 넣지 않습니다.

## 일정

| 날짜 | 내용 |
|---|---|
| 10/25 | 기능 동결, 시연 영상 녹화 |
| 10/26~10/30 17시 | 작품 제출 (10/28까지 조기 제출 목표) |
| 11/10 | 본선 발표·시연 |

## 팀 역할

| 역할 | 담당 |
|---|---|
| 기획·데이터 | (미정) |
| 프론트·UX | (미정) |
| 백엔드·DB | (미정) |
| AI 파이프라인 | (미정) |
