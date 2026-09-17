const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const key='my2048:game-state:v1';
const game={board:[[2,2,null,null],[4,null,null,null],[null,null,null,null],[null,null,null,null]],score:20,won:false,gameOver:false};
(async()=>{
 const browser=await chromium.launch({headless:true,});
 try {
 const page=await browser.newPage();
 await page.addInitScript(({key,game})=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  set.call(localStorage,key,JSON.stringify({game,bestScore:100}));
  window.readSave=()=>get.call(localStorage,key);window.writes=[];window.pendingWrites=[];
  Storage.prototype.getItem=function(k){
   if(k!==key)return get.call(this,k);
   const value=get.call(this,k);
   return new Promise(resolve=>{window.releaseRead=()=>resolve(value)});
  };
  Storage.prototype.setItem=function(k,v){
   if(k!==key)return set.call(this,k,v);
   window.writes.push(JSON.parse(v));
   return new Promise(resolve=>{window.pendingWrites.push(()=>{set.call(this,k,v);resolve()})});
  };
 },{key,game});
 await page.goto((process.env.PROOF_URL || 'http://127.0.0.1:18748'));
 await page.waitForFunction(()=>typeof window.releaseRead==='function');
 assert.equal(await page.getByRole('button',{name:'New Game',exact:true}).isDisabled(),true,'New Game must wait for restoration');
 assert.equal(await page.getByRole('button',{name:'Move Left'}).isDisabled(),true);
 await page.keyboard.press('ArrowLeft');
 assert.deepEqual(await page.evaluate(()=>window.writes),[]);
 await page.evaluate(()=>window.releaseRead());
 await page.waitForFunction(()=>window.writes.length===1);
 assert.deepEqual(await page.evaluate(()=>window.writes[0]),{game,bestScore:100});
 await page.getByRole('button',{name:'Move Left'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('24'));
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.writes.length),1,'later saves must wait for earlier write');
 await page.evaluate(async()=>{for(let i=0;i<12;i++){window.pendingWrites.shift()?.();await new Promise(r=>setTimeout(r,10));}});
 const saved=await page.evaluate(()=>JSON.parse(window.readSave()));
 assert.equal(saved.game.score,0);assert.equal(saved.bestScore,100);
 assert.equal(saved.game.board.flat().filter(x=>x!==null).length,2);
 console.log('PASS slow storage: buttons and keyboard gated before restore; move/reset writes ordered; latest reset retained.');
 await page.close();
 const failure=await browser.newPage();
 await failure.addInitScript(({key,game})=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  set.call(localStorage,key,JSON.stringify({game,bestScore:100}));window.readSave=()=>get.call(localStorage,key);
  Storage.prototype.getItem=function(k){if(k===key)throw new Error('simulated read failure');return get.call(this,k)};
 },{key,game});
 await failure.goto((process.env.PROOF_URL || 'http://127.0.0.1:18748'));
 await failure.getByText('Saved game unavailable. Playing without saving.',{exact:true}).waitFor();
 await failure.getByRole('button',{name:'Move Left'}).click();
 await failure.getByRole('button',{name:'New Game',exact:true}).click();
 assert.deepEqual(await failure.evaluate(()=>JSON.parse(window.readSave())),{game,bestScore:100});
 console.log('PASS read failure: game remains playable, existing inaccessible save is never overwritten.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
