const {app,BrowserWindow}=require('electron');
const {mkdtempSync,mkdirSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {pathToFileURL}=require('node:url');
const directory=mkdtempSync(join(tmpdir(),'gallorin-color-controls-'));
mkdirSync(join(directory,'browser'));
app.setPath('userData',join(directory,'browser'));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const {colorControl}=await import(pathToFileURL(join(__dirname,'../public/library-editor.js')).href);
 const controls=['Eye Color','Coat Top','Page Background','Border Color'].map(name=>colorControl(name,'#AABBCC',name)).join('');
 const win=new BrowserWindow({show:false,width:1000,height:500,webPreferences:{contextIsolation:true,sandbox:true}});
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html><body><div style="display:grid;grid-template-columns:repeat(4,180px);gap:20px">'+controls+'</div></body></html>'));
 const result=await win.webContents.executeJavaScript('(()=>{try{('+verifyColorControls.toString()+')();return {ok:true};}catch(error){return {error:error.message};}})()');
 if(result.error)throw Error(result.error);
 win.destroy();
 console.log('PASS: captions, gaps, containers and hex fields do not open pickers; all four swatches do.');
 app.exit(0);
}).catch(error=>{console.error(error.message);app.exit(1);});
function verifyColorControls(){
 for(const control of document.querySelectorAll('.color-control')){
  const picker=control.querySelector('[type=color]'),hex=control.querySelector('[data-color-hex]');
  let activations=0;
  // Suppress the native dialog while recording its actual activation target.
  picker.addEventListener('click',event=>{event.preventDefault();activations++;});
  control.querySelector(':scope > span').click();
  control.querySelector('.color-inputs').click();
  control.click();
  hex.click();
  if(activations)throw Error(picker.getAttribute('aria-label')+': a click outside the swatch activates the picker');
  picker.click();
  if(activations!==1)throw Error('Swatch click failed');
  hex.focus();if(document.activeElement!==hex)throw Error('Hex field is not independently focusable');
  if(!picker.getAttribute('aria-label')||!hex.getAttribute('aria-label'))throw Error('Color controls lost accessible names');
 }
}
