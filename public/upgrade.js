document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(
    ".public-topbar,.hero-copy,.qris-card,.form-panel,.footer,.stat-card,.panel"
  );

  if (!("IntersectionObserver" in window)) {
    items.forEach(x => x.classList.add("show"));
    return;
  }

  items.forEach(x => x.classList.add("reveal-up"));

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("show");
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:.08});

  items.forEach(x => obs.observe(x));
});
