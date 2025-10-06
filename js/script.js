// script.js

// smooth reveal for sections on load/scroll
document.addEventListener('DOMContentLoaded', () => {
  const secs = document.querySelectorAll('.section');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting) e.target.classList.add('visible');
    });
  }, {threshold: 0.12});

  secs.forEach(s => obs.observe(s));

  // department search
  const search = document.getElementById('deptSearch');
  const table = document.getElementById('deptTable');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    [...table.tBodies[0].rows].forEach(row => {
      const name = row.cells[0].textContent.toLowerCase();
      row.style.display = name.includes(q) ? '' : 'none';
    });
  });

  // Backlog modal
  const backlogModal = document.getElementById('backlogModal');
  const openBacklog = document.getElementById('openBacklog');
  const closeBacklog = document.getElementById('closeBacklog');
  openBacklog.addEventListener('click', () => {
    backlogModal.setAttribute('aria-hidden','false');
  });
  closeBacklog.addEventListener('click', () => backlogModal.setAttribute('aria-hidden','true'));
  backlogModal.addEventListener('click', e => {
    if(e.target === backlogModal) backlogModal.setAttribute('aria-hidden','true');
  });

  // PYQs list modal
  const pyqsList = document.getElementById('pyqsList');
  document.getElementById('open-pyqs-list').addEventListener('click', ()=> pyqsList.setAttribute('aria-hidden','false'));
  document.getElementById('closePyqsList').addEventListener('click', ()=> pyqsList.setAttribute('aria-hidden','true'));
  pyqsList.addEventListener('click', e => { if(e.target === pyqsList) pyqsList.setAttribute('aria-hidden','true'); });

  // intercept admission link to show loader then navigate
  const toAdmissionLinks = document.querySelectorAll('.to-admission');
  const navLoader = document.getElementById('nav-loader');

  toAdmissionLinks.forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const href = a.getAttribute('href');
      // show loader
      navLoader.setAttribute('aria-hidden','false');
      const bar = navLoader.querySelector('.nav-loader-bar');
      bar.style.width = '24%';
      // animate progress
      setTimeout(()=> bar.style.width = '60%', 160);
      setTimeout(()=> bar.style.width = '92%', 380);
      // finalize, then go to page
      setTimeout(()=>{
        bar.style.width = '100%';
      }, 520);
      setTimeout(()=> {
        navLoader.setAttribute('aria-hidden','true');
        bar.style.width = '0%';
        window.location.href = href;
      }, 900); // short, smooth transition
    });
  });

});
