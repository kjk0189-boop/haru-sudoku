import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Grid2X2, House, Play, Smartphone, Trophy } from 'lucide-react';
import { isComplete, type Difficulty } from './game';
import { puzzleFor, type Session } from './session';
import { calendarDays, dailyDifficulty, koreaDayKey, summarizeProfile, type PlayerProfile } from './player';
import './lobby.css';

export type LobbyTab = 'home' | 'daily' | 'records';

interface LobbyProps {
  tab: LobbyTab;
  onTab: (tab: LobbyTab) => void;
  onNewClassic: () => void;
  onContinueClassic: () => void;
  onDaily: (dayKey: string) => void;
  onGuide: () => void;
  classic: Session | null;
  dailySessions: Record<string, Session>;
  profile: PlayerProfile;
  today: string;
  storageFailed: boolean;
}

const LABELS: Record<Difficulty, string> = { easy: '쉬움', medium: '보통', hard: '어려움', expert: '전문가' };
const TIME_LABEL = (value: number | null) => value === null ? '—' : `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
const shortDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return `${year}년 ${month}월 ${day}일`; };

export default function Lobby({ tab, onTab, onNewClassic, onContinueClassic, onDaily, onGuide, classic, dailySessions, profile, today, storageFailed }: LobbyProps) {
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState<Difficulty | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'classic' | 'daily'>('all');
  useEffect(() => setMonthKey(today.slice(0, 7)), [today]);
  const summary = summarizeProfile(profile, filter === 'all' ? undefined : filter, modeFilter === 'all' ? undefined : modeFilter);
  const allSummary = summarizeProfile(profile);
  const dailyFinished = new Set(profile.records.filter(record => record.mode === 'daily' && record.status === 'completed').map(record => record.dayKey));
  const currentDaily = dailySessions[today];
  const todayComplete = dailyFinished.has(today) || !!currentDaily && isComplete(currentDaily.board);
  const classicPuzzle = classic ? puzzleFor(classic) : null;
  const classicStarted = classic && ('startedAt' in classic || 'runId' in classic || classic.elapsed > 0 || classic.hints > 0 || classic.board.some((value, i) => value !== classicPuzzle!.givens[i]));
  const canContinue = !!classic && !!classicStarted && !isComplete(classic.board);
  const [year, month] = monthKey.split('-').map(Number);
  const days = calendarDays(year, month);
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const recent = profile.records.filter(record => (filter === 'all' || record.difficulty === filter) && (modeFilter === 'all' || record.mode === modeFilter))
    .slice().sort((a, b) => (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt)).slice(0, 10);
  function moveMonth(delta: number) {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    const next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (next <= today.slice(0, 7) && date.getUTCFullYear() >= 2000) setMonthKey(next);
  }

  return <div className={`lobby-shell lobby-screen-${tab}`}>
    <header className="lobby-header">
      <div className="lobby-wordmark"><span><Grid2X2 size={20}/></span>하루 스도쿠</div>
      <div className="lobby-header-actions"><a className="lobby-preview-link" href="./preview.html"><Smartphone size={17}/>모바일 화면 보기</a><button className="lobby-guide-button" aria-label="게임 안내" onClick={onGuide}><BookOpen size={21}/></button></div>
    </header>
    <main className={`lobby-page lobby lobby-page-${tab}`}>
      {storageFailed && <p className="lobby-storage-warning" role="alert">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</p>}
      {tab === 'home' ? <>
        <section className="lobby-welcome">
          <div><h1>한 판 풀어볼까요?</h1><p>이어서 풀거나, 새로운 문제를 골라보세요.</p></div>
        </section>

        <button className={`lobby-daily-card ${todayComplete ? 'lobby-daily-done' : ''}`} onClick={() => onDaily(today)}>
          <span className="lobby-daily-icon">{todayComplete ? <Check size={26}/> : <CalendarDays size={26}/>}</span>
          <span className="lobby-daily-copy"><span>매일 도전</span><strong>{todayComplete ? '오늘의 문제 완료' : '오늘의 문제'}</strong><small>{shortDate(today)} · {LABELS[dailyDifficulty(today)]}</small></span>
          <span className="lobby-card-arrow"><ArrowRight size={19}/></span>
        </button>

        <section className="lobby-classic-card" aria-label="클래식 스도쿠">
          <div className="lobby-card-title"><span className="lobby-classic-icon"><Grid2X2 size={22}/></span><div><h2>클래식 스도쿠</h2><p>원하는 난이도로 자유롭게</p></div></div>
          {canContinue && <button className="lobby-button lobby-button-primary lobby-continue" onClick={onContinueClassic}><span><Play size={16}/>이어서 풀기</span><small>{LABELS[classicPuzzle!.difficulty]} · {TIME_LABEL(classic!.elapsed)}</small></button>}
          <button className={`lobby-button ${canContinue ? 'lobby-button-outline' : 'lobby-button-primary'}`} onClick={onNewClassic}><span>새로운 게임</span><ArrowRight size={17}/></button>
        </section>

        <div className="lobby-home-bottom">
          <button className="lobby-progress-preview" onClick={() => onTab('records')}><span>완료한 게임 <b>{allSummary.completed}회</b></span><span>내 기록<ChevronRight size={16}/></span></button>
          <p className="lobby-free-note">힌트와 자동 메모는 무료로 사용할 수 있어요.</p>
        </div>
      </> : tab === 'daily' ? <>
        <section className="lobby-section-intro"><h1>매일 도전</h1><p>날짜를 골라 하루 한 문제씩 풀어보세요.</p></section>
        <button className="lobby-today-button" onClick={() => onDaily(today)}><span className="lobby-today-symbol">{todayComplete ? <Check size={23}/> : <CalendarDays size={23}/>}</span><span><strong>{todayComplete ? '오늘의 문제 완료' : '오늘의 문제 풀기'}</strong><small>{shortDate(today)} · {LABELS[dailyDifficulty(today)]}</small></span><ArrowRight size={19}/></button>
        <section className="lobby-calendar" aria-label="매일 도전 달력">
          <div className="lobby-calendar-heading"><button aria-label="이전 달" onClick={() => moveMonth(-1)} disabled={monthKey <= '2000-01'}><ChevronLeft size={20}/></button><h2>{year}년 {month}월</h2><button aria-label="다음 달" onClick={() => moveMonth(1)} disabled={monthKey >= today.slice(0, 7)}><ChevronRight size={20}/></button></div>
          <div className="lobby-calendar-grid">{['일','월','화','수','목','금','토'].map((name, i) => <span className={`lobby-weekday ${i === 0 ? 'lobby-sunday' : ''}`} key={name}>{name}</span>)}
            {Array.from({ length: offset }, (_, i) => <span className="lobby-calendar-spacer" key={`pad-${i}`} aria-hidden="true"/>)}
            {days.map(dayKey => {
              const done = dailyFinished.has(dayKey) || !!dailySessions[dayKey] && isComplete(dailySessions[dayKey].board);
              const started = !!dailySessions[dayKey] && !done;
              const isToday = dayKey === today;
              return <button key={dayKey} disabled={dayKey > today} aria-current={isToday ? 'date' : undefined} aria-label={`${shortDate(dayKey)} 매일 도전${done ? ', 완료' : started ? ', 이어서 풀기' : ''}`} className={`lobby-day ${done ? 'lobby-day-complete' : ''} ${started ? 'lobby-day-started' : ''} ${isToday ? 'lobby-day-today' : ''}`} onClick={() => onDaily(dayKey)}><span>{Number(dayKey.slice(-2))}</span>{done ? <Check size={11}/> : <i/>}</button>;
            })}
          </div>
          <div className="lobby-calendar-legend"><span><i className="lobby-legend-done"/>완료</span><span><i className="lobby-legend-started"/>진행 중</span><span><i className="lobby-legend-today"/>오늘</span></div>
        </section>
        <div className="lobby-daily-summary"><span className="lobby-summary-icon"><Trophy size={22}/></span><div><strong>{allSummary.dailyCompleted}일의 도전을 완성했어요</strong><p>지나간 날짜도 선택해서 풀 수 있어요.</p></div></div>
      </> : <>
        <section className="lobby-section-intro"><h1>내 기록</h1><p>지금까지 풀어온 게임을 확인하세요.</p></section>
        <div className="lobby-filters" aria-label="기록 난이도 필터">{(['all','easy','medium','hard','expert'] as const).map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? '전체' : LABELS[value]}</button>)}</div>
        <div className="lobby-mode-filter" aria-label="기록 모드 필터">{(['all','classic','daily'] as const).map(value => <button key={value} aria-pressed={modeFilter === value} className={modeFilter === value ? 'is-active' : ''} onClick={() => setModeFilter(value)}>{value === 'all' ? '모든 모드' : value === 'classic' ? '클래식' : '매일 도전'}</button>)}</div>
        <section className="lobby-stat-grid" aria-label="플레이 통계">
          <div className="lobby-stat lobby-stat-featured"><Trophy size={20}/><span>완료한 게임</span><strong>{summary.completed}<small>회</small></strong><p>시작한 게임 {summary.played}회</p></div>
          <div className="lobby-stat"><Check size={20}/><span>완료율</span><strong>{summary.played ? summary.completionRate : '—'}<small>{summary.played ? '%' : ''}</small></strong><p>기록된 게임 기준</p></div>
          <div className="lobby-stat"><Clock3 size={20}/><span>최고 기록</span><strong className="lobby-time-value">{TIME_LABEL(summary.bestSeconds)}</strong><p>완료한 게임 중 가장 빠른 시간</p></div>
          <div className="lobby-stat"><BarChart3 size={20}/><span>평균 시간</span><strong className="lobby-time-value">{TIME_LABEL(summary.averageSeconds)}</strong><p>완료한 게임 기준</p></div>
        </section>
        <div className="lobby-total-time"><span>누적 플레이 시간</span><strong>{Math.floor(summary.totalSeconds / 60)}분</strong><span>힌트 {summary.totalHints}회 · 실수 {summary.totalMistakes}회</span></div>
        <section className="lobby-recent"><h2>최근 플레이 <span>최근 10개</span></h2>{recent.length ? <ul>{recent.map(record => <li key={record.id}><span className={`lobby-record-symbol ${record.status === 'completed' ? 'is-complete' : ''}`}>{record.status === 'completed' ? <Check size={17}/> : <Grid2X2 size={17}/>}</span><div><strong>{record.mode === 'daily' ? '매일 도전' : '클래식'} · {LABELS[record.difficulty]}</strong><small>{record.mode === 'daily' && record.dayKey ? shortDate(record.dayKey) : shortDate(koreaDayKey(new Date(record.startedAt)))} · 힌트 {record.hints}회</small></div><span className="lobby-record-result"><b>{TIME_LABEL(record.elapsed)}</b><small>{record.status === 'completed' ? '완료' : record.status === 'abandoned' ? '중단' : '진행 중'}</small></span></li>)}</ul> : <div className="lobby-empty"><Grid2X2 size={29}/><strong>아직 기록이 없어요</strong><p>게임을 시작하면 여기에 기록이 쌓여요.</p><button onClick={onNewClassic}>첫 게임 시작하기<ArrowRight size={16}/></button></div>}</section>
        <p className="lobby-local-note">기록은 이 기기에 저장돼요. 앱을 삭제하거나 데이터를 지우면 함께 삭제될 수 있어요.</p>
      </>}
    </main>
    <nav className="lobby-nav" aria-label="앱 메뉴">{([{ id:'home', label:'홈', icon:House },{ id:'daily', label:'매일 도전', icon:CalendarDays },{ id:'records', label:'내 기록', icon:BarChart3 }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'is-active' : ''} onClick={() => onTab(id)}><Icon size={22}/><span>{label}</span></button>)}</nav>
  </div>;
}
