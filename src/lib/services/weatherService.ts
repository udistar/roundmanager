import { WeatherData } from '@/types';
import { addHours, format, parse } from 'date-fns';

const SOURCES = ['KMA', 'AccuWeather', 'WeatherChannel', 'OpenWeather'] as const;

export async function getCourseWeather(courseName: string, date: string, teeTime: string): Promise<WeatherData[]> {
    // Simulate API Network Delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const startDate = parse(`${date} ${teeTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const forecast: WeatherData[] = [];

    // Generate 5 hours of weather data
    for (let i = 0; i < 5; i++) {
        const currentTime = addHours(startDate, i);
        const timeStr = format(currentTime, 'HH:mm');

        // Simulate "Average" weather conditions for a typical nice golf day
        // Maybe add some random variance based on the "Course Name" hash or simple random
        const baseTemp = 18 + (i * 0.5) + (Math.random() * 2 - 1);

        forecast.push({
            time: timeStr,
            temp: Math.round(baseTemp * 10) / 10,
            precipitation: Math.random() < 0.2 ? Math.round(Math.random() * 5) : 0, // 20% chance of rain
            windSpeed: Math.round((2 + Math.random() * 3) * 10) / 10, // 2-5 m/s
            sky: Math.random() > 0.3 ? 'Clear' : 'Cloudy',
            source: 'KMA' // We could return multiple sources per hour, but let's simplify to "Aggregated" for now or return a primary source
        });
    }

    return forecast;
}
