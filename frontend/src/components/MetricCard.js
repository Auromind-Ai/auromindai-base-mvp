import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function MetricCard({ label, value, change, trend, subtext }) {
    const trendClasses = 
        trend === 'up' ? 'text-emerald-400' :
        trend === 'down' ? 'text-red-400' :
        'text-[#52525b]';

    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

    return (
        <Card className="bg-transparent border border-[#333335] hover:border-indigo-500/30 transition-colors group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
                <CardTitle className="text-[10px] font-black text-[#52525b] uppercase tracking-widest">{label}</CardTitle>
                <span className={`flex items-center text-xs font-bold ${trendClasses}`}>
                    {TrendIcon && <TrendIcon size={12} className="mr-1" />}
                    {change}
                </span>
            </CardHeader>
            <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tighter">{value}</div>
                <p className="text-[10px] text-[#52525b] uppercase font-bold">{subtext}</p>
            </CardContent>
        </Card>
    );
}
