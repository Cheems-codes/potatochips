(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('themeToggleBtn');
  const themeText = document.getElementById('themeToggleText');
  const themeKey = 'portfolio-theme';

  function setTheme(dark) {
    root.classList.toggle('dark', dark);
    themeText.textContent = dark ? 'Dark Mode' : 'Light Mode';
    try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch (_) {}
  }
  try { setTheme(localStorage.getItem(themeKey) === 'dark'); } catch (_) { setTheme(false); }
  themeButton?.addEventListener('click', () => setTheme(!root.classList.contains('dark')));

  window.openCertModal = (src, title) => {
    const modal = document.getElementById('certModal');
    document.getElementById('certModalImg').src = src;
    document.getElementById('certModalTitle').textContent = title || 'Certificate Viewer';
    modal.classList.remove('hidden'); modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  };
  window.closeCertModal = () => closeModal('certModal');
  window.openResumeModal = () => {
    const modal = document.getElementById('resumeModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
  };
  window.closeResumeModal = () => closeModal('resumeModal');
  function closeModal(id) {
    const modal = document.getElementById(id);
    modal?.classList.add('hidden'); modal?.classList.remove('flex');
    if (!document.querySelector('#certModal.flex, #resumeModal.flex')) document.body.classList.remove('overflow-hidden');
  }
  document.querySelectorAll('#certModal, #resumeModal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal.id); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { window.closeCertModal(); window.closeResumeModal(); }
  });

  const canvas = document.getElementById('fairyDustCanvas');
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx) {
    let particles = [];
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    addEventListener('resize', resize); resize();
    addEventListener('mousemove', e => {
      for (let i = 0; i < 3; i++) particles.push({x:e.clientX,y:e.clientY,size:Math.random()*4+1.5,sx:(Math.random()-.5)*2,sy:(Math.random()-.5)*2-.5,life:1});
    });
    (function animate() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const dark = root.classList.contains('dark');
      particles = particles.filter(p => p.life > 0);
      for (const p of particles) {
        p.x += p.sx; p.y += p.sy; p.life -= .025;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle = dark ? `rgba(230,161,92,${p.life})` : `rgba(34,34,59,${p.life})`; ctx.fill();
      }
      requestAnimationFrame(animate);
    })();
  }
  if (window.lucide) lucide.createIcons();
})();
