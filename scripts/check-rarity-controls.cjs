const {app,BrowserWindow}=require('electron');
const {mkdtempSync,mkdirSync,writeFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
const directory=mkdtempSync(join(tmpdir(),'gallorin-rarity-controls-'));
mkdirSync(join(directory,'browser'));app.setPath('userData',join(directory,'browser'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const {raritiesManagerPage,readRaritySettings,syncRarityControls}=await import(pathToFileURL(join(__dirname,'../public/rarities-manager.js')).href);
 const {rarityNames}=await import(pathToFileURL(join(__dirname,'../public/rarity-settings.js')).href);
 const css=pathToFileURL(join(__dirname,'../public/library.css')).href;
 writeFileSync(join(directory,'index.html'),'<!doctype html><html><head><link rel="stylesheet" href="'+css+'"></head><body><main id="main">'+raritiesManagerPage({})+'<article id="glowing" class="horse-card" data-card-rank="rare" data-rarity-glow style="--horse-rank-color:#123456">Glow</article><article id="border-only" class="horse-card" data-card-rank="rare" style="--horse-rank-color:#123456">Border</article></main></body></html>');
 const win=new BrowserWindow({show:false,width:1300,height:900,webPreferences:{sandbox:true,contextIsolation:true}});
 await win.loadFile(join(directory,'index.html'));
 await win.webContents.executeJavaScript('window.rarityNames='+JSON.stringify(rarityNames));
 const result=await win.webContents.executeJavaScript('('+verifyRarityControls.toString()+')('+syncRarityControls.toString()+','+readRaritySettings.toString()+')');
 if(result.error)throw Error(result.error);
 win.destroy();console.log('PASS: border/glow dependency, border-only serialization, reset, captions, and actual glow styles.');
 app.exit(0);
}).catch(error=>{console.error(error.message);app.exit(1);});
async function verifyRarityControls(sync,read){
 try{
  const form=document.querySelector('form'),field=name=>form.elements.namedItem(name);
  form.addEventListener('input',()=>sync(form));
  form.addEventListener('reset',()=>setTimeout(()=>sync(form),0));
  if(document.querySelector('h1').textContent!=='Rarity Manager'||document.querySelector('.rarity-settings-note'))throw Error('Manager heading or intro incorrect');
  for(const label of document.querySelectorAll('.color-control>span:first-child'))if(getComputedStyle(label).display!=='none')throw Error('Color caption is still visible');
  if(!field('glow:common').disabled||field('glow:common').checked)throw Error('Glow is available without a border');
  field('enabled:common').click();
  if(field('glow:common').disabled)throw Error('Border did not unlock Glow');
  field('glow:common').click();
  if(!read(form).glow.common)throw Error('Enabled glow was not serialized');
  field('enabled:common').click();
  if(!field('glow:common').disabled||field('glow:common').checked||read(form).glow.common)throw Error('Border removal did not clear/lock Glow');
  field('glow:rare').click();
  const saved=read(form);
  if(saved.glow.rare||!saved.colors.rare)throw Error('Glow toggle changed the border');
  form.reset();await new Promise(resolve=>setTimeout(resolve,0));
  if(!field('glow:rare').checked||field('glow:rare').disabled||!field('glow:common').disabled)throw Error('Reset did not restore dependencies');
  if(getComputedStyle(document.querySelector('#glowing')).boxShadow==='none')throw Error('Enabled glow not rendered');
  if(getComputedStyle(document.querySelector('#border-only')).boxShadow!=='none')throw Error('Border-only card still glows');
  return {ok:true};
 }catch(error){return {error:error.message};}
}
