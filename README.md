# 다전공 탐색

2026학번부터 다전공·부전공·마이크로디그리(MD) 중 하나가 졸업요건이 되면서, 신입생이 **정보를 찾고, 전공을 체험하고, 경험자 후기를 확인해 결정**할 수 있도록 돕는 앱입니다. 경희대학교 **국제캠퍼스** 전공만 다룹니다(서울캠퍼스 전공은 범위 밖).
2026 KHU AI Challenge 출품작이며, 부문은 AI 문제해결 솔루션입니다(팀 확정 필요).

- 배포 주소: https://ai-challenge-ivory.vercel.app (휴대폰에서 "홈 화면에 추가"로 앱처럼 설치)
- 진행 순서와 할 일: [PLAN.md](./PLAN.md)

## 현재 상태

| 기능 | 상태 | 내용 |
|---|---|---|
| 1. 전공 조합 계획 (`/onboarding`) | **동작** | 본전공 + 희망 다전공·부전공·마이크로디그리를 고르면 필요한 학점과 과목, 적용되는 학교 규칙을 보여 줌 |
| 1-2. 제도 Q&A (RAG) | 준비 중 | 출처를 붙여 제도 질문에 답변 |
| 2. AI 전공 체험 | 준비 중 | 입문 문제 → 자체 검증 → 사람 검수 → 캐시 |
| 3. 커뮤니티 | 준비 중 | 전공별 후기·질문, AI 요약 (Supabase + RLS) |

### 기능 1에서 보여 주는 것

- **학점**: 본전공(다전공을 하면 다전공 기준으로 줄어든 학점)과 희망 전공의 전공기초·필수·선택 학점, 합계
- **과목**: 전공기초·전공필수 과목 목록. 과목 학점 합이 필요 학점과 같으면 "모두 이수", 더 많으면 "아래 중 선택", 맞지 않으면 "학과 확인 필요"로 표시하고 전공선택은 후보 목록으로 보여 줌
- **학과 규정 원문**: 그 과정에 관한 학과 시행세칙 문장을 쪽 번호와 함께 표시
- **학교 공통 규칙** (교육과정 p.25~26, p.115~118)
  - 다전공 금지 조합 (예: 환경학 ↔ 환경공학은 1개만)
  - 같은 단과대학·같은 전공기초면 두 번째 전공의 전공기초 면제
  - 두 전공이 함께 요구하는 과목(같은 학수번호)은 양쪽에 인정되지만 졸업학점엔 한 번만 → "실제로 들어야 할 최소 전공학점"
  - 부전공 과목이 본전공과 겹치면 부전공 학점으로 인정 안 됨
  - 신청 자격, 최대 이수 개수, 포기 시 처리 등 안내
- **마이크로디그리**: 43개(여러 학과가 같이 운영하는 것은 하나로 합침)의 과목·학점, 본전공과 겹치는 과목 표시, 마이크로디그리 규칙
- **앱(PWA)**: 홈 화면 설치, 앱 아이콘, 한 번 본 화면과 결과는 오프라인에서도 열림

### 알려진 한계

- 과목 정보가 없는 학과: **인공지능학과, 글로벌문화기술** (편성표 형식이 달라 자동 추출 실패). 학점은 나옵니다.
- "학과 확인 필요" 상태: 한 편성표에 여러 전공이 섞인 **기계공학부(3개 전공), 환경학및환경공학과(2개 전공)**, 과목 학점 합이 필요 학점과 다른 일부 학과
- 학점은 교육과정 책의 "전공별 교육과정 기본구조표"(p.121~122)를 기준으로 합니다. 예전 학점 개요(`overview_all.json`)와 다른 곳은 경고(`BOOK_DIFFERS`)로 남겨 두었습니다. 책 숫자로도 합이 맞지 않는 **융합바이오·신소재공학과 부전공**(필수 15 + 선택 "-" ≠ 21)은 "검증 미통과"로 제외합니다.
- 마이크로디그리 60개 중 7개는 책에 학수번호가 빠졌거나 표가 깨져 "학과 확인 필요"입니다.

## 설계 원칙

