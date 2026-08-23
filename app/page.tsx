'use client';

import { useMemo, useState } from 'react';

type RGB = [number, number, number];
type Cell = { base: RGB; lit: RGB; missing: boolean };

const BASES: RGB[] = [
  [226,82,96],[243,154,62],[237,206,88],[93,181,124],
  [62,149,166],[79,113,190],[135,101,181],[205,117,169],
  [235,131,89],[155,190,91],[70,171,155],[88,133,203],
  [171,110,190],[220,105,136],[202,165,116],[111,164,136],
];
const LIGHTS:{name:string;color:RGB}[] = [
  {name:'暖色',color:[1.03,.78,.66]},
  {name:'寒色',color:[.72,.88,1.08]},
  {name:'夕景',color:[1.12,.62,.48]},
  {name:'スタジオ',color:[.94,.98,1.02]},
];
const rgb = (c: RGB) => `rgb(${c.join(',')})`;
const hex = (c: RGB) => `#${c.map(v => Math.round(v).toString(16).padStart(2,'0')).join('')}`;
const hexToRgb = (v: string): RGB => [1,3,5].map(i => parseInt(v.slice(i,i+2),16)) as RGB;
const clamp = (v: number) => Math.max(0,Math.min(255,Math.round(v)));

function makeBoard(level: number, missingCount: number, lighting: number): Cell[] {
  const light = LIGHTS[lighting].color;
  return BASES.map((base,i) => {
    const intensity = .58 + (i%4)*.08 + Math.floor(i/4)*.035;
    return { base, lit: base.map((v,n) => clamp(v*light[n]*intensity+[18,20,30][n])) as RGB, missing: ((i*5+level*3)%16)<missingCount };
  });
}

function colorDistance(a: RGB,b: RGB) {
  const mean=(a[0]+b[0])/2, dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2];
  return Math.sqrt((2+mean/256)*dr*dr+4*dg*dg+(2+(255-mean)/256)*db*db);
}

function colorStats(c: RGB) {
  const max=Math.max(...c), min=Math.min(...c), d=max-min;
  let h=0;
  if(d){ if(max===c[0]) h=((c[1]-c[2])/d)%6; else if(max===c[1]) h=(c[2]-c[0])/d+2; else h=(c[0]-c[1])/d+4; h=Math.round(h*60); if(h<0)h+=360; }
  const saturation=max===0?0:Math.round(d/max*100);
  const brightness=Math.round(max/255*100);
  const names=['赤','オレンジ','黄','黄緑','緑','青緑','シアン','空色','青','紫','マゼンタ','ローズ'];
  return {h,saturation,brightness,name:saturation<8?'ニュートラル':names[Math.round(h/30)%12]};
}

function hsvToRgb(h:number,s:number,v:number):RGB {
  s/=100;v/=100;const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let p:[number,number,number];
  if(h<60)p=[c,x,0];else if(h<120)p=[x,c,0];else if(h<180)p=[0,c,x];else if(h<240)p=[0,x,c];else if(h<300)p=[x,0,c];else p=[c,0,x];
  return p.map(n=>clamp((n+m)*255)) as RGB;
}

