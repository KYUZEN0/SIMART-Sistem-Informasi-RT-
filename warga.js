/* ============================================================
   GANTI DENGAN CONFIG FIREBASE ANDA (sama dengan index.html)
   Dapatkan di: console.firebase.google.com
   Project Settings > General > Your apps > Web app > SDK setup
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBILdsgXojLJUanEf3gg6V5op2UAppRvDg",
  authDomain: "simart-9fe1d.firebaseapp.com",
  databaseURL: "https://simart-9fe1d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "simart-9fe1d",
  storageBucket: "simart-9fe1d.firebasestorage.app",
  messagingSenderId: "982502510613",
  appId: "1:982502510613:web:5844528aca80948aee3e1c"
};
/* ============================================================ */

// Inisialisasi Firebase dengan proteksi error
let db;
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.database();
} catch(e) {
  console.error('Firebase init gagal:', e);
  const lo = document.getElementById('loading');
  lo.querySelector('p').textContent = '\u274C Konfigurasi Firebase salah. Periksa config & databaseURL.';
  lo.querySelector('p').style.color = '#e94560';
  setTimeout(() => { lo.style.opacity='0'; setTimeout(()=>lo.style.display='none',400); }, 3000);
}

const user = JSON.parse(sessionStorage.getItem('simart_user')||'null');
if(!user||user.role!=='warga') window.location.href='index.html';
if(!db){
  document.addEventListener('DOMContentLoaded',()=>{
    const banner=document.createElement('div');
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;text-align:center;padding:14px 16px;font-size:14px;font-weight:600;';
    banner.innerHTML='\u26A0\uFE0F Firebase TIDAK terhubung! Periksa konfigurasi <code style="background:rgba(0,0,0,.3);padding:2px 6px;border-radius:4px">databaseURL</code> di warga.html';
    document.body.prepend(banner);
  });
}
document.getElementById('uName').textContent=user.nama;
document.getElementById('bannerName').textContent=user.nama;

let myWarga=null, suratData=[], kasData=[], annData=[];
const fRp=n=>'Rp '+Number(n).toLocaleString('id-ID');
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=(type==='ok'?'✅ ':'❌ ')+msg;t.className='toast on'+(type==='er'?' er':'');setTimeout(()=>t.classList.remove('on'),3000);}
function dbReady(){if(!db){toast('Firebase belum terhubung! Periksa databaseURL di config.','er');return false;}return true;}
function openModal(id){document.getElementById(id).classList.add('on');}
function closeModal(id){document.getElementById(id).classList.remove('on');}
function toArr(snap){if(!snap.exists())return[];return Object.values(snap.val());}

async function loadAll(){
  if(!dbReady()) return;
  const[ws,ss,ks,as]=await Promise.all([
    db.ref('simart/warga').once('value'),
    db.ref('simart/surat').once('value'),
    db.ref('simart/kas').once('value'),
    db.ref('simart/pengumuman').once('value')
  ]);
  const warga=toArr(ws);
  myWarga=warga.find(w=>w.fbKey===user.fbKey)||warga.find(w=>w.username===user.username)||null;
  suratData=toArr(ss).filter(s=>s.warga_key===(myWarga?.fbKey));
  kasData=toArr(ks); annData=toArr(as);
}

function goPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nl').forEach(n=>n.classList.remove('on'));
  document.querySelectorAll('.bnb').forEach(n=>n.classList.remove('on'));
  document.getElementById('pg-'+name).classList.add('on');
  document.querySelectorAll('.nl').forEach(n=>{if(n.textContent.toLowerCase().includes(name==='beranda'?'beranda':name==='surat'?'surat':name==='kas'?'kas':name==='pengumuman'?'pengumuman':'profil'))n.classList.add('on');});
  const bn=document.getElementById('bn-'+name);if(bn)bn.classList.add('on');
  if(name==='beranda')renderBeranda();
  else if(name==='surat')renderSurat();
  else if(name==='kas')renderKas();
  else if(name==='pengumuman')renderAnn();
  else if(name==='profil')renderProfil();
}

