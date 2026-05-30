/* ============================================================
   GANTI DENGAN CONFIG FIREBASE ANDA
   Dapatkan di: console.firebase.google.com
   Project Settings > General > Your apps > Web app > SDK setup
   PASTIKAN databaseURL diisi! Format:
   https://NAMA-PROJECT-default-rtdb.firebaseio.com
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

/* Username & password admin — ubah sesuai keinginan */
const ADMIN_U = "admin";
const ADMIN_P = "adminganteng";

/* ============================================================
   PENTING: Atur Firebase Realtime Database Rules di console:
   Realtime Database > Rules > set ke:
   { "rules": { ".read": true, ".write": true } }
   ============================================================ */

// Inisialisasi Firebase dengan proteksi error
let db;
function showFatalError(msg) {
  const lo = document.getElementById('loading');
  lo.querySelector('p').textContent = msg;
  lo.querySelector('p').style.color = '#ff6b7a';
  document.getElementById('btnLogin').disabled = false;
  document.getElementById('btnDaftar').disabled = false;
  setTimeout(() => { lo.style.opacity = '0'; setTimeout(() => lo.style.display = 'none', 400); }, 3000);
}
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.database();
} catch(e) {
  console.error('Firebase init gagal:', e);
  showFatalError('\u274C Konfigurasi Firebase salah. Periksa config & databaseURL.');
}

let curTab = 'login';

function switchTab(t) {
  curTab = t;
  document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('on',(t==='login'&&i===0)||(t==='daftar'&&i===1)));
  document.getElementById('secLogin').classList.toggle('on', t==='login');
  document.getElementById('secDaftar').classList.toggle('on', t==='daftar');
  document.getElementById('cTitle').textContent = t==='login'?'Masuk':'Daftar';
  document.getElementById('cSub').textContent   = t==='login'?'Masukkan username dan password Anda':'Buat akun baru sebagai warga RT';
}

async function doLogin() {
  const u = document.getElementById('uname').value.trim();
  const p = document.getElementById('upass').value.trim();
  const err = document.getElementById('errLogin');
  const btn = document.getElementById('btnLogin');
  err.style.display='none';
  if(!u||!p){showErr(err,'⚠️ Username dan password wajib diisi.');return;}
  btn.textContent='Memeriksa...'; btn.disabled=true;
  try {
    if(u===ADMIN_U&&p===ADMIN_P){
      sessionStorage.setItem('simart_user',JSON.stringify({role:'admin',nama:'Admin RT',username:'admin'}));
      window.location.href='admin.html'; return;
    }
    if(!dbReady(err)){btn.textContent='Masuk ke Sistem →'; btn.disabled=false; return;}
    const snap = await db.ref('simart/warga').once('value');
    if(snap.exists()){
      const found = Object.values(snap.val()).find(w=>w.username===u&&w.password===p);
      if(found){
        sessionStorage.setItem('simart_user',JSON.stringify({role:'warga',nama:found.nama,fbKey:found.fbKey,username:found.username}));
        window.location.href='warga.html'; return;
      }
    }
    const pSnap = await db.ref('simart/pending_reg').once('value');
    if(pSnap.exists()&&Object.values(pSnap.val()).find(x=>x.username===u)){
      showErr(err,'⏳ Akun Anda masih menunggu persetujuan Admin RT.'); return;
    }
    showErr(err,'⚠️ Username atau password salah. Silakan coba lagi.');
  } catch(e){ showErr(err,'❌ Gagal terhubung: '+e.message); }
  finally{ btn.textContent='Masuk ke Sistem →'; btn.disabled=false; }
}

