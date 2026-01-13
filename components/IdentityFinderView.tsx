import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { IdentityStage, IdentityResult, IdentityOption } from '../types';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { getAIChannelRecommendations } from '../services/geminiService';

interface IdentityFinderViewProps {
    onBack: () => void;
}

// --- Data Structures ---

const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.993.142M9 8a3 3 0 1 0 5.183 2.378M12 19a3 3 0 1 0 5.993-.142M15 16a3 3 0 1 0-5.183-2.378M14 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M12 12h.01"/><path d="M17.5 14.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M17.5 9.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M6.5 14.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/><path d="M6.5 9.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/></svg>;

const JohnsonIcon = () => <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white shadow-md border-2 border-blue-400/50"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-2h4v2H10zm5.91-4.5H8.09c-.49 0-.85-.59-.57-1.02l1.9-2.92c.2-.31.54-.51.92-.51h3.32c.38 0 .72.2.92.51l1.9 2.92c.28.43-.08 1.02-.57 1.02z"/></svg></div>;


// Extended Question Pool (~180 options)
const QUESTION_POOL: Record<string, IdentityOption[]> = {
    'A': [ // PART A: 본능적 끌림 & 메인 카테고리 탐색
        { text: "AI로 월 100만원 자동수익 만들기", traits: { category: 'Money', age: '20-39', tone: 'Info', keyword: 'AI', gender: 'Neutral' } },
        { text: "공포영화 소름 돋는 반전 TOP 5", traits: { category: 'Movie', age: '10-29', tone: 'Shock', keyword: 'Horror', gender: 'Neutral' } },
        { text: "30kg 감량한 다이어트 식단 공개", traits: { category: 'Health', age: '20-39', tone: 'Info', keyword: 'Diet', gender: 'Female' } },
        { text: "한국인이 모르는 일본 소도시 여행", traits: { category: 'Life', age: '20-39', tone: 'Healing', keyword: 'Travel', gender: 'Female' } },
        { text: "현실적인 30대 자취생 브이로그", traits: { category: 'Life', age: '25-39', tone: 'Healing', keyword: 'Vlog', gender: 'Neutral' } },
        { text: "듣자마자 눈물 터지는 이별 노래 모음", traits: { category: 'Music', age: 'All', tone: 'Emotional', keyword: 'Playlist', gender: 'Neutral' } },
        { text: "삼성전자 주가 전망, 지금 사야 할까?", traits: { category: 'Money', age: '30-59', tone: 'Info', keyword: 'Stock', gender: 'Male' } },
        { text: "미스터리, 사라진 아이들의 행방", traits: { category: 'Story', age: '20-49', tone: 'Shock', keyword: 'Mystery', gender: 'Neutral' } },
        { text: "편의점 알바 진상 참교육 썰", traits: { category: 'Talk', age: '16-24', tone: 'Fun', keyword: 'Ssul', gender: 'Neutral' } },
        { text: "호텔 쉐프가 알려주는 라면 레시피", traits: { category: 'Life', age: 'All', tone: 'Info', keyword: 'Cook', gender: 'Neutral' } },
        { text: "탑골공원 가요무대 레전드 모음", traits: { category: 'Music', age: '50-60+', tone: 'Emotional', keyword: 'Trot', gender: 'Neutral' } },
        { text: "성공하는 사람들의 아침 루틴 5가지", traits: { category: 'Self', age: '20-39', tone: 'Info', keyword: 'Motivation', gender: 'Neutral' } },
        { text: "100만뷰 터진 고양이의 애교", traits: { category: 'Life', age: 'All', tone: 'Healing', keyword: 'Pet', gender: 'Neutral' } },
        { text: "아이브(IVE) 무대 교차편집 레전드", traits: { category: 'Music', age: '10-15', tone: 'Fun', keyword: 'Kpop', gender: 'Female' } },
        { text: "롤(LOL) 페이커 슈퍼플레이 모음", traits: { category: 'Game', age: '10-24', tone: 'Fun', keyword: 'Game', gender: 'Male' } },
        { text: "충격적인 연예계 뒷담화 폭로", traits: { category: 'Talk', age: '20-39', tone: 'Shock', keyword: 'Gossip', gender: 'Female' } },
        { text: "하루 10분, 거북목 교정 스트레칭", traits: { category: 'Health', age: 'All', tone: 'Info', keyword: 'Exercise', gender: 'Neutral' } },
        { text: "넷플릭스 19금 드라마 추천작", traits: { category: 'Movie', age: '20-39', tone: 'Shock', keyword: 'Review', gender: 'Neutral' } },
        { text: "퇴사하고 세계일주 떠납니다", traits: { category: 'Life', age: '25-39', tone: 'Healing', keyword: 'Travel', gender: 'Neutral' } },
        { text: "부자들은 절대 하지 않는 3가지", traits: { category: 'Money', age: '30-59', tone: 'Info', keyword: 'Mindset', gender: 'Male' } },
        { text: "먹방, 시장 떡볶이 10인분 도전", traits: { category: 'Life', age: 'All', tone: 'Fun', keyword: 'Mukbang', gender: 'Neutral' } },
        { text: "영어회화, 이 문장만 알면 끝", traits: { category: 'Edu', age: '20-49', tone: 'Info', keyword: 'English', gender: 'Neutral' } },
        { text: "아이폰 숨겨진 꿀팁 10가지", traits: { category: 'Tech', age: '10-29', tone: 'Info', keyword: 'Tech', gender: 'Neutral' } },
        { text: "결혼식 축가 레전드 (눈물바다)", traits: { category: 'Music', age: '20-39', tone: 'Emotional', keyword: 'Wedding', gender: 'Female' } },
        { text: "층간소음 복수 레전드 후기", traits: { category: 'Talk', age: '20-49', tone: 'Fun', keyword: 'Ssul', gender: 'Male' } },
        { text: "시골 폐가 리모델링 과정 공개", traits: { category: 'Life', age: '30-59', tone: 'Healing', keyword: 'DIY', gender: 'Male' } },
        { text: "MBTI 유형별 연애 스타일 분석", traits: { category: 'Talk', age: '16-29', tone: 'Fun', keyword: 'MBTI', gender: 'Female' } },
        { text: "역대급 방송사고 모음 (웃음참기)", traits: { category: 'Comedy', age: 'All', tone: 'Fun', keyword: 'Humor', gender: 'Neutral' } },
        { text: "중년의 외로움을 달래주는 시", traits: { category: 'Life', age: '50-60+', tone: 'Emotional', keyword: 'Poem', gender: 'Female' } },
        { text: "Chat GPT로 업무시간 1시간으로 줄이기", traits: { category: 'Tech', age: '25-49', tone: 'Info', keyword: 'AI', gender: 'Male' } }
    ],
    'B': [ // PART B: 검증 및 포맷 (Format)
        { text: "60초 안에 배우는 엑셀 꿀팁 (쇼츠)", traits: { category: 'Edu', age: '20-39', tone: 'Info', keyword: 'Shorts', gender: 'Neutral' } },
        { text: "100일간의 바디프로필 도전기 (다큐)", traits: { category: 'Health', age: '20-29', tone: 'Emotional', keyword: 'Challenge', gender: 'Neutral' } },
        { text: "지루할 틈 없는 빠른 컷편집 먹방", traits: { category: 'Life', age: '10-24', tone: 'Fun', keyword: 'Fast', gender: 'Neutral' } },
        { text: "잠들기 전 듣는 빗소리 ASMR", traits: { category: 'Life', age: 'All', tone: 'Healing', keyword: 'ASMR', gender: 'Female' } },
        { text: "현직 의사가 말하는 암 예방 습관", traits: { category: 'Health', age: '40-60+', tone: 'Info', keyword: 'Doctor', gender: 'Neutral' } },
        { text: "무논리 병맛 더빙 (약빰)", traits: { category: 'Comedy', age: '10-15', tone: 'Fun', keyword: 'Dubbing', gender: 'Male' } },
        { text: "2시간 동안 공부할 때 듣는 음악", traits: { category: 'Music', age: '16-29', tone: 'Healing', keyword: 'Study', gender: 'Neutral' } },
        { text: "부동산 폭락, 지금 집 사도 될까?", traits: { category: 'Money', age: '30-59', tone: 'Info', keyword: 'RealEstate', gender: 'Male' } },
        { text: "연예인 공항패션 가격 정보 총정리", traits: { category: 'Life', age: '20-39', tone: 'Info', keyword: 'Fashion', gender: 'Female' } },
        { text: "웃음참기 챌린지, 실패시 물벼락", traits: { category: 'Comedy', age: '10-15', tone: 'Fun', keyword: 'Challenge', gender: 'Neutral' } },
        { text: "깊이 있는 대화, 침착맨 스타일 토크", traits: { category: 'Talk', age: '20-39', tone: 'Healing', keyword: 'Talk', gender: 'Male' } },
        { text: "화려한 CG가 들어간 영화 리뷰", traits: { category: 'Movie', age: '20-39', tone: 'Info', keyword: 'Review', gender: 'Male' } },
        { text: "자막 없이 보는 힐링 룩북(Lookbook)", traits: { category: 'Life', age: '20-39', tone: 'Healing', keyword: 'Fashion', gender: 'Female' } },
        { text: "1분 만에 만드는 초간단 안주", traits: { category: 'Life', age: '20-39', tone: 'Info', keyword: 'Cook', gender: 'Neutral' } },
        { text: "충격 실화, 그날의 진실은?", traits: { category: 'Story', age: '20-59', tone: 'Shock', keyword: 'Crime', gender: 'Neutral' } },
        { text: "주식 단타로 하루 50만원 벌기", traits: { category: 'Money', age: '20-39', tone: 'Shock', keyword: 'Stock', gender: 'Male' } },
        { text: "반려견과 함께하는 차박 캠핑", traits: { category: 'Life', age: '25-49', tone: 'Healing', keyword: 'Camping', gender: 'Neutral' } },
        { text: "신상 아이패드 언박싱 & 솔직 후기", traits: { category: 'Tech', age: '16-29', tone: 'Info', keyword: 'Review', gender: 'Neutral' } },
        { text: "고막이 녹는 팝송 커버 (Cover)", traits: { category: 'Music', age: '20-39', tone: 'Emotional', keyword: 'Song', gender: 'Female' } },
        { text: "팩트 체크: 뉴스에서 말하지 않는 진실", traits: { category: 'Talk', age: '30-59', tone: 'Info', keyword: 'News', gender: 'Male' } },
        { text: "남자들의 로망, 슈퍼카 하차감", traits: { category: 'Life', age: '20-39', tone: 'Fun', keyword: 'Car', gender: 'Male' } },
        { text: "명품 가방 하울 & 추천 (Haul)", traits: { category: 'Life', age: '20-39', tone: 'Fun', keyword: 'Luxury', gender: 'Female' } },
        { text: "직장인 퇴근 후 갓생 살기 브이로그", traits: { category: 'Life', age: '25-34', tone: 'Healing', keyword: 'Vlog', gender: 'Female' } },
        { text: "역대급 반전 스릴러 영화 추천", traits: { category: 'Movie', age: '20-39', tone: 'Shock', keyword: 'Thriller', gender: 'Neutral' } },
        { text: "할머니가 해주신 집밥 먹방", traits: { category: 'Life', age: 'All', tone: 'Healing', keyword: 'Food', gender: 'Neutral' } },
        { text: "수능 수학 1등급 공부법", traits: { category: 'Edu', age: '16-19', tone: 'Info', keyword: 'Study', gender: 'Neutral' } },
        { text: "알리익스프레스 1000원짜리 꿀템깡", traits: { category: 'Life', age: '10-29', tone: 'Fun', keyword: 'Review', gender: 'Male' } },
        { text: "은퇴 후 귀농 라이프, 현실은?", traits: { category: 'Life', age: '50-60+', tone: 'Info', keyword: 'Senior', gender: 'Male' } },
        { text: "15초 댄스 챌린지 (틱톡 감성)", traits: { category: 'Music', age: '10-15', tone: 'Fun', keyword: 'Dance', gender: 'Female' } },
        { text: "세상을 바꾼 천재들의 이야기", traits: { category: 'Story', age: '20-49', tone: 'Info', keyword: 'Bio', gender: 'Neutral' } }
    ],
    'C': [ // PART C: 타겟 연령 및 세대 공감 (Detailed Age & Gender)
        { text: "90년대 인기가요 탑골공원", traits: { category: 'Music', age: '30-49', tone: 'Emotional', keyword: 'Retro', gender: 'Neutral' } },
        { text: "요즘 10대들이 쓰는 급식체 퀴즈", traits: { category: 'Comedy', age: '10-15', tone: 'Fun', keyword: 'Teen', gender: 'Neutral' } },
        { text: "5060을 위한 건강체조", traits: { category: 'Health', age: '50-60+', tone: 'Info', keyword: 'Senior', gender: 'Female' } },
        { text: "사회초년생 월급 관리 노하우", traits: { category: 'Money', age: '25-29', tone: 'Info', keyword: 'Money', gender: 'Neutral' } },
        { text: "40대 아재들의 리얼한 술먹방", traits: { category: 'Talk', age: '40-49', tone: 'Fun', keyword: 'Uncle', gender: 'Male' } },
        { text: "MZ세대 오피스룩 코디법", traits: { category: 'Life', age: '25-34', tone: 'Info', keyword: 'Fashion', gender: 'Female' } },
        { text: "수능 금지곡 모음", traits: { category: 'Music', age: '16-19', tone: 'Fun', keyword: 'Study', gender: 'Neutral' } },
        { text: "은퇴 준비, 연금 100만원 더 받기", traits: { category: 'Money', age: '50-60+', tone: 'Info', keyword: 'Pension', gender: 'Male' } },
        { text: "육아 퇴근 후 마시는 맥주 한 잔", traits: { category: 'Life', age: '30-39', tone: 'Healing', keyword: 'Parent', gender: 'Female' } },
        { text: "대학생 시험기간 밤샘 브이로그", traits: { category: 'Life', age: '20-24', tone: 'Healing', keyword: 'Uni', gender: 'Neutral' } },
        { text: "결혼식 축의금, 얼마가 적당할까?", traits: { category: 'Talk', age: '25-34', tone: 'Info', keyword: 'Manner', gender: 'Neutral' } },
        { text: "7080 통기타 라이브 카페", traits: { category: 'Music', age: '50-60+', tone: 'Emotional', keyword: 'Folk', gender: 'Male' } },
        { text: "탕후루 만들기 실패 영상", traits: { category: 'Life', age: '10-15', tone: 'Fun', keyword: 'Trend', gender: 'Female' } },
        { text: "중년 부부의 캠핑카 여행", traits: { category: 'Life', age: '40-60+', tone: 'Healing', keyword: 'Couple', gender: 'Neutral' } },
        { text: "취준생 자소서 합격 팁", traits: { category: 'Edu', age: '25-29', tone: 'Info', keyword: 'Job', gender: 'Neutral' } },
        { text: "임영웅 노래 모음 (광고없음)", traits: { category: 'Music', age: '50-60+', tone: 'Emotional', keyword: 'Hero', gender: 'Female' } },
        { text: "아이폰15 vs 갤럭시S24 비교", traits: { category: 'Tech', age: '20-39', tone: 'Info', keyword: 'Tech', gender: 'Male' } },
        { text: "탑블레이드, 유희왕 추억 소환", traits: { category: 'Life', age: '25-29', tone: 'Emotional', keyword: 'Kidult', gender: 'Male' } },
        { text: "갱년기 극복하는 식단", traits: { category: 'Health', age: '40-59', tone: 'Info', keyword: 'Health', gender: 'Female' } },
        { text: "로블록스 점프맵 깨기", traits: { category: 'Game', age: '10-15', tone: 'Fun', keyword: 'Roblox', gender: 'Male' } },
        { text: "30대 직장인 현실 재테크", traits: { category: 'Money', age: '30-39', tone: 'Info', keyword: 'Invest', gender: 'Male' } },
        { text: "고딩 래퍼 지원 영상", traits: { category: 'Music', age: '16-19', tone: 'Fun', keyword: 'HipHop', gender: 'Male' } },
        { text: "등산 후 먹는 파전에 막걸리", traits: { category: 'Life', age: '40-60+', tone: 'Healing', keyword: 'Hiking', gender: 'Male' } },
        { text: "내 집 마련의 꿈, 청약 당첨 후기", traits: { category: 'Money', age: '30-49', tone: 'Info', keyword: 'House', gender: 'Neutral' } },
        { text: "슬라임 섞기 (소리 대박)", traits: { category: 'Life', age: '10-15', tone: 'Healing', keyword: 'Slime', gender: 'Female' } },
        { text: "전원주택 텃밭 가꾸기", traits: { category: 'Life', age: '50-60+', tone: 'Healing', keyword: 'Garden', gender: 'Female' } },
        { text: "군대 훈련소 꿀팁 정리", traits: { category: 'Info', age: '20-24', tone: 'Info', keyword: 'Army', gender: 'Male' } },
        { text: "워킹맘의 아침 전쟁", traits: { category: 'Life', age: '30-39', tone: 'Fun', keyword: 'Mom', gender: 'Female' } },
        { text: "아이돌 포카깡 (희귀템 뜸)", traits: { category: 'Life', age: '10-15', tone: 'Fun', keyword: 'Idol', gender: 'Female' } },
        { text: "노후 자금 5억 모으기", traits: { category: 'Money', age: '50-60+', tone: 'Info', keyword: 'Rich', gender: 'Male' } }
    ],
    'D': [ // PART D: 톤앤매너
        { text: "가슴이 웅장해지는 동기부여 연설", traits: { category: 'Self', age: '20-39', tone: 'Emotional', keyword: 'Passion', gender: 'Male' } },
        { text: "뇌 빼고 보기 좋은 병맛 애니", traits: { category: 'Comedy', age: '10-24', tone: 'Fun', keyword: 'Crazy', gender: 'Male' } },
        { text: "팩트만 꽂는 사이다 참교육", traits: { category: 'Talk', age: '20-39', tone: 'Shock', keyword: 'Cider', gender: 'Male' } },
        { text: "눈물 콧물 쏙 빼는 감동 실화", traits: { category: 'Story', age: 'All', tone: 'Emotional', keyword: 'Sad', gender: 'Female' } },
        { text: "잠 안 올 때 보는 힐링 숲 영상", traits: { category: 'Life', age: 'All', tone: 'Healing', keyword: 'Relax', gender: 'Neutral' } },
        { text: "10초 만에 핵심만 요약 (빠른 템포)", traits: { category: 'Info', age: '10-29', tone: 'Info', keyword: 'Speed', gender: 'Male' } },
        { text: "영화 같은 영상미의 시네마틱 브이로그", traits: { category: 'Life', age: '20-34', tone: 'Emotional', keyword: 'Mood', gender: 'Female' } },
        { text: "논란의 중심, 사건의 내막 파헤치기", traits: { category: 'Talk', age: '20-49', tone: 'Shock', keyword: 'Issue', gender: 'Male' } },
        { text: "조용히 공부만 하는 '스터디 위드 미'", traits: { category: 'Life', age: '16-24', tone: 'Healing', keyword: 'Study', gender: 'Female' } },
        { text: "텐션 폭발, 시끄러운 예능 편집", traits: { category: 'Comedy', age: '10-24', tone: 'Fun', keyword: 'Tension', gender: 'Neutral' } },
        { text: "따뜻한 위로를 건네는 라디오 감성", traits: { category: 'Talk', age: '30-49', tone: 'Emotional', keyword: 'Radio', gender: 'Female' } },
        { text: "전문가의 날카로운 심층 분석", traits: { category: 'Info', age: '30-59', tone: 'Info', keyword: 'Deep', gender: 'Male' } },
        { text: "공포, 기괴, 미스터리 (무서운 BGM)", traits: { category: 'Story', age: '10-29', tone: 'Shock', keyword: 'Fear', gender: 'Neutral' } },
        { text: "아무 말 없이 요리만 함 (리틀 포레스트)", traits: { category: 'Life', age: '20-39', tone: 'Healing', keyword: 'Quiet', gender: 'Female' } },
        { text: "B급 감성, 저세상 드립 난무", traits: { category: 'Comedy', age: '20-29', tone: 'Fun', keyword: 'Drip', gender: 'Male' } },
        { text: "성공학 명언, 묵직한 울림", traits: { category: 'Self', age: '30-59', tone: 'Emotional', keyword: 'Wise', gender: 'Male' } },
        { text: "현실적인 독설, 뼈 때리는 조언", traits: { category: 'Self', age: '20-39', tone: 'Info', keyword: 'Sting', gender: 'Neutral' } },
        { text: "화려한 색감과 트랜지션 (편집 장인)", traits: { category: 'Tech', age: '16-29', tone: 'Fun', keyword: 'Edit', gender: 'Male' } },
        { text: "잔잔한 피아노 선율 배경음악", traits: { category: 'Music', age: 'All', tone: 'Healing', keyword: 'Piano', gender: 'Female' } },
        { text: "충격적인 반전, 소름 돋는 결말", traits: { category: 'Story', age: '20-39', tone: 'Shock', keyword: 'Twist', gender: 'Neutral' } },
        { text: "친구랑 수다 떨듯 편안한 분위기", traits: { category: 'Talk', age: '20-34', tone: 'Fun', keyword: 'Friend', gender: 'Female' } },
        { text: "데이터와 통계로 증명하는 팩트", traits: { category: 'Info', age: '30-59', tone: 'Info', keyword: 'Data', gender: 'Male' } },
        { text: "몽환적이고 신비로운 분위기", traits: { category: 'Art', age: '20-29', tone: 'Emotional', keyword: 'Dreamy', gender: 'Female' } },
        { text: "극한의 효율, 1분 안에 모든 정보 전달", traits: { category: 'Info', age: '10-29', tone: 'Info', keyword: 'Shorts', gender: 'Male' } },
        { text: "귀여운 강아지/고양이 힐링 모먼트", traits: { category: 'Life', age: 'All', tone: 'Healing', keyword: 'Cute', gender: 'Female' } },
        { text: "분노 유발, 혈압 상승 주의", traits: { category: 'Story', age: '25-49', tone: 'Shock', keyword: 'Angry', gender: 'Male' } },
        { text: "레트로 감성, 옛날 비디오 느낌", traits: { category: 'Life', age: '20-34', tone: 'Emotional', keyword: 'Retro', gender: 'Neutral' } },
        { text: "미친 텐션의 먹방 리액션", traits: { category: 'Life', age: '10-29', tone: 'Fun', keyword: 'React', gender: 'Neutral' } },
        { text: "차분하게 책 읽어주는 목소리", traits: { category: 'Book', age: '30-50', tone: 'Healing', keyword: 'Voice', gender: 'Female' } },
        { text: "궁금증 유발, 썸네일 어그로", traits: { category: 'Story', age: '10-24', tone: 'Shock', keyword: 'Click', gender: 'Male' } }
    ],
    'E': [ // PART E: 세부 장르 확정
        { text: "넷플릭스 신작 영화 리뷰", traits: { category: 'Movie', age: '20-39', tone: 'Info', keyword: 'Review', gender: 'Neutral' } },
        { text: "배당주 투자 포트폴리오 공개", traits: { category: 'Money', age: '30-59', tone: 'Info', keyword: 'Stock', gender: 'Male' } },
        { text: "간헐적 단식 1주일 후기", traits: { category: 'Health', age: '25-49', tone: 'Info', keyword: 'Diet', gender: 'Female' } },
        { text: "동기부여 팟캐스트 하이라이트", traits: { category: 'Self', age: '20-39', tone: 'Info', keyword: 'Mind', gender: 'Male' } },
        { text: "편의점 신상 털기 (먹방)", traits: { category: 'Life', age: '10-24', tone: 'Fun', keyword: 'Food', gender: 'Female' } },
        { text: "실제 범죄 사건 파일 (True Crime)", traits: { category: 'Story', age: '25-49', tone: 'Shock', keyword: 'Crime', gender: 'Female' } },
        { text: "축구 국가대표 경기 입중계", traits: { category: 'Sports', age: '20-59', tone: 'Fun', keyword: 'Soccer', gender: 'Male' } },
        { text: "아이패드 프로 vs 에어 비교", traits: { category: 'Tech', age: '20-34', tone: 'Info', keyword: 'Tech', gender: 'Male' } },
        { text: "MBTI 유형별 상황극", traits: { category: 'Comedy', age: '16-24', tone: 'Fun', keyword: 'Sketch', gender: 'Female' } },
        { text: "직장인 월급 로그 (가계부)", traits: { category: 'Money', age: '25-34', tone: 'Info', keyword: 'Salary', gender: 'Female' } },
        { text: "차박 캠핑 용품 추천", traits: { category: 'Life', age: '30-49', tone: 'Info', keyword: 'Camping', gender: 'Male' } },
        { text: "미국 주식 시황 분석", traits: { category: 'Money', age: '30-59', tone: 'Info', keyword: 'Stock', gender: 'Male' } },
        { text: "집에서 하는 필라테스 홈트", traits: { category: 'Health', age: '20-39', tone: 'Info', keyword: 'Yoga', gender: 'Female' } },
        { text: "연예인 메이크업 튜토리얼", traits: { category: 'Beauty', age: '16-24', tone: 'Info', keyword: 'Makeup', gender: 'Female' } },
        { text: "길고양이 구조와 입양 스토리", traits: { category: 'Life', age: 'All', tone: 'Emotional', keyword: 'Cat', gender: 'Female' } },
        { text: "역사 속 미스터리 사건", traits: { category: 'Edu', age: '25-59', tone: 'Info', keyword: 'History', gender: 'Male' } },
        { text: "신작 게임 플레이 실황", traits: { category: 'Game', age: '10-29', tone: 'Fun', keyword: 'Game', gender: 'Male' } },
        { text: "노래방에서 부르기 좋은 노래", traits: { category: 'Music', age: '16-34', tone: 'Info', keyword: 'Song', gender: 'Neutral' } },
        { text: "알바생이 푸는 진상 손님 썰", traits: { category: 'Talk', age: '16-24', tone: 'Fun', keyword: 'Job', gender: 'Female' } },
        { text: "명상과 확언 (수면 유도)", traits: { category: 'Health', age: '30-59', tone: 'Healing', keyword: 'Sleep', gender: 'Female' } },
        { text: "명품 하울 및 언박싱", traits: { category: 'Life', age: '25-49', tone: 'Fun', keyword: 'Luxury', gender: 'Female' } },
        { text: "챗GPT 활용법 강의", traits: { category: 'Tech', age: '25-49', tone: 'Info', keyword: 'AI', gender: 'Male' } },
        { text: "반전 드라마 결말 해석", traits: { category: 'Movie', age: '20-49', tone: 'Info', keyword: 'Review', gender: 'Female' } },
        { text: "해외여행 짐싸기 꿀팁", traits: { category: 'Life', age: '20-34', tone: 'Info', keyword: 'Travel', gender: 'Female' } },
        { text: "중고차 잘 고르는 법", traits: { category: 'Info', age: '30-59', tone: 'Info', keyword: 'Car', gender: 'Male' } },
        { text: "성공한 CEO의 인터뷰", traits: { category: 'Self', age: '25-49', tone: 'Info', keyword: 'Biz', gender: 'Male' } },
        { text: "매운 음식 챌린지 먹방", traits: { category: 'Life', age: '10-29', tone: 'Fun', keyword: 'Spicy', gender: 'Neutral' } },
        { text: "다이소 추천템 TOP 10", traits: { category: 'Life', age: 'All', tone: 'Info', keyword: 'Cheap', gender: 'Female' } },
        { text: "심리학으로 사람 마음 읽기", traits: { category: 'Edu', age: '20-49', tone: 'Info', keyword: 'Psych', gender: 'Neutral' } },
        { text: "랜덤 채팅 참교육 영상", traits: { category: 'Comedy', age: '16-24', tone: 'Fun', keyword: 'Chat', gender: 'Male' } }
    ],
    'F': [ // PART F: 핵심 세계관
        { text: "월 1000만원 버는 부업 시리즈", traits: { category: 'Money', age: '25-49', tone: 'Info', keyword: 'SideHustle', gender: 'Male' } },
        { text: "전국 맛집 도장깨기 로드", traits: { category: 'Life', age: 'All', tone: 'Fun', keyword: 'FoodTrip', gender: 'Neutral' } },
        { text: "30대 평범한 직장인의 갓생살기", traits: { category: 'Self', age: '30-39', tone: 'Emotional', keyword: 'Vlog', gender: 'Female' } },
        { text: "방구석 1열 영화관 (결말포함)", traits: { category: 'Movie', age: '20-59', tone: 'Info', keyword: 'MovieReview', gender: 'Neutral' } },
        { text: "매일 아침 10분, 전신 다이어트", traits: { category: 'Health', age: '20-49', tone: 'Info', keyword: 'WorkoutRoutine', gender: 'Female' } },
        { text: "세상의 모든 미스터리 (공포라디오)", traits: { category: 'Story', age: '16-39', tone: 'Shock', keyword: 'GhostStory', gender: 'Male' } },
        { text: "왕초보를 위한 주식 투자 입문", traits: { category: 'Money', age: '25-49', tone: 'Info', keyword: 'StockBasic', gender: 'Male' } },
        { text: "남녀 심리 토크쇼 (연애의 참견)", traits: { category: 'Talk', age: '20-34', tone: 'Fun', keyword: 'LoveTalk', gender: 'Female' } },
        { text: "힐링 낭독, 책 읽어주는 밤", traits: { category: 'Book', age: '30-59', tone: 'Healing', keyword: 'AudioBook', gender: 'Female' } },
        { text: "IT 기기 얼리어답터 리뷰", traits: { category: 'Tech', age: '20-39', tone: 'Info', keyword: 'TechReview', gender: 'Male' } },
        { text: "자취 요리, 만원으로 일주일 살기", traits: { category: 'Life', age: '20-29', tone: 'Info', keyword: 'CookVlog', gender: 'Female' } },
        { text: "세계일주 여행기 (배낭여행)", traits: { category: 'Life', age: '20-34', tone: 'Healing', keyword: 'WorldTravel', gender: 'Neutral' } },
        { text: "B급 감성 병맛 더빙 극장", traits: { category: 'Comedy', age: '10-24', tone: 'Fun', keyword: 'DubbingComedy', gender: 'Male' } },
        { text: "성공학 동기부여 명언 모음", traits: { category: 'Self', age: '30-59', tone: 'Emotional', keyword: 'Motivation', gender: 'Male' } },
        { text: "현직 변호사/의사의 전문 지식", traits: { category: 'Info', age: '30-59', tone: 'Info', keyword: 'Expert', gender: 'Male' } },
        { text: "다꾸(다이어리 꾸미기) ASMR", traits: { category: 'Life', age: '10-15', tone: 'Healing', keyword: 'Deco', gender: 'Female' } },
        { text: "케이팝 아이돌 안무 배우기", traits: { category: 'Music', age: '10-15', tone: 'Fun', keyword: 'DanceCover', gender: 'Female' } },
        { text: "골프 레슨, 비거리 늘리기", traits: { category: 'Sports', age: '40-60+', tone: 'Info', keyword: 'Golf', gender: 'Male' } },
        { text: "반려동물 성장일기", traits: { category: 'Life', age: 'All', tone: 'Healing', keyword: 'PetVlog', gender: 'Neutral' } },
        { text: "부동산 임장 및 경매 분석", traits: { category: 'Money', age: '35-59', tone: 'Info', keyword: 'RealEstate', gender: 'Male' } },
        { text: "영어 쉐도잉 100일 챌린지", traits: { category: 'Edu', age: '20-49', tone: 'Info', keyword: 'English', gender: 'Female' } },
        { text: "메이크업 비포 애프터 쇼", traits: { category: 'Beauty', age: '20-29', tone: 'Shock', keyword: 'MakeOver', gender: 'Female' } },
        { text: "자동차 시승기 및 하차감 리뷰", traits: { category: 'Life', age: '25-49', tone: 'Info', keyword: 'CarReview', gender: 'Male' } },
        { text: "사건 사고 블랙박스 모음", traits: { category: 'Info', age: '25-59', tone: 'Shock', keyword: 'BlackBox', gender: 'Male' } },
        { text: "알고리즘이 선택한 이슈 정리", traits: { category: 'Talk', age: '16-39', tone: 'Info', keyword: 'IssueSummary', gender: 'Male' } },
        { text: "시골 폐가 수리해서 살기", traits: { category: 'Life', age: '30-59', tone: 'Healing', keyword: 'CountryLife', gender: 'Male' } },
        { text: "편의점 꿀조합 레시피", traits: { category: 'Life', age: '10-19', tone: 'Fun', keyword: 'StoreFood', gender: 'Female' } },
        { text: "타로카드 연애운 봐드립니다", traits: { category: 'Life', age: '20-34', tone: 'Healing', keyword: 'Tarot', gender: 'Female' } },
        { text: "축구 하이라이트 및 전술 분석", traits: { category: 'Sports', age: '20-49', tone: 'Info', keyword: 'SoccerAnalysis', gender: 'Male' } },
        { text: "룩북, 상황별 코디 제안", traits: { category: 'Life', age: '20-34', tone: 'Info', keyword: 'LookBook', gender: 'Female' } }
    ]
};