function renderBeranda(){
  document.getElementById('qsSurat').textContent=suratData.length;
  document.getElementById('qsPend').textContent=suratData.filter(x=>x.status==='pending').length;
  document.getElementById('qsAnn').textContent=annData.length;
  const rAnn=[...annData].reverse().slice(0,3);
  document.getElementById('latestAnn').innerHTML=!rAnn.length?'':
    `<div class="card"><div class="ch"><h3>📢 Pengumuman Terbaru</h3><button class="btn bg sm" onclick="goPage('pengumuman')">Lihat Semua</button></div><div class="cb">${rAnn.map(a=>`<div style="padding:12px 0;border-bottom:1px solid var(--bor)"><div style="font-weight:700;font-size:15px;margin-bottom:4px">${a.judul}</div><div style="font-size:12px;color:var(--mu);margin-bottom:6px">📅 ${a.tanggal}</div><div style="font-size:13px;color:var(--mu);line-height:1.6">${a.isi}</div></div>`).join('')}</div></div>`;
}

function renderSurat(){
  const tb=document.getElementById('tbSurat');
  if(!suratData.length){tb.innerHTML=`<tr><td colspan="5"><div class="empty"><div class="ei">📭</div><h4>Belum ada surat</h4><p>Klik "Ajukan Surat" untuk membuat pengajuan</p></div></td></tr>`;return;}
  tb.innerHTML=[...suratData].reverse().map((s,i)=>`<tr><td style="color:var(--mu)">${i+1}</td><td><div style="font-weight:600">${s.jenis}</div></td><td>${s.tanggal}</td><td><span class="badge ${s.status==='pending'?'bpend':s.status==='approved'?'bapp':'brej'}">${s.status==='pending'?'⏳ Menunggu':s.status==='approved'?'✅ Disetujui':'❌ Ditolak'}</span></td><td><div style="display:flex;gap:6px"><button class="btn bg sm" onclick="viewSurat('${s.fbKey}')">👁️</button>${s.status==='approved'?`<button class="btn bs sm" onclick="cetakSuratW('${s.fbKey}')">🖨️</button>`:''}</div></td></tr>`).join('');
}

function bukaAjukan(){
  if(myWarga){document.getElementById('sNama').value=myWarga.nama||'';document.getElementById('sNIK').value=myWarga.nik||'';document.getElementById('sAKTP').value=myWarga.alamat||'';document.getElementById('sANow').value=myWarga.alamat||'';}
  openModal('moSurat');
}

async function ajukanSurat(){
  if(!dbReady()) return;
  const jenis=document.getElementById('sJenis').value,nama=document.getElementById('sNama').value.trim(),jk=document.getElementById('sJK').value,tl=document.getElementById('sTL').value.trim(),tglL=document.getElementById('sTglL').value,wn=document.getElementById('sWN').value.trim(),agama=document.getElementById('sAgama').value,sk=document.getElementById('sSK').value,kerja=document.getElementById('sKerja').value.trim(),aKTP=document.getElementById('sAKTP').value.trim(),aNow=document.getElementById('sANow').value.trim(),nik=document.getElementById('sNIK').value.trim(),ket=document.getElementById('sKet').value.trim();
  if(!nama||!tl||!tglL||!kerja||!aKTP||!aNow||!nik){toast('Harap isi semua field yang wajib','er');return;}
  if(nik.length<16){toast('NIK harus 16 digit','er');return;}
  try{
    const tglLF=new Date(tglL).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const nr=db.ref('simart/surat').push();
    const nd={fbKey:nr.key,warga_key:myWarga?.fbKey||'',nama,jenis,tanggal:new Date().toISOString().split('T')[0],status:'pending',keterangan:ket,jk,tempat_lahir:tl,tgl_lahir:tglL,tgl_lahir_format:tglLF,kewarganegaraan:wn,agama,status_kawin:sk,pekerjaan:kerja,alamat_ktp:aKTP,alamat_now:aNow,nik};
    await nr.set(nd); suratData.push(nd);
    closeModal('moSurat');
    ['sNama','sTL','sKerja','sAKTP','sANow','sNIK','sKet'].forEach(id=>document.getElementById(id).value='');
    renderSurat(); renderBeranda(); toast('Pengajuan surat berhasil dikirim!');
  }catch(e){toast('Gagal menyimpan: '+e.message,'er');}
}

