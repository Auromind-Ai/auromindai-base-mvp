'use client';

import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function AIEmployeeCard({
    icon: Icon,
    name,
    tagline,
    description,
    status = 'active',
    href,
    ctaLabel = 'Open'
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    {Icon && <Icon size={24} strokeWidth={1.5} />}
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Content */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{name}</h3>
                <p className="text-sm text-indigo-600 font-medium mb-2">{tagline}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>

            {/* Action */}
            <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                    href={href}
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    {ctaLabel}
                </Link>
            </div>
        </div>
    );
}
