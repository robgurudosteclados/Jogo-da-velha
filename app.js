(function(){
  "use strict";

  // ---------- Regras do jogo da velha ----------
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function checkWinnerSymbol(board){
    for(const [a,b,c] of LINES){
      if(board[a] && board[a]===board[b] && board[a]===board[c]) return {symbol:board[a], line:[a,b,c]};
    }
    return null;
  }
  function isFull(board){ return board.every(c=>c!==null); }
  function emptyCells(board){ return board.map((v,i)=>v===null?i:null).filter(v=>v!==null); }

  function chooseEasyMove(board, avail){
    avail = avail || emptyCells(board);
    return avail[Math.floor(Math.random()*avail.length)];
  }

  function chooseMediumMove(board, aiSymbol, humanSymbol, avail){
    avail = avail || emptyCells(board);
    const playSmart = Math.random() > 0.25; // ocasionalmente joga de forma imperfeita
    if(playSmart){
      for(const i of avail){
        const nb = board.slice(); nb[i]=aiSymbol;
        if(checkWinnerSymbol(nb) && checkWinnerSymbol(nb).symbol===aiSymbol) return i;
      }
      for(const i of avail){
        const nb = board.slice(); nb[i]=humanSymbol;
        if(checkWinnerSymbol(nb) && checkWinnerSymbol(nb).symbol===humanSymbol) return i;
      }
    }
    if(avail.includes(4) && board[4]===null) return 4;
    const corners = [0,2,6,8].filter(i=>avail.includes(i) && board[i]===null);
    if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
    return avail[Math.floor(Math.random()*avail.length)];
  }

  function minimaxTTT(board, turnSymbol, aiSymbol, humanSymbol, depth){
    const res = checkWinnerSymbol(board);
    if(res){ return res.symbol===aiSymbol ? 10-depth : depth-10; }
    if(isFull(board)) return 0;
    const empties = emptyCells(board);
    if(turnSymbol===aiSymbol){
      let best=-Infinity;
      for(const i of empties){
        const nb=board.slice(); nb[i]=aiSymbol;
        best = Math.max(best, minimaxTTT(nb, humanSymbol, aiSymbol, humanSymbol, depth+1));
      }
      return best;
    } else {
      let best=Infinity;
      for(const i of empties){
        const nb=board.slice(); nb[i]=humanSymbol;
        best = Math.min(best, minimaxTTT(nb, aiSymbol, aiSymbol, humanSymbol, depth+1));
      }
      return best;
    }
  }
  function chooseHardMove(board, aiSymbol, humanSymbol, avail){
    avail = avail || emptyCells(board);
    let bestVal=-Infinity, bestMoves=[];
    for(const i of avail){
      const nb=board.slice(); nb[i]=aiSymbol;
      const val = minimaxTTT(nb, humanSymbol, aiSymbol, humanSymbol, 1);
      if(val>bestVal){ bestVal=val; bestMoves=[i]; }
      else if(val===bestVal){ bestMoves.push(i); }
    }
    return bestMoves[Math.floor(Math.random()*bestMoves.length)];
  }
  function chooseAIMove(board, difficulty, aiSymbol, humanSymbol, isAiFirstMove, centerRestricted){
    let avail = emptyCells(board);
    if(centerRestricted && isAiFirstMove){
      const filtered = avail.filter(i=>i!==4);
      if(filtered.length>0) avail = filtered; // fallback: se só sobrar o centro, libera
    }
    if(difficulty==='easy') return chooseEasyMove(board, avail);
    if(difficulty==='medium') return chooseMediumMove(board, aiSymbol, humanSymbol, avail);
    // difícil: joga quase sempre perfeito, mas com uma chance pequena de deslize
    // (o jogo da velha jogado com perfeição nos dois lados sempre empata — deixando
    // uma brecha ocasional, fica possível vencer se você jogar muito bem)
    if(Math.random() < 0.12) return chooseMediumMove(board, aiSymbol, humanSymbol, avail);
    return chooseHardMove(board, aiSymbol, humanSymbol, avail);
  }

  // ---------- Música polifônica (Web Audio, sem arquivos externos) ----------
  // 3 trilhas, acordes sustentados + melodia no topo, loop de 16s.
  const MusicLib = (function(){
    const SEMI = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
    function noteFreq(note){
      const m = /^([A-G][#b]?)(\d)$/.exec(note);
      if(!m) return 440;
      const semi = SEMI[m[1]];
      const oct = parseInt(m[2],10);
      return 440 * Math.pow(2, (oct-4) + (semi-9)/12);
    }
    function buildPolyTrack(chords){
      const stepDur = 0.2;          // 80 passos * 0.2s = 16s
      const totalSteps = 80;
      const stepsPerChord = totalSteps / chords.length;
      const steps = new Array(totalSteps).fill(null);
      for(let c=0;c<chords.length;c++){
        const chordNotes = chords[c];
        const start = c*stepsPerChord;
        steps[start] = steps[start] || [];
        for(const n of chordNotes){
          steps[start].push({freq: noteFreq(n), type:'sine', gain:0.5, durSteps: stepsPerChord*0.92});
        }
        const mid = start + Math.floor(stepsPerChord*0.5);
        steps[mid] = steps[mid] || [];
        const top = chordNotes[chordNotes.length-1];
        steps[mid].push({freq: noteFreq(top)*2, type:'triangle', gain:0.32, durSteps: stepsPerChord*0.4});
      }
      return {stepDur, totalSteps, steps};
    }
    const tracks = [
      { name:'Suíte I',   data: buildPolyTrack([['C3','E3','G3','B3'],['A3','C4','E4','G4'],['D3','F3','A3','C4'],['G3','B3','D4','F4']]) },
      { name:'Suíte II',  data: buildPolyTrack([['F3','A3','C4','E4'],['E3','G3','B3','D4'],['D3','F3','A3','C4'],['C3','E3','G3','B3']]) },
      { name:'Suíte III', data: buildPolyTrack([['A3','C4','E4'],['F3','A3','C4'],['C3','E3','G3'],['G3','B3','D4']]) }
    ];
    return { tracks };
  })();

  const MusicEngine = (function(){
    let ctx=null, masterGain=null, playing=false, step=0, timer=null, currentIndex=0;
    function ensureCtx(){
      if(!ctx){
        ctx = new (window.AudioContext||window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.14;
        masterGain.connect(ctx.destination);
      }
    }
    function pluck(freq, dur, type, gainVal, delay){
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gainVal, t0+0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
      osc.connect(g); g.connect(masterGain);
      osc.start(t0); osc.stop(t0+dur+0.02);
    }
    function currentTrack(){ return MusicLib.tracks[currentIndex].data; }
    function scheduleStep(){
      const track = currentTrack();
      const notes = track.steps[step % track.totalSteps];
      if(notes) for(const n of notes) pluck(n.freq, n.durSteps*track.stepDur, n.type, n.gain, 0);
      step++;
    }
    function tick(){
      if(!playing) return;
      const track = currentTrack();
      scheduleStep();
      timer = setTimeout(tick, track.stepDur*1000);
    }
    function start(){
      ensureCtx();
      if(ctx.state==='suspended') ctx.resume();
      if(playing) return;
      playing = true; step = 0; tick();
    }
    function stop(){ playing=false; if(timer) clearTimeout(timer); }
    function restart(){ if(!playing) return; if(timer) clearTimeout(timer); step=0; tick(); }
    function setTrack(index){ currentIndex = index; restart(); }
    function blip(freq, type){
      ensureCtx();
      if(ctx.state==='suspended') ctx.resume();
      pluck(freq, 0.16, type||'square', 0.5, 0);
    }
    function playJingle(result){
      ensureCtx();
      if(ctx.state==='suspended') ctx.resume();
      if(result==='win'){ [523.25,659.25,783.99,1046.50].forEach((f,i)=> pluck(f,0.38,'square',0.55,i*0.1)); }
      else if(result==='draw'){ [440.00,493.88,440.00].forEach((f,i)=> pluck(f,0.32,'triangle',0.5,i*0.13)); }
      else if(result==='loss'){ [392.00,349.23,293.66,246.94].forEach((f,i)=> pluck(f,0.42,'triangle',0.55,i*0.12)); }
    }
    return {
      start, stop, blip, setTrack, playJingle,
      get playing(){ return playing; },
      get index(){ return currentIndex; },
      get trackName(){ return MusicLib.tracks[currentIndex].name; }
    };
  })();

  // ---------- Histórico do Jogador 1 (persistido no navegador) ----------
  const STATS_KEY = 'ttt_stats_v1';
  function loadStats(){
    try{
      const raw = localStorage.getItem(STATS_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return { easy:{w:0,l:0}, medium:{w:0,l:0}, hard:{w:0,l:0} };
  }
  function saveStats(s){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(s)); }catch(e){} }
  let stats = loadStats();
  function renderStats(){
    for(const diff of ['easy','medium','hard']){
      document.getElementById('st-'+diff+'-w').textContent = stats[diff].w;
      document.getElementById('st-'+diff+'-l').textContent = stats[diff].l;
    }
  }
  function recordResult(difficulty, result){
    if(!stats[difficulty]) stats[difficulty] = {w:0,l:0};
    if(result==='win') stats[difficulty].w++;
    else if(result==='loss') stats[difficulty].l++;
    saveStats(stats);
    renderStats();
  }

  // ---------- Tabuleiro (SVG) ----------
  const svg = document.getElementById('board-svg');
  const PAD=20, CELL=120;
  function cellCenter(i){
    const r = Math.floor(i/3), c = i%3;
    return [PAD + c*CELL + CELL/2, PAD + r*CELL + CELL/2];
  }
  function buildBoardSVG(){
    svg.innerHTML='';
    const linesG = document.createElementNS('http://www.w3.org/2000/svg','g');
    linesG.setAttribute('stroke','var(--line)');
    linesG.setAttribute('stroke-opacity','0.5');
    linesG.setAttribute('stroke-width','3');
    linesG.setAttribute('stroke-linecap','round');
    [1,2].forEach(k=>{
      const x = PAD + k*CELL;
      const l = document.createElementNS('http://www.w3.org/2000/svg','line');
      l.setAttribute('x1',x); l.setAttribute('y1',PAD+8); l.setAttribute('x2',x); l.setAttribute('y2',PAD+3*CELL-8);
      linesG.appendChild(l);
      const y = PAD + k*CELL;
      const l2 = document.createElementNS('http://www.w3.org/2000/svg','line');
      l2.setAttribute('x1',PAD+8); l2.setAttribute('y1',y); l2.setAttribute('x2',PAD+3*CELL-8); l2.setAttribute('y2',y);
      linesG.appendChild(l2);
    });
    svg.appendChild(linesG);
    const marksG = document.createElementNS('http://www.w3.org/2000/svg','g');
    marksG.setAttribute('id','marksG');
    svg.appendChild(marksG);
    const hitsG = document.createElementNS('http://www.w3.org/2000/svg','g');
    for(let i=0;i<9;i++){
      const [cx,cy] = cellCenter(i);
      const hit = document.createElementNS('http://www.w3.org/2000/svg','rect');
      hit.setAttribute('x', cx-CELL/2); hit.setAttribute('y', cy-CELL/2);
      hit.setAttribute('width', CELL); hit.setAttribute('height', CELL);
      hit.setAttribute('fill','transparent'); hit.setAttribute('class','cell-hit');
      hit.dataset.idx = i;
      hit.addEventListener('click', ()=>onCellClick(i));
      hitsG.appendChild(hit);
    }
    svg.appendChild(hitsG);
  }
  function drawMark(i, symbol){
    const marksG = document.getElementById('marksG');
    const [cx,cy] = cellCenter(i);
    if(symbol==='X'){
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('class','mark');
      g.setAttribute('stroke','var(--gold)'); g.setAttribute('stroke-width','13'); g.setAttribute('stroke-linecap','round');
      const l1 = document.createElementNS('http://www.w3.org/2000/svg','line');
      l1.setAttribute('x1',cx-32); l1.setAttribute('y1',cy-32); l1.setAttribute('x2',cx+32); l1.setAttribute('y2',cy+32);
      const l2 = document.createElementNS('http://www.w3.org/2000/svg','line');
      l2.setAttribute('x1',cx-32); l2.setAttribute('y1',cy+32); l2.setAttribute('x2',cx+32); l2.setAttribute('y2',cy-32);
      g.appendChild(l1); g.appendChild(l2);
      marksG.appendChild(g);
    } else {
      const circ = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circ.setAttribute('class','mark');
      circ.setAttribute('cx',cx); circ.setAttribute('cy',cy); circ.setAttribute('r',34);
      circ.setAttribute('fill','none'); circ.setAttribute('stroke','var(--sage)'); circ.setAttribute('stroke-width','13');
      marksG.appendChild(circ);
    }
  }
  function highlightLine(line){
    const marksG = document.getElementById('marksG');
    const [x1,y1] = cellCenter(line[0]);
    const [x2,y2] = cellCenter(line[2]);
    const l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1',x1); l.setAttribute('y1',y1); l.setAttribute('x2',x2); l.setAttribute('y2',y2);
    l.setAttribute('stroke','var(--rust)'); l.setAttribute('stroke-width','7'); l.setAttribute('stroke-linecap','round');
    l.setAttribute('opacity','0.85');
    marksG.appendChild(l);
  }

  // ---------- Estado da partida ----------
  let state = null;
  let musicEnabled = false;
  let centerAllowedFirstMove = true; // preferência da chave "Regra do centro"

  function currentDiff(){
    const active = document.querySelector('.seg-btn[data-diff].active');
    return active ? active.dataset.diff : 'medium';
  }
  function setStatus(msg){ document.getElementById('statusMsg').textContent = msg; }

  function renderTurnIndicator(){
    const el = document.getElementById('turnIndicator');
    document.getElementById('forfeitBtn').disabled = !state || state.gameOver;
    if(!state || state.gameOver){
      el.innerHTML = '<span>Partida encerrada</span>';
      return;
    }
    if(state.turn==='human'){
      el.innerHTML = '<span class="mark-swatch '+state.humanSymbol.toLowerCase()+'">'+state.humanSymbol+'</span><span>Sua vez</span>';
    } else {
      el.innerHTML = '<span class="mark-swatch '+state.aiSymbol.toLowerCase()+'">'+state.aiSymbol+'</span><span>Vez da IA'+(state.aiThinking? ' · pensando…':'')+'</span>';
    }
  }

  function onCellClick(i){
    if(!state || state.gameOver || state.turn!=='human' || state.aiThinking) return;
    if(state.board[i]!==null) return;
    if(state.centerRestricted && i===4 && state.humanMoveCount===0 && emptyCells(state.board).length>1){
      setStatus('Com a regra ativa, o centro só pode ser jogado a partir da sua 2ª jogada.');
      return;
    }
    placeMark(i, state.humanSymbol, 'human');
  }

  function placeMark(i, symbol, who){
    state.board[i] = symbol;
    if(who==='human') state.humanMoveCount++; else state.aiMoveCount++;
    drawMark(i, symbol);
    MusicEngine.blip(who==='human'? 480:300, 'triangle');

    const res = checkWinnerSymbol(state.board);
    if(res){
      highlightLine(res.line);
      const winnerWho = res.symbol===state.humanSymbol ? 'human' : 'ai';
      endGame(winnerWho, winnerWho==='human' ? 'Você alinhou três símbolos!' : 'A IA alinhou três símbolos.');
      return;
    }
    if(isFull(state.board)){
      endGame('draw', 'O tabuleiro encheu sem vencedor.');
      return;
    }
    state.turn = who==='human' ? 'ai' : 'human';
    renderTurnIndicator();
    if(state.turn==='ai'){
      setStatus('A IA está pensando...');
      state.aiThinking = true;
      renderTurnIndicator();
      setTimeout(()=>{ if(!state.gameOver) aiMove(); }, 480);
    } else {
      setStatus('Sua vez: escolha uma casa.');
    }
  }

  function aiMove(){
    if(state.gameOver) return;
    const isFirst = state.aiMoveCount===0;
    const i = chooseAIMove(state.board, state.difficulty, state.aiSymbol, state.humanSymbol, isFirst, state.centerRestricted);
    state.aiThinking = false;
    placeMark(i, state.aiSymbol, 'ai');
  }

  function endGame(outcome, reason){
    state.gameOver = true;
    renderTurnIndicator();
    MusicEngine.stop(); // encerra a trilha in-game antes do jingle de resultado (ou do silêncio, se interrompida)
    const banner = document.getElementById('winnerBanner');
    const title = document.getElementById('winnerTitle');
    const sub = document.getElementById('winnerSub');
    let jingle = null;
    if(outcome==='interrupt'){
      title.textContent = 'Partida interrompida';
      setStatus('Partida interrompida. '+reason);
    } else if(outcome==='draw'){
      title.textContent='Empate!'; jingle='draw'; setStatus('Empate. '+reason);
    } else if(outcome==='human'){
      title.textContent='Você venceu!'; jingle='win'; setStatus('Vitória! '+reason);
    } else {
      title.textContent='A IA venceu'; jingle='loss'; setStatus('Derrota. '+reason);
    }
    sub.textContent = reason;
    banner.classList.remove('hidden');
    if(jingle){
      MusicEngine.playJingle(jingle);
      if(outcome==='human') recordResult(state.difficulty, 'win');
      else if(outcome==='ai') recordResult(state.difficulty, 'loss');
    }
  }

  function forfeitGame(){
    if(!state || state.gameOver) return;
    endGame('interrupt', 'Você interrompeu a partida.');
  }

  // ---------- Sorteio (cara ou coroa) e escolha de símbolo ----------
  function showCoinFlip(callback){
    const overlay = document.getElementById('coinFlipOverlay');
    const coinEl = document.getElementById('coinEl');
    const resultText = document.getElementById('coinResultText');
    overlay.classList.remove('hidden');
    resultText.textContent = 'Cara ou coroa...';
    coinEl.style.transition = 'none';
    coinEl.style.transform = 'rotateY(0deg)';
    void coinEl.offsetWidth;
    const heads = Math.random() < 0.5; // cara = você começa
    const finalDeg = 4*360 + (heads? 0 : 180);
    requestAnimationFrame(()=>{
      coinEl.style.transition = 'transform 1.15s cubic-bezier(.2,.8,.2,1)';
      coinEl.style.transform = 'rotateY('+finalDeg+'deg)';
    });
    setTimeout(()=>{
      const starter = heads ? 'human' : 'ai';
      resultText.textContent = heads
        ? 'Cara! Você começa jogando.'
        : 'Coroa! A IA começa jogando.';
      MusicEngine.blip(heads? 720:260, 'triangle');
      setTimeout(()=>{
        overlay.classList.add('hidden');
        callback(starter);
      }, 5000);
    }, 1200);
  }

  function showSymbolChoice(who, callback){
    const overlay = document.getElementById('symbolOverlay');
    const title = document.getElementById('symbolOverlayTitle');
    title.textContent = who==='human' ? 'Você perdeu o sorteio' : 'A IA perdeu o sorteio';
    overlay.classList.remove('hidden');
    document.getElementById('pickXBtn').onclick = ()=>{ overlay.classList.add('hidden'); callback('X'); };
    document.getElementById('pickOBtn').onclick = ()=>{ overlay.classList.add('hidden'); callback('O'); };
  }

  function decideSymbolsAndBegin(starter){
    const loser = starter==='human' ? 'ai' : 'human';
    if(loser==='human'){
      showSymbolChoice('human', (humanSymbol)=>{
        beginMatch(starter, humanSymbol, humanSymbol==='X'?'O':'X');
      });
    } else {
      const aiSymbol = Math.random()<0.5 ? 'X' : 'O';
      setStatus('A IA perdeu o sorteio e escolheu jogar com '+aiSymbol+'.');
      beginMatch(starter, aiSymbol==='X'?'O':'X', aiSymbol);
    }
  }

  function beginMatch(starter, humanSymbol, aiSymbol){
    state = {
      board: new Array(9).fill(null),
      humanSymbol, aiSymbol,
      turn: starter,
      difficulty: currentDiff(),
      gameOver: false,
      aiThinking: false,
      humanMoveCount: 0,
      aiMoveCount: 0,
      centerRestricted: !centerAllowedFirstMove
    };
    buildBoardSVG();
    document.getElementById('winnerBanner').classList.add('hidden');
    if(musicEnabled) MusicEngine.start();
    renderTurnIndicator();
    if(state.turn==='human'){
      setStatus('Sua vez: escolha uma casa. Você joga com '+humanSymbol+'.');
    } else {
      setStatus('A IA começa jogando com '+aiSymbol+'.');
      state.aiThinking = true;
      renderTurnIndicator();
      setTimeout(()=>{ if(!state.gameOver) aiMove(); }, 500);
    }
  }

  function startNewGame(){
    document.getElementById('winnerBanner').classList.add('hidden');
    document.getElementById('symbolOverlay').classList.add('hidden');
    setStatus('Sorteando quem começa...');
    showCoinFlip(decideSymbolsAndBegin);
  }

  // ---------- Controles ----------
  document.getElementById('newGameBtn').addEventListener('click', startNewGame);
  document.getElementById('forfeitBtn').addEventListener('click', forfeitGame);
  document.getElementById('playAgainBtn').addEventListener('click', startNewGame);
  document.querySelectorAll('#diffControl .seg-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#diffControl .seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(state) state.difficulty = btn.dataset.diff;
    });
  });

  const musicBtn = document.getElementById('musicToggleBtn');
  const trackLabel = document.getElementById('trackLabel');
  function updateTrackLabel(){
    trackLabel.textContent = 'Trilha ' + (MusicEngine.index+1) + '/3 · ' + MusicEngine.trackName;
  }
  musicBtn.addEventListener('click', ()=>{
    musicEnabled = !musicEnabled;
    if(musicEnabled){
      musicBtn.textContent = '🔊 Música: ligada';
      musicBtn.classList.add('on');
      if(state && !state.gameOver) MusicEngine.start();
    } else {
      musicBtn.textContent = '🔇 Música: desligada';
      musicBtn.classList.remove('on');
      MusicEngine.stop();
    }
  });
  document.getElementById('trackNextBtn').addEventListener('click', ()=>{
    MusicEngine.setTrack((MusicEngine.index+1) % 3);
    updateTrackLabel();
  });
  updateTrackLabel();

  const centerRuleBtn = document.getElementById('centerRuleBtn');
  centerRuleBtn.addEventListener('click', ()=>{
    centerAllowedFirstMove = !centerAllowedFirstMove;
    if(centerAllowedFirstMove){
      centerRuleBtn.textContent = '🔓 Centro liberado na 1ª jogada';
      centerRuleBtn.classList.remove('on');
    } else {
      centerRuleBtn.textContent = '🔒 Centro proibido na 1ª jogada';
      centerRuleBtn.classList.add('on');
    }
    // a mudança vale a partir da próxima partida; a atual não é afetada
  });

  document.getElementById('resetStatsBtn').addEventListener('click', ()=>{
    stats = { easy:{w:0,l:0}, medium:{w:0,l:0}, hard:{w:0,l:0} };
    saveStats(stats);
    renderStats();
  });

  renderStats();
  buildBoardSVG();
  startNewGame();

  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }
})();