function viewSurat(k){
  const s=suratData.find(x=>x.fbKey===k);if(!s)return;
  document.getElementById('suratDetailW').innerHTML=`<div style="display:grid;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--bor)"><span style="color:var(--mu)">Jenis Surat</span><strong>${s.jenis}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Tanggal Ajuan</span><strong>${s.tanggal}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Status</span><span class="badge ${s.status==='pending'?'bpend':s.status==='approved'?'bapp':'brej'}">${s.status==='pending'?'⏳ Menunggu Proses':s.status==='approved'?'✅ Disetujui':'❌ Ditolak'}</span></div>
    ${s.keterangan&&s.status==='rejected'?`<div style="background:rgba(233,69,96,.08);border-radius:10px;padding:12px;font-size:13px;color:var(--red)">Alasan: ${s.keterangan}</div>`:''}
    ${s.nama?`<div style="background:var(--sur2);border:1px solid var(--bor);border-radius:10px;padding:12px;font-size:13px"><div style="font-weight:700;margin-bottom:8px;color:var(--tx)">Data Pemohon</div><div style="color:var(--mu)">Nama: <strong style="color:var(--tx)">${s.nama}</strong></div><div style="color:var(--mu)">NIK: <strong style="color:var(--tx);font-family:monospace">${s.nik||'-'}</strong></div><div style="color:var(--mu)">Pekerjaan: <strong style="color:var(--tx)">${s.pekerjaan||'-'}</strong></div></div>`:''}
  </div>`;
  const acts=document.getElementById('suratActsW');
  acts.innerHTML=`<button class="btn bg" onclick="closeModal('moDetail')">Tutup</button>`;
  if(s.status==='approved')acts.innerHTML+=`<button class="btn bp" onclick="cetakSuratW('${k}')">🖨️ Cetak Surat</button>`;
  openModal('moDetail');
}

