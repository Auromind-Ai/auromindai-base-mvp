
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}


export function getDateLabel(timestamp) {
    if (!timestamp) return '';

    const msgDate = new Date(timestamp);
    if (isNaN(msgDate.getTime())) return '';

    const today = startOfDay(new Date());
    const msgDay = startOfDay(msgDate);

    const diffMs = today.getTime() - msgDay.getTime();
    const diffDays = Math.round(diffMs / 86400000); 

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays >= 2 && diffDays <= 6) {
        return msgDate.toLocaleDateString(undefined, { weekday: 'long' });
    }

    // Older than 7 days → "28 May 2026"
    return msgDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}


export function getDayKey(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}


export function insertDateSeparators(messages) {
    if (!messages || messages.length === 0) return [];

    const result = [];
    let prevDayKey = null;

    for (const msg of messages) {
        const ts = msg.timestamp || msg.created_at;
        const dayKey = getDayKey(ts);

        if (dayKey && dayKey !== prevDayKey) {
            result.push({
                _dateSeparator: true,
                label: getDateLabel(ts),
                key: `sep-${dayKey}`,
            });
            prevDayKey = dayKey;
        }

        result.push(msg);
    }

    return result;
}
