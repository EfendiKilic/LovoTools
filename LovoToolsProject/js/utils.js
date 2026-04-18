/**
 * Ortak Yardımcı Fonksiyonlar
 */

export const formatTime = (seconds) => {
    if (isNaN(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0') + '.' + ms;
};

export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getFileExtension = (filename) => {
    return filename.split('.').pop();
};

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    
    // Icon mapping
    const iconMap = {
        success: 'ph-check-circle',
        error: 'ph-warning-circle',
        info: 'ph-info',
        warning: 'ph-warning'
    };
    
    const colorMap = {
        success: 'success',
        error: 'danger',
        info: 'primary',
        warning: 'warning'
    };

    const icon = iconMap[type] || 'ph-info';
    const color = colorMap[type] || 'primary';
    
    toast.innerHTML = `<i class="ph ${icon}" style="font-size: 1.5rem; color: var(--${color})"></i>
                       <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
};

export const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
};