async function doDaftar() {
  const nama=document.getElementById('rNama').value.trim(),nik=document.getElementById('rNik').value.trim(),
    alamat=document.getElementById('rAlamat').value.trim(),tel=document.getElementById('rTel').value.trim(),
    status=document.getElementById('rStatus').value,user=document.getElementById('rUser').value.trim(),
    pass=document.getElementById('rPass').value.trim();
  const err=document.getElementById('errDaftar'),ok=document.getElementById('okDaftar'),btn=document.getElementById('btnDaftar');
  err.style.display='none'; ok.style.display='none';
  if(!nama||!nik||!alamat||!tel||!user||!pass){showErr(err,'⚠️ Semua field wajib diisi.');return;}
  if(nik.length<16){showErr(err,'⚠️ NIK harus 16 digit.');return;}
  if(pass.length<6){showErr(err,'⚠️ Password minimal 6 karakter.');return;}
  btn.textContent='Mengirim...'; btn.disabled=true;
  if(!dbReady(err)){btn.textContent='Kirim Pendaftaran →'; btn.disabled=false; return;}
  try {
    const [wSnap,pSnap]=await Promise.all([db.ref('simart/warga').once('value'),db.ref('simart/pending_reg').once('value')]);
    const warga=wSnap.exists()?Object.values(wSnap.val()):[];
    const pend=pSnap.exists()?Object.values(pSnap.val()):[];
    if(warga.find(w=>w.username===user)||pend.find(w=>w.username===user)){showErr(err,'⚠️ Username sudah digunakan.');return;}
    if(warga.find(w=>w.nik===nik)||pend.find(w=>w.nik===nik)){showErr(err,'⚠️ NIK sudah terdaftar.');return;}
    const nr=db.ref('simart/pending_reg').push();
    await nr.set({fbKey:nr.key,nama,nik,alamat,telepon:tel,status,username:user,password:pass,tanggal_daftar:new Date().toISOString().split('T')[0]});
    ok.textContent='✅ Pendaftaran berhasil! Tunggu persetujuan Admin RT untuk bisa login.';
    ok.style.display='block';
    ['rNama','rNik','rAlamat','rTel','rUser','rPass'].forEach(id=>document.getElementById(id).value='');
  } catch(e){ showErr(err,'❌ Gagal menyimpan: '+e.message); }
  finally{ btn.textContent='Kirim Pendaftaran →'; btn.disabled=false; }
}

function showErr(el,msg){el.textContent=msg;el.style.display='block';}
function dbReady(errEl){
  if(!db){
    const msg='❌ Firebase belum terhubung! Pastikan databaseURL sudah diisi di konfigurasi.';
    if(errEl) showErr(errEl, msg);
    else alert(msg);
    return false;
  }
  return true;
}

async function init() {
  try {
    const snap=await db.ref('simart/initialized').once('value');
    if(!snap.exists()){
      const w1=db.ref('simart/warga').push(), w2=db.ref('simart/warga').push();
      await w1.set({fbKey:w1.key,nama:'Anwar Maulana',nik:'3201012345670001',alamat:'Jl. Mawar No. 1',telepon:'08123456789',status:'Tetap',username:'warga1',password:'warga123'});
      await w2.set({fbKey:w2.key,nama:'Siti Rahayu',nik:'3201012345670002',alamat:'Jl. Melati No. 3',telepon:'08987654321',status:'Tetap',username:'warga2',password:'warga123'});
      const s1=db.ref('simart/surat').push();
      await s1.set({fbKey:s1.key,warga_key:w1.key,nama:'Anwar Maulana',jenis:'Usaha',tanggal:'2026-04-17',status:'pending',keterangan:''});
      const a1=db.ref('simart/pengumuman').push();
      await a1.set({fbKey:a1.key,judul:'Kerja Bakti Minggu Ini',tanggal:'2026-04-17',isi:'Seluruh warga dimohon hadir dalam kegiatan kerja bakti pada hari Minggu pukul 07.00 WIB.'});
      await db.ref('simart/initialized').set(true);
    }
  } catch(e){ console.error('Init error',e); }
  finally {
    document.getElementById('btnLogin').disabled=false;
    document.getElementById('btnDaftar').disabled=false;
    const lo=document.getElementById('loading');
    lo.style.opacity='0'; setTimeout(()=>lo.style.display='none',400);
    document.addEventListener('keydown',e=>{if(e.key==='Enter'){if(curTab==='login')doLogin();else doDaftar();}});
    const pc=document.getElementById('particles');
    for(let i=0;i<20;i++){const p=document.createElement('div');p.className='particle';const s=Math.random()*4+2;p.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;background:${Math.random()>.5?'rgba(233,69,96,0.6)':'rgba(245,166,35,0.4)'};animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s;`;pc.appendChild(p);}
  }
}
// Tampilkan banner error jika Firebase tidak terhubung
if(!db){
  document.addEventListener('DOMContentLoaded',()=>{
    const banner=document.createElement('div');
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;text-align:center;padding:12px 16px;font-size:13px;font-weight:600;';
    banner.innerHTML='\u26A0\uFE0F Firebase TIDAK terhubung! Isi <b>databaseURL</b> yang benar di konfigurasi index.html, admin.html, dan warga.html';
    document.body.prepend(banner);
  });
} else {
  init();
}

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
  void btn.offsetWidth; // reflow to restart animation
  btn.classList.add('pop');
  btn.addEventListener('animationend', () => btn.classList.remove('pop'), {once: true});
}