const STAGE_TITLES: Record<string, { title: string; desc: string }> = {
    'A': { title: "PART A. 카테고리 & 본능 탐색", desc: "가장 만들고 싶거나, 시청자로서 가장 먼저 클릭하고 싶은 썸네일을 하나만 고르세요." },
    'B': { title: "PART B. 검증 및 포맷 (Format)", desc: "비슷하지만 다른 접근입니다. 어떤 '형식'이 더 끌리나요?" },
    'C': { title: "PART C. 타겟 연령 정밀 분석", desc: "나이대를 직접 묻지 않겠습니다. 당신이 가장 공감하는 문구를 고르세요." },
    'D': { title: "PART D. 톤앤매너 (분위기)", desc: "당신의 채널 편집 분위기를 결정할 썸네일은 무엇인가요?" },
    'E': { title: "PART E. 세부 장르 확정", desc: "이제 범위를 좁힙니다. 구체적으로 어떤 '소재'에 가깝습니까?" },
    'F': { title: "PART F. 핵심 세계관 (Series Key)", desc: "마지막입니다. 지속 가능한 '시리즈' 하나를 기획한다면?" }
};

const JOHNSON_DIALOGUE: Record<string, { preamble: string, preamble_en: string, question: string, question_en: string }> = {
    'A': { preamble: "좋아, 시작해볼까? 먼저, **네 마음**이 어디로 향하는지부터 보자.", preamble_en: "Alright, shall we start? First, let's see where **your heart** is heading.", question: "복잡하게 생각하지 말고, 그냥 **본능적으로 가장 끌리는** 썸네일 하나만 골라봐.", question_en: "Don't overthink it. Just pick the one thumbnail you're **instinctively most drawn to**." },
    'B': { preamble: "오케이, 첫인상은 알았어. 이제 그걸 **어떻게 요리할지** 정해볼까?", preamble_en: "Okay, I've got your first impression. Now, let's decide **how you'd cook it**.", question: "같은 주제라도 **어떤 포맷**으로 만들 때 네가 더 신나게 만들 수 있을 것 같아?", question_en: "Even with the same topic, which **format** do you think you'd be more excited to create?" },
    'C': { preamble: "좋아, 요리법도 정했고... 이제 **누구를 위한 요리인지** 생각해보자.", preamble_en: "Great, recipe's set... Now, let's think about **who this dish is for**.", question: "네가 **가장 깊이 공감하고**, '아, 이건 내 얘기인데?' 싶은 썸네일은 뭐야?", question_en: "Which thumbnail do you **resonate with the most**, thinking, 'Ah, this is my story'?" },
    'D': { preamble: "누구에게 줄지도 정했네. 그럼 이제 **어떤 분위기**로 대접할지 볼까?", preamble_en: "We've decided who to serve. Now, let's see **what mood** we're setting.", question: "네 채널의 **전반적인 느낌**, 즉 '톤앤매너'를 결정한다면 어떤 쪽에 가까워?", question_en: "If you were to decide on your channel's **overall vibe**, its 'tone and manner,' which of these is it closer to?" },
    'E': { preamble: "분위기도 잡았고... 거의 다 왔어. 이제 **메인 메뉴**를 정할 시간이야.", preamble_en: "The mood is set... We're almost there. Time to decide on the **main course**.", question: "여러 가지 관심사 중에서, 네가 **가장 자신 있게 파고들 수 있는** 세부 주제는 뭐야?", question_en: "Among your various interests, what's the specific topic you feel **most confident diving deep into**?" },
    'F': { preamble: "마지막 질문이야. 이 모든 걸 엮어서 **하나의 세계관**으로 만들 차례야.", preamble_en: "Last question. It's time to weave all this into **a single universe**.", question: "네가 앞으로 **1년 동안 꾸준히 할 수 있는** 단 하나의 콘텐츠 시리즈를 고른다면?", question_en: "If you had to pick just one content series that you could **consistently produce for a year**, what would it be?" }
};


