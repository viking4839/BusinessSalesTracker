export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

export const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return 'Just now';
};

export const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
};

export const isThisWeek = (date) => {
    const now = new Date();
    const checkDate = new Date(date);
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return checkDate >= weekStart;
};