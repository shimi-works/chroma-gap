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
const MASK = [false,true,false,false,true,false,false,true,false,false,true,false,true,false,false,true];
const rgb = (c: RGB) => `rgb(${c.join(',')})`;
const hex = (c: RGB) => `#${c.map(v => Math.round(v).toString(16).padStart(2,'0')).join('')}`;
const hexToRgb = (v: string): RGB => [1,3,5].map(i => parseInt(v.slice(i,i+2),16)) as RGB;
const clamp = (v: number) => Math.max(0,Math.min(255,Math.round(v)));

function makeBoard(level: number): Cell[] {
  const lights: RGB[] = [[1.03,.78,.66],[.72,.88,1.08],[.86,1.02,.72],[1.06,.72,.94]];
  const light = lights[level % lights.length];
  return BASES.map((base,i) => {
    const intensity = .58 + (i%4)*.08 + Math.floor(i/4)*.035;
    return { base, lit: base.map((v,n) => clamp(v*light[n]*intensity+[18,20,30][n])) as RGB, missing: MASK[(i+level)%MASK.length] };
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
  const brightness=Math.round((.2126*c[0]+.7152*c[1]+.0722*c[2])/255*100);
  const names=['赤','オレンジ','黄','黄緑','緑','青緑','シアン','空色','青','紫','マゼンタ','ローズ'];
  return {h,saturation,brightness,name:saturation<8?'ニュートラル':names[Math.round(h/30)%12]};
}

export default function Home() {
  const [level,setLevel]=useState(0);
  const board=useMemo(()=>makeBoard(level),[level]);
  const missing=useMemo(()=>board.map((c,i)=>c.missing?i:-1).filter(i=>i>=0),[board]);
  const [active,setActive]=useState(missing[0]??0);
  const [answers,setAnswers]=useState<Record<number,RGB>>({});
  const [checked,setChecked]=useState(false);
  const [showHint,setShowHint]=useState(false);
  const selected=answers[active]??[128,128,128] as RGB;
  const stats=colorStats(selected);
  const answered=missing.filter(i=>answers[i]).length;
  const distances=missing.map(i=>answers[i]?colorDistance(answers[i],board[i].lit):255);
  const score=Math.round(Math.max(0,100-distances.reduce((a,b)=>a+b,0)/distances.length/2.2));
  const update=(value: RGB)=>{setAnswers(p=>({...p,[active]:value}));setChecked(false)};
  const nextRound=()=>{const next=level+1;const b=makeBoard(next);setLevel(next);setAnswers({});setChecked(false);setShowHint(false);setActive(b.findIndex(c=>c.missing))};

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Chroma Gap ホーム"><span className="brand-mark">C</span><span>CHROMA GAP</span></a>
      <div className="round-pill">ROUND <b>{String(level+1).padStart(2,'0')}</b></div>
      <button className="icon-button" onClick={()=>setShowHint(v=>!v)} aria-label="遊び方">?</button>
    </header>
    <section className="intro"><div><p className="eyebrow">COLOR × LIGHT PUZZLE</p><h1>欠けた光を、<br/><em>色で埋める。</em></h1></div><p className="lede">左の固有色と、右に残された光の手がかりを観察して、空白に入る色を推理しよう。</p></section>
    {showHint&&<aside className="hint"><b>遊び方</b><span>右の点線セルを選択 → 下のパレットで色を調整 → すべて埋めたら採点。残っている色から光の色と強さを読み取るのがコツです。</span><button onClick={()=>setShowHint(false)}>×</button></aside>}
    <section className="game-area">
      <div className="boards">
        <Board title="01 / 固有色" sub="光が当たる前" cells={board} mode="base"/>
        <div className="arrow" aria-hidden="true"><span>LIGHT</span>→</div>
        <Board title="02 / ライティング後" sub={`${missing.length}か所が欠けています`} cells={board} mode="lit" active={active} answers={answers} checked={checked} onPick={setActive}/>
      </div>
      <aside className="controls glass-card">
        <div className="control-head"><div><p className="eyebrow">SELECTED CELL</p><h2>色を調整</h2></div><span className="cell-number">{String(missing.indexOf(active)+1).padStart(2,'0')}</span></div>
        <label className="color-well" style={{background:rgb(selected)}}><input type="color" value={hex(selected)} onChange={e=>update(hexToRgb(e.target.value))} aria-label="色を選ぶ"/><span className="pick-label">クリックして色を選択</span><b>{hex(selected).toUpperCase()}</b></label>
        <div className="color-summary" aria-label="現在の色の情報">
          <div><span>色味</span><strong>{stats.name}</strong></div>
          <div><span>明るさ</span><strong>{stats.brightness}%</strong></div>
          <div><span>鮮やかさ</span><strong>{stats.saturation}%</strong></div>
        </div>
        <div className="hue-track" aria-label={`色相 ${stats.h}度`}><i style={{left:`${stats.h/360*100}%`}}/><span>色相 {stats.h}°</span></div>
        <div className="sliders">{(['R','G','B'] as const).map((name,channel)=><label key={name}><span className={`channel ${name.toLowerCase()}`}>{name}</span><input type="range" min="0" max="255" value={selected[channel]} onChange={e=>{const next=[...selected] as RGB;next[channel]=Number(e.target.value);update(next)}}/><output>{selected[channel]}</output></label>)}</div>
        <div className="progress"><span>入力済み</span><b>{answered} / {missing.length}</b><i><u style={{width:`${answered/missing.length*100}%`}}/></i></div>
        {checked&&<div className="result"><span>SCORE</span><strong>{score}</strong><small>/ 100</small><p>{score>=90?'光を完全に捉えました！':score>=70?'かなり近い！微調整してみよう。':'残った色の明るさと色味をよく観察しよう。'}</p></div>}
        <button className="primary" disabled={answered<missing.length} onClick={()=>setChecked(true)}>{answered<missing.length?`あと ${missing.length-answered} マス`:'答え合わせ'} <span>↗</span></button>
        {checked&&<button className="secondary" onClick={nextRound}>次のラウンドへ →</button>}
      </aside>
    </section>
    <footer><span>色覚トレーニング / LIGHT STUDY No.{String(level+1).padStart(3,'0')}</span><span>欠けたセルをクリックして開始</span></footer>
  </main>;
}

function Board({title,sub,cells,mode,active,answers={},checked,onPick}:{title:string;sub:string;cells:Cell[];mode:'base'|'lit';active?:number;answers?:Record<number,RGB>;checked?:boolean;onPick?:(i:number)=>void}) {
  return <article className="board-wrap"><div className="board-label"><div><b>{title}</b><span>{sub}</span></div><i>{mode==='base'?'SOURCE':'TARGET'}</i></div><div className={`board ${mode}`}>
    {cells.map((cell,i)=>{const hidden=mode==='lit'&&cell.missing, answer=answers[i], dist=answer?colorDistance(answer,cell.lit):255;return <button key={i} disabled={!hidden} className={`${hidden?'missing':''} ${active===i?'active':''} ${checked&&hidden?(dist<32?'correct':'wrong'):''}`} style={{background:hidden?(answer?rgb(answer):undefined):rgb(mode==='base'?cell.base:cell.lit)}} onClick={()=>onPick?.(i)} aria-label={hidden?`欠けたセル ${i+1}`:`色セル ${i+1}`}>
      {hidden&&!answer&&<span>＋</span>}{checked&&hidden&&<small>{dist<32?'✓':'△'}</small>}
    </button>})}
  </div></article>;
}
