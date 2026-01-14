const videoContainers = document.querySelectorAll('[data-participant-id]');
videoContainers.forEach(container => {
    const img = document.createElement('img');
    img.src = `https://placekitten.com/${container.offsetWidth}/${container.offsetHeight}`;
    img.style.position = 'absolute';
    img.style.zIndex = '100';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    container.appendChild(img);
});