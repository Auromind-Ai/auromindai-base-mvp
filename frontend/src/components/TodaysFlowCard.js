import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TodaysFlowCard({ flowStats }) {
    return (
        <Card className="bg-transparent border border-[#333335]">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-sm font-black text-white uppercase tracking-widest">Today's Flow</CardTitle>
                <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-[#161617] border border-[#333335] rounded text-emerald-400">Live</div>
            </CardHeader>
            <CardContent>
                <div className="relative pt-2 pb-6">
                    <div className="flex justify-between text-[10px] font-black text-[#52525b] uppercase tracking-wider mb-2">
                        <span>New</span>
                        <span>Working</span>
                        <span>Review</span>
                        <span>Closed</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#161617] rounded-full overflow-hidden flex">
                        <div className="h-full bg-indigo-500/20 w-[30%]" />
                        <div className="h-full bg-indigo-500/40 w-[20%]" />
                        <div className="h-full bg-indigo-500/60 w-[15%]" />
                        <div className="h-full bg-indigo-500 w-[35%]" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    {flowStats.map((stat, i) => (
                        <div key={i} className="text-center p-3 bg-[#161617]/30 border border-[#333335] rounded-lg">
                            <p className="text-xl sm:text-2xl font-black text-white tracking-tighter">{stat.count}</p>
                            <p className="text-[10px] text-[#52525b] font-black uppercase tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