- **계산은 코드, 설명은 LLM.** 학점·조합 판정은 LLM에 맡기지 않습니다(`src/lib/rules/`의 순수 함수 + 테스트).
- **출처 없으면 답하지 않음.** 모든 값과 규칙에 출처(교육과정 책 쪽 번호)와 기준(2026학년도)을 붙입니다.
- **지어내지 않음.** 책에 인쇄된 과목만 쓰고, 맞지 않는 값은 고치지 않고 "확인 필요"로 표시합니다.
- **사람이 검수한 문제만 노출.** AI 생성 문제는 `approved` 상태만 사용자에게 보입니다.
- **개인정보 미수집·미전송.** 학번, 이름, 연락처는 저장하지 않고 LLM에도 보내지 않습니다(ChatKHU 이용 가이드 준수).
- **가상 데이터는 표기.** 예시 데이터는 화면에 "예시 데이터"로 표시합니다.

## 기술 스택

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Vitest · Vercel · PWA(manifest + 서비스 워커)
데이터 준비: Python 3 + pydantic, `pdftotext`

로그인: Supabase Auth + `profiles` 테이블(RLS). 환경변수가 없으면 이 기기 브라우저에만 저장하는 예시 로그인으로 자동 전환됩니다.
예정: Supabase pgvector(RAG), LLM은 ChatKHU 우선(연동 방식 확인 전까지 `src/lib/llm/`에 mock으로 개발).

## 폴더 구조

```
.
├── CLAUDE.md                     # Claude Code가 매 세션 읽는 규칙
├── README.md, PLAN.md
├── data/
│   ├── raw/                      # 교육과정 PDF (git 제외, 팀 채널에서 받기)
│   ├── extracted/                # 사람/LLM이 구조화한 원본 (overview_all.json 등)
│   └── curated/                  # 앱이 쓰는 검증된 데이터
│       ├── credits_global.json   # 국제캠 학과별 단일·다전공·부전공 학점 (책 기본구조표 기준)
│       └── 2026/
│           ├── courses.json      # 학과별 교과목 편성표와 과정별 과목 그룹
│           ├── major_rules.json  # 다전공·부전공·MD 공통 규칙 (쪽 번호·원문 포함)
│           └── microdegrees.json # 마이크로디그리 과목 목록
├── scripts/pipeline/             # 데이터 준비 (Python, 앱 런타임에는 안 씀)
│   ├── book.py                   # 교육과정 책을 목차 기준으로 학과별 분리
│   ├── book_credits.py           # 책의 기본구조표(p.121~122) → 학과별 학점
│   ├── catalog.py                # [별표1] 교육과정 편성표 → 과목 목록
│   ├── programs.py               # 과정별 과목 그룹 + 학점 대조 → courses.json
│   ├── microdegrees.py           # 마이크로디그리 → microdegrees.json
│   ├── overview.py               # 책 학점으로 교체·검증 → credits_global.json
│   └── ingest·detect·parse_table·schema·build·plan.py  # 학과별 PDF용 이전 파이프라인 (인공지능학과·철학과)
├── public/sw.js                  # 서비스 워커 (오프라인)
├── src/
│   ├── app/
│   │   ├── page.tsx              # 앱 홈
│   │   ├── onboarding/           # 전공 조합 계획 화면
│   │   ├── api/plan/             # 다전공·부전공 계산 API
│   │   ├── api/microdegree/      # 마이크로디그리 API
│   │   ├── manifest.ts, icons/   # 앱 설치 정보와 아이콘
│   │   └── guide/, experience/, community/   # 기능 1-2·2·3 자리 (비어 있음)
│   ├── components/               # MajorPlanner(화면), ServiceWorker
│   └── lib/
│       ├── rules/                # credits·courses·majorRules·microdegrees (순수 함수)
│       ├── auth/                 # 로그인: supabase.ts(실제 계정) / mock.ts(기기 저장), 같은 AuthService 인터페이스
│       ├── supabase/client.ts    # Supabase 클라이언트 (환경변수 없으면 null)
│       ├── safety/               # 입력 검사, 개인정보를 LLM에 보내지 않는 forLlm
│       └── llm/, rag/            # 예정 (비어 있음)
├── supabase/migrations/          # DB 스키마 SQL (Supabase SQL Editor에서 실행)
└── tests/
    ├── rules/                    # Vitest
    └── pipeline/                 # Python unittest
```

