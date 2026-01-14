let count = 0;
const disco = setInterval(() => {
    document.body.style.backgroundColor = `hsl(${count % 360}, 70%, 50%)`;
    count += 30;
}, 100);