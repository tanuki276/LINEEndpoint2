document.querySelectorAll('[data-participant-id]').forEach(el => {
  el.style.transition = "transform 2s";
  el.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
});