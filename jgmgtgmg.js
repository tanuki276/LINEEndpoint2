(function() {
    const vids = document.querySelectorAll('video');
    vids.forEach(v => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.style.position = 'absolute';
        canvas.style.zIndex = '10';
        canvas.width = v.offsetWidth;
        canvas.height = v.offsetHeight;
        v.parentElement.appendChild(canvas);

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const fontSize = 16;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0F0';
            ctx.font = fontSize + 'px monospace';
            drops.forEach((y, i) => {
                const text = letters[Math.floor(Math.random() * letters.length)];
                ctx.fillText(text, i * fontSize, y * fontSize);
                if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            });
        }
        setInterval(draw, 33);
    });
})();