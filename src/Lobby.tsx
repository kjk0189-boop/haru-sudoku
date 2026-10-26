import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Grid2X2, House, Play, Smartphone, Trophy } from 'lucide-react';
import { isComplete, type Difficulty } from './game';
import { puzzleFor, type Session } from './session';
import { calendarDays, dailyDifficulty, koreaDayKey, summarizeProfile, type PlayerProfile } from './player';
import { useI18n } from './i18n';
import './lobby.css';

export type LobbyTab = 'home' | 'daily' | 'records';
interface LobbyProps {
  tab: LobbyTab;
  onTab: (tab: LobbyTab) => void;
  onNewClassic: () => void;
  onContinueClassic: () => void;
  onResume: (session: Session) => void;
  onDaily: (dayKey: string) => void;
  onGuide: () => void;
  classic: Session | null;
  dailySessions: Record<string, Session>;
  profile: PlayerProfile;
  today: string;
  storageFailed: boolean;
}
const time = (value: number | null) => value === null ? '—' : `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;

export default function Lobby({ tab, onTab, onNewClassic, onContinueClassic, onResume, onDaily, onGuide, classic, dailySessions, profile, today, storageFailed }: LobbyProps) {
  const { language, setLanguage, t } = useI18n();
  const labels: Record<Difficulty, string> = { easy: t('쉬움','Easy'), medium: t('보통','Medium'), hard: t('어려움','Hard'), expert: t('전문가','Expert') };
  const dateLabel = (dayKey: string) => new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${dayKey}T00:00:00Z`));
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState<Difficulty | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'classic' | 'daily'>('all');
  useEffect(() => setMonthKey(today.slice(0, 7)), [today]);
  const summary = summarizeProfile(profile, filter === 'all' ? undefined : filter, modeFilter === 'all' ? undefined : modeFilter);
  const allSummary = summarizeProfile(profile);
  const dailyFinished = new Set(profile.records.filter(record => record.mode === 'daily' && record.status === 'completed').map(record => record.dayKey));
  const currentDaily = dailySessions[today];
  const todayStarted = !!currentDaily && !isComplete(currentDaily.board);
  const todayComplete = !todayStarted && (dailyFinished.has(today) || !!currentDaily && isComplete(currentDaily.board));
  const classicPuzzle = classic ? puzzleFor(classic) : null;
  const canContinue = !!classic && !isComplete(classic.board);
  const dailyInProgress = Object.values(dailySessions).filter(saved => !isComplete(saved.board)).reverse();
  const ongoing = [...(canContinue ? [classic!] : []), ...dailyInProgress];
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
  function resumeList(sessions: Session[], heading: string) {
    if (!sessions.length) return null;
    return <section className="lobby-resume" aria-label={heading}><h2>{heading}</h2><ul>{sessions.map(saved => <li key={saved.runId ?? saved.puzzleId}><button onClick={() => onResume(saved)}>
      <Play size={17}/><span><strong>{saved.mode === 'daily' ? `${t('매일 도전','Daily')} · ${dateLabel(saved.dayKey!)}` : t('클래식','Classic')}</strong><small>{labels[puzzleFor(saved).difficulty]} · {time(saved.elapsed)}</small></span><span className="lobby-resume-label">{t('이어서 풀기','Continue')}<ChevronRight size={15}/></span>
    </button></li>)}</ul></section>;
  }
  const dailyTitle = todayComplete ? t('오늘의 문제 완료','Today’s puzzle completed') : todayStarted ? t('이어서 풀기','Continue today’s puzzle') : t('오늘의 문제','Today’s puzzle');

  return <div className={`lobby-shell lobby-screen-${tab}`}>
    <header className="lobby-header">
      <div className="lobby-wordmark"><span><Grid2X2 size={20}/></span>{t('하루 스도쿠','Haru Sudoku')}</div>
      <div className="lobby-header-actions"><a className="lobby-preview-link" href="./preview.html"><Smartphone size={17}/>{t('모바일 화면 보기','Mobile preview')}</a><button className="lobby-guide-button" aria-label={t('게임 안내','Game guide')} onClick={onGuide}><BookOpen size={21}/></button></div>
    </header>
    <main className={`lobby-page lobby lobby-page-${tab}`}>
      {storageFailed && <p className="lobby-storage-warning" role="alert">{t('기록을 저장하지 못했어요. 기기 저장 공간을 확인해 주세요.','Could not save your records. Check the storage available on this device.')}</p>}
      {tab === 'home' ? <>
        <section className="lobby-welcome"><div><h1>{t('한 판 풀어볼까요?','Ready for a puzzle?')}</h1><p>{t('이어서 풀거나, 새로운 문제를 골라보세요.','Pick up where you left off, or start a new puzzle.')}</p></div></section>
        <button className={`lobby-daily-card ${todayComplete ? 'lobby-daily-done' : ''}`} onClick={() => onDaily(today)}>
          <span className="lobby-daily-icon">{todayComplete ? <Check size={26}/> : todayStarted ? <Play size={26}/> : <CalendarDays size={26}/>}</span>
          <span className="lobby-daily-copy"><span>{t('매일 도전','Daily challenge')}</span><strong>{dailyTitle}</strong><small>{dateLabel(today)} · {labels[dailyDifficulty(today)]}{todayStarted ? ` · ${time(currentDaily.elapsed)}` : ''}</small></span><span className="lobby-card-arrow"><ArrowRight size={19}/></span>
        </button>
        <section className="lobby-classic-card" aria-label={t('클래식 스도쿠','Classic Sudoku')}>
          <div className="lobby-card-title"><span className="lobby-classic-icon"><Grid2X2 size={22}/></span><div><h2>{t('클래식 스도쿠','Classic Sudoku')}</h2><p>{t('원하는 난이도로 자유롭게','Play at your preferred difficulty')}</p></div></div>
          {canContinue && <button className="lobby-button lobby-button-primary lobby-continue" onClick={onContinueClassic}><span><Play size={16}/>{t('이어서 풀기','Continue')}</span><small>{labels[classicPuzzle!.difficulty]} · {time(classic!.elapsed)}</small></button>}
          <button className={`lobby-button ${canContinue ? 'lobby-button-outline' : 'lobby-button-primary'}`} onClick={onNewClassic}><span>{t('새로운 게임','New game')}</span><ArrowRight size={17}/></button>
        </section>
        <div className="lobby-home-bottom"><button className="lobby-progress-preview" onClick={() => onTab('records')}><span>{t('완료한 게임','Completed')} <b>{allSummary.completed}{t('회',allSummary.completed === 1 ? ' game' : ' games')}</b></span><span>{t('내 기록','My records')}<ChevronRight size={16}/></span></button><p className="lobby-free-note">{t('힌트와 자동 메모는 무료로 사용할 수 있어요.','Hints and auto notes are free to use.')}</p></div>
      </> : tab === 'daily' ? <>
        <section className="lobby-section-intro"><h1>{t('매일 도전','Daily challenge')}</h1><p>{t('날짜를 골라 하루 한 문제씩 풀어보세요.','Choose a date and solve a puzzle each day.')}</p></section>
        <button className={`lobby-today-button ${todayComplete ? 'lobby-today-complete' : ''}`} onClick={() => onDaily(today)}><span className="lobby-today-symbol">{todayComplete ? <Check size={23}/> : todayStarted ? <Play size={23}/> : <CalendarDays size={23}/>}</span><span><strong>{todayComplete ? dailyTitle : todayStarted ? t('오늘의 문제 이어서 풀기','Continue today’s puzzle') : t('오늘의 문제 풀기','Play today’s puzzle')}</strong><small>{dateLabel(today)} · {labels[dailyDifficulty(today)]}{todayStarted ? ` · ${time(currentDaily.elapsed)}` : ''}</small></span><ArrowRight size={19}/></button>
        <section className="lobby-calendar" aria-label={t('매일 도전 달력','Daily challenge calendar')}>
          <div className="lobby-calendar-heading"><button aria-label={t('이전 달','Previous month')} onClick={() => moveMonth(-1)} disabled={monthKey <= '2000-01'}><ChevronLeft size={20}/></button><h2>{new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))}</h2><button aria-label={t('다음 달','Next month')} onClick={() => moveMonth(1)} disabled={monthKey >= today.slice(0, 7)}><ChevronRight size={20}/></button></div>
          <div className="lobby-calendar-grid">{(language === 'ko' ? ['일','월','화','수','목','금','토'] : ['Su','Mo','Tu','We','Th','Fr','Sa']).map((name, i) => <span className={`lobby-weekday ${i === 0 ? 'lobby-sunday' : ''}`} key={name}>{name}</span>)}
            {Array.from({ length: offset }, (_, i) => <span className="lobby-calendar-spacer" key={`pad-${i}`} aria-hidden="true"/>)}
            {days.map(dayKey => {
              const started = !!dailySessions[dayKey] && !isComplete(dailySessions[dayKey].board);
              const done = !started && (dailyFinished.has(dayKey) || !!dailySessions[dayKey] && isComplete(dailySessions[dayKey].board));
              const isToday = dayKey === today;
              return <button key={dayKey} disabled={dayKey > today} aria-current={isToday ? 'date' : undefined} aria-label={`${dateLabel(dayKey)} ${t('매일 도전','Daily challenge')}${done ? t(', 완료',', completed') : started ? t(', 이어서 풀기',', continue') : ''}${isToday ? t(', 오늘',', today') : ''}`} className={`lobby-day ${done ? 'lobby-day-complete' : ''} ${started ? 'lobby-day-started' : ''} ${isToday ? 'lobby-day-today' : ''}`} onClick={() => onDaily(dayKey)}><span>{Number(dayKey.slice(-2))}</span>{done ? <Check size={12}/> : <i/>}</button>;
            })}
          </div>
          <div className="lobby-calendar-legend"><span><i className="lobby-legend-done"/>{t('완료','Completed')}</span><span><i className="lobby-legend-started"/>{t('진행 중','In progress')}</span><span><i className="lobby-legend-today"/>{t('오늘','Today')}</span></div>
        </section>
        <div className="lobby-daily-summary"><span className="lobby-summary-icon"><Trophy size={22}/></span><div><strong>{t(`${allSummary.dailyCompleted}일의 도전을 완성했어요`,`${allSummary.dailyCompleted} daily ${allSummary.dailyCompleted === 1 ? 'challenge' : 'challenges'} completed`)}</strong><p>{t('지나간 날짜도 선택해서 풀 수 있어요.','You can play puzzles from past dates, too.')}</p></div></div>
        {resumeList(dailyInProgress.filter(saved => saved.dayKey !== today),t('진행 중인 도전','Continue a daily challenge'))}
      </> : <>
        <section className="lobby-section-intro"><h1>{t('내 기록','My records')}</h1><p>{t('지금까지 풀어온 게임을 확인하세요.','See the games you have played so far.')}</p></section>
        <div className="lobby-language"><label htmlFor="app-language">{t('언어','Language')}</label><select id="app-language" value={language} onChange={event=>setLanguage(event.target.value === 'en' ? 'en' : 'ko')}><option value="ko">한국어</option><option value="en">English</option></select></div>
        <div className="lobby-filters" aria-label={t('기록 난이도 필터','Filter records by difficulty')}>{(['all','easy','medium','hard','expert'] as const).map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? t('전체','All') : labels[value]}</button>)}</div>
        <div className="lobby-mode-filter" aria-label={t('기록 모드 필터','Filter records by mode')}>{(['all','classic','daily'] as const).map(value => <button key={value} aria-pressed={modeFilter === value} className={modeFilter === value ? 'is-active' : ''} onClick={() => setModeFilter(value)}>{value === 'all' ? t('모든 모드','All modes') : value === 'classic' ? t('클래식','Classic') : t('매일 도전','Daily')}</button>)}</div>
        <section className="lobby-stat-grid" aria-label={t('플레이 통계','Game statistics')}>
          <div className="lobby-stat lobby-stat-featured"><Trophy size={20}/><span>{t('완료한 게임','Completed')}</span><strong>{summary.completed}<small>{t('회',summary.completed === 1 ? ' game' : ' games')}</small></strong><p>{t(`시작한 게임 ${summary.played}회`,`${summary.played} ${summary.played === 1 ? 'game' : 'games'} started`)}</p></div>
          <div className="lobby-stat"><Check size={20}/><span>{t('완료율','Completion rate')}</span><strong>{summary.played ? summary.completionRate : '—'}<small>{summary.played ? '%' : ''}</small></strong><p>{t('기록된 게임 기준','Based on recorded games')}</p></div>
          <div className="lobby-stat"><Clock3 size={20}/><span>{t('최고 기록','Best time')}</span><strong className="lobby-time-value">{time(summary.bestSeconds)}</strong><p>{t('완료한 게임 중 가장 빠른 시간','Fastest completed game')}</p></div>
          <div className="lobby-stat"><BarChart3 size={20}/><span>{t('평균 시간','Average time')}</span><strong className="lobby-time-value">{time(summary.averageSeconds)}</strong><p>{t('완료한 게임 기준','Completed games only')}</p></div>
        </section>
        <div className="lobby-total-time"><span>{t('누적 플레이 시간','Total time')}</span><strong>{Math.floor(summary.totalSeconds / 60)}{t('분',' min')}</strong><span>{t(`힌트 ${summary.totalHints}회 · 실수 ${summary.totalMistakes}회`,`Hints: ${summary.totalHints} · Mistakes: ${summary.totalMistakes}`)}</span></div>
        {resumeList(ongoing,t('진행 중인 게임','Continue a game'))}
        <section className="lobby-recent"><h2>{t('최근 플레이','Recent games')} <span>{t('최근 10개','Latest 10')}</span></h2>{recent.length ? <ul>{recent.map(record => <li key={record.id}><span className={`lobby-record-symbol ${record.status === 'completed' ? 'is-complete' : ''}`}>{record.status === 'completed' ? <Check size={17}/> : <Grid2X2 size={17}/>}</span><div><strong>{record.mode === 'daily' ? t('매일 도전','Daily') : t('클래식','Classic')} · {labels[record.difficulty]}</strong><small>{dateLabel(record.mode === 'daily' && record.dayKey ? record.dayKey : koreaDayKey(new Date(record.startedAt)))} · {t(`힌트 ${record.hints}회`,`Hints: ${record.hints}`)}</small></div><span className="lobby-record-result"><b>{time(record.elapsed)}</b><small>{record.status === 'completed' ? t('완료','Completed') : record.status === 'abandoned' ? t('중단','Stopped') : t('진행 중','In progress')}</small></span></li>)}</ul> : <div className="lobby-empty"><Grid2X2 size={29}/><strong>{t('아직 기록이 없어요','No records yet')}</strong><p>{t('게임을 시작하면 여기에 기록이 쌓여요.','Your games will appear here as you play.')}</p><button onClick={onNewClassic}>{t('첫 게임 시작하기','Start your first game')}<ArrowRight size={16}/></button></div>}</section>
        <p className="lobby-local-note">{t('진행 기록은 기기 내 자동 저장됩니다.','Progress is saved automatically on this device.')}</p>
      </>}
    </main>
    <nav className="lobby-nav" aria-label={t('앱 메뉴','App navigation')}>{([{ id:'home', label:t('홈','Home'), icon:House },{ id:'daily', label:t('매일 도전','Daily'), icon:CalendarDays },{ id:'records', label:t('내 기록','My records'), icon:BarChart3 }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'is-active' : ''} onClick={() => onTab(id)}><Icon size={22}/><span>{label}</span></button>)}</nav>
  </div>;
}
