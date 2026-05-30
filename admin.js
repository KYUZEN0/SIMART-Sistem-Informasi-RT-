/* ============================================================
   GANTI DENGAN CONFIG FIREBASE ANDA (sama dengan index.html)
   Dapatkan di: console.firebase.google.com
   Project Settings > General > Your apps > Web app > SDK setup
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
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
  lo.querySelector('p').style.color = '#ff6b7a';
  setTimeout(() => { lo.style.opacity='0'; setTimeout(()=>lo.style.display='none',400); }, 3000);
}

// Auth check
const user = JSON.parse(sessionStorage.getItem('simart_user')||'null');
if(!user||user.role!=='admin') window.location.href='index.html';
// Show Firebase error banner if db failed
if(!db){
  document.addEventListener('DOMContentLoaded',()=>{
    const banner=document.createElement('div');
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;text-align:center;padding:14px 16px;font-size:14px;font-weight:600;';
    banner.innerHTML='⚠️ Firebase TIDAK terhubung! Periksa konfigurasi <code style="background:rgba(0,0,0,.3);padding:2px 6px;border-radius:4px">databaseURL</code> di admin.html &amp; index.html';
    document.body.prepend(banner);
  });
}
document.getElementById('adminName').textContent = user?.nama||'Admin';
document.getElementById('dateEl').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

// In-memory cache
let wargaData=[], suratData=[], kasData=[], annData=[], regData=[];
let suratFilter='all';

// Sidebar
function toggleSB(){document.getElementById('sb').classList.toggle('on');document.getElementById('ovl').classList.toggle('on');}
function closeSB(){document.getElementById('sb').classList.remove('on');document.getElementById('ovl').classList.remove('on');}

// Pages
const pgTitles={dashboard:'Dashboard Admin',warga:'Data Warga',surat:'Surat',kas:'Kas RT',pengumuman:'Pengumuman',pendaftaran:'Pendaftaran Warga'};
function goPage(name){
  closeSB();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni[data-page]').forEach(n=>n.classList.toggle('on', n.dataset.page===name));
  document.getElementById('pg-'+name).classList.add('on');
  document.getElementById('pgTitle').textContent=pgTitles[name]||name;
  if(name==='dashboard') renderDash();
  else if(name==='warga') renderWarga();
  else if(name==='surat'){suratFilter='all';renderSurat();}
  else if(name==='kas') renderKas();
  else if(name==='pengumuman') renderAnn();
  else if(name==='pendaftaran') renderReg();
}

// Helpers
const fRp=n=>'Rp '+Number(n).toLocaleString('id-ID');
function toast(msg,type='ok'){const t=document.getElementById('toast');t.textContent=(type==='ok'?'✅ ':'❌ ')+msg;t.className='toast on'+(type==='er'?' er':'');setTimeout(()=>t.classList.remove('on'),3500);}
function dbReady(){
  if(!db){
    toast('Firebase belum terhubung! Pastikan databaseURL sudah diisi di config.','er');
    return false;
  }
  return true;
}
function openModal(id){document.getElementById(id).classList.add('on');}
function closeModal(id){document.getElementById(id).classList.remove('on');}
function toArr(snap){if(!snap.exists())return[];return Object.values(snap.val());}

// Load all data
async function loadAll(){
  if(!dbReady()) return;
  const [ws,ss,ks,as,rs]=await Promise.all([
    db.ref('simart/warga').once('value'),
    db.ref('simart/surat').once('value'),
    db.ref('simart/kas').once('value'),
    db.ref('simart/pengumuman').once('value'),
    db.ref('simart/pending_reg').once('value')
  ]);
  wargaData=toArr(ws); suratData=toArr(ss); kasData=toArr(ks); annData=toArr(as); regData=toArr(rs);
  updateBadges();
}

function updateBadges(){
  const p=suratData.filter(x=>x.status==='pending').length;
  document.getElementById('bSurat').textContent=p;
  const r=regData.length;
  const rb=document.getElementById('bReg');
  rb.textContent=r; rb.style.display=r>0?'inline-flex':'none';
}

// DASHBOARD
function renderDash(){
  const kas=kasData.reduce((a,x)=>a+(x.jenis==='masuk'?+x.jumlah:-x.jumlah),0);
  document.getElementById('stWarga').textContent=wargaData.length;
  document.getElementById('stSurat').textContent=suratData.length;
  document.getElementById('stPend').textContent=suratData.filter(x=>x.status==='pending').length;
  document.getElementById('stSaldo').textContent=kas.toLocaleString('id-ID');
  const recent=[...suratData].reverse().slice(0,4);
  document.getElementById('dSurat').innerHTML=!recent.length?'<div class="empty"><div class="ei">📭</div><p>Belum ada surat</p></div>':recent.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--bor);"><div><div style="font-size:14px;font-weight:600">${s.nama}</div><div style="font-size:12px;color:var(--mu)">${s.jenis} • ${s.tanggal}</div></div><span class="badge ${s.status==='pending'?'bp2':s.status==='approved'?'ba':'br'}">${s.status}</span></div>`).join('');
  const rAnn=[...annData].reverse().slice(0,3);
  document.getElementById('dAnn').innerHTML=!rAnn.length?'<div class="empty"><div class="ei">📭</div><p>Belum ada pengumuman</p></div>':rAnn.map(a=>`<div style="padding:11px 0;border-bottom:1px solid var(--bor);"><div style="font-size:14px;font-weight:600">${a.judul}</div><div style="font-size:12px;color:var(--mu);margin-top:3px">${a.tanggal}</div></div>`).join('');
}

// WARGA
let wargaFiltered=[];
function renderWarga(){wargaFiltered=[...wargaData];renderWargaTb();}
function filterWarga(q){wargaFiltered=wargaData.filter(w=>w.nama.toLowerCase().includes(q.toLowerCase())||w.nik.includes(q));renderWargaTb();}
function renderWargaTb(){
  const tb=document.getElementById('tbWarga');
  if(!wargaFiltered.length){tb.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="ei">👥</div><h4>Belum ada warga</h4></div></td></tr>`;return;}
  tb.innerHTML=wargaFiltered.map((w,i)=>`<tr><td style="color:var(--mu)">${i+1}</td><td><div style="font-weight:600">${w.nama}</div><div style="font-size:12px;color:var(--mu)">${w.alamat||''}</div></td><td style="font-family:monospace;font-size:12px">${w.nik}</td><td>${w.telepon}</td><td><span class="badge ba">${w.status}</span></td><td><div style="display:flex;gap:6px"><button class="btn bw sm" onclick="editWarga('${w.fbKey}')">✏️</button><button class="btn bd sm" onclick="delWarga('${w.fbKey}')">🗑️</button></div></td></tr>`).join('');
}
function openMW(){document.getElementById('wFbKey').value='';document.getElementById('mwTitle').textContent='Tambah Warga';['wNama','wNik','wAlamat','wTel','wUser','wPass'].forEach(id=>document.getElementById(id).value='');document.getElementById('wStatus').value='Tetap';openModal('moWarga');}
function editWarga(k){const w=wargaData.find(x=>x.fbKey===k);if(!w)return;document.getElementById('wFbKey').value=k;document.getElementById('mwTitle').textContent='Edit Warga';document.getElementById('wNama').value=w.nama;document.getElementById('wNik').value=w.nik;document.getElementById('wAlamat').value=w.alamat;document.getElementById('wTel').value=w.telepon;document.getElementById('wStatus').value=w.status;document.getElementById('wUser').value=w.username;document.getElementById('wPass').value='';openModal('moWarga');}
async function saveWarga(){
  if(!dbReady()) return;
  const k=document.getElementById('wFbKey').value,nama=document.getElementById('wNama').value.trim(),nik=document.getElementById('wNik').value.trim(),alamat=document.getElementById('wAlamat').value.trim(),tel=document.getElementById('wTel').value.trim(),status=document.getElementById('wStatus').value,username=document.getElementById('wUser').value.trim(),pass=document.getElementById('wPass').value.trim();
  if(!nama||!nik||!alamat||!tel||!username){toast('Isi semua field wajib','er');return;}
  try{
    if(k){
      const cur=wargaData.find(x=>x.fbKey===k);
      const upd={...cur,nama,nik,alamat,telepon:tel,status,username,...(pass?{password:pass}:{})};
      await db.ref('simart/warga/'+k).set(upd);
      const idx=wargaData.findIndex(x=>x.fbKey===k);wargaData[idx]=upd;
    } else {
      if(wargaData.find(w=>w.username===username)){toast('Username sudah digunakan','er');return;}
      const nr=db.ref('simart/warga').push();
      const nd={fbKey:nr.key,nama,nik,alamat,telepon:tel,status,username,password:pass||'warga123'};
      await nr.set(nd); wargaData.push(nd);
    }
    closeModal('moWarga'); renderWarga(); updateBadges(); toast(k?'Data warga diperbarui!':'Warga berhasil ditambahkan!');
  }catch(e){toast('Gagal menyimpan: '+e.message,'er');}
}
async function delWarga(k){
  if(!dbReady()) return;
  if(!confirm('Hapus data warga ini?'))return;
  try{
    await db.ref('simart/warga/'+k).remove();
    wargaData=wargaData.filter(x=>x.fbKey!==k);
    // hapus surat terkait
    const toDelS=suratData.filter(s=>s.warga_key===k);
    await Promise.all(toDelS.map(s=>db.ref('simart/surat/'+s.fbKey).remove()));
    suratData=suratData.filter(s=>s.warga_key!==k);
    renderWarga(); updateBadges(); toast('Warga dihapus','er');
  }catch(e){toast('Gagal menghapus','er');}
}

// SURAT
function filterSurat(f){suratFilter=f;renderSurat();}
function renderSurat(){
  let data=suratFilter==='all'?[...suratData]:suratData.filter(s=>s.status===suratFilter);
  const tb=document.getElementById('tbSurat');
  if(!data.length){tb.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="ei">📄</div><h4>Tidak ada surat</h4></div></td></tr>`;return;}
  tb.innerHTML=[...data].reverse().map((s,i)=>`<tr><td style="color:var(--mu)">${i+1}</td><td><div style="font-weight:600">${s.nama}</div></td><td>${s.jenis}</td><td>${s.tanggal}</td><td><span class="badge ${s.status==='pending'?'bp2':s.status==='approved'?'ba':'br'}">${s.status==='pending'?'⏳ Pending':s.status==='approved'?'✅ Disetujui':'❌ Ditolak'}</span></td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn bg sm" onclick="viewSurat('${s.fbKey}')">👁️</button>${s.status==='pending'?`<button class="btn bs sm" onclick="approveSurat('${s.fbKey}')">✅</button><button class="btn bd sm" onclick="rejectSurat('${s.fbKey}')">❌</button>`:''}${s.status==='approved'?`<button class="btn bw sm" onclick="cetakSurat('${s.fbKey}')">🖨️</button>`:''}</div></td></tr>`).join('');
}
function viewSurat(k){
  const s=suratData.find(x=>x.fbKey===k); if(!s)return;
  const hasD=!!s.jk;
  document.getElementById('suratDetail').innerHTML=`<div style="display:grid;gap:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--bor)"><span style="color:var(--mu)">Jenis Surat</span><strong>${s.jenis}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Tanggal Ajuan</span><strong>${s.tanggal}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Status</span><span class="badge ${s.status==='pending'?'bp2':s.status==='approved'?'ba':'br'}">${s.status}</span></div>
    ${hasD?`<div style="margin-top:6px;padding:14px;background:var(--sur2);border:1px solid var(--bor);border-radius:12px"><div style="font-size:11px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Data Pemohon</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px"><div><div style="color:var(--mu);font-size:11px">Nama</div><strong>${s.nama||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">Jenis Kelamin</div><strong>${s.jk||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">Tempat, Tgl Lahir</div><strong>${s.tempat_lahir||'-'}, ${s.tgl_lahir_format||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">Kewarganegaraan</div><strong>${s.kewarganegaraan||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">Agama</div><strong>${s.agama||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">Status Kawin</div><strong>${s.status_kawin||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">Pekerjaan</div><strong>${s.pekerjaan||'-'}</strong></div><div><div style="color:var(--mu);font-size:11px">NIK</div><strong style="font-family:monospace">${s.nik||'-'}</strong></div><div style="grid-column:1/-1"><div style="color:var(--mu);font-size:11px">Alamat KTP</div><strong>${s.alamat_ktp||'-'}</strong></div><div style="grid-column:1/-1"><div style="color:var(--mu);font-size:11px">Alamat Saat Ini</div><strong>${s.alamat_now||'-'}</strong></div></div></div>`:''}
    ${s.keterangan?`<div style="font-size:13px;color:var(--mu)">📝 ${s.keterangan}</div>`:''}
  </div>`;
  const acts=document.getElementById('suratActs');
  acts.innerHTML=`<button class="btn bg" onclick="closeModal('moSurat')">Tutup</button>`;
  if(s.status==='pending') acts.innerHTML+=`<button class="btn bs" onclick="approveSurat('${k}');closeModal('moSurat')">✅ Setujui</button><button class="btn bd" onclick="rejectSurat('${k}');closeModal('moSurat')">❌ Tolak</button>`;
  if(s.status==='approved') acts.innerHTML+=`<button class="btn bw" onclick="cetakSurat('${k}')">🖨️ Cetak</button>`;
  openModal('moSurat');
}
async function approveSurat(k){
  if(!dbReady()) return;
  const idx=suratData.findIndex(x=>x.fbKey===k);if(idx===-1)return;
  try{await db.ref('simart/surat/'+k+'/status').set('approved');suratData[idx].status='approved';renderSurat();updateBadges();toast('Surat disetujui!');}
  catch(e){toast('Gagal','er');}
}
async function rejectSurat(k){
  if(!dbReady()) return;
  const ket=prompt('Alasan penolakan (opsional):')||'';
  const idx=suratData.findIndex(x=>x.fbKey===k);if(idx===-1)return;
  try{await db.ref('simart/surat/'+k).update({status:'rejected',keterangan:ket});suratData[idx].status='rejected';suratData[idx].keterangan=ket;renderSurat();updateBadges();toast('Surat ditolak','er');}
  catch(e){toast('Gagal','er');}
}

// KAS
function renderKas(){
  const m=kasData.filter(x=>x.jenis==='masuk').reduce((a,x)=>a+ +x.jumlah,0);
  const k=kasData.filter(x=>x.jenis==='keluar').reduce((a,x)=>a+ +x.jumlah,0);
  document.getElementById('kMasuk').textContent=fRp(m);document.getElementById('kKeluar').textContent=fRp(k);document.getElementById('kSaldo').textContent=fRp(m-k);
  const tb=document.getElementById('tbKas');
  if(!kasData.length){tb.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="ei">💰</div><h4>Belum ada transaksi</h4></div></td></tr>`;return;}
  tb.innerHTML=[...kasData].reverse().map((x,i)=>`<tr><td style="color:var(--mu)">${i+1}</td><td>${x.tanggal}</td><td><span class="badge ${x.jenis==='masuk'?'bm':'bk'}">${x.jenis==='masuk'?'Pemasukan':'Pengeluaran'}</span></td><td style="font-weight:700;color:${x.jenis==='masuk'?'var(--ac3)':'var(--ac)'}">${x.jenis==='masuk'?'+':'-'}${fRp(x.jumlah)}</td><td>${x.keterangan}</td><td><button class="btn bd sm" onclick="delKas('${x.fbKey}')">🗑️</button></td></tr>`).join('');
}
async function saveKas(){
  if(!dbReady()) return;
  const tgl=document.getElementById('kTgl').value,jenis=document.getElementById('kJenis').value,jumlah=document.getElementById('kJumlah').value,ket=document.getElementById('kKet').value.trim();
  if(!tgl||!jumlah){toast('Isi tanggal dan jumlah','er');return;}
  try{const nr=db.ref('simart/kas').push();const nd={fbKey:nr.key,tanggal:tgl,jenis,jumlah:+jumlah,keterangan:ket};await nr.set(nd);kasData.push(nd);closeModal('moKas');document.getElementById('kJumlah').value='';document.getElementById('kKet').value='';renderKas();toast('Transaksi disimpan!');}
  catch(e){toast('Gagal','er');}
}
async function delKas(k){
  if(!confirm('Hapus transaksi ini?'))return;
  try{await db.ref('simart/kas/'+k).remove();kasData=kasData.filter(x=>x.fbKey!==k);renderKas();toast('Transaksi dihapus','er');}
  catch(e){toast('Gagal','er');}
}

// PENGUMUMAN
function renderAnn(){
  const el=document.getElementById('listAnn');
  if(!annData.length){el.innerHTML=`<div class="empty"><div class="ei">📢</div><h4>Belum ada pengumuman</h4></div>`;return;}
  el.innerHTML=[...annData].reverse().map(a=>`<div class="ai"><h4>${a.judul}</h4><div class="ad">📅 ${a.tanggal}</div><div class="ab">${a.isi}</div><div class="aa"><button class="btn bd sm" onclick="delAnn('${a.fbKey}')">🗑️ Hapus</button></div></div>`).join('');
}
async function savePeng(){
  if(!dbReady()) return;
  const judul=document.getElementById('pJudul').value.trim(),tgl=document.getElementById('pTgl').value,isi=document.getElementById('pIsi').value.trim();
  if(!judul||!tgl||!isi){toast('Isi semua field','er');return;}
  try{const nr=db.ref('simart/pengumuman').push();const nd={fbKey:nr.key,judul,tanggal:tgl,isi};await nr.set(nd);annData.push(nd);closeModal('moPeng');document.getElementById('pJudul').value='';document.getElementById('pIsi').value='';renderAnn();toast('Pengumuman dipublikasikan!');}
  catch(e){toast('Gagal','er');}
}
async function delAnn(k){
  if(!confirm('Hapus pengumuman ini?'))return;
  try{await db.ref('simart/pengumuman/'+k).remove();annData=annData.filter(x=>x.fbKey!==k);renderAnn();toast('Pengumuman dihapus','er');}
  catch(e){toast('Gagal','er');}
}

// PENDAFTARAN
function renderReg(){
  const el=document.getElementById('listReg');
  if(!regData.length){el.innerHTML=`<div class="card"><div class="cb"><div class="empty"><div class="ei">📋</div><h4>Tidak ada pendaftaran baru</h4><p>Warga yang daftar mandiri akan muncul di sini</p></div></div></div>`;return;}
  el.innerHTML=`<div class="card"><div class="ch"><h3>📋 Menunggu Verifikasi (${regData.length})</h3></div><div class="cb">`+
    regData.map(r=>`<div class="ri"><div class="rih"><div><div class="rin">${r.nama}</div><div style="font-size:12px;color:var(--mu)">Mendaftar: ${r.tanggal_daftar||'-'}</div></div><div class="ria"><button class="btn bs sm" onclick="approveReg('${r.fbKey}')">✅ Setujui</button><button class="btn bd sm" onclick="rejectReg('${r.fbKey}')">❌ Tolak</button></div></div><div class="rm"><div class="rmi">🪪 NIK: <strong>${r.nik}</strong></div><div class="rmi">📱 HP: <strong>${r.telepon}</strong></div><div class="rmi">🏠 Alamat: <strong>${r.alamat}</strong></div><div class="rmi">🏘️ Status: <strong>${r.status}</strong></div><div class="rmi">👤 Username: <strong>${r.username}</strong></div></div></div>`).join('')+
  '</div></div>';
  updateBadges();
}
async function approveReg(k){
  if(!dbReady()) return;
  const reg=regData.find(x=>x.fbKey===k);if(!reg)return;
  try{
    const nr=db.ref('simart/warga').push();
    await nr.set({fbKey:nr.key,nama:reg.nama,nik:reg.nik,alamat:reg.alamat,telepon:reg.telepon,status:reg.status,username:reg.username,password:reg.password});
    await db.ref('simart/pending_reg/'+k).remove();
    wargaData.push({fbKey:nr.key,nama:reg.nama,nik:reg.nik,alamat:reg.alamat,telepon:reg.telepon,status:reg.status,username:reg.username,password:reg.password});
    regData=regData.filter(x=>x.fbKey!==k);
    renderReg();updateBadges();toast(`${reg.nama} berhasil disetujui!`);
  }catch(e){toast('Gagal','er');}
}
async function rejectReg(k){
  if(!dbReady()) return;
  if(!confirm('Tolak pendaftaran ini?'))return;
  try{await db.ref('simart/pending_reg/'+k).remove();regData=regData.filter(x=>x.fbKey!==k);renderReg();updateBadges();toast('Pendaftaran ditolak','er');}
  catch(e){toast('Gagal','er');}
}

// CETAK SURAT
function cetakSurat(k){
  const s=suratData.find(x=>x.fbKey===k);if(!s)return;
  const no=`${String(suratData.indexOf(s)+1).padStart(3,'0')}/RT07/RW04/${new Date().getFullYear()}`;
  const tglF=new Date(s.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const nama=s.nama||'-',jk=s.jk||'...............................',ttl=s.tempat_lahir&&s.tgl_lahir_format?`${s.tempat_lahir}, ${s.tgl_lahir_format}`:'...............................',wn=s.kewarganegaraan||'Indonesia',agama=s.agama||'...............................',kawin=s.status_kawin||'...............................',kerja=s.pekerjaan||'...............................',aKTP=s.alamat_ktp||'...............................',aNow=s.alamat_now||'...............................',nik=s.nik||'...............................';
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Surat Keterangan ${s.jenis}</title><style>@page{margin:2.5cm 2.5cm 2cm 2.5cm;}body{font-family:'Times New Roman',Times,serif;font-size:12pt;color:#000;line-height:1.4;}.kop table{width:100%;border-collapse:collapse;}.kop td{padding:2px 0;font-size:11.5pt;vertical-align:top;}.kop td:nth-child(2){width:10px;padding:2px 6px;}hr{border:none;border-top:4px double #000;margin:10px 0 20px;}.jdl{text-align:center;margin:0 0 4px;}.jdl h2{font-size:13.5pt;font-weight:bold;text-transform:uppercase;text-decoration:underline;letter-spacing:.5px;margin:0;}.nomor{text-align:center;font-size:12pt;margin-bottom:18px;}.pmk{text-align:justify;margin-bottom:12px;line-height:1.7;}table.dt{width:100%;border-collapse:collapse;margin-bottom:18px;}table.dt td{padding:3px 0;vertical-align:top;font-size:12pt;}.n{width:28px;}.f{width:170px;}.sep{width:14px;text-align:center;}.pnt{text-align:justify;line-height:1.7;margin-bottom:24px;}.tr{text-align:right;margin-bottom:10px;}.ttd{display:flex;justify-content:space-between;}.tb{text-align:center;min-width:160px;}.sp{height:70px;}.nm{font-weight:bold;text-decoration:underline;font-size:12pt;}</style></head><body><div class="kop"><table><tr><td>RT/RW</td><td>:</td><td>07 / 04</td></tr><tr><td>Kelurahan</td><td>:</td><td>Pabuaran</td></tr><tr><td>Kecamatan</td><td>:</td><td>Cibinong</td></tr></table></div><hr><div class="jdl"><h2>Surat Keterangan ${s.jenis}</h2></div><div class="nomor">No. &nbsp;&nbsp; ${no}</div><p class="pmk">Yang bertanda tangan dibawah ini Ketua RT 07 RW 04 Kelurahan Pabuaran, Kecamatan Cibinong, Kabupaten Bogor menerangkan bahwa ;</p><table class="dt"><tr><td class="n">1.</td><td class="f">Nama Lengkap</td><td class="sep">:</td><td>${nama}</td></tr><tr><td class="n">2.</td><td class="f">Jenis Kelamin</td><td class="sep">:</td><td>${jk}</td></tr><tr><td class="n">3.</td><td class="f">Tempat, tanggal lahir</td><td class="sep">:</td><td>${ttl}</td></tr><tr><td class="n">4.</td><td class="f">Kewarganegaraan</td><td class="sep">:</td><td>${wn}</td></tr><tr><td class="n">5.</td><td class="f">Agama</td><td class="sep">:</td><td>${agama}</td></tr><tr><td class="n">6.</td><td class="f">Status Perkawinan</td><td class="sep">:</td><td>${kawin}</td></tr><tr><td class="n">7.</td><td class="f">Pekerjaan</td><td class="sep">:</td><td>${kerja}</td></tr><tr><td class="n">8.</td><td class="f">Alamat KTP/KK</td><td class="sep">:</td><td>${aKTP}</td></tr><tr><td class="n">9.</td><td class="f">Alamat saat ini</td><td class="sep">:</td><td>${aNow}</td></tr><tr><td class="n">10.</td><td class="f">NIK</td><td class="sep">:</td><td>${nik}</td></tr></table><p class="pnt">Demikian Surat Keterangan ${s.jenis} ini kami buat dengan sebenarnya agar dapat dipergunakan untuk keperluan ………………</p><div class="tr">Pabuaran, ${tglF}</div><div class="ttd"><div class="tb"><div>Ketua RT 07</div><div class="sp"></div><div class="nm">Rohim</div></div><div class="tb"><div>Ketua RW 04</div><div class="sp"></div><div class="nm">Yusuf Hernawan</div></div></div></body></html>`);
  win.document.close(); setTimeout(()=>win.print(),500);
}

function logout(){if(confirm('Yakin ingin keluar?')){sessionStorage.removeItem('simart_user');window.location.href='index.html';}}

// INIT
async function init(){
  const d=new Date();
  document.getElementById('kTgl').value=d.toISOString().split('T')[0];
  document.getElementById('pTgl').value=d.toISOString().split('T')[0];
  try{await loadAll();}catch(e){console.error(e);}
  renderDash();
  const lo=document.getElementById('loading');
  lo.style.opacity='0';setTimeout(()=>lo.style.display='none',400);
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