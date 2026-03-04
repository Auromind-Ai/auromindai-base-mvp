import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpcomingScheduleCard({ upcomingSchedule }) {
    return (
        <Card className="bg-transparent border border-[#333335]">
            <CardHeader>
                <CardTitle className="text-[10px] font-black text-[#52525b] uppercase tracking-widest">Upcoming Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {upcomingSchedule.map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-lg bg-[#161617] border border-[#333335] flex items-center justify-center shrink-0 text-[#a1a1aa]">
                            <span className="text-xs font-black">{item.day}</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{item.title}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#52525b] mt-0.5">{item.details}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