function cetakSuratW(k){
  const s=suratData.find(x=>x.fbKey===k);if(!s)return;
  const no=`${String(suratData.indexOf(s)+1).padStart(3,'0')}/RT07/RW04/${new Date().getFullYear()}`;
  const tglF=new Date(s.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const nama=s.nama||'-',jk=s.jk||'...............................',ttl=s.tempat_lahir&&s.tgl_lahir_format?`${s.tempat_lahir}, ${s.tgl_lahir_format}`:'...............................',wn=s.kewarganegaraan||'Indonesia',agama=s.agama||'...............................',kawin=s.status_kawin||'...............................',kerja=s.pekerjaan||'...............................',aKTP=s.alamat_ktp||'...............................',aNow=s.alamat_now||'...............................',nik=s.nik||'...............................';
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Surat Keterangan ${s.jenis}</title><style>@page{margin:2.5cm 2.5cm 2cm 2.5cm;}body{font-family:'Times New Roman',Times,serif;font-size:12pt;color:#000;line-height:1.4;}.kop table{width:100%;border-collapse:collapse;}.kop td{padding:2px 0;font-size:11.5pt;vertical-align:top;}.kop td:nth-child(2){width:10px;padding:2px 6px;}hr{border:none;border-top:4px double #000;margin:10px 0 20px;}.jdl{text-align:center;margin:0 0 4px;}.jdl h2{font-size:13.5pt;font-weight:bold;text-transform:uppercase;text-decoration:underline;letter-spacing:.5px;margin:0;}.nomor{text-align:center;font-size:12pt;margin-bottom:18px;}.pmk{text-align:justify;margin-bottom:12px;line-height:1.7;}table.dt{width:100%;border-collapse:collapse;margin-bottom:18px;}table.dt td{padding:3px 0;vertical-align:top;font-size:12pt;}.n{width:28px;}.f{width:170px;}.sep{width:14px;text-align:center;}.pnt{text-align:justify;line-height:1.7;margin-bottom:24px;}.tr{text-align:right;margin-bottom:10px;}.ttd{display:flex;justify-content:space-between;}.tb{text-align:center;min-width:160px;}.sp{height:70px;}.nm{font-weight:bold;text-decoration:underline;}</style></head><body><div class="kop"><table><tr><td>RT/RW</td><td>:</td><td>07 / 04</td></tr><tr><td>Kelurahan</td><td>:</td><td>Pabuaran</td></tr><tr><td>Kecamatan</td><td>:</td><td>Cibinong</td></tr></table></div><hr><div class="jdl"><h2>Surat Keterangan ${s.jenis}</h2></div><div class="nomor">No. &nbsp;&nbsp; ${no}</div><p class="pmk">Yang bertanda tangan dibawah ini Ketua RT 07 RW 04 Kelurahan Pabuaran, Kecamatan Cibinong, Kabupaten Bogor menerangkan bahwa ;</p><table class="dt"><tr><td class="n">1.</td><td class="f">Nama Lengkap</td><td class="sep">:</td><td>${nama}</td></tr><tr><td class="n">2.</td><td class="f">Jenis Kelamin</td><td class="sep">:</td><td>${jk}</td></tr><tr><td class="n">3.</td><td class="f">Tempat, tanggal lahir</td><td class="sep">:</td><td>${ttl}</td></tr><tr><td class="n">4.</td><td class="f">Kewarganegaraan</td><td class="sep">:</td><td>${wn}</td></tr><tr><td class="n">5.</td><td class="f">Agama</td><td class="sep">:</td><td>${agama}</td></tr><tr><td class="n">6.</td><td class="f">Status Perkawinan</td><td class="sep">:</td><td>${kawin}</td></tr><tr><td class="n">7.</td><td class="f">Pekerjaan</td><td class="sep">:</td><td>${kerja}</td></tr><tr><td class="n">8.</td><td class="f">Alamat KTP/KK</td><td class="sep">:</td><td>${aKTP}</td></tr><tr><td class="n">9.</td><td class="f">Alamat saat ini</td><td class="sep">:</td><td>${aNow}</td></tr><tr><td class="n">10.</td><td class="f">NIK</td><td class="sep">:</td><td>${nik}</td></tr></table><p class="pnt">Demikian Surat Keterangan ${s.jenis} ini kami buat dengan sebenarnya agar dapat dipergunakan untuk keperluan ………………</p><div class="tr">Pabuaran, ${tglF}</div><div class="ttd"><div class="tb"><div>Ketua RT 07</div><div class="sp"></div><div class="nm">Rohim</div></div><div class="tb"><div>Ketua RW 04</div><div class="sp"></div><div class="nm">Yusuf Hernawan</div></div></div></body></html>`);
  win.document.close();setTimeout(()=>win.print(),500);
}

function renderKas(){
  const m=kasData.filter(x=>x.jenis==='masuk').reduce((a,x)=>a+ +x.jumlah,0);
  const k=kasData.filter(x=>x.jenis==='keluar').reduce((a,x)=>a+ +x.jumlah,0);
  document.getElementById('kMasuk').textContent=fRp(m);document.getElementById('kKeluar').textContent=fRp(k);document.getElementById('kSaldo').textContent=fRp(m-k);
  const tb=document.getElementById('tbKas');
  if(!kasData.length){tb.innerHTML=`<tr><td colspan="5"><div class="empty"><div class="ei">💰</div><h4>Belum ada transaksi</h4></div></td></tr>`;return;}
  tb.innerHTML=[...kasData].reverse().map((x,i)=>`<tr><td style="color:var(--mu)">${i+1}</td><td>${x.tanggal}</td><td style="font-size:12px;font-weight:700;color:${x.jenis==='masuk'?'var(--grn)':'var(--red)'}">${x.jenis==='masuk'?'⬆ Pemasukan':'⬇ Pengeluaran'}</td><td style="font-weight:700;color:${x.jenis==='masuk'?'var(--grn)':'var(--red)'}">${x.jenis==='masuk'?'+':'-'}${fRp(x.jumlah)}</td><td>${x.keterangan}</td></tr>`).join('');
}

function renderAnn(){
  const el=document.getElementById('listAnn');
  if(!annData.length){el.innerHTML=`<div class="empty"><div class="ei">📢</div><h4>Belum ada pengumuman</h4></div>`;return;}
  el.innerHTML=[...annData].reverse().map(a=>`<div class="ac2"><h4>${a.judul}</h4><div class="adate">📅 ${a.tanggal}</div><div class="abody">${a.isi}</div></div>`).join('');
}

function renderProfil(){
  if(!myWarga){document.getElementById('profileCard').innerHTML='<div class="empty"><div class="ei">❌</div><h4>Data profil tidak ditemukan</h4></div>';return;}
  document.getElementById('editForm').classList.remove('on');
  document.getElementById('profileCard').style.display='block';
  document.getElementById('profileCard').innerHTML=`<div class="pcard"><div class="phead"><div class="pav">👤</div><div class="pname">${myWarga.nama}</div><div class="prole">Warga RT • ${myWarga.status}</div></div><div class="pinfo"><div class="ir"><div class="iico">🪪</div><div style="flex:1"><div class="ilb">NIK</div><div class="ival" style="font-family:monospace;font-size:13px">${myWarga.nik}</div></div></div><div class="ir"><div class="iico">🏠</div><div style="flex:1"><div class="ilb">Alamat</div><div class="ival">${myWarga.alamat}</div></div></div><div class="ir"><div class="iico">📱</div><div style="flex:1"><div class="ilb">Telepon</div><div class="ival">${myWarga.telepon}</div></div></div><div class="ir"><div class="iico">👤</div><div style="flex:1"><div class="ilb">Username</div><div class="ival">${myWarga.username}</div></div></div><div class="ir"><div class="iico">🏘️</div><div style="flex:1"><div class="ilb">Status Hunian</div><div class="ival">${myWarga.status}</div></div></div></div><div style="padding:18px 24px;border-top:1px solid var(--bor)"><button class="btn bp full" onclick="openEdit()">✏️ Edit Profil Saya</button></div></div>`;
}

function openEdit(){
  document.getElementById('epNama').value=myWarga.nama;document.getElementById('epNik').value=myWarga.nik;document.getElementById('epAlamat').value=myWarga.alamat;document.getElementById('epTel').value=myWarga.telepon;
  ['epOld','epNew','epConf'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('profileCard').style.display='none';document.getElementById('editForm').classList.add('on');
  document.getElementById('editForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function cancelEdit(){document.getElementById('editForm').classList.remove('on');document.getElementById('profileCard').style.display='block';}

async function saveProfile(){
  if(!dbReady()) return;
  const alamat=document.getElementById('epAlamat').value.trim(),tel=document.getElementById('epTel').value.trim();
  const old=document.getElementById('epOld').value,nw=document.getElementById('epNew').value,conf=document.getElementById('epConf').value;
  if(!alamat||!tel){toast('Alamat dan telepon wajib diisi','er');return;}
  let upd={...myWarga,alamat,telepon:tel};
  if(nw||old){
    if(!old){toast('Masukkan password lama','er');return;}
    if(myWarga.password!==old){toast('Password lama salah','er');return;}
    if(nw.length<6){toast('Password baru minimal 6 karakter','er');return;}
    if(nw!==conf){toast('Konfirmasi password tidak cocok','er');return;}
    upd.password=nw;
  }
  try{
    await db.ref('simart/warga/'+myWarga.fbKey).set(upd);
    myWarga=upd; cancelEdit(); renderProfil(); toast('Profil berhasil diperbarui!');
  }catch(e){toast('Gagal menyimpan: '+e.message,'er');}
}

function logout(){if(confirm('Yakin ingin keluar?')){sessionStorage.removeItem('simart_user');window.location.href='index.html';}}

async function init(){
  try{await loadAll();}catch(e){console.error(e);}
  renderBeranda();
  const lo=document.getElementById('loading');lo.style.opacity='0';setTimeout(()=>lo.style.display='none',400);
}
init();

// === Toggle Show/Hide Password ===
const _EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const _EYE_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
function togglePw(btn, id) {
  const inp = document.getElementById(id);
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden ? _EYE_OFF : _EYE;
  btn.classList.toggle('active', isHidden);
  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');
  btn.addEventListener('animationend', () => btn.classList.remove('pop'), {once:true});
}