## 시작하기

### 1. 앱 실행 (화면만 볼 때)

필요한 것: Git, Node.js(LTS). Python 가상환경과 `.env.local`은 지금은 필요 없습니다. 앱이 쓰는 데이터(`data/curated/`)는 저장소에 들어 있습니다.

```bash
git clone https://github.com/Dear-my-crazy-soulmate/AI_challenge.git
cd AI_challenge
npm install
npm run dev     # 터미널에 Local / Network 주소가 나옵니다
npm test        # Vitest 테스트
```

브라우저에서 **http://localhost:3000** 을 엽니다. 개발 모드(`npm run dev`)에서는 서비스 워커가 꺼져 있습니다. 앱 설치·오프라인 동작은 `npm run build` 후 `npm run start`로 실행하거나 배포 주소에서 확인합니다.

### 2. 팀원과 함께 확인하는 방법

| 방법 | 언제 | 주소 |
|---|---|---|
| A. 각자 실행 | 코드를 같이 고치며 확인할 때 (권장) | 각자 PC의 `http://localhost:3000` |
| B. 내 PC 서버를 같이 보기 | 같은 Wi-Fi에서 바로 보여 줄 때 | 서버 켠 사람의 `Network` 주소 |
| C. 배포 주소 | 다른 장소에서 보거나 시연할 때 | https://ai-challenge-ivory.vercel.app (main에 push된 내용) |

**A. 각자 실행**: 위 1번을 각자 하고, 작업 전에 `git pull`로 변경을 받습니다. 같은 파일을 동시에 고치면 충돌이 나기 쉬우니 기능별 브랜치에서 작업하고 PR로 합치는 것을 권장합니다.

**B. 같은 네트워크에서 한 사람의 서버를 같이 보기**

1. 서버를 켠 사람의 터미널에 나온 `Network: http://192.168.x.x:3000` 주소를 팀원에게 공유합니다(주소는 PC·Wi-Fi마다 다릅니다).
2. Windows 방화벽 창이 뜨면 **개인 네트워크**에서 Node.js 허용을 선택합니다. 학교·공용 Wi-Fi는 기기 간 접속이 막혀 있을 수 있어서, 그때는 A나 C를 씁니다.
3. 터미널에 `Blocked cross-origin request to Next.js dev resource /_next/hmr from "192.168.x.x"` 경고가 나오면: 페이지는 열리지만 코드 수정이 화면에 자동 반영(HMR)되지 않습니다. 필요하면 `next.config.ts`에 그 주소를 추가하고 서버를 다시 켭니다. 주소는 PC마다 달라서 저장소에는 커밋하지 않습니다.

   ```ts
   const nextConfig: NextConfig = {
     allowedDevOrigins: ["192.168.x.x"], // 터미널 경고에 나온 주소
     // ...기존 설정
   };
   ```

**C. 배포 주소**: Vercel이 `main`에 push될 때마다 자동으로 배포합니다(1분 안팎).

**같이 확인할 시나리오** (홈 → "내 전공 조합 계획하기")

1. `컴퓨터공학과` → 다전공 → `소프트웨어융합학과`: 합계 102학점, 겹치는 필수 과목을 빼면 최소 84학점, 두 전공 모두 "학점 검증 완료"
2. `스마트팜과학과` → 다전공 → `원예생명공학과`: 같은 단과대학·같은 전공기초라 원예생명공학과 전공기초 6학점 면제
3. `체육학과` → 다전공 → `응용수학과`: "일부 선택 이수", "아래 과목 중 선택", 학과 규정 원문
4. `환경학및환경공학과 (환경학)` → 다전공: 목록에 `(환경공학)`이 나오지 않음 (금지 조합)
5. `컴퓨터공학과` → 부전공 → `융합바이오·신소재공학과`: 검증 미통과 안내 (`전자공학과` 부전공은 책 기준으로 정상 표시)
6. `컴퓨터공학과` → 마이크로디그리 → `빅데이터 분석`: 9학점 모두 이수, 2과목에 "본전공에도 있음"

화면이 이상하면 주소, 선택한 조합, 화면 캡처를 함께 공유합니다.

### 3. 로그인 서버(Supabase) 연결

