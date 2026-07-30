# OpenAI Project Control

- Repository: `8friend8ship-cloud/Analyzer-12.09`
- Project role: **Content OS / 전 프로젝트 분석·진단·수익화 관제**
- Management status: `ACTIVE_CONTROL_PLANE`
- Last reviewed: `2026-07-30 KST`
- Architecture: React/Vite + Gemini + Firebase + charts

## 1. 활용 방향

이 저장소는 콘텐츠를 직접 생산하는 본체가 아니라, 각 프로젝트의 상태·성과·오류·수익 신호를 모아 **무엇을 수정하고 어디에 재투입할지 판단하는 관제 앱**으로 사용한다.

주요 역할:
- 콘텐츠/앱 KPI 대시보드
- 유튜브·플랫폼 데이터 분석
- 검색·시장·인플루언서 신호 분석
- 시스템 로그·문제 보고·수정 우선순위
- 저장소·Drive·배포 상태를 연결한 운영 판단

## 2. 상호 연계

### 입력 대상
- `DRYWRITE`: 기준 글·생성 상태
- `-365-3.30`: 사용자 앱·오디오·상담 사용 데이터
- `interior`: 홈디자인 앱·견적/상담 데이터
- `kfood`: K-Kitchen 사용·콘텐츠 데이터
- `hope`: 희망구매 플랫폼 사용·PDF 결과 데이터
- `type`: 고객 충성도 진단 데이터
- `-`, `animation`: 영상·클립 제작 상태

### 출력 대상
- `MASTER_REGISTRY`: 프로젝트 상태 갱신
- 각 저장소의 Issue/PR 작업 우선순위
- 콘텐츠 재작성·재배포 작업큐
- 수익화·상품 연결·플랫폼 운영 판단

## 3. Drive 연계 정책

공개 저장소에는 Drive URL·파일 ID를 직접 넣지 않는다.

- `MASTER_REGISTRY`
- `EXTERNAL_CONNECTION_REGISTRY`
- `CONTENT_OS_YOUTUBE_DATA`
- `CONTENT_FACTORY`
- `WORKFLOW_CHARTER`
- 프로젝트별 KPI/작업큐 별칭

실제 주소와 접근 계정은 중앙 외부연결 운영대장에서 관리한다.

## 4. 파일 꼬리표

- `[DASHBOARD]`: KPI·차트·상태 화면
- `[ANALYTICS]`: 분석·진단 로직
- `[GEMINI]`: AI 분석·요약
- `[YOUTUBE]`: YouTube 데이터
- `[FIREBASE]`: Firebase 저장·인증·동기화
- `[DRIVE]`: 중앙 시트·작업큐 연계
- `[SYSTEM]`: 로그·문제 보고·상태 관리
- `[INTEGRATION]`: 타 저장소/플랫폼 연결
- `[SECRET]`: 키·환경변수 점검
- `[DEPLOY]`: 빌드·배포
- `[REVIEW]`: 지표 정의 또는 데이터 신뢰성 확인 필요

## 5. 초기 파일 대장

| 파일/영역 | 태그 | 활용 방향 | 상태 | 다음 점검 |
|---|---|---|---|---|
| `services/geminiService.ts` | `[GEMINI] [ANALYTICS] [SECRET]` | AI 분석·요약 호출 | 확인됨 | 키 관리와 호출비용 통제 점검 |
| `services/youtubeService.ts` | `[YOUTUBE] [ANALYTICS]` | YouTube 데이터 수집·분석 | 확인됨 | OAuth/API·데이터 최신성 점검 |
| `components/InfluencerMarketingView.tsx` | `[DASHBOARD] [ANALYTICS]` | 인플루언서/시장 분석 화면 | 확인됨 | 실제 데이터 연결 여부 확인 |
| Firebase 영역 | `[FIREBASE] [SECRET]` | 상태·로그·분석 데이터 저장 | 검토 예정 | 무료 한도·보안규칙·중앙 시트 역할 중복 확인 |
| 시스템 로그/이슈 기능 | `[SYSTEM]` | 운영 장애와 수정 작업 관리 | 검토 예정 | GitHub Issue 및 Agent Task Queue 연계 |
| 차트/대시보드 | `[DASHBOARD]` | KPI 시각화 | 검토 예정 | CONTENT_ID·PUBLISH_ID·SLOT_ID·OFFER_ID 결합 확인 |

## 6. 수정 진행 규칙

1. 데이터 정의와 출처를 확인하지 않은 지표는 대시보드에 확정값으로 표시하지 않는다.
2. 각 수정 작업은 대상 저장소·Drive 별칭·KPI 영향을 함께 기록한다.
3. 동일 데이터를 Firebase와 Sheets에 중복 저장할 때 기준 원본을 명시한다.
4. 새 외부 서비스 연결은 `EXTERNAL_CONNECTION_REGISTRY` 등록 후 진행한다.
5. 키·토큰·OAuth Secret은 저장소에 커밋하지 않는다.
6. 코드 변경은 작업 브랜치와 Draft PR을 기본으로 한다.
7. 분석 결과는 실제 수정 작업·Issue·Agent Task Queue로 이어지게 한다.

## 7. 결정 기록

- `2026-07-30`: Analyzer를 전 프로젝트 분석·수익화·운영 관제 저장소로 지정함.
