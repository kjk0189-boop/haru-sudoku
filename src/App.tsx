import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Eraser, Leaf, Lightbulb, Pause, Pencil, Play, RotateCcw, BookOpen, MoreHorizontal, ShieldCheck, Sparkles, Undo2, X } from 'lucide-react';
import { conflicts, isComplete, type Difficulty } from './game';
import { requestPuzzle, readRecent, rememberPuzzle, RECENT_KEY } from './generator-client';
import { STARTER_PUZZLE } from './starter';
import Lobby, { type LobbyTab } from './Lobby';
import { emptyLibrary, identifySession, putSession, restoreLibrary, LIBRARY_KEY, PROFILE_KEY } from './library';
import { abandonRecord, dailyDifficulty, dailySeed, koreaDayKey, restoreProfile, upsertRecord, type GameMode } from './player';
import { assessAccess } from './access';
import { minimizeNativeApp, useNativeEvents } from './useNativeEvents';
import { applyHint, completedDigits, createSession, enterValue, fillAllNotes, puzzleFor, remainingHints, restoreSession, STORAGE_KEY, undo, restartSession, type Session } from './session';

const LABELS: Record<Difficulty, string> = { easy: '쉬움', medium: '보통', hard: '어려움', expert: '전문가' };
const DESCRIPTIONS: Record<Difficulty, string> = { easy: '기본 규칙으로 차근차근', medium: '후보를 비교하며 깊이 생각하기', hard: '후보 잠금과 후보 쌍에 도전', expert: 'X-Wing까지 활용하는 고급 도전' };
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
function initialData() {
  try {
    const library = restoreLibrary(localStorage.getItem(LIBRARY_KEY), localStorage.getItem(STORAGE_KEY));
    let profile = restoreProfile(localStorage.getItem(PROFILE_KEY));
    if (library.classic) profile = upsertRecord(profile, library.classic);
    for (const saved of Object.values(library.daily)) profile = upsertRecord(profile, saved);
    return { library, profile };
  } catch { return { library: emptyLibrary(), profile: restoreProfile(null) }; }
}