// --- Helper: Age Calculation ---
const getAgeValue = (range: string): number => {
    // Fine-grained mapping
    if (range === '10-15') return 12.5;
    if (range === '16-19') return 17.5;
    if (range === '20-24') return 22;
    if (range === '25-29') return 27;
    if (range === '30-39') return 35;
    if (range === '40-49') return 45;
    if (range === '50-59') return 55;
    if (range === '60+' || range === '50-60+') return 65;

    // Coarse-grained / Legacy mapping
    if (range.includes('10-19') || range.includes('10-24') || range.includes('10-29')) return 20;
    if (range.includes('20-39') || range.includes('25-39') || range.includes('25-49')) return 30;
    if (range.includes('30-59') || range.includes('35-59') || range.includes('40-60+')) return 45;
    if (range === 'All') return 30; // Neutral midpoint
    
    return 30; 
};

// --- Helper: Gender Calculation ---
const getGenderScore = (answers: Record<string, IdentityOption>): string => {
    let score = 0; // Negative = Female, Positive = Male
    Object.values(answers).forEach(opt => {
        if (opt.traits.gender === 'Male') score += 1;
        if (opt.traits.gender === 'Female') score -= 1;
    });
    
    if (score > 1) return "남성향";
    if (score < -1) return "여성향";
    return "남녀 공통";
};