export default function Home() {
  const [level,setLevel]=useState(0);
  const [missingCount,setMissingCount]=useState(6);
  const [difficulty,setDifficulty]=useState<'easy'|'normal'>('easy');
  const [lighting,setLighting]=useState(0);
  const board=useMemo(()=>makeBoard(level,missingCount,lighting),[level,missingCount,lighting]);
  const missing=useMemo(()=>board.map((c,i)=>c.missing?i:-1).filter(i=>i>=0),[board]);
  const [active,setActive]=useState(missing[0]??0);
  const [answers,setAnswers]=useState<Record<number,RGB>>({});
  const [scores,setScores]=useState<Record<number,number>>({});
  const [zoomed,setZoomed]=useState(false);
  const [showHint,setShowHint]=useState(false);
  const selected=answers[active]??(difficulty==='easy'?hsvToRgb(colorStats(board[active].lit).h,50,50):[128,128,128]) as RGB;
  const stats=colorStats(selected);
  const correctStats=colorStats(board[active].lit);
  const locked=scores[active]!==undefined;
  const hueDiff=Math.min(Math.abs(stats.h-correctStats.h),360-Math.abs(stats.h-correctStats.h));
  const answered=missing.filter(i=>answers[i]).length;
  const totalScore=Object.values(scores).reduce((a,b)=>a+b,0);
  const completed=Object.keys(scores).length===missing.length;
  const settingsLocked=answered>0&&!completed;
  const update=(value: RGB)=>{if(locked)return;setAnswers(p=>({...p,[active]:value}))};
  const updateHSV=(key:'h'|'s'|'v',value:number)=>{const next={h:stats.h,s:stats.saturation,v:stats.brightness,[key]:value};update(hsvToRgb(next.h,next.s,next.v))};
  const grade=()=>{if(!answers[active])return;const value=Math.round(Math.max(0,100-colorDistance(answers[active],board[active].lit)/2.2));setScores(p=>({...p,[active]:value}))};
  const reset=(count=missingCount,nextLevel=level,nextLighting=lighting)=>{const b=makeBoard(nextLevel,count,nextLighting);setAnswers({});setScores({});setShowHint(false);setActive(b.findIndex(c=>c.missing))};
  const nextRound=()=>{const next=level+1;setLevel(next);reset(missingCount,next)};
  const changeCount=(count:number)=>{if(settingsLocked)return;setMissingCount(count);reset(count,level)};
  const changeDifficulty=(value:'easy'|'normal')=>{if(settingsLocked)return;setDifficulty(value);reset(missingCount,level)};
  const changeLighting=(value:number)=>{if(settingsLocked)return;setLighting(value);reset(missingCount,level,value)};

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Chroma Gap ホーム"><span className="brand-mark">C</span><span>CHROMA GAP</span></a>
      <div className="round-pill">ROUND <b>{String(level+1).padStart(2,'0')}</b></div>
      <button className="icon-button" onClick={()=>setShowHint(v=>!v)} aria-label="遊び方">?</button>
    </header>
    <section className="intro"><div><p className="eyebrow">COLOR × LIGHT PUZZLE</p><h1>欠けた光を、<br/><em>色で埋める。</em></h1></div><div className="intro-side"><p className="lede">左の固有色と、右に残された光の手がかりを観察して、空白に入る色を推理しよう。</p><div className={`game-settings ${settingsLocked?'settings-locked':''}`}><div className="setting-row"><span>モード</span><div className="segmented"><button disabled={settingsLocked} className={difficulty==='easy'?'selected':''} onClick={()=>changeDifficulty('easy')}>イージー</button><button disabled={settingsLocked} className={difficulty==='normal'?'selected':''} onClick={()=>changeDifficulty('normal')}>ノーマル</button></div></div><div className="setting-row"><span>虫食い数</span><div className="count-buttons">{[3,5,6,8,10].map(n=><button disabled={settingsLocked} key={n} className={missingCount===n?'selected':''} onClick={()=>changeCount(n)}>{n}</button>)}</div></div><div className="setting-row lighting-row"><span>ライト</span><div className="lighting-buttons">{LIGHTS.map((item,i)=><button disabled={settingsLocked} key={item.name} className={lighting===i?'selected':''} onClick={()=>changeLighting(i)}>{item.name}</button>)}</div></div>{settingsLocked&&<p className="settings-note">プレイ中は設定を変更できません</p>}</div></div></section>
    {showHint&&<aside className="hint"><b>遊び方</b><span>右の点線セルを選択 → 下のパレットで色を調整 → すべて埋めたら採点。残っている色から光の色と強さを読み取るのがコツです。</span><button onClick={()=>setShowHint(false)}>×</button></aside>}
    <section className="game-area">
      <div className="boards">
        <Board title="01 / 固有色" sub="光が当たる前" cells={board} mode="base"/>
        <div className="arrow" aria-hidden="true"><span>LIGHT</span>→</div>
        <Board title="02 / ライティング後" sub={`${missing.length}か所が欠けています`} cells={board} mode="lit" active={active} answers={answers} scores={scores} onPick={setActive} onZoom={()=>setZoomed(true)}/>
      </div>
      <aside className="controls glass-card">
        <div className="control-head"><div><p className="eyebrow">SELECTED CELL</p><h2>色を調整</h2></div><span className="cell-number">{String(missing.indexOf(active)+1).padStart(2,'0')}</span></div>
        <div className={`picker-layout ${locked?'is-locked':''}`}><div className="picked-side"><label className="color-well" style={{background:rgb(selected)}}><input type="color" disabled={locked} value={hex(selected)} onChange={e=>update(hexToRgb(e.target.value))} aria-label="色を選ぶ"/><span className="pick-label">{locked?'確定した色':'選んだ色'}</span><b>{hex(selected).toUpperCase()}</b></label>
        <div className="color-summary" aria-label="現在の色の情報">
          <div><span>色味</span><strong>{stats.name}</strong></div>
          <div><span>明るさ</span><strong>{stats.brightness}%</strong></div>
          <div><span>鮮やかさ</span><strong>{stats.saturation}%</strong></div>
        </div>{locked&&<div className="cell-score"><strong>{scores[active]}点</strong><span>/ 100点<br/>このマスの点数</span></div>}</div><div className="adjust-side">
        <div className="sliders hsv-sliders">
          <label className={difficulty==='easy'||locked?'locked':''}><span className="channel h">H</span><input className="hue-input" type="range" min="0" max="359" value={stats.h} disabled={difficulty==='easy'||locked} onChange={e=>updateHSV('h',Number(e.target.value))}/><output>{difficulty==='easy'?'固定':`${stats.h}°`}</output></label>
          <label className={locked?'locked':''}><span className="channel s">S</span><input type="range" min="0" max="100" disabled={locked} value={stats.saturation} onChange={e=>updateHSV('s',Number(e.target.value))}/><output>{stats.saturation}%</output></label>
          <label className={locked?'locked':''}><span className="channel v">V</span><input type="range" min="0" max="100" disabled={locked} value={stats.brightness} onChange={e=>updateHSV('v',Number(e.target.value))}/><output>{stats.brightness}%</output></label>
        </div>
        </div></div>
        {locked&&<div className="answer-comparison"><div className="compare-head"><b>採点結果</b><span>確定後は変更できません</span></div><div className="compare-grid"><span></span><b>あなた</b><b>正解</b><b>差</b><span>H</span><strong>{stats.h}°</strong><strong>{correctStats.h}°</strong><em>{hueDiff}°</em><span>S</span><strong>{stats.saturation}%</strong><strong>{correctStats.saturation}%</strong><em>{Math.abs(stats.saturation-correctStats.saturation)}%</em><span>V</span><strong>{stats.brightness}%</strong><strong>{correctStats.brightness}%</strong><em>{Math.abs(stats.brightness-correctStats.brightness)}%</em></div></div>}
        <div className="progress"><span>入力済み</span><b>{answered} / {missing.length}</b><i><u style={{width:`${answered/missing.length*100}%`}}/></i></div>
        {completed&&<div className="result total-result"><span>TOTAL SCORE</span><strong>{totalScore}点</strong><small>/ {missing.length*100}点満点</small><p>{missing.length}マスすべての合計点</p></div>}
        <button className="primary" disabled={!answers[active]||locked} onClick={grade}>{locked?`${scores[active]}点 / 100点・確定済み`:'このマスを確定して採点'} <span>↗</span></button>
        {completed&&<button className="secondary" onClick={nextRound}>次のラウンドへ →</button>}
      </aside>
    </section>
    {zoomed&&<div className="zoom-modal" role="dialog" aria-modal="true" aria-label="回答盤面の拡大表示" onClick={()=>setZoomed(false)}><div onClick={e=>e.stopPropagation()}><button className="zoom-close" onClick={()=>setZoomed(false)}>×</button><Board title="拡大表示" sub="マスを選択できます" cells={board} mode="lit" active={active} answers={answers} scores={scores} onPick={i=>{setActive(i);setZoomed(false)}}/></div></div>}
    <footer><span>色覚トレーニング / LIGHT STUDY No.{String(level+1).padStart(3,'0')}</span><span>欠けたセルをクリックして開始</span></footer>
  </main>;
}

function Board({title,sub,cells,mode,active,answers={},scores={},onPick,onZoom}:{title:string;sub:string;cells:Cell[];mode:'base'|'lit';active?:number;answers?:Record<number,RGB>;scores?:Record<number,number>;onPick?:(i:number)=>void;onZoom?:()=>void}) {
  return <article className="board-wrap"><div className="board-label"><div><b>{title}</b><span>{sub}</span></div>{onZoom?<button className="zoom-button" onClick={onZoom}>拡大 ⤢</button>:<i>{mode==='base'?'SOURCE':'TARGET'}</i>}</div><div className={`board ${mode}`}>
    {cells.map((cell,i)=>{const hidden=mode==='lit'&&cell.missing, answer=answers[i], score=scores[i];return <button key={i} disabled={!hidden} className={`${hidden?'missing':''} ${active===i?'active':''}`} style={{background:hidden?(answer?rgb(answer):undefined):rgb(mode==='base'?cell.base:cell.lit)}} onClick={()=>onPick?.(i)} aria-label={hidden?`欠けたセル ${i+1}`:`色セル ${i+1}`}>
      {hidden&&!answer&&<span>＋</span>}{score!==undefined&&<small>{score}</small>}
    </button>})}
  </div></article>;
}
