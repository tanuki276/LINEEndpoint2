document.querySelectorAll('[data-participant-id] span').forEach(el => {
    if(el.innerText.length > 0) {
        el.innerText = "Unknown Entity #" + Math.floor(Math.random() * 9999);
    }
});