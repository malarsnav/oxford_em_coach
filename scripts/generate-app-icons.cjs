const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.join(__dirname,'../app-icons');fs.mkdirSync(root,{recursive:true});
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),size=Buffer.alloc(4),check=Buffer.alloc(4);size.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([size,name,data,check]);}
// A small, reproducible PPE monogram; no third-party artwork or font dependency.
const glyphs=['11110011110011111','10001010001010000','10001010001010000','11110011110011110','10000010000010000','10000010000010000','10000010000011111'];
for(const size of [180,192,512]){
  const scale=Math.floor(size/23),left=Math.floor((size-17*scale)/2),top=Math.floor((size-7*scale)/2);
  const pixels=Buffer.alloc(size*(1+size*3));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const gx=Math.floor((x-left)/scale),gy=Math.floor((y-top)/scale);
    const white=gx>=0&&gx<17&&gy>=0&&gy<7&&glyphs[gy][gx]==='1';
    const i=y*(1+size*3)+1+x*3;pixels[i]=white?255:18;pixels[i+1]=white?255:116;pixels[i+2]=white?255:108;
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
  fs.writeFileSync(path.join(root,`icon-${size}.png`),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
