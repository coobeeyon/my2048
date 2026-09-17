const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const key='my2048:game-state:v1';
(async()=>{
 const browser=await chromium.launch({headless:true,});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PROOF_URL || 'http://127.0.0.1:18748'));
 await page.waitForFunction(k=>localStorage.getItem(k)!==null,key);
 const game={board:[[2,2,null,null],[4,null,null,null],[null,null,null,null],[null,null,null,null]],score:20,won:false,gameOver:false};
 await page.evaluate(({key,game})=>localStorage.setItem(key,JSON.stringify({game,bestScore:100})),{key,game});
 await page.reload();
 await page.getByRole('button',{name:'Move Left'}).waitFor();
 await page.waitForFunction(()=>document.body.textContent.includes('100'));
 const restored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.deepEqual(restored,{game,bestScore:100});
 await page.getByRole('button',{name:'Move Left'}).click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).game.score===24,key);
 const moved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 await page.reload();
 await page.waitForFunction(()=>document.body.textContent.includes('24'));
 assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),moved);
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).game.score===0,key);
 const reset=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal(reset.bestScore,100);assert.equal(reset.game.board.flat().filter(x=>x!==null).length,2);
 await page.reload();await page.waitForFunction(()=>document.body.textContent.includes('100'));
 assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),reset);
 for(const raw of ['broken', JSON.stringify({game:{...game,board:[[3,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]},bestScore:100})]){
  await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.reload();
  await page.waitForFunction(k=>{try{return JSON.parse(localStorage.getItem(k)).game.score===0}catch{return false}},key);
 }
 for(const flag of ['won','gameOver']){
  await page.evaluate(({key,game,flag})=>localStorage.setItem(key,JSON.stringify({game:{...game,[flag]:true},bestScore:100})),{key,game,flag});
  await page.reload();await page.getByText(flag==='won'?'2048 reached. Keep going.':'Game over. Start a new game.',{exact:true}).waitFor();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS exported web app: restore, move/reload, reset/reload, best score, damaged saves, win and game-over states; no browser errors.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
