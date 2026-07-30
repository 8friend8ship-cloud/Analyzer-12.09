# OpenAI Portfolio Control

- Owner: `8friend8ship-cloud`
- Drive operating account: `home design. taedi / homedesigntaedi@gmail.com`
- Last updated: `2026-07-30 KST`
- Purpose: 모든 GitHub 저장소·Drive 원본·배포·수정 작업을 한 기준으로 추적한다.

## 1. 저장소 포트폴리오

| 저장소 | 실제 역할 | 관리 상태 | 주요 상위 입력 | 주요 하위 출력/연계 |
|---|---|---|---|---|
| `DRYWRITE` | 기준 글·전자책·롱폼 마스터 생성 | `ACTIVE_CORE` | QUEENS/ABIDE/Auto Input | 365, ClipStream, animation, 플랫폼 편집 |
| `-365-3.30` | 잠언365/성경365 풀스택 운영 후보 | `ACTIVE_PRIMARY_CANDIDATE` | DRYWRITE, J365 Sheets, audio | 사용자 앱, 관리자, 분석 데이터 |
| `-365-AI-` | 잠언365 AI Studio 실험본 | `EXPERIMENTAL_COMPARE` | DRYWRITE, J365 Sheets | 검증 기능을 운영본으로 이관 |
| `Analyzer-12.09` | Content OS·KPI·오류·수익 관제 | `ACTIVE_CONTROL_PLANE` | 모든 앱/플랫폼 데이터 | Issue, 작업큐, 수정 우선순위 |
| `-` | ClipStream AI 영상/클립 파이프라인 | `ACTIVE_PIPELINE` | DRYWRITE, 콘텐츠 마스터 | 쇼츠·장면·animation 입력 |
| `animation` | GIF/MP4/ZIP 미디어 렌더링 | `ACTIVE_MEDIA_ENGINE` | ClipStream, 장면 이미지 | Drive 미디어 폴더, 플랫폼 송출 |
| `interior` | 홈디자인 인테리어 전문가 AI | `PRIMARY_COMPARE_PENDING` | HD DB, 견적·상담 자료 | 견적/상담/콘텐츠/분석 |
| `-2.20` | 인테리어 전문가 AI 중복·버전 비교본 | `DUPLICATE_REVIEW` | HD DB | `interior`와 비교 후 통합/보관 |
| `kfood` | K-Kitchen AI/Firebase 앱 | `FEATURE_AUDIT_REQUIRED` | 콘텐츠·상품·사용 데이터 | K-food 서비스 및 Content OS |
| `hope` | Hope Purchase Platform v4, PDF 결과 | `FEATURE_AUDIT_REQUIRED` | 상품/요청/AI 데이터 | PDF·구매희망 결과·분석 |
| `type` | Loyalty Autopsy 고객 충성도 진단 | `FEATURE_AUDIT_REQUIRED` | 설문/고객/행동 데이터 | 진단 리포트·Content OS |

## 2. 공통 Drive 별칭

공개 저장소에는 실제 Drive URL·ID를 넣지 않는다. 실제 값은 중앙 외부연결 운영대장에만 저장한다.

- `MASTER_REGISTRY`: 저장소·앱·Drive·배포 전체 연결 기준
- `EXTERNAL_CONNECTION_REGISTRY`: 외부 서비스·키 위치·계정·상태
- `WORKFLOW_CHARTER`: 최상위 운영 원칙과 파이프라인
- `CONTENT_FACTORY`: 기준 글 생산
- `J365_MAIN_SHEET`: 365 본문/운영 데이터
- `J365_WRITER_SHEET`: 365 작가 에이전트
- `J365_PUBLISH_SHEET`: 플랫폼 송출
- `AUDIO_DELIVERY_SHEET`: 음원 송출
- `MULTILINGUAL_AUDIO_SHEET`: 다국어 음원
- `HD_AGENT_DB`: 홈디자인 에이전트 DB
- `HD_PLATFORM_FOLDER`: 홈디자인 운영 폴더
- `CONTENT_OS_YOUTUBE_DATA`: Content OS YouTube 데이터
- `MEDIA_OUTPUT`: 이미지·GIF·MP4·ZIP 산출물 폴더

## 3. 공통 꼬리표

- `[CORE]` 핵심 기능
- `[FRONTEND]` 사용자/관리 화면
- `[BACKEND]` 서버/API
- `[DB]` 저장·데이터베이스
- `[AI]` Gemini/AI 호출
- `[PROMPT]` 프롬프트·템플릿
- `[DRIVE]` Drive/Sheets 연계
- `[INTEGRATION]` 저장소·플랫폼 상호 연계
- `[AUDIO]` 음원
- `[MEDIA]` 이미지·영상
- `[ANALYTICS]` 분석·KPI
- `[SECRET]` 민감 설정 점검
- `[DEPLOY]` 빌드·배포
- `[DUPLICATE]` 중복 버전
- `[LEGACY]` 보관/폐기 후보
- `[REVIEW]` 추가 검토 필요

## 4. OpenAI 작업 순서

1. 현재 GitHub/Drive 연결 계정을 확인한다.
2. 대상 저장소의 `OPENAI_PROJECT_CONTROL.md`를 읽는다.
3. 파일의 역할·태그·Drive 별칭·상호 연계를 확인한다.
4. 해당 파일을 파일 대장에 추가하거나 상태를 갱신한다.
5. 코드 수정은 작업 브랜치와 Draft PR로 진행한다.
6. 빌드/테스트/데이터 흐름/배포 영향을 확인한다.
7. `MASTER_REGISTRY`와 이 포트폴리오 문서의 상태를 함께 갱신한다.

## 5. 우선 검토 순서

1. `DRYWRITE` 글 생산 구조와 Secret 노출
2. `-365-3.30` 프런트·서버·Drive·오디오 통합
3. `-365-AI-`와 운영본 중복 기능 비교
4. `interior`와 `-2.20` 최신본 비교 및 통합 결정
5. `Analyzer-12.09` 중앙 작업큐·GitHub Issue 연계
6. ClipStream → animation → Drive → 플랫폼 송출 연결
7. `kfood`, `hope`, `type` 기능·데이터·수익화 역할 상세 분류

## 6. 변경 기록

- `2026-07-30`: 최초 포트폴리오 분류 및 GitHub/Drive 연계 관리 기준 수립.
