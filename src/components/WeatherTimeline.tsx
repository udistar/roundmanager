import { WeatherData } from '@/types';
import { Card } from '@/components/ui/Card';
import { Cloud, Sun, CloudRain, Wind, Thermometer } from 'lucide-react';

interface WeatherTimelineProps {
    weather: WeatherData[];
    courseName: string;
}

export default function WeatherTimeline({ weather, courseName }: WeatherTimelineProps) {
    const getIcon = (sky: string) => {
        if (sky === 'Clear') return <Sun className="w-8 h-8 text-yellow-400" />;
        if (sky === 'Rain') return <CloudRain className="w-8 h-8 text-blue-400" />;
        return <Cloud className="w-8 h-8 text-gray-400" />;
    };

    return (
        <Card title={`Weather Forecast @ ${courseName}`}>
            <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                    <span>Sources: KMA, AccuWeather, WeatherCh, OpenWeather</span>
                </div>

                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-emerald-600">
                    {weather.map((data, idx) => (
                        <div key={idx} className="flex-shrink-0 w-24 flex flex-col items-center bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                            <span className="text-slate-300 font-mono text-sm mb-2">{data.time}</span>
                            <div className="my-2">{getIcon(data.sky)}</div>

                            <div className="flex items-center space-x-1 text-white font-bold text-lg">
                                <span>{data.temp}°</span>
                            </div>

                            <div className="flex flex-col items-center mt-2 space-y-1 text-xs text-slate-400">
                                <div className="flex items-center">
                                    <Wind className="w-3 h-3 mr-1" />
                                    {data.windSpeed}m/s
                                </div>
                                {data.precipitation > 0 && (
                                    <div className="flex items-center text-blue-300">
                                        <CloudRain className="w-3 h-3 mr-1" />
                                        {data.precipitation}mm
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
