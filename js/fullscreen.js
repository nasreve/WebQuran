// ============================================
// Fullscreen - mode layar penuh untuk jendela operator
// ============================================

let isFullscreen = false;

function toggleFullscreen() {
    const resultArea = document.getElementById("resultArea");
    const body = document.body;
    if (!resultArea) return;

    if (!isFullscreen) {
        resultArea.classList.add("fullscreen-mode");
        body.classList.add("fullscreen-active");
        isFullscreen = true;

        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                // Electron tetap memakai fallback CSS di bawah
            });
        }
    } else {
        resultArea.classList.remove("fullscreen-mode");
        body.classList.remove("fullscreen-active");
        isFullscreen = false;

        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        }
    }
}

// Listen for native fullscreen exit (ESC)
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isFullscreen) {
        const resultArea = document.getElementById("resultArea");
        const body = document.body;
        resultArea.classList.remove("fullscreen-mode");
        body.classList.remove("fullscreen-active");
        isFullscreen = false;
    }
});

// Sidebar Toggle
function toggleSidebar() {
    const container = document.querySelector('.container');
    if (container) container.classList.toggle('sidebar-hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
});
