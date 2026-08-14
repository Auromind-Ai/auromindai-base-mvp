export function formatBillingDate(dateInput, includeTime = false) {
    if (!dateInput) return '—';
    try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return '—';

        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        if (includeTime) {
            return d.toLocaleDateString('en-US', {
                ...dateOptions,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return d.toLocaleDateString('en-US', dateOptions);
    } catch {
        return '—';
    }
}

export function formatBillingAmount(amount, currency = '₹') {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${currency}0`;
    return `${currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function getActivityMeta(item) {
    if (!item) return { label: 'Transaction', status: 'completed', badgeClass: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20' };

    const type = (item.type || item.event_type || item.action || '').toLowerCase();
    const status = (item.status || 'success').toLowerCase();

    let label = item.description || item.title || 'Billing Activity';
    if (!item.description) {
        if (type.includes('recharge') || type.includes('topup')) label = 'Wallet Top-up';
        else if (type.includes('subscription') || type.includes('plan')) label = 'Plan Subscription';
        else if (type.includes('usage') || type.includes('deduct')) label = 'Usage Deduction';
        else if (type.includes('refund')) label = 'Refund Processed';
    }

    let badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (status === 'failed' || status === 'cancelled') {
        badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    } else if (status === 'pending') {
        badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }

    return {
        label,
        status,
        badgeClass
    };
}

export function formatPaymentMethod(method, provider) {
    const p = (provider || '').toLowerCase();
    const m = (method || '').toLowerCase();

    let label = 'Online Payment';
    if (m.includes('upi')) label = 'UPI';
    else if (m.includes('card') || m.includes('credit') || m.includes('debit')) label = 'Card';
    else if (m.includes('netbanking') || m.includes('bank')) label = 'Net Banking';
    else if (m.includes('wallet')) label = 'Wallet';
    else if (m) label = method.toUpperCase();

    const providerLabel = p ? (p.charAt(0).toUpperCase() + p.slice(1)) : 'Gateway';
    const tooltip = `${label} via ${providerLabel}`;

    return { label, tooltip };
}
