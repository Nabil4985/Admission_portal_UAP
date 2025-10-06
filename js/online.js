/* online.js — upgraded file handling and full end-to-end client demo */

(function(){
  // Short helpers
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  function toast(msg, t=3000){
    const toasts = $('#toasts');
    const el = document.createElement('div'); el.className='toast'; el.textContent = msg;
    toasts.appendChild(el);
    setTimeout(()=> el.remove(), t);
  }

  // Storage keys
  const APP_KEY = 'uap_applications';
  const SEAT_KEY = 'uap_seats';

  function loadApps(){ return JSON.parse(localStorage.getItem(APP_KEY) || '[]'); }
  function saveApps(arr){ localStorage.setItem(APP_KEY, JSON.stringify(arr)); }
  function loadSeats(){
    const raw = localStorage.getItem(SEAT_KEY);
    if(raw) return JSON.parse(raw);
    const initial = { CSE:50, EEE:36, Civil:30, Architecture:16, BBA:40 };
    localStorage.setItem(SEAT_KEY, JSON.stringify(initial));
    return initial;
  }
  function saveSeats(obj){ localStorage.setItem(SEAT_KEY, JSON.stringify(obj)); }

  // Program fees
  const fees = { bachelors:500, masters:700, postgraduate:900 };
  const programType = $('#programType');
  const appFee = $('#appFee');
  function updateFee(){ appFee.textContent = (fees[programType.value] || 0) + ' BDT'; }
  programType.addEventListener('change', updateFee);
  updateFee();

  // Staged files (holds {name,type,size,dataUrl})
  const stagedFiles = {};

  // helper: file -> dataURL
  function fileToDataURL(file){
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  // setup drop areas
  function setUpDrop(drop){
    const target = drop.dataset.target;
    const input = drop.querySelector('.file-input');
    const previewRow = document.querySelector(`[data-target="${target}-preview"]`);
    const progressBar = document.querySelector(`[data-target="${target}-progress"] > div`);

    function clearPreview(){ previewRow.innerHTML = ''; progressBar.style.width = '0%'; }

    async function handleFile(file){
      clearPreview();
      // size validation: photo/sign 5MB, transcript 10MB
      const maxSize = target === 'transcript' ? 10*1024*1024 : 5*1024*1024;
      if(file.size > maxSize){ toast('File too large for ' + target + ' (max ' + Math.round(maxSize/1024/1024) + 'MB)'); return; }

      // show immediate preview
      if(file.type.startsWith('image/')){
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.onload = ()=> URL.revokeObjectURL(img.src);
        previewRow.appendChild(img);
      } else {
        const box = document.createElement('div'); box.className = 'file-box'; box.textContent = file.name;
        previewRow.appendChild(box);
      }

      // simulate upload progress, then convert to base64 and save in stagedFiles
      progressBar.style.width = '6%';
      let p = 6;
      const int = setInterval(()=> {
        p = Math.min(96, p + Math.ceil(Math.random()*14));
        progressBar.style.width = p + '%';
      }, 180);

      try {
        const dataUrl = await fileToDataURL(file);
        clearInterval(int);
        progressBar.style.width = '100%';
        stagedFiles[target] = { name: file.name, size: file.size, type: file.type, dataUrl };
        toast(`${file.name} ready`);
      } catch(e){
        clearInterval(int);
        progressBar.style.width = '0%';
        toast('Failed to read file');
      }
    }

    input.addEventListener('change', (ev) => {
      if(input.files[0]) handleFile(input.files[0]);
    });

    drop.addEventListener('click', ()=> input.click());
    drop.addEventListener('dragover', (e)=>{ e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', ()=> drop.classList.remove('drag'));
    drop.addEventListener('drop', (e)=> {
      e.preventDefault(); drop.classList.remove('drag');
      const f = e.dataTransfer.files[0];
      if(f) handleFile(f);
    });
  }

  $$('.drop').forEach(setUpDrop);

  // Submit application
  $('#submitApp').addEventListener('click', async ()=>{
    const name = $('#fullName').value.trim();
    const email = $('#email').value.trim();
    const phone = $('#phone').value.trim();
    const guardian = $('#guardian').value.trim();
    const address = $('#address').value.trim();
    const education = $('#education').value.trim();
    const examRoll = $('#examRoll').value.trim();
    const dept = $('#applyDept').value;
    const program = $('#programType').value;

    if(!name || !email || !phone || !dept){ toast('Please fill name, email, phone and select department.'); return; }

    // Ensure required files exist (photo & transcript) for demo — signature optional
    if(!stagedFiles.photo || !stagedFiles.transcript){
      if(!confirm('Photo and transcript recommended. Continue submission without them?')) return;
    }

    // Build app object and include file dataUrls (if present)
    const appId = 'UAP' + Date.now().toString(36).toUpperCase().slice(-9);
    const app = {
      id: appId,
      name, email, phone, guardian, address, education, examRoll, dept, program,
      files: {
        photo: stagedFiles.photo || null,
        sign: stagedFiles.sign || null,
        transcript: stagedFiles.transcript || null
      },
      fee: fees[program] || 0,
      status: 'submitted',
      appliedAt: new Date().toISOString()
    };

    // save
    const apps = loadApps(); apps.push(app); saveApps(apps);

    // reset form + staged files + previews
    $('#appForm').reset();
    for(const key of Object.keys(stagedFiles)) delete stagedFiles[key];
    $$('.preview-row').forEach(el => el.innerHTML = '');
    $$('.progress > div').forEach(d => d.style.width = '0%');

    toast('Application submitted — ID: ' + appId, 4000);

    // auto-open dashboard and show this app
    populateAppsList();
    $('#openDashboard').click();
  });

  // Dashboard
  const dashModal = $('#dashboardModal');
  $('#openDashboard').addEventListener('click', ()=> {
    populateAppsList();
    dashModal.setAttribute('aria-hidden','false');
  });
  $('#closeDashboard').addEventListener('click', ()=> dashModal.setAttribute('aria-hidden','true'));

  function populateAppsList(){
    const apps = loadApps().slice().reverse();
    const container = $('#appsList'); container.innerHTML = '';
    if(apps.length===0){ container.innerHTML = '<p>No applications yet.</p>'; return; }

    apps.forEach(a => {
      const el = document.createElement('div');
      el.className = 'app-row';
      const filesSummary = [];
      if(a.files.photo) filesSummary.push('Photo');
      if(a.files.sign) filesSummary.push('Signature');
      if(a.files.transcript) filesSummary.push('Transcript');
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>${a.name}</strong> <small style="color:#666">${a.id}</small>
            <div style="color:#555;font-size:13px">Dept: ${a.dept} • Program: ${a.program} • Status: <em>${a.status}</em></div>
            <div style="color:#444;margin-top:6px;font-size:13px">Files: ${filesSummary.join(', ') || '—'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div>
              <button class="btn" data-id="${a.id}" data-act="view">View</button>
              <button class="btn" data-id="${a.id}" data-act="pay">${a.status==='paid' ? 'Paid' : 'Pay'}</button>
              <button class="btn" data-id="${a.id}" data-act="download">Download</button>
            </div>
            <div>
              <button class="btn" data-id="${a.id}" data-act="delete">Delete</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(el);
    });

    // event delegation for app actions
    container.querySelectorAll('.btn').forEach(b => b.addEventListener('click', (ev) => {
      const id = b.dataset.id, act = b.dataset.act;
      if(act==='view') showAppDetails(id);
      if(act==='pay') openPaymentFlow(id);
      if(act==='download') downloadAllFiles(id);
      if(act==='delete') {
        if(confirm('Delete application ' + id + '?')) {
          deleteApp(id); populateAppsList(); renderDeptList();
        }
      }
    }));
  }

  function showAppDetails(id){
    const apps = loadApps(); const app = apps.find(x=>x.id===id);
    if(!app) return;
    // render timeline
    const steps = ['submitted','docs_verified','payment_pending','paid','verified','accepted','rejected'];
    const t = $('#statusTimeline'); t.innerHTML = '';
    steps.forEach(s => {
      const div = document.createElement('div'); div.className = 'step';
      if(s === app.status || steps.indexOf(s) < steps.indexOf(app.status)) div.classList.add('active');
      div.innerHTML = `<strong>${s.replace('_',' ').toUpperCase()}</strong> <div style="font-size:12px;color:#444">${s===app.status ? 'CURRENT' : ''}</div>`;
      t.appendChild(div);
    });

    // show file previews in the appsList area for detail
    const appsList = $('#appsList');
    const filesHTML = ['photo','sign','transcript'].map(k => {
      const f = app.files[k];
      if(!f) return '';
      if(f.type && f.type.startsWith('image/')){
        return `<div style="display:inline-block;margin:5px"><img src="${f.dataUrl}" alt="${f.name}" style="height:50px;border-radius:6px;border:1px solid #eee" /><div style="font-size:12px;text-align:center">${k}</div></div>`;
      } else {
        return `<div style="display:inline-block;margin:5px"><div class="file-box" style="height:85px;width:180px;display:flex;align-items:center;justify-content:center">${f.name}</div><div style="font-size:12px;text-align:center">${k}</div></div>`;
      }
    }).join('');
    appsList.innerHTML = `<div style="margin-bottom:10px"><strong>${app.name}</strong> — ${app.id} <div style="color:#666">${app.dept} • ${app.program} • ${app.status}</div></div>
      <div>${filesHTML || '<em>No files uploaded</em>'}</div>
      <div style="margin-top:12px">
        <button class="btn" id="acceptBtn">Accept</button>
        <button class="btn" id="rejectBtn">Reject</button>
      </div>`;
    $('#acceptBtn').addEventListener('click', ()=> { acceptApplicant(id); populateAppsList(); renderDeptList(); showAppDetails(id); });
    $('#rejectBtn').addEventListener('click', ()=> { rejectApplicant(id); populateAppsList(); renderDeptList(); showAppDetails(id); });
  }

  function deleteApp(id){
    const arr = loadApps().filter(a=>a.id !== id);
    saveApps(arr); toast('Deleted ' + id);
  }

  // mock payment flow
  function openPaymentFlow(appId){
    const apps = loadApps(); const app = apps.find(a=>a.id===appId);
    if(!app) { toast('Application not found'); return; }
    if(app.status === 'paid' || app.status === 'accepted'){ toast('Already paid/accepted'); return; }

    if(!confirm(`Pay ${app.fee} BDT for ${app.id}? (Mock payment)`)) return;
    app.status = 'payment_pending'; saveApps(apps); populateAppsList(); toast('Processing payment...');

    // simulate progress
    let p = 0;
    const iv = setInterval(()=> {
      p += Math.round(Math.random()*30);
      if(p >= 100){ clearInterval(iv); app.status = 'paid'; app.paidAt = new Date().toISOString();
        // create a small text receipt stored in app.receipt (printable)
        app.receipt = `UAP RECEIPT\nAppID: ${app.id}\nName: ${app.name}\nProgram: ${app.program}\nDept: ${app.dept}\nAmount: ${app.fee} BDT\nPaidAt: ${app.paidAt}`;
        saveApps(apps); populateAppsList(); toast('Payment successful — status PAID'); }
    }, 450);
  }

  function downloadAllFiles(appId){
    const apps = loadApps(); const app = apps.find(a=>a.id===appId);
    if(!app) { toast('Not found'); return; }
    const files = app.files || {};
    Object.keys(files).forEach(k => {
      const f = files[k];
      if(!f) return;
      // convert dataUrl -> blob
      const arr = f.dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length; const u8 = new Uint8Array(n);
      while(n--) u8[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = f.name || (k + (mime.includes('pdf')?'.pdf':'.bin'));
      a.click(); URL.revokeObjectURL(url);
    });
    toast('Downloaded files (if any)');
  }

  // Department list + view applicants
  function renderDeptList(){
    const seats = loadSeats();
    const container = $('#deptList'); container.innerHTML = '';
    Object.keys(seats).forEach(d => {
      const div = document.createElement('div'); div.className = 'dept-item';
      div.innerHTML = `<h4>${d}</h4><div>Seats left: <span class="seats">${seats[d]}</span></div>
        <div style="margin-top:8px"><button class="btn" data-dept="${d}" data-act="view">View applicants</button></div>`;
      container.appendChild(div);
    });
    // attach view actions
    container.querySelectorAll('button').forEach(b => b.addEventListener('click', ()=> showApplicantsForDept(b.dataset.dept)));
  }

  function showApplicantsForDept(dept){
    const apps = loadApps().filter(a => a.dept === dept);
    const appsList = $('#appsList');
    if(apps.length===0){ appsList.innerHTML = `<p>No applicants for ${dept} yet.</p>`; dashModal.setAttribute('aria-hidden','false'); return; }

    const html = apps.map(a => `
      <div style="padding:8px;border-bottom:1px solid #eee">
        <strong>${a.name}</strong> <small>${a.id}</small>
        <div style="font-size:13px;color:#444">Status: ${a.status}</div>
        <div style="margin-top:6px">
          <button class="btn" data-id="${a.id}" data-act="accept">Accept</button>
          <button class="btn" data-id="${a.id}" data-act="reject">Reject</button>
          <button class="btn" data-id="${a.id}" data-act="pay">Pay</button>
        </div>
      </div>
    `).join('');
    appsList.innerHTML = `<h4>${dept} applicants</h4>${html}`;
    appsList.querySelectorAll('button').forEach(b => b.addEventListener('click', ()=>{
      const id = b.dataset.id, act = b.dataset.act;
      if(act==='accept') acceptApplicant(id);
      if(act==='reject') rejectApplicant(id);
      if(act==='pay') openPaymentFlow(id);
      populateAppsList(); renderDeptList();
    }));
    dashModal.setAttribute('aria-hidden','false');
  }

  function acceptApplicant(id){
    const apps = loadApps(); const app = apps.find(a=>a.id===id);
    if(!app) return;
    const seats = loadSeats();
    if(seats[app.dept] <= 0){ alert('No seats left in ' + app.dept); return; }
    app.status = 'accepted';
    saveApps(apps);
    seats[app.dept] = Math.max(0, seats[app.dept] - 1); saveSeats(seats);
    toast('Accepted ' + id + ' — seats left: ' + seats[app.dept]);
  }
  function rejectApplicant(id){
    const apps = loadApps(); const app = apps.find(a=>a.id===id);
    if(!app) return;
    app.status = 'rejected'; saveApps(apps); toast('Rejected ' + id);
  }

  // Delete app
  function deleteApp(id){
    const arr = loadApps().filter(a => a.id !== id); saveApps(arr); toast('Deleted ' + id);
  }

  // Merit generator
  $('#genMerit').addEventListener('click', ()=> {
    const wGPA = Number($('#weightGPA').value) || 60;
    const wExam = Number($('#weightExam').value) || 40;
    // use all submitted apps
    const apps = loadApps();
    const rows = apps.map(a => {
      // try parse GPA from education string
      let gpa = 0;
      const m = (a.education || '').match(/GPA\s*[:\-]?\s*([0-9.]+)/i);
      if(m) gpa = Number(m[1]);
      else gpa = +(3.5 + Math.random()*1.5).toFixed(2); // fallback
      // exam: parse numbers from examRoll and normalize 0-100
      let examRaw = 0;
      const exm = (a.examRoll || '').match(/\d+/);
      if(exm) examRaw = Number(exm[0]) % 101; else examRaw = Math.round(40 + Math.random()*60);
      const examNorm = (examRaw/100)*5; // convert to scale 0-5
      const score = (wGPA/100)*gpa + (wExam/100)*examNorm;
      return {...a, gpa, exam: examRaw, score: Number(score.toFixed(3))};
    });

    rows.sort((A,B) => {
      if(B.score !== A.score) return B.score - A.score;
      if(B.gpa !== A.gpa) return B.gpa - A.gpa;
      return new Date(A.appliedAt) - new Date(B.appliedAt);
    });

    const tbody = $('#meritTable tbody'); tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.id}</td><td>${r.name}</td><td>${r.dept}</td><td>${r.gpa}</td><td>${r.exam}</td><td>${r.score}</td>
        <td><button class="btn" data-id="${r.id}" data-act="accept">Accept</button></td>`;
      tbody.appendChild(tr);
    });
    // attach accept handlers
    $$('#meritTable button').forEach(b => b.addEventListener('click', ()=> { acceptApplicant(b.dataset.id); renderDeptList(); populateAppsList(); }));
    toast('Merit generated (' + rows.length + ')');
  });

  // Export CSV
  $('#exportMerit').addEventListener('click', ()=> {
    const rows = Array.from($('#meritTable tbody tr')).map(tr => Array.from(tr.cells).slice(0,6).map(td => td.textContent.trim()));
    if(rows.length===0){ alert('No rows. Generate merit first.'); return; }
    const csv = ['AppID,Name,Dept,GPA,Exam,Score', ...rows.map(r=> r.map(c=>`"${c.replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'merit.csv'; a.click(); URL.revokeObjectURL(url);
    toast('CSV exported');
  });

  // Dept filter
  $('#deptFilter').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('#deptList .dept-item').forEach(it => {
      const name = it.querySelector('h4').textContent.toLowerCase();
      it.style.display = name.includes(q) ? '' : 'none';
    });
  });

  // Teachers data & search
  const teachersData = [
    { name:'Dr. A. Rahman', dept:'CSE', position:'Professor', degrees:'PhD (AI), M.Sc Computer Science', email:'arahman@uap-bd.edu', phone:'+8801711000001' },
    { name:'Prof. S. Karim', dept:'EEE', position:'Professor', degrees:'PhD (Power Systems)', email:'skarim@uap-bd.edu', phone:'+8801711000002' },
    { name:'Dr. M. Hasan', dept:'Civil', position:'Associate Professor', degrees:'PhD (Structural)', email:'mhasan@uap-bd.edu', phone:'+8801711000003' },
    { name:'Ar. L. Ahmed', dept:'Architecture', position:'Assistant Professor', degrees:'M.Arch', email:'lahmed@uap-bd.edu', phone:'+8801711000004' },
    { name:'Dr. R. Khan', dept:'BBA', position:'Associate Professor', degrees:'PhD (Management)', email:'rkhan@uap-bd.edu', phone:'+8801711000005' },
  ];

  function renderTeachers(filter=''){
    const wrap = $('#teachers'); wrap.innerHTML = '';
    teachersData.filter(t => (t.name + ' ' + t.dept).toLowerCase().includes(filter.toLowerCase())).forEach(t => {
      const d = document.createElement('div'); d.className='teacher-card';
      d.innerHTML = `<h4>${t.name}</h4><p><strong>${t.position} — ${t.dept}</strong></p>
        <p>${t.degrees}</p>
        <p><a href="mailto:${t.email}">${t.email}</a> • <a href="tel:${t.phone}">${t.phone}</a></p>`;
      wrap.appendChild(d);
    });
  }
  $('#teacherSearch').addEventListener('input', (e)=> renderTeachers(e.target.value));
  renderTeachers();

  // initial render
  renderDeptList();
  loadSeats(); // ensure seats exist

  // small auto-update: submitted -> docs_verified if files exist; paid -> verified
  setInterval(()=> {
    let changed=false;
    const arr = loadApps();
    arr.forEach(a => {
      if(a.status === 'submitted' && (a.files && (a.files.photo || a.files.transcript || a.files.sign))){
        a.status = 'docs_verified'; changed = true;
      }
      if(a.status === 'paid' && (a.files && (a.files.photo || a.files.transcript))){
        a.status = 'verified'; changed = true;
      }
    });
    if(changed) saveApps(arr);
  }, 2500);

  // helpful message
  toast('Uploads fixed — try selecting files, submitting, then open Dashboard to view & pay', 4500);

})();
