import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, Eraser, Leaf, Lightbulb, Pause, Pencil, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Undo2, X } from 'lucide-react';
import { conflicts, isComplete, type Difficulty } from './game';
import { applyHint, completedDigits, createSession, enterValue, fillAllNotes, puzzleFor, remainingHints, restoreSession, STORAGE_KEY, undo, type Session } from './session';

const LABELS: Record<Difficulty, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
function initial(): Session {
  try { return restoreSession(localStorage.getItem(STORAGE_KEY)) ?? createSession('easy'); }
  catch { return createSession('easy'); }
}

export default function App() {
  const [session, setSession] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [memo, setMemo] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [dialog, setDialog] = useState<'new' | 'restart' | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => puzzleFor(session).difficulty);
  const [message, setMessage] = useState('빈칸을 선택하고 숫자를 채워보세요.');
  const [saveFailed, setSaveFailed] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const puzzle = puzzleFor(session);
  const complete = isComplete(session.board);
  const errors = conflicts(session.board);
  const fullDigits = completedDigits(session.board);
  const hintsLeft = remainingHints(session);
  const filled = session.board.filter(Boolean).length;
  const selectedValue = selected === null ? 0 : session.board[selected];
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); setSaveFailed(false); }
    catch { setSaveFailed(true); }
  }, [session]);
  useEffect(() => {
    if (paused || complete || dialog || help || settings) return;
    const timer = window.setInterval(() => setSession(s => ({ ...s, elapsed: s.elapsed + 1 })), 1000);
    return () => clearInterval(timer);
  }, [paused, complete, dialog, help, settings]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function input(value: number) {
    if (selected === null || paused || complete) return;
    if (puzzle.givens[selected]) { setMessage('처음 주어진 숫자는 바꿀 수 없어요.'); return; }
    if (value && session.board[selected] !== value && fullDigits.has(value)
      && !(memo && session.notes[selected].includes(value))) { setMessage(`숫자 ${value}: 이미 9개가 채워졌어요. 숫자를 지우거나 되돌리면 다시 입력할 수 있어요.`); return; }
    setSession(s => enterValue(s, selected, value, memo && value !== 0));
    setMessage(memo && value ? '후보 숫자를 메모했어요.' : value ? '좋아요. 천천히 이어가세요.' : '선택한 칸을 지웠어요.');
  }
  function hint() {
    if (paused || complete) return;
    const result = applyHint(session);
    if (result.index !== undefined) setSelected(result.index);
    setSession(result.session);
    setMessage(result.message);
  }
  function advancedMemo() {
    if (paused || complete) return;
    if (errors.size) { setMessage('중복된 숫자를 먼저 수정하면 모든 후보를 메모할 수 있어요.'); return; }
    const next = fillAllNotes(session);
    setSession(next);
    setMessage(next === session ? '모든 빈칸의 후보 메모가 이미 최신 상태예요.' : '모든 빈칸에 현재 가능한 후보를 메모했어요. 되돌리기로 이전 메모를 복원할 수 있어요.');
  }
  function start() {
    if (dialog === 'restart') setSession({ ...createSession(puzzle.difficulty), puzzleId: puzzle.id, board: [...puzzle.givens] });
    else setSession(createSession(difficulty, puzzle.id));
    setSelected(null); setPaused(false); setMemo(false); setDialog(null); setMessage('새로운 마음으로 시작해볼까요?');
  }
  function keydown(event: React.KeyboardEvent<HTMLElement>) {
    if (paused || complete || dialog || settings || help) return;
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
  const blocking = dialog || settings || help;
  useEffect(() => {
    if (!blocking) return;
    const element = document.querySelector<HTMLElement>('[role="dialog"]');
    const prior = document.activeElement as HTMLElement;
    element?.querySelector<HTMLElement>('button, select, input')?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDialog(null); setSettings(false); setHelp(false); }
      if (e.key === 'Tab') {
        const items = element?.querySelectorAll<HTMLElement>('button, select, input');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); prior?.focus(); };
  }, [blocking]);
  return <>
    <header className="site-header"><a className="brand" href="./" aria-label="하루 스도쿠 홈"><span className="brand-icon"><Leaf size={22} /></span>하루 스도쿠<span className="brand-dot">.</span></a><div className="header-right"><span className="header-tag">하루의 작은 몰입</span><button className="icon-button" aria-label="게임 설정" onClick={() => setSettings(true)}><Settings2 size={20}/></button></div></header>
    <main onKeyDown={keydown}>
      <section className="intro"><div className="eyebrow"><span/> A LITTLE PAUSE, A CLEARER MIND</div><h1>복잡한 하루에,<br className="mobile-break"/> 단순한 즐거움.</h1><p>숫자 하나에 집중하다 보면, 마음도 조금 가벼워질 거예요.</p></section>
      <div className="workspace">
        <section className="game-panel" aria-label="스도쿠 게임">
          <div className="game-top"><div className="difficulty-badge"><span/>{LABELS[puzzle.difficulty]}<span className="badge-divider">/</span><span className="puzzle-label">클래식 9 × 9</span></div><div className="timer"><Clock3 size={16}/><span>{time(session.elapsed)}</span><button aria-label={paused ? '게임 계속하기' : '게임 일시정지'} className="icon-button small" disabled={complete} onClick={() => setPaused(v => !v)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button></div></div>
          <div className="board-container">
            <div ref={boardRef} className={`board ${paused ? 'is-paused' : ''}`} role="grid" aria-label="스도쿠 9행 9열">
              {Array.from({length:9},(_,r) => <div role="row" className="board-row" key={r}>{session.board.slice(r*9,r*9+9).map((v,c) => {
                const i=r*9+c, sr=selected===null?-1:Math.floor(selected/9), sc=selected===null?-1:selected%9;
                const related=selected!==null&&(sr===r||sc===c||(Math.floor(sr/3)===Math.floor(r/3)&&Math.floor(sc/3)===Math.floor(c/3)));
                return <button key={i} role="gridcell" tabIndex={i===(selected??0)?0:-1} aria-selected={selected===i} aria-readonly={!!puzzle.givens[i]} aria-invalid={!paused&&errors.has(i)} disabled={paused} aria-label={`${r+1}행 ${c+1}열, ${paused?'숨김':v||'빈칸'}${puzzle.givens[i]?', 고정 숫자':''}${!paused&&errors.has(i)?', 숫자 중복':''}${!paused&&session.notes[i].length?`, 메모 ${session.notes[i].join(', ')}`:''}`} onFocus={() => setSelected(i)} onClick={() => setSelected(i)} className={`cell ${puzzle.givens[i]?'given':''} ${related?'related':''} ${v&&v===selectedValue?'same':''} ${selected===i?'selected':''} ${errors.has(i)?'conflict':''} ${c===2||c===5?'box-right':''} ${r===2||r===5?'box-bottom':''}`}>
                  {!paused&&(v||<span className="notes">{Array.from({length:9},(_,n)=><span key={n}>{session.notes[i].includes(n+1)?n+1:''}</span>)}</span>)}
                </button>;
              })}</div>)}
            </div>
            {paused&&<div className="pause-overlay"><span className="pause-circle"><Pause size={27}/></span><h2>잠깐 쉬어가세요</h2><p>게임은 여기서 기다리고 있을게요.</p><button className="primary" onClick={()=>setPaused(false)}><Play size={16}/> 이어서 풀기</button></div>}
          </div>
          <div className="board-bottom"><span><span className="status-dot"/>{complete?'퍼즐 완성!':paused?'잠시 쉬는 중':'나만의 속도로 풀어보세요'}</span><span><b>{filled}</b> / 81</span></div>
        </section>
        <aside className="controls">
          <div className="control-heading"><span className="section-label">MY SUDOKU</span><span className="live-label"><span/>진행 중</span></div>
          <h2>작은 한 칸부터.</h2><p className="control-description">정답은 서두르지 않아도 괜찮아요.</p>
          <label className="field-label" htmlFor="difficulty">난이도 선택</label><div className="select-wrap"><select id="difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}>{Object.entries(LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><ChevronDown size={16}/></div>
          <button className="primary new-game" onClick={()=>setDialog('new')}>새 게임 시작<ArrowRight size={17}/></button>
          <div className="divider"/>
          <div className="input-label"><span className="field-label">숫자 입력</span><span>{memo?'메모 모드 ON':'칸을 선택한 후 입력'}</span></div>
          <div className="number-pad">{Array.from({length:9},(_,n)=>fullDigits.has(n+1)?<span key={n} className="number-complete" aria-hidden="true"/>:<button key={n} disabled={paused||complete} aria-label={`숫자 ${n+1} 입력`} onClick={()=>input(n+1)} className={selectedValue===n+1?'active':''}>{n+1}<span>{Math.max(0,9-session.board.filter(v=>v===n+1).length)}</span></button>)}</div>
          <div className="tools"><button disabled={paused||complete||!session.history.length} onClick={()=>setSession(undo)}><Undo2 size={20}/><span>되돌리기</span></button><button disabled={paused||complete} onClick={()=>input(0)}><Eraser size={20}/><span>지우기</span></button><button disabled={paused||complete} aria-pressed={memo} className={memo?'tool-active':''} onClick={()=>setMemo(v=>!v)}><Pencil size={20}/><span>메모 <small>{memo?'ON':'OFF'}</small></span></button></div>
          <button className="advanced-memo" disabled={paused||complete} onClick={advancedMemo}><span><Sparkles size={18}/>고급 메모</span><span>모든 후보 한 번에 채우기</span></button>
          <button className="hint-button" disabled={paused||complete||hintsLeft===0} onClick={hint}><span><Lightbulb size={19}/>조금의 도움이 필요할 때</span><span>{hintsLeft===null?'힌트 무제한':`힌트 ${hintsLeft}회 남음`}<ArrowRight size={15}/></span></button>
          <p className="hint-usage">이번 게임에서 힌트 {session.hints}회 사용</p>
          <div className="save-status">{saveFailed?<><X size={14}/>저장 불가 · 브라우저 저장 설정을 확인하세요</>:<><ShieldCheck size={14}/>진행 상황이 이 브라우저에 자동 저장돼요</>}</div>
          <button className="restart-link" onClick={()=>setDialog('restart')}><RotateCcw size={13}/>이 문제 처음부터 풀기</button>
        </aside>
      </div>
      <div className={`message ${complete?'completed':''}`} role="status" aria-live="polite">{complete?<Sparkles size={19}/>:<Lightbulb size={18}/>}<span>{complete?`멋져요! ${time(session.elapsed)} 동안 집중해서 완성했어요. 힌트 ${session.hints}회 사용.`:message}</span></div>
      <section className="tips"><span className="tip-icon"><Leaf size={21}/></span><div><h3>스도쿠, 이렇게 즐겨요</h3><p>가로, 세로, 3×3 상자마다 1부터 9까지 한 번씩 채워주세요.</p></div><button onClick={()=>setHelp(true)}>플레이 가이드<ArrowRight size={15}/></button></section>
      <p className="keyboard-guide">키보드로도 편하게 <kbd>1–9</kbd> 숫자 입력 <span>·</span> <kbd>↑ ↓ ← →</kbd> 이동 <span>·</span> <kbd>N</kbd> 메모</p>
    </main>
    <footer><span className="footer-brand">하루 스도쿠<span>.</span></span><p>오늘도, 한 칸만큼의 여유.</p><a href="https://github.com/kjk0189-boop/haru-sudoku" target="_blank" rel="noreferrer">GitHub ↗</a></footer>
    {blocking&&<div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" aria-label="닫기" onClick={()=>{setDialog(null);setSettings(false);setHelp(false);}}><X size={20}/></button>
      {dialog?<><span className="modal-icon"><Leaf size={26}/></span><h2 id="modal-title">{dialog==='restart'?'처음부터 다시 풀까요?':'새 퍼즐을 시작할까요?'}</h2><p>{dialog==='restart'?'현재 문제의 입력, 시간, 메모가 초기화됩니다.':`${LABELS[difficulty]} 난이도의 새로운 문제를 시작해요. 현재 진행 상황은 새 게임으로 바뀝니다.`}</p><div className="modal-actions"><button className="secondary" onClick={()=>setDialog(null)}>계속 풀기</button><button className="primary" onClick={start}>시작하기<ArrowRight size={16}/></button></div></>:settings?<><h2 id="modal-title">게임 설정</h2><p><strong>중복 숫자는 항상 표시해요.</strong> 행·열·상자에서 겹치는 숫자를 바로 확인할 수 있어요.</p><p>행·열·상자에서 겹치는 숫자를 표시합니다. 정답과 다른 모든 입력을 표시하는 기능은 아닙니다.</p><p>진행 기록은 이 브라우저에 저장됩니다. 난이도는 단서 수에 따른 초기 분류이며 풀이 기법에 따른 정밀 평가는 준비 중이에요.</p></>:<><h2 id="modal-title">한 칸씩, 차근차근</h2><p>각 가로줄, 세로줄, 굵은 선으로 구분된 3×3 상자에는 1~9가 한 번씩 들어가야 해요.</p><p>빈칸을 선택하고 숫자를 누르세요. 메모 모드에서는 후보 숫자를 작게 적을 수 있어요. 같은 숫자를 다시 누르면 메모가 지워져요.</p><p>고급 메모는 현재 보드를 기준으로 모든 빈칸의 후보를 한 번에 새로 채워요. 기존 메모는 교체되며 되돌리기로 복원할 수 있어요. 숫자를 입력한 뒤 다시 누르면 후보가 갱신돼요.</p><p>9개가 채워진 숫자는 입력판에서 사라져요. 지우거나 되돌리면 다시 나타나요.</p><p>힌트는 단일 후보와 숨은 단일 후보를 설명하고 한 칸을 채워줘요. 어려운 기법이 필요하면 힌트를 찾지 못할 수 있어요.</p><p>방향키로 이동, Delete로 지우기, N으로 메모 전환, Ctrl/⌘+Z로 되돌리기.</p><button className="primary" onClick={()=>setHelp(false)}><Check size={16}/>알겠어요</button></>}
    </section></div>}
  </>;
}
