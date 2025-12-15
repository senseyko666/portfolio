// Task Checker slideshow navigation - FIXED VERSION
let currentTaskCheckerImage = 1;
const totalTaskCheckerImages = 5;

function nextTaskCheckerImage() {
    console.log('Next clicked, current:', currentTaskCheckerImage);
    const nextImage = currentTaskCheckerImage < totalTaskCheckerImages ? currentTaskCheckerImage + 1 : 1;
    updateTaskCheckerImage(nextImage);
}

function previousTaskCheckerImage() {
    console.log('Previous clicked, current:', currentTaskCheckerImage);
    const prevImage = currentTaskCheckerImage > 1 ? currentTaskCheckerImage - 1 : totalTaskCheckerImages;
    updateTaskCheckerImage(prevImage);
}

function updateTaskCheckerImage(imageNumber) {
    console.log('Updating to image:', imageNumber);
    const image = document.getElementById('taskCheckerImage');
    const indicator = document.getElementById('taskCheckerIndicator');
    
    if (!image || !indicator) {
        console.error('Elements not found');
        return;
    }
    
    // Update current image number
    currentTaskCheckerImage = imageNumber;
    
    // Update image source
    image.src = `demos/Task Checker/${imageNumber}.jpg`;
    
    // Update indicator
    indicator.textContent = `${imageNumber} / ${totalTaskCheckerImages}`;
    
    // Add fade effect
    image.style.opacity = '0.7';
    setTimeout(() => {
        image.style.opacity = '1';
    }, 150);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Task Checker slideshow initialized');
    updateTaskCheckerImage(1);
});