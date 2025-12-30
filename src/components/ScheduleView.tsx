import { Schedule } from '@/types';
import { Card } from '@/components/ui/Card';
import { getScheduleExplanation } from '@/lib/services/routeService';
import { Car, Coffee, Flag, Clock } from 'lucide-react';

interface ScheduleViewProps {
    schedule: Schedule;
    hasBreakfast: boolean;
}

export default function ScheduleView({ schedule, hasBreakfast }: ScheduleViewProps) {
    const reasons = getScheduleExplanation(hasBreakfast, schedule.travelTime);

    return (
        <Card title="Recommended Schedule">
            <div className="space-y-6">
                {/* Main Departure Callout */}
                <div className="bg-emerald-900/40 p-5 rounded-2xl border border-emerald-500/30 text-center">
                    <p className="text-emerald-300 text-sm font-medium mb-1">Recommended Departure</p>
                    <div className="text-4xl font-black text-white tracking-tight">
                        {schedule.departureTime}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Arrive by {schedule.arrivalTime}
                    </p>
                </div>

                {/* Timeline */}
                <div className="relative pl-6 border-l-2 border-slate-700 space-y-8 py-2">
                    <div className="relative">
                        <div className="absolute -left-[2.1rem] bg-slate-800 p-1.5 rounded-full border border-slate-600">
                            <Car className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-white font-bold">Depart Home</p>
                        <p className="text-xs text-slate-500">{schedule.departureTime}</p>
                    </div>

                    {hasBreakfast && (
                        <div className="relative">
                            <div className="absolute -left-[2.1rem] bg-slate-800 p-1.5 rounded-full border border-slate-600">
                                <Coffee className="w-4 h-4 text-orange-400" />
                            </div>
                            <p className="text-white font-bold">Breakfast</p>
                            <p className="text-xs text-slate-500">30 min duration</p>
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute -left-[2.1rem] bg-slate-800 p-1.5 rounded-full border border-slate-600">
                            <Flag className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-white font-bold">Arrive Clubhouse</p>
                        <p className="text-xs text-slate-500">{schedule.arrivalTime}</p>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-[2.1rem] bg-slate-800 p-1.5 rounded-full border border-slate-600">
                            <Clock className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-white font-bold">Tee Off</p>
                        <p className="text-xs text-slate-500">{schedule.teeTime}</p>
                    </div>
                </div>

                {/* Explanation */}
                <div className="bg-slate-800/50 p-4 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-slate-300 mb-2">Why this time?</p>
                    <ul className="space-y-1 text-slate-400 list-disc list-inside">
                        {reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );
}