export default function App() {
  const [initial] = useState(initialData);
  const [library, setLibrary] = useState(initial.library);
  const [profile, setProfile] = useState(initial.profile);
  const [view, setView] = useState<LobbyTab | 'game'>('home');
  const [session, setSession] = useState<Session>(() => initial.library.classic ?? createSession(STARTER_PUZZLE));
  const [today, setToday] = useState(koreaDayKey);
  const [selected, setSelected] = useState<number | null>(null);
  const [memo, setMemo] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [panel, setPanel] = useState<'menu' | 'hint' | null>(null);
  const modalTrigger = useRef<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<'new' | 'restart' | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => puzzleFor(session).difficulty);
  const [message, setMessage] = useState('빈칸을 선택하고 숫자를 채워보세요.');
  const [saveFailed, setSaveFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const generation = useRef<AbortController | null>(null);
  const [recent, setRecent] = useState<string[]>(() => { try { return readRecent(localStorage.getItem(RECENT_KEY)); } catch { return []; } });
  useEffect(() => () => generation.current?.abort(), []);
  const boardRef = useRef<HTMLDivElement>(null);
  const puzzle = puzzleFor(session);
  const complete = isComplete(session.board);
  const showCompletion = complete && !generating && !generationFailed;
  const errors = conflicts(session.board);
  const fullDigits = completedDigits(session.board);
  const hintsLeft = remainingHints(session);
  const filled = session.board.filter(Boolean).length;
  const selectedValue = selected === null ? 0 : session.board[selected];
  useEffect(() => {
    if (view !== 'game' || !session.runId) return;
    setLibrary(value => putSession(value, session));
    setProfile(value => upsertRecord(value, session));
  }, [session, view]);
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      if (library.classic) localStorage.setItem(STORAGE_KEY, JSON.stringify(library.classic));
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
  }, [library, profile]);
  useEffect(() => {
    const updateDate = () => setToday(koreaDayKey());
    const timer = window.setInterval(updateDate, 30000);
    document.addEventListener('visibilitychange', updateDate);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', updateDate); };
  }, []);
  useEffect(() => {
    if (view !== 'game' || paused || complete || generating || dialog || help || settings || panel) return;
    const timer = window.setInterval(() => setSession(s => ({ ...s, elapsed: s.elapsed + 1 })), 1000);
    return () => clearInterval(timer);
  }, [view, paused, complete, generating, dialog, help, settings, panel]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function input(value: number) {
    if (selected === null || paused || complete || generating) return;
    if (puzzle.givens[selected]) { setMessage('처음 주어진 숫자는 바꿀 수 없어요.'); return; }
    if (value && session.board[selected] !== value && fullDigits.has(value)
      && !(memo && session.notes[selected].includes(value))) { setMessage(`숫자 ${value}: 이미 9개가 채워졌어요. 숫자를 지우거나 되돌리면 다시 입력할 수 있어요.`); return; }
    setSession(s => {
      const next = enterValue(s, selected, value, memo && value !== 0);
      const wrong = value !== 0 && !memo && next !== s && value !== puzzleFor(s).solution[selected];
      return wrong ? { ...next, mistakes: (s.mistakes ?? 0) + 1 } : next;
    });
    setMessage(memo && value ? '후보 숫자를 메모했어요.' : value ? '좋아요. 천천히 이어가세요.' : '선택한 칸을 지웠어요.');
  }
  function hint() {
    if (paused || complete || generating) return;
    const access = assessAccess('hint', session.hints, 0);
    if (!access.allowed) { setMessage('정답 확인 이용 한도에 도달했어요. 추가 이용 방식은 준비 중입니다.'); openOverlay('hint'); return; }
    const result = applyHint(session);
    if (result.index !== undefined) setSelected(result.index);
    setSession(result.session);
    setMessage(result.message);
    if (window.matchMedia('(max-width: 600px)').matches) openOverlay('hint');
  }
  function advancedMemo() {
    if (paused || complete || generating) return;
    if (errors.size) { setMessage('중복된 숫자를 먼저 수정하면 모든 후보를 메모할 수 있어요.'); return; }
    const access = assessAccess('advancedNotes', session.advancedNotes ?? 0, 0);
    if (!access.allowed) { setMessage('자동 메모 이용 한도에 도달했어요. 추가 이용 방식은 준비 중입니다.'); openOverlay('hint'); return; }
    const next = fillAllNotes(session);
    setSession(next === session ? session : { ...next, advancedNotes: (session.advancedNotes ?? 0) + 1 });
    setMessage(next === session ? '모든 빈칸의 후보 메모가 이미 최신 상태예요.' : '모든 빈칸에 현재 가능한 후보를 메모했어요. 되돌리기로 이전 메모를 복원할 수 있어요.');
  }
  function leaveGame() {
    if (generating) generation.current?.abort();
    if (session.runId && view === 'game') {
      setLibrary(value => putSession(value, session));
      setProfile(value => upsertRecord(value, session));
    }
    closeOverlays(); setPaused(true); setView('home');
  }
  function resumeGame(saved: Session) {
    setSession(saved); setSelected(null); setMemo(false); setPaused(false); setView('game');
    setGenerationFailed(false); setMessage('이어서 천천히 풀어보세요.');
  }
  function openDaily(dayKey: string) {
    if (generating || dayKey > today) return;
    const saved = library.daily[dayKey];
    if (saved) { resumeGame(saved); return; }
    void generateGame('daily', dayKey);
  }
  async function generateGame(mode: GameMode, dayKey?: string) {
    if (generating) return;
    const tier = mode === 'daily' && dayKey ? dailyDifficulty(dayKey) : difficulty;
    setDialog(null); setPanel(null); setGenerating(true); setGenerationFailed(false);
    setMessage('새 문제의 정답과 난이도를 검증하고 있어요.');
    const controller = new AbortController(); generation.current = controller;
    try {
      const generated = await requestPuzzle(tier, mode === 'daily' ? [] : [...recent, puzzle.givens.join('')], controller.signal,
        mode === 'daily' && dayKey ? dailySeed(dayKey) : undefined);
      if (controller.signal.aborted) return;
      const nextSession = identifySession(createSession(generated), mode, dayKey);
      const previous = mode === 'classic' ? library.classic : dayKey ? library.daily[dayKey] : null;
      setProfile(value => upsertRecord(previous?.runId ? abandonRecord(value, previous.runId) : value, nextSession));
      setLibrary(value => putSession(value, nextSession)); setSession(nextSession);
      if (mode === 'classic') {
        const nextRecent = rememberPuzzle(recent, generated.fingerprint); setRecent(nextRecent);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent)); } catch { /* Current-memory exclusions remain available. */ }
      }
      setDifficulty(tier); setView('game'); setSelected(null); setPaused(false); setMemo(false);
      setMessage(mode === 'daily' ? `${dayKey} 매일 도전을 시작해요. 같은 날짜는 같은 문제로 즐길 수 있어요.` : `${LABELS[tier]} 새 문제를 준비했어요. 정답이 하나이며 논리적으로 끝까지 풀 수 있어요.`);
    } catch (error) {
      setGenerationFailed(true);
      setMessage(error instanceof DOMException && error.name === 'AbortError' ? '문제 생성을 취소했어요. 기존 기록은 그대로 보관됩니다.' : error instanceof Error ? error.message : '문제를 생성하지 못했어요. 다시 시도해 주세요.');
      if (view !== 'game') openOverlay('hint');
    } finally {
      if (generation.current === controller) { generation.current = null; setGenerating(false); }
    }
  }
  function start() {
    if (generating) return;
    if (dialog === 'restart') {
      const next = identifySession(restartSession(session), session.mode ?? 'classic', session.dayKey);
      setProfile(value => upsertRecord(session.runId ? abandonRecord(value, session.runId) : value, next));
      setLibrary(value => putSession(value, next)); setSession(next); setGenerationFailed(false);
      setSelected(null); setPaused(false); setMemo(false); setDialog(null); setMessage('같은 문제를 처음부터 다시 시작해요.');
      return;
    }
    void generateGame('classic');
  }
  function keydown(event: React.KeyboardEvent<HTMLElement>) {
    if (view !== 'game' || paused || complete || generating || dialog || settings || help || panel) return;
    if ((event.target as HTMLElement).matches('input, select, textarea')) return;
    const { key } = event;
    if (/^[1-9]$/.test(key)) { event.preventDefault(); input(Number(key)); }
    else if (key === 'Backspace' || key === 'Delete' || key === '0') { event.preventDefault(); input(0); }
    else if (key.toLowerCase() === 'n') { event.preventDefault(); setMemo(v => !v); }
    else if (key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); setSession(undo); }
    else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)) {
      event.preventDefault();
      const current = selected ?? 0;
      const row = Math.floor(current / 9), col = current % 9;
      const next = key === 'ArrowLeft' ? row * 9 + Math.max(0, col - 1) : key === 'ArrowRight' ? row * 9 + Math.min(8, col + 1) : key === 'ArrowUp' ? Math.max(0, current - 9) : Math.min(80, current + 9);
      setSelected(next);
      boardRef.current?.querySelectorAll<HTMLButtonElement>('[role="gridcell"]')[next]?.focus();
    }
  }
  const blocking = generating && view !== 'game' ? 'generating' : dialog || settings || help || panel;
  const statusText = showCompletion ? `멋져요! ${time(session.elapsed)} 동안 집중해서 완성했어요. 힌트 ${session.hints}회 사용.` : message;
  function openOverlay(kind: 'menu' | 'hint' | 'settings' | 'help' | 'new' | 'restart') {
    if (!modalTrigger.current) modalTrigger.current = document.activeElement as HTMLElement;
    setPanel(null); setSettings(false); setHelp(false); setDialog(null);
    if (kind === 'new' || kind === 'restart') setDialog(kind);
    else if (kind === 'settings') setSettings(true);
    else if (kind === 'help') setHelp(true);
    else setPanel(kind);
  }
  function closeOverlays() { setDialog(null); setSettings(false); setHelp(false); setPanel(null); }
  useEffect(() => {
    if (!blocking) {
      if (modalTrigger.current) {
        const targets = [modalTrigger.current, document.querySelector<HTMLElement>('.mobile-more'), document.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]'), document.querySelector<HTMLElement>('.desktop-guide')];
        targets.find(target => target?.isConnected && target.getClientRects().length > 0 && !target.matches(':disabled') && !target.closest('[inert]'))?.focus();
      }
      modalTrigger.current = null;
      return;
    }
    const element = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!modalTrigger.current) modalTrigger.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.querySelector<HTMLElement>('button, select, input')?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlays();
      if (e.key === 'Tab') {
        const items = element?.querySelectorAll<HTMLElement>('button, select, input');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = previousOverflow; };
  }, [blocking]);
  useNativeEvents(() => {
    if (generating) { generation.current?.abort(); return; }
    if (blocking) { closeOverlays(); return; }
    if (view === 'game') leaveGame(); else if (view !== 'home') setView('home'); else minimizeNativeApp();
  }, () => setPaused(true));
  return <>
    {view !== 'game' && <div className="lobby-host" inert={!!blocking}><Lobby tab={view} onTab={setView}
      onNewClassic={()=>openOverlay('new')} onContinueClassic={()=>library.classic && resumeGame(library.classic)}
      onDaily={openDaily} onGuide={()=>openOverlay('settings')} classic={library.classic} dailySessions={library.daily}
      profile={profile} today={today} storageFailed={saveFailed}/></div>}
    {view === 'game' && <>
    <header className="site-header" inert={!!blocking}><button type="button" className="brand brand-home" onClick={leaveGame} aria-label="홈으로"><ArrowLeft size={20}/><span className="brand-icon"><Leaf size={22} /></span>하루 스도쿠<span className="brand-dot">.</span></button><div className="header-right"><span className="header-tag">하루의 작은 몰입</span><button className="icon-button desktop-guide" aria-label="게임 안내" onClick={() => openOverlay('settings')}><BookOpen size={20}/></button><button className="icon-button mobile-only mobile-more" aria-label="더보기" aria-haspopup="dialog" aria-expanded={panel==='menu'} aria-controls="game-dialog" onClick={()=>openOverlay('menu')}><MoreHorizontal size={22}/></button></div></header>
    <main onKeyDown={keydown} inert={!!blocking}>
      <section className="intro"><div className="eyebrow"><span/> A LITTLE PAUSE, A CLEARER MIND</div><h1>복잡한 하루에,<br className="mobile-break"/> 단순한 즐거움.</h1><p>숫자 하나에 집중하다 보면, 마음도 조금 가벼워질 거예요.</p></section>
      <div className="workspace">
        <section className="game-panel" aria-label="스도쿠 게임">
          <div className="game-top"><div className="difficulty-badge"><span/>{session.mode==='daily'?'매일 도전':'클래식'} · {LABELS[puzzle.difficulty]}<span className="badge-divider">/</span><span className="puzzle-label">클래식 9 × 9</span></div><div className="timer"><Clock3 size={16}/><span>{time(session.elapsed)}</span><button aria-label={paused ? '게임 계속하기' : '게임 일시정지'} className="icon-button small" disabled={generating||complete} onClick={() => setPaused(v => !v)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button></div></div>
          <div className="board-container" aria-busy={generating}>
            <div ref={boardRef} className={`board ${paused ? 'is-paused' : ''}`} role="grid" aria-label="스도쿠 9행 9열">
              {Array.from({length:9},(_,r) => <div role="row" className="board-row" key={r}>{session.board.slice(r*9,r*9+9).map((v,c) => {
                const i=r*9+c, sr=selected===null?-1:Math.floor(selected/9), sc=selected===null?-1:selected%9;
                const related=selected!==null&&(sr===r||sc===c||(Math.floor(sr/3)===Math.floor(r/3)&&Math.floor(sc/3)===Math.floor(c/3)));
                return <button key={i} role="gridcell" tabIndex={i===(selected??0)?0:-1} aria-selected={selected===i} aria-readonly={!!puzzle.givens[i]} aria-invalid={!paused&&errors.has(i)} disabled={generating||paused} aria-label={`${r+1}행 ${c+1}열, ${paused?'숨김':v||'빈칸'}${puzzle.givens[i]?', 고정 숫자':''}${!paused&&errors.has(i)?', 숫자 중복':''}${!paused&&session.notes[i].length?`, 메모 ${session.notes[i].join(', ')}`:''}`} onFocus={() => setSelected(i)} onClick={() => setSelected(i)} className={`cell ${puzzle.givens[i]?'given':''} ${related?'related':''} ${v&&v===selectedValue?'same':''} ${selected===i?'selected':''} ${errors.has(i)?'conflict':''} ${c===2||c===5?'box-right':''} ${r===2||r===5?'box-bottom':''}`}>
                  {!paused&&(v||<span className="notes">{Array.from({length:9},(_,n)=><span key={n}>{session.notes[i].includes(n+1)?n+1:''}</span>)}</span>)}
                </button>;
              })}</div>)}
            </div>
            {generating&&<div className="pause-overlay generation-overlay" role="status"><span className="generation-spinner"/><h2>새로운 문제를 만들고 있어요</h2><p>정답과 난이도를 꼼꼼히 확인하고 있어요.<br/>전문가 문제는 조금 더 걸릴 수 있어요.</p><button className="secondary" onClick={()=>generation.current?.abort()}>생성 취소</button></div>}
            {paused&&!generating&&<div className="pause-overlay"><span className="pause-circle"><Pause size={27}/></span><h2>잠깐 쉬어가세요</h2><p>게임은 여기서 기다리고 있을게요.</p><button className="primary" onClick={()=>setPaused(false)}><Play size={16}/> 이어서 풀기</button></div>}
          </div>
          <div className="board-bottom"><span><span className="status-dot"/>{complete?'퍼즐 완성!':paused?'잠시 쉬는 중':`실수 ${session.mistakes ?? 0} · ${session.mode==='daily'?session.dayKey:'나만의 속도로'}`}</span><span><b>{filled}</b> / 81</span></div>
        </section>
        <aside className="controls">
          <div className="control-heading"><span className="section-label">MY SUDOKU</span><span className="live-label"><span/>{generating?'문제 준비 중':complete?'완성':'진행 중'}</span></div>
          <h2>작은 한 칸부터.</h2><p className="control-description">정답은 서두르지 않아도 괜찮아요.</p>
          <label className="field-label" htmlFor="difficulty">난이도 선택</label><div className="select-wrap"><select disabled={generating} id="difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}>{Object.entries(LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><ChevronDown size={16}/></div>
          <button disabled={generating} className="primary new-game" onClick={()=>openOverlay('new')}>새 게임 시작<ArrowRight size={17}/></button>
          <p className="difficulty-description">{DESCRIPTIONS[difficulty]}</p>
          <div className="divider"/>
          <div className="input-label"><span className="field-label">숫자 입력</span><span>{memo?'메모 모드 ON':'칸을 선택한 후 입력'}</span></div>
          <div className="number-pad">{Array.from({length:9},(_,n)=>fullDigits.has(n+1)?<span key={n} className="number-complete" aria-hidden="true"/>:<button key={n} disabled={generating||paused||complete} aria-label={`숫자 ${n+1} 입력`} onClick={()=>input(n+1)} className={selectedValue===n+1?'active':''}>{n+1}<span>{Math.max(0,9-session.board.filter(v=>v===n+1).length)}</span></button>)}</div>
          <div className="tools"><button disabled={generating||paused||complete||!session.history.length} onClick={()=>setSession(undo)}><Undo2 size={20}/><span>되돌리기</span></button><button disabled={generating||paused||complete} onClick={()=>input(0)}><Eraser size={20}/><span>지우기</span></button><button disabled={generating||paused||complete} aria-pressed={memo} className={memo?'tool-active':''} onClick={()=>setMemo(v=>!v)}><Pencil size={20}/><span>메모 <small>{memo?'ON':'OFF'}</small></span></button>
            <button className="mobile-only" aria-label="고급 메모 자동 숫자 채우기" disabled={generating||paused||complete} onClick={advancedMemo}><Sparkles size={20}/><span>자동 메모 <small>무료</small></span></button>
            <button className="mobile-only" aria-label="랜덤 정답 확인하기" disabled={generating||paused||complete||hintsLeft===0} onClick={hint}><Lightbulb size={20}/><span>정답 확인 <small>무료</small></span></button>
          </div>
          <button className="advanced-memo" disabled={generating||paused||complete} onClick={advancedMemo}><span><Sparkles size={18}/>고급 메모</span><span>자동 숫자 채우기 · 무료</span></button>
          <button className="hint-button" disabled={generating||paused||complete||hintsLeft===0} onClick={hint}><span><Lightbulb size={19}/>랜덤 정답 확인하기</span><span>{hintsLeft===null?'힌트 무제한':`힌트 ${hintsLeft}회 남음`}<ArrowRight size={15}/></span></button>
          <p className="hint-usage">이번 게임에서 힌트 {session.hints}회 사용</p>
          <div className="save-status">{saveFailed?<><X size={14}/>저장 불가 · 브라우저 저장 설정을 확인하세요</>:<><ShieldCheck size={14}/>진행 상황이 이 브라우저에 자동 저장돼요</>}</div>
          <button disabled={generating} className="restart-link" onClick={()=>openOverlay('restart')}><RotateCcw size={13}/>이 문제 처음부터 풀기</button>
        </aside>
      </div>
      <div className={`message ${showCompletion?'completed':''}`} role="status" aria-live="polite">{showCompletion?<Sparkles size={19}/>:<Lightbulb size={18}/>}<span>{showCompletion?`멋져요! ${time(session.elapsed)} 동안 집중해서 완성했어요. 힌트 ${session.hints}회 사용.`:message}</span></div>
      <div className="mobile-status mobile-only" role="status" aria-live="polite"><button aria-haspopup="dialog" onClick={()=>openOverlay('hint')}><span>{saveFailed?'자동 저장을 할 수 없어요. 브라우저 저장 설정을 확인해 주세요.':statusText}</span><ChevronDown size={15}/></button></div>
      <section className="tips"><span className="tip-icon"><Leaf size={21}/></span><div><h3>스도쿠, 이렇게 즐겨요</h3><p>가로, 세로, 3×3 상자마다 1부터 9까지 한 번씩 채워주세요.</p></div><button onClick={()=>openOverlay('help')}>플레이 가이드<ArrowRight size={15}/></button></section>
      <p className="keyboard-guide">키보드로도 편하게 <kbd>1–9</kbd> 숫자 입력 <span>·</span> <kbd>↑ ↓ ← →</kbd> 이동 <span>·</span> <kbd>N</kbd> 메모</p>
    </main>
    <footer inert={!!blocking}><span className="footer-brand">하루 스도쿠<span>.</span></span><p>오늘도, 한 칸만큼의 여유.</p><a href="https://github.com/kjk0189-boop/haru-sudoku" target="_blank" rel="noreferrer">GitHub ↗</a></footer>
    </>}
    {blocking&&<div className={`modal-backdrop ${panel?'sheet-backdrop':''}`}><section id="game-dialog" className={`modal ${settings?'game-guide':''} ${panel?'bottom-sheet':''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" aria-label="닫기" onClick={closeOverlays}><X size={20}/></button>
      {generating && view !== 'game'?<><span className="generation-spinner"/><h2 id="modal-title">게임을 준비하고 있어요</h2><p>정답과 난이도를 확인하고 있어요.</p><button className="secondary" onClick={()=>generation.current?.abort()}>생성 취소</button></>:panel==='menu'?<>
        <h2 id="modal-title">게임 메뉴</h2>
        <p className="menu-description">{session.mode==='daily'?`${session.dayKey} 매일 도전`:'클래식 플레이'}</p>
        <label className="field-label" htmlFor="mobile-difficulty">새 게임 난이도</label>
        <div className="select-wrap"><select id="mobile-difficulty" disabled={generating} value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}>{Object.entries(LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><ChevronDown size={16}/></div>
        <p className="menu-description">{DESCRIPTIONS[difficulty]}</p>
        <button className="primary menu-new" disabled={generating} onClick={()=>{setPanel(null);openOverlay('new');}}>선택한 난이도로 새 게임<ArrowRight size={17}/></button>
        <div className="menu-actions"><button onClick={leaveGame}><ArrowLeft size={18}/>홈으로 · 기록 보관</button>
          <button disabled={generating} onClick={()=>{setPanel(null);openOverlay('restart');}}><RotateCcw size={18}/>이 문제 처음부터 풀기</button>
          <button onClick={()=>{setPanel(null);openOverlay('settings');}}><BookOpen size={18}/>게임 안내</button>
          <button onClick={()=>{setPanel(null);openOverlay('help');}}><Lightbulb size={18}/>플레이 가이드</button>
        </div>
        <p className="menu-save">{saveFailed?'자동 저장 불가 · 브라우저 저장 설정을 확인해 주세요.':'진행 상황은 이 브라우저에 자동 저장됩니다.'}</p>
        <p className="menu-save">도움 기능 무료 · 자동 메모 {session.advancedNotes ?? 0}회 사용</p><p className="menu-save">힌트 {session.hints}회 사용 · {hintsLeft===null?'무제한':`${hintsLeft}회 남음`}</p>
      </>:panel==='hint'?<>
        <h2 id="modal-title">{view==='game' && showCompletion?'퍼즐 완성':'풀이 안내'}</h2>
        <p className="hint-explanation">{saveFailed?'자동 저장을 할 수 없어요. 브라우저 저장 설정을 확인해 주세요.':view==='game'?statusText:message}</p>
        <button className="primary" onClick={()=>setPanel(null)}>{view==='game'?'확인하고 계속 풀기':'확인'}<Check size={16}/></button>
      </>:dialog?<><span className="modal-icon"><Leaf size={26}/></span><h2 id="modal-title">{dialog==='restart'?'처음부터 다시 풀까요?':'새 퍼즐을 시작할까요?'}</h2>{dialog==='new'&&<div className="new-game-tiers" role="group" aria-label="새 게임 난이도">{Object.entries(LABELS).map(([key,label])=><button key={key} aria-pressed={difficulty===key} className={difficulty===key?'is-active':''} onClick={()=>setDifficulty(key as Difficulty)}>{label}<small>{DESCRIPTIONS[key as Difficulty]}</small></button>)}</div>}<p>{dialog==='restart'?'현재 문제를 새 시도로 시작합니다. 이전 시도는 내 기록에 남습니다.':`${LABELS[difficulty]} 난이도의 새로운 문제를 시작해요. 클래식 진행 중인 게임은 내 기록에 보관하고 새 게임으로 바뀝니다.`}</p><div className="modal-actions"><button className="secondary" onClick={()=>setDialog(null)}>계속 풀기</button><button className="primary" onClick={start}>시작하기<ArrowRight size={16}/></button></div></>:settings?<>
        <h2 id="modal-title">게임 안내</h2>
        <h3>기본 규칙</h3>
        <ul>
          <li><strong>격자 구조</strong>: 전체 9×9 격자는 81개의 칸으로 이루어져 있으며, 3×3 크기의 작은 정사각형 9개로 나뉩니다.</li>
          <li><strong>행(가로줄) 규칙</strong>: 1부터 9까지의 숫자가 겹치지 않고 정확히 한 번씩 들어가야 합니다.</li>
          <li><strong>열(세로줄) 규칙</strong>: 1부터 9까지의 숫자가 겹치지 않고 정확히 한 번씩 들어가야 합니다.</li>
          <li><strong>3×3 블록 규칙</strong>: 각각의 3×3 작은 박스 안에도 1부터 9까지의 숫자가 중복 없이 들어가야 합니다.</li>
        </ul>
        <h3>주요 풀이 전략</h3>
        <ul>
          <li><strong>소거법</strong>: 가로, 세로, 3×3 블록을 확인해 이미 사용된 숫자를 제외하고 들어갈 수 있는 후보를 좁혀나갑니다.</li>
          <li><strong>네이키드 싱글(확실한 싱글)</strong>: 다른 가능성이 전혀 없고 오직 하나의 숫자만 들어갈 수 있는 칸을 찾아 채웁니다.</li>
          <li><strong>메모 기능</strong>: 헷갈리는 칸에는 가능한 후보 숫자를 작게 적어두어 중복을 방지합니다.</li>
          <li><strong>고급 메모 기능</strong>: 자동으로 숫자를 적어줍니다.</li>
        </ul>
        <h3>게임 진행 안내</h3>
        <ul><li>진행 기록은 게임 브라우저에 자동 저장됩니다.</li></ul>
      </>:<><h2 id="modal-title">한 칸씩, 차근차근</h2><p>각 가로줄, 세로줄, 굵은 선으로 구분된 3×3 상자에는 1~9가 한 번씩 들어가야 해요.</p><p>빈칸을 선택하고 숫자를 누르세요. 메모 모드에서는 후보 숫자를 작게 적을 수 있어요. 같은 숫자를 다시 누르면 메모가 지워져요.</p><p>고급 메모는 현재 보드를 기준으로 모든 빈칸의 후보를 한 번에 새로 채워요. 기존 메모는 교체되며 되돌리기로 복원할 수 있어요. 숫자를 입력한 뒤 다시 누르면 후보가 갱신돼요.</p><p>9개가 채워진 숫자는 입력판에서 사라져요. 지우거나 되돌리면 다시 나타나요.</p><p>힌트는 단일 후보, 후보 잠금, 후보 쌍, X-Wing까지 순서대로 설명하고 한 칸을 채워줘요. 잘못 입력한 숫자가 있으면 먼저 수정을 안내해요.</p><p>방향키로 이동, Delete로 지우기, N으로 메모 전환, Ctrl/⌘+Z로 되돌리기.</p><button className="primary" onClick={()=>setHelp(false)}><Check size={16}/>알겠어요</button></>}
    </section></div>}
  </>;
}