환경변수를 넣지 않으면 로그인은 **이 기기 브라우저에만 저장되는 예시 로그인**으로 동작합니다(다른 기기에서는 로그인 불가). 실제 계정을 쓰려면 한 번만 설정합니다.

1. https://supabase.com 에서 New project (지역: Seoul `ap-northeast-2` 권장)
2. **SQL Editor** → New query → `supabase/migrations/0001_profiles.sql` 내용을 붙여 넣고 Run
   (프로필 테이블, 본인 행만 읽고 쓰는 RLS, 회원 탈퇴 함수가 만들어집니다)
3. **Authentication → Sign In / Providers → Email**에서 시연용으로 **Confirm email 끄기**
   (켜 두면 가입 후 메일의 링크를 눌러야 로그인됩니다. 앱은 두 경우 모두 처리합니다)
4. **Project Settings → API**의 Project URL과 **anon(public) key**를 프로젝트 루트의 `.env.local`에 넣습니다(커밋 금지)

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

5. 배포 사이트: Vercel → Project → Settings → Environment Variables에 같은 두 값을 넣고 다시 배포

`service_role` 키는 앱 어디에도 넣지 않습니다. 회원 탈퇴도 anon 키 + DB 함수(`delete_own_account`)로 처리합니다.
무료 플랜은 7일 동안 접속이 없으면 일시정지되므로, 본선 전에 대시보드에서 켜져 있는지 확인합니다.

**계정 관리 (MY → 계정)**: 이메일 변경, 비밀번호 변경, 로그아웃, 회원 탈퇴. 모두 현재 비밀번호를 다시 확인합니다.

### 4. 데이터 파이프라인 실행 (데이터를 다시 만들 때만)

교육과정 PDF에서 `data/curated/`를 다시 만드는 Python 스크립트입니다. Windows에서는 `pdftotext`가 들어 있는 **Git Bash**에서 실행합니다(macOS: `brew install poppler`).

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # macOS/Linux: .venv/bin/python
```

원본 PDF는 저장소에 없습니다(`data/raw/`는 git 제외). 팀 채널에서 `2026경희대 교육과정.pdf`를 받아 `data/raw/`에 넣은 뒤 실행합니다.

```bash
.venv/Scripts/python -I scripts/pipeline/book.py                              # 책을 학과별로 분리 (PIPELINE_YEAR 없이: 있으면 data/work/2026/2026에 저장돼 다음 단계가 못 찾음)
PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/book_credits.py  # 책 기본구조표 → 학점
.venv/Scripts/python -I scripts/pipeline/overview.py                         # 책 학점으로 교체·검증
PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/programs.py      # 과목 데이터 생성
PIPELINE_YEAR=2026 .venv/Scripts/python -I scripts/pipeline/microdegrees.py  # 마이크로디그리 데이터 생성
PIPELINE_YEAR=2026 .venv/Scripts/python -I tests/pipeline/test_book.py       # 파이프라인 테스트
```

기본구조표에서 칸이 병합돼 자동으로 못 읽는 행(전자공학과·반도체공학과 다전공의 "전공기초+전공필수 30")은 `data/extracted/2026/credit_notes.json`에 쪽 번호와 원문 줄을 붙여 사람이 적어 둡니다.

`(.venv)` 활성화는 필요 없습니다. 위처럼 `.venv/Scripts/python`을 직접 쓰면 됩니다. 앱(`npm run dev`)은 가상환경과 관계없이 실행됩니다.

**내년(2027) 갱신**: 새 교육과정 책을 `data/raw/2027경희대 교육과정.pdf`로 넣고 `PIPELINE_YEAR=2027`로 같은 명령을 실행하면 `data/curated/2027/`이 만들어집니다. 학생은 입학년도 교육과정을 따르므로 이전 연도 데이터는 지우지 않습니다. 각 스크립트가 출력하는 "check" 항목만 사람이 원문과 대조하면 됩니다.

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

LLM 프롬프트를 쓰기 시작하면 `docs/prompt-log.md`(아직 없음)를 만들어 바꿀 때마다 기록합니다: 단계, 모델, 프롬프트 버전, 문제점, 사람의 수정, 결과. API 키와 개인정보는 넣지 않습니다.

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
