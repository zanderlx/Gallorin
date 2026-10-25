import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Validate the single Windows NSIS manifest produced by our builder.
export async function verifyReleaseAssets(directory='dist',version){
  version ??= JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
  const name='Gallorin-Setup-'+version+'.exe';
  const manifest=await readFile(resolve(directory,'latest.yml'),'utf8');
  const field=(key,indent='')=>{
    const values=[...manifest.matchAll(new RegExp('^'+indent+key+': (.+)$','gm'))].map(m=>m[1].trim().replace(/^['"]|['"]$/g,''));
    if(values.length!==1)throw Error('Expected one manifest '+key);
    return values[0];
  };
  if(field('version')!==version||field('path')!==name||field('url','  - ')!==name)throw Error('Installer/manifest version or filename mismatch');
  const bytes=await readFile(resolve(directory,name));
  const hash=createHash('sha512').update(bytes).digest('base64');
  if(field('sha512')!==hash||field('sha512','    ')!==hash)throw Error('Installer checksum mismatch');
  if(Number(field('size','    '))!==bytes.length)throw Error('Installer size mismatch');
  if((await stat(resolve(directory,name+'.blockmap'))).size===0)throw Error('Empty installer blockmap');
  console.log('Verified installer, blockmap, and updater manifest for '+version);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  verifyReleaseAssets().catch(error=>{console.error(error.message);process.exitCode=1;});
}