// --- Helper: Keyword Generation (Core 3, Side 5) ---
const generateKeywords = (answers: Record<string, IdentityOption>) => {
    const mainCat = answers['E'].traits.category;
    const tone = answers['D'].traits.tone;
    const age = answers['C'].traits.age;
    const keywordF = answers['F'].traits.keyword;
    const keywordE = answers['E'].traits.keyword;
    const keywordA = answers['A'].traits.keyword;
    const format = answers['B'].traits.keyword; // e.g. Shorts, Vlog

    // Core Keywords (3): The pillars of the channel
    const core = [
        `#${keywordF}`, // Series Key
        `#${keywordE}`, // Specific Topic
        `#${mainCat}_${age.replace(/[^0-9]/g, '').slice(0,2)}대` // e.g. #Money_30대
    ];

    // Side Keywords (5): Traffic drivers & Vibe
    const side = [
        `#${tone}감성`,
        `#${format}`,
        `#${keywordA}`,
        `#${age}공감`,
        `#${answers['F'].text.split(' ')[0]}` // Extract first word from title
    ];

    return { core, side };
};


const IdentityFinderView: React.FC<IdentityFinderViewProps> = ({ onBack }) => {
    const [state, setState] = useState<'intro' | 'loading_quiz' | 'quiz' | 'analyzing' | 'result'>('intro');
    const [activeStages, setActiveStages] = useState<IdentityStage[]>([]);
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [selections, setSelections] = useState<Record<string, IdentityOption>>({}); // Key: Stage ID (A, B...)
    const [result, setResult] = useState<IdentityResult | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const initializeQuiz = () => {
        setState('loading_quiz');
        
        setTimeout(() => {
            const stages: IdentityStage[] = ['A', 'B', 'C', 'D', 'E', 'F'].map(stageId => {
                const pool = QUESTION_POOL[stageId];
                // Fisher-Yates Shuffle
                const shuffled = [...pool];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                
                // Select top 12
                const selectedOptions = shuffled.slice(0, 12);
                
                return {
                    id: stageId,
                    title: `STEP ${stageId}`,
                    description: 'Select one that resonates most with you.',
                    options: selectedOptions
                };
            });
            
            setActiveStages(stages);
            setState('quiz');
            setCurrentStageIdx(0);
            setSelections({});
        }, 800);
    };

    const handleStart = () => {
        initializeQuiz();
    };

    const handleSelectOption = (option: IdentityOption) => {
        const stageId = activeStages[currentStageIdx].id;
        setSelections(prev => ({ ...prev, [stageId]: option }));

        if (currentStageIdx < activeStages.length - 1) {
            setCurrentStageIdx(prev => prev + 1);
        } else {
            const finalSelections = { ...selections, [stageId]: option };
            analyzeResults(finalSelections);
        }
    };

    const analyzeResults = async (answers: Record<string, IdentityOption>) => {
        setState('analyzing');

        let score = 100;
        const penalties: string[] = [];
        const penalties_en: string[] = [];

        // 1. Category Consistency
        const catA = answers['A'].traits.category;
        const catB = answers['B'].traits.category;
        const catE = answers['E'].traits.category;

        if (catA !== catB) {
            score -= 15;
            penalties.push(`첫 선택('${catA}')과 다른 형식('${catB}')을 골랐습니다. 이는 흥미와 실행 간의 간극을 의미할 수 있습니다.`);
            penalties_en.push(`You chose a different format ('${catB}') from your initial interest ('${catA}'). This may indicate a gap between interest and execution.`);
        }
        if (catA !== catE && catB !== catE) {
            score -= 10;
            penalties.push(`최종 장르('${catE}')가 초반의 흥미와 다릅니다. 채널 방향이 흔들릴 가능성이 있습니다.`);
            penalties_en.push(`The final genre ('${catE}') differs from your initial interest. Your channel direction may be unstable.`);
        }

        // 2. Age Consistency
        const ageA = answers['A'].traits.age;
        const ageC = answers['C'].traits.age;
        const valA = getAgeValue(ageA);
        const valC = getAgeValue(ageC);

        if (Math.abs(valA - valC) >= 20) {
            score -= 25;
            penalties.push(`끌리는 콘텐츠(${ageA})와 공감하는 콘텐츠(${ageC})의 세대 차이가 큽니다. 타겟 시청자 설정에 어려움을 겪을 수 있습니다.`);
            penalties_en.push(`There's a large generational gap between content you're drawn to (${ageA}) and content you relate to (${ageC}). This may cause difficulty in setting a target audience.`);
        }

        // 3. Tone Consistency
        const toneA = answers['A'].traits.tone;
        const toneD = answers['D'].traits.tone;
        const isFast = (t: string) => ['Fun', 'Shock', 'Info'].includes(t);
        const isSlow = (t: string) => ['Healing', 'Emotional'].includes(t);

        if ((isFast(toneA) && isSlow(toneD)) || (isSlow(toneA) && isFast(toneD))) {
            score -= 15;
            penalties.push(`자극적인(빠른) 콘텐츠와 편안한(느린) 콘텐츠를 동시에 선호합니다. 채널의 톤앤매너가 불분명해질 수 있습니다.`);
            penalties_en.push(`You prefer both stimulating (fast) and relaxing (slow) content. This can make your channel's tone and manner unclear.`);
        }

        score = Math.max(30, Math.min(100, score));

        // Persona Construction
        const dominantCategory = catE;
        const dominantAge = ageC;
        const dominantTone = toneD;
        const dominantKeyword = answers['F'].traits.keyword;
        const genderBias = getGenderScore(answers);
        const personaString = `${dominantAge} 타겟 | ${genderBias} | ${dominantCategory} | ${dominantTone} 감성`;
        let statusMessage = "";
        let strategy = "";
        let statusMessage_en = "";
        let strategy_en = "";
        
        if (score >= 90) {
            statusMessage = "최상위 콘텐츠 일관성";
            statusMessage_en = "Excellent Content Consistency";
            strategy = "완벽합니다. 이 키워드 조합으로 5개 영상을 연달아 올리면 시청자가 반응할 확률이 매우 높습니다.";
            strategy_en = "Perfect. Uploading five consecutive videos with this keyword combination has a very high probability of eliciting viewer response.";
        } else if (score >= 70) {
            statusMessage = "성장 잠재력 보유 (재정비 필요)";
            statusMessage_en = "Potential for Growth (Needs Refinement)";
            strategy = "좋은 방향이지만, " + (penalties[0] || "타겟을 조금 더 좁힐 필요가 있습니다.");
            strategy_en = "It's a good direction, but " + (penalties_en[0] || "you need to narrow down your target a bit more.");
        } else {
            statusMessage = "채널 방향성 긴급 점검 필요";
            statusMessage_en = "Urgent Review of Channel Direction Needed";
            strategy = "하고 싶은 게 너무 많습니다. '내가 좋아하는 것' 말고 '타겟이 반응하는 것' 하나만 남기고 버리는 용기가 필요합니다.";
            strategy_en = "You want to do too many things. You need the courage to abandon everything except for the one thing 'your target audience reacts to,' not just 'what you like.'";
        }
        const profile = { category: dominantCategory, age: dominantAge, tone: dominantTone, keyword: dominantKeyword, persona: personaString, gender: genderBias };
        const recs = [
            { title: `${answers['F'].text} - 1편`, concept: "시리즈의 시작, 세계관 정립", concept_en: "Start of the series, establishing the world" },
            { title: `[${dominantKeyword}] ${answers['D'].text} 스타일 편집본`, concept: "톤앤매너 강화", concept_en: "Strengthening tone & manner" },
            { title: `${answers['E'].text} 모음집`, concept: "조회수 보장형 콘텐츠", concept_en: "Guaranteed-view content" }
        ];
        const keywords = generateKeywords(answers);

        try {
            const minDelay = new Promise(resolve => setTimeout(resolve, 2000));
            const aiFetch = getAIChannelRecommendations(dominantCategory, dominantKeyword);
            const [_, recommendedChannels] = await Promise.all([minDelay, aiFetch]);

            setResult({ score, profile, seriesIdeas: recs, suggestedKeywords: keywords, statusMessage, statusMessage_en, strategy, strategy_en, analysisLog: penalties, analysisLog_en: penalties_en, suggestedChannels: recommendedChannels || { korea: [], global: [] } });
            setState('result');
        } catch (error) {
            console.error("Analysis Failed", error);
            setResult({ score, profile, seriesIdeas: recs, suggestedKeywords: keywords, statusMessage, statusMessage_en, strategy, strategy_en, analysisLog: penalties, analysisLog_en: penalties_en, suggestedChannels: { korea: [], global: [] } });
            setState('result');
        }
    };

    const reset = () => {
        initializeQuiz(); 
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-purple-400';
        if (score >= 70) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const ChannelRecommendations = ({ channels, title, icon }: { channels: { name: string; reason: string }[], title: string, icon: string }) => (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 h-full">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><span className="text-xl">{icon}</span> {title}</h3>
            <div className="grid grid-cols-1 gap-3">
                {channels.map((channel) => (
                    <div key={channel.name} className="bg-gray-900/50 p-3 rounded-lg border border-gray-600/50 hover:border-blue-500 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-sm text-blue-300">{channel.name}</h4>
                            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(channel.name)}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>
                        </div>
                        <p className="text-xs text-gray-400 leading-snug">{channel.reason}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    if (state === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in text-center max-w-2xl mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6 text-white p-5 shadow-lg shadow-blue-500/30"><BrainCircuitIcon /></div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">크리에이터 DNA 진단 (Creator DNA Diagnosis)</h1>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                    안녕하세요! AI 가이드 Johnson입니다.<br/>
                    6단계 질문을 통해 당신도 몰랐던 크리에이터 DNA를 함께 발견해봐요.<br/>
                    <span className="text-blue-300 font-semibold">당신에게 가장 잘 맞는 채널 방향성</span>과 콘텐츠 아이디어를 찾을 수 있을 거예요.
                </p>
                <div className="space-y-4 w-full max-w-sm">
                    <Button onClick={handleStart} className="w-full py-4 text-lg font-bold shadow-lg transform transition hover:scale-105 bg-blue-600 hover:bg-blue-500 border-none">진단 시작하기</Button>
                    <Button onClick={onBack} variant="secondary" className="w-full py-3">뒤로 가기</Button>
                </div>
            </div>
        );
    }

    if (state === 'loading_quiz') { return <div className="flex justify-center items-center h-full"><Spinner message="오늘의 질문 세트를 구성하고 있습니다..." /></div>; }

    if (state === 'quiz') {
        const stage = activeStages[currentStageIdx];
        const dialogue = JOHNSON_DIALOGUE[stage.id];
        const progress = ((currentStageIdx) / activeStages.length) * 100;

        return (
            <div className="flex flex-col h-full max-w-6xl mx-auto p-4 md:p-6 animate-fade-in">
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-gray-400 mb-2"><span>STEP {currentStageIdx + 1} / {activeStages.length}</span></div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div></div>
                </div>
                
                <div className="mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 flex items-start gap-4">
                    <JohnsonIcon />
                    <div>
                        <p className="text-gray-300 text-sm mb-1" dangerouslySetInnerHTML={{ __html: dialogue.preamble.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}></p>
                        <p className="text-gray-500 text-xs mb-3 italic">{dialogue.preamble_en}</p>
                        <p className="text-white font-semibold whitespace-pre-line" dangerouslySetInnerHTML={{ __html: dialogue.question.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-300">$1</strong>') }}></p>
                        <p className="text-gray-400 text-xs whitespace-pre-line mt-1 italic">{dialogue.question_en}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-4">
                    {stage.options.map((option, idx) => (
                        <button key={idx} onClick={() => handleSelectOption(option)} className="relative group bg-gray-800 border-2 border-gray-700 hover:border-blue-500 p-4 rounded-xl text-left transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 flex flex-col justify-center min-h-[100px]">
                            <span className="text-gray-200 group-hover:text-white font-medium text-base leading-snug">{option.text}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (state === 'analyzing') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
                <Spinner message="DNA 패턴을 해독하고 있습니다..." />
                <div className="mt-8 space-y-3 text-center text-sm text-gray-400">
                    <p className="animate-pulse [animation-delay:0s]">🧠 카테고리 일관성 검사 중... (Checking category consistency...)</p>
                    <p className="animate-pulse [animation-delay:0.2s]">📉 타겟 연령 및 성별 분석 중... (Analyzing target age & gender...)</p>
                    <p className="animate-pulse [animation-delay:0.4s]">🔍 톤앤매너 적합도 분석 중... (Analyzing tone & manner suitability...)</p>
                    <p className="animate-pulse [animation-delay:0.6s]">🔑 필승 키워드 조합 생성 중... (Generating winning keywords...)</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto animate-fade-in">
            <div className="max-w-6xl mx-auto w-full" ref={reportRef}>
                 <header className="text-center mb-8">
                    <p className="text-blue-400 font-bold tracking-widest uppercase text-xs mb-2">Creator DNA Report</p>
                    <h1 className="text-3xl font-bold text-white">Johnson의 생각 정리 (Johnson's Thoughts)</h1>
                    <p className="text-gray-400 mt-2">이건 평가표가 아니야. 지금까지 네가 고른 선택을 하나의 방향으로 정리해본 지도야.<br/><span className="text-sm text-gray-500">This isn't an evaluation sheet. It's a map organizing your choices into a single direction.</span></p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center shadow-lg min-h-[240px] flex flex-col justify-center">
                            <p className="text-gray-400 mb-2 font-medium">콘텐츠 방향성 일관성<br/><span className="text-xs">(Content Direction Consistency)</span></p>
                            
                            <div className="flex-grow flex flex-col justify-center">
                                <p className={`font-black text-3xl leading-tight ${getScoreColor(result!.score)}`}>{result!.statusMessage}</p>
                                <p className={`text-base text-gray-400 mt-2`}>{result!.statusMessage_en}</p>
                            </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <h3 className="font-bold text-white mb-4">DNA 프로필 (DNA Profile)</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">주력 카테고리</span><span className="font-semibold">{result!.profile.category}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">타겟 (연령/성별)</span><span className="font-semibold">{result!.profile.age} / {result!.profile.gender}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">핵심 키워드</span><span className="font-semibold">{result!.profile.keyword}</span></div>
                                <div className="pt-2"><p className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded-lg border border-blue-500/20">"{result!.profile.persona}"</p></div>
                            </div>
                        </div>
                        {result!.analysisLog.length > 0 && (
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <h3 className="font-bold text-white mb-3">함께 생각해볼 점 (Points to Consider)</h3>
                                <ul className="space-y-2 text-xs text-gray-400 list-disc list-inside">
                                    {result!.analysisLog.map((log, i) => <li key={i}>{log}<br/><span className="text-gray-500 italic">{result!.analysisLog_en[i]}</span></li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <h3 className="font-bold text-white mb-4 text-lg">📢 Johnson의 성장 전략 가이드 (Johnson's Growth Strategy Guide)</h3>
                            <p className="text-gray-300 mb-2 text-sm">{result!.strategy}</p>
                            <p className="text-gray-400 text-xs italic mb-4">{result!.strategy_en}</p>
                            
                            <h4 className="font-semibold text-yellow-400 mb-3 text-sm uppercase">콘텐츠 아이디어 (Content Ideas)</h4>
                            <div className="space-y-2">
                                {result!.seriesIdeas.map((rec, i) => (
                                    <div key={i} className="flex items-start gap-3 bg-gray-700/50 p-2 rounded-lg">
                                        <div className="bg-gray-600 text-xs w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                                        <div><p className="text-white text-sm">{rec.title}</p><p className="text-xs text-gray-400">의도: {rec.concept} <span className="text-gray-500 italic">({rec.concept_en})</span></p></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <h3 className="font-bold text-white mb-4 text-lg">🚀 Your First Step Today</h3>
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
                                 <p className="text-green-300 text-sm">
                                    지금 바로 <b className="text-white">'탐색'</b> 메뉴로 이동해서, 당신의 핵심 키워드인
                                    <br/><span className="text-green-500 text-xs italic">Go to the <b className="text-white">'Explore'</b> menu and search for your core keyword:</span>
                                </p>
                                <p className="text-2xl font-bold my-2 text-white">"{result!.suggestedKeywords.core[1].substring(1)}"</p>
                                <p className="text-green-300 text-sm">
                                    를 검색하고, 상위 영상 3개를 <b className="text-white">'컬렉션'</b>에 저장해보세요.<br/>그게 당신 채널의 첫 번째 '지도'가 될 거예요.
                                    <br/><span className="text-green-500 text-xs italic">Save the top 3 videos to your <b className="text-white">'Collection'</b>.<br/>That will be your channel's first 'map'.</span>
                                </p>
                            </div>
                        </div>
                        
                        {result!.suggestedChannels && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ChannelRecommendations title="국내 벤치마킹 (Korea)" icon="🇰🇷" channels={result!.suggestedChannels.korea} />
                                <ChannelRecommendations title="글로벌 벤치마킹 (Global)" icon="🌎" channels={result!.suggestedChannels.global} />
                        </div>)}

                        <div className="text-center pt-4">
                            <p className="text-lg text-white mb-4">이 결과 보고 ‘아… 맞다’ 싶어, 아니면 ‘뭔가 어색한지’ 솔직하게 느껴봐.<br/><span className="text-sm text-gray-400">After seeing this result, honestly consider if it feels right or if something seems off.</span></p>
                            <div className="flex gap-4 max-w-md mx-auto">
                                <Button onClick={onBack} className="flex-1 py-3">✅ 이 방향으로 가볼래 (Go this way)</Button>
                                <Button onClick={reset} variant="secondary" className="flex-1 py-3">🔄 다시 생각해볼래 (Rethink)</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdentityFinderView;