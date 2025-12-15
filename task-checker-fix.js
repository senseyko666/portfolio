// Task Checker slideshow navigation - OPTIMIZED VERSION
let currentTaskCheckerImage = 1;
const totalTaskCheckerImages = 5;
let preloadedImages = {};
let isLoading = false;

// Check WebP support
function supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Preload all images
function preloadTaskCheckerImages() {
    console.log('Preloading Task Checker images...');
    const useWebP = supportsWebP();
    const format = useWebP ? 'webp' : 'jpg';
    const folder = useWebP ? 'webp/' : '';
    
    console.log(`Using format: ${format}`);
    
    for (let i = 1; i <= totalTaskCheckerImages; i++) {
        const img = new Image();
        img.onload = () => {
            console.log(`Image ${i} preloaded (${format})`);
            preloadedImages[i] = img;
        };
        img.onerror = () => {
            console.error(`Failed to preload image ${i}, trying fallback`);
            // Fallback to JPG if WebP fails
            if (useWebP) {
                const fallbackImg = new Image();
                fallbackImg.onload = () => {
                    console.log(`Image ${i} preloaded (JPG fallback)`);
                    preloadedImages[i] = fallbackImg;
                };
                fallbackImg.src = `demos/Task Checker/${i}.jpg`;
            }
        };
        img.src = `demos/Task Checker/${folder}${i}.${format}`;
    }
}

function nextTaskCheckerImage() {
    if (isLoading) return;
    console.log('Next clicked, current:', currentTaskCheckerImage);
    const nextImage = currentTaskCheckerImage < totalTaskCheckerImages ? currentTaskCheckerImage + 1 : 1;
    updateTaskCheckerImage(nextImage);
}

function previousTaskCheckerImage() {
    if (isLoading) return;
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
    
    isLoading = true;
    
    // Update current image number
    currentTaskCheckerImage = imageNumber;
    
    // Show loading state
    image.style.opacity = '0.3';
    
    // Use preloaded image if available, otherwise load normally
    if (preloadedImages[imageNumber]) {
        image.src = preloadedImages[imageNumber].src;
        // Quick transition for preloaded images
        setTimeout(() => {
            image.style.opacity = '1';
            isLoading = false;
        }, 100);
    } else {
        // Fallback to normal loading
        image.onload = () => {
            image.style.opacity = '1';
            isLoading = false;
        };
        image.src = `demos/Task Checker/${imageNumber}.jpg`;
    }
    
    // Update indicator
    indicator.textContent = `${imageNumber} / ${totalTaskCheckerImages}`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Task Checker slideshow initialized');
    preloadTaskCheckerImages();
    updateTaskCheckerImage(1);
});