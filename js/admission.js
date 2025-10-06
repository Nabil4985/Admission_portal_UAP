// admission.js
document.addEventListener('DOMContentLoaded', () => {
  const deptSelect = document.getElementById('deptSelect');
  const totalCredits = document.getElementById('totalCredits');
  const perCreditFee = document.getElementById('perCreditFee');
  const scholar = document.getElementById('scholar');
  const calcBtn = document.getElementById('calcBtn');
  const resetBtn = document.getElementById('resetCalc');
  const totalTuition = document.getElementById('totalTuition');
  const afterScholar = document.getElementById('afterScholar');
  const perSemester = document.getElementById('perSemester');
  const calcResult = document.getElementById('calcResult');

  // populate credits & fee when dept selected
  deptSelect.addEventListener('change', () => {
    const opt = deptSelect.selectedOptions[0];
    const credits = opt.dataset.credits || '';
    const fee = opt.dataset.fee || '';
    totalCredits.value = credits;
    perCreditFee.value = fee;
  });

  function formatBDT(n){
    return n.toLocaleString('en-BD') + " BDT";
  }

  calcBtn.addEventListener('click', () => {
    const credits = Number(totalCredits.value) || 0;
    const fee = Number(perCreditFee.value) || 0;
    const sch = Number(scholar.value) || 0;
    if(credits <= 0 || fee <= 0){
      alert('Please enter valid credits and per-credit fee.');
      return;
    }
    const total = credits * fee;
    const after = total * (1 - (sch/100));
    const perSem = after / 8; // show per-sem for 8 semesters default
    // animate result reveal
    calcResult.style.transform = 'translateY(0)';
    totalTuition.textContent = 'Total tuition: ' + formatBDT(total);
    afterScholar.textContent = 'After scholarship (' + sch + '%): ' + formatBDT(Math.round(after));
    perSemester.textContent = 'Per-semester (8 sem): ' + formatBDT(Math.round(perSem));
  });

  resetBtn.addEventListener('click', () => {
    deptSelect.value = '';
    totalCredits.value = '';
    perCreditFee.value = '';
    scholar.value = '';
    totalTuition.textContent = 'Total tuition: —';
    afterScholar.textContent = 'After scholarship: —';
    perSemester.textContent = 'Per-semester (8 sem): —';
  });

  // Back to home with loader
  const backBtn = document.getElementById('backHome');
  const navLoader = document.getElementById('nav-loader-adm');
  if(backBtn){
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navLoader.setAttribute('aria-hidden','false');
      const bar = navLoader.querySelector('.nav-loader-bar');
      bar.style.width = '40%';
      setTimeout(()=> bar.style.width = '78%', 180);
      setTimeout(()=> bar.style.width = '98%', 420);
      setTimeout(()=> {
        bar.style.width = '100%';
      }, 560);
      setTimeout(()=> {
        navLoader.setAttribute('aria-hidden','true');
        bar.style.width = '0%';
        window.location.href = 'index.html';
      }, 900);
    });
  }
});
