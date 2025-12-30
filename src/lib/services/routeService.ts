import { Schedule, RoundingInfo } from '@/types';
import { addMinutes, subMinutes, format, parse, differenceInMinutes } from 'date-fns';

export async function calculateSchedule(info: RoundingInfo): Promise<Schedule> {
    // Mock Route Calculation
    // In real app: Directions API (Naver/Tmap) to get travelTime
    const travelTimeMinutes = 90; // Assume 1.5 hours on average for golf trips in Korea

    const teeTimeDate = parse(`${info.date} ${info.teeTime}`, 'yyyy-MM-dd HH:mm', new Date());

    // Rule: Arrival at Clubhouse 40 mins before. 
    // Actually prompts says: "Departure 1h before travel time... 40m prep + 20m load/start car".
    // Let's reverse calculate:
    // TeeTime
    // - 40 mins (Locker/Prep) -> Clubhouse Arrival
    // - TravelTime
    // - 20 mins (Loading/Start Car) -> Departure from House?
    // OR Prompt says: "Recommended departure = TravelTime + 1 Hour earlier."
    // And "Reason: 40m prep + 20m car setup".
    // Additional: "If Restaurant recommended, add 30 mins".

    let bufferMinutes = 60; // 40 prep + 20 car
    let mealMinutes = 0;

    if (info.hasBreakfast) {
        mealMinutes = 30;
    }

    const totalDeduction = travelTimeMinutes + bufferMinutes + mealMinutes;

    const departureDate = subMinutes(teeTimeDate, totalDeduction);

    // Route Strings
    const route = [info.startLocation];
    if (info.hasBreakfast) route.push("Breakfast Restaurant");
    route.push(info.courseName);

    return {
        departureTime: format(departureDate, 'HH:mm'),
        travelTime: travelTimeMinutes,
        teeTime: info.teeTime,
        arrivalTime: format(subMinutes(teeTimeDate, 40), 'HH:mm'), // Arrive 40m before tee
        route: route,
    };
}

export function getScheduleExplanation(hasBreakfast: boolean, travelTime: number): string[] {
    const reasons = [
        `Travel Time: ${Math.floor(travelTime / 60)}h ${travelTime % 60}m`,
        `Clubhouse Prep: 40 mins (Check-in, Changing, Warm-up)`,
        `Car Loading & Warm-up: 20 mins`,
    ];
    if (hasBreakfast) {
        reasons.push(`Breakfast: 30 mins (Quick meal recommended)`);
    }
    return reasons;
}
