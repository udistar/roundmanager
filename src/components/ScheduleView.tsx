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

                {/* Timeline - Horizontal */}
                <div className="relative mt-8 mb-4">
                    {/* Connecting Line */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-700" />

                    <div className="flex justify-between items-start relative z-10">
                        {/* Depart Home */}
                        <div className="flex flex-col items-center group">
                            <div className="bg-slate-800 p-2 rounded-full border border-slate-600 mb-2 shadow-lg z-10 relative">
                                <Car className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-xs">Depart</p>
                                <p className="text-[10px] text-slate-400">{schedule.departureTime}</p>
                            </div>
                        </div>

                        {hasBreakfast && (
                            <div className="flex flex-col items-center group">
                                <div className="bg-slate-800 p-2 rounded-full border border-slate-600 mb-2 shadow-lg z-10 relative">
                                    <Coffee className="w-5 h-5 text-orange-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-bold text-xs">Breakfast</p>
                                    <p className="text-[10px] text-slate-400">30m</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-center group">
                            <div className="bg-slate-800 p-2 rounded-full border border-slate-600 mb-2 shadow-lg z-10 relative">
                                <Flag className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-xs">Arrive</p>
                                <p className="text-[10px] text-slate-400">{schedule.arrivalTime}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center group">
                            <div className="bg-slate-800 p-2 rounded-full border border-slate-600 mb-2 shadow-lg z-10 relative">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-xs">Tee Off</p>
                                <p className="text-[10px] text-slate-400">{schedule.teeTime}</p>
                            </div>
                        </div>
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
