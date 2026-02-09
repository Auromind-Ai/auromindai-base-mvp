import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AIInsightCard({ insights }) {
    return (
        <Card className="bg-[#161617]/30 border border-indigo-500/20">
            <CardHeader className="flex flex-row items-center gap-2 p-5 pb-4 text-indigo-400">
                <Sparkles size={16} />
                <CardTitle className="text-xs font-black uppercase tracking-widest">AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
                <div className="space-y-3">
                    {insights.map((insight, i) => (
                        <div key={i} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                            <p className="text-sm text-indigo-100/70 leading-relaxed font-medium">{insight.text}</p>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/10 transition-colors">
                    View Full Report
                </button>
            </CardContent>
        </Card>
    );
}
