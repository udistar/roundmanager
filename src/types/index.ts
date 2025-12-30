export interface RoundingInfo {
  date: string; // YYYY-MM-DD
  teeTime: string; // HH:mm
  courseName: string;
  startLocation: string;
  hasBreakfast: boolean; // Pre-round meal
  hasDinner: boolean; // Post-round meal
}

export interface WeatherData {
  time: string; // HH:mm
  temp: number;
  precipitation: number; // mm
  windSpeed: number; // m/s
  sky: string; // Clear, Cloudy, Rain, etc.
  source: 'KMA' | 'AccuWeather' | 'WeatherChannel' | 'OpenWeather';
}

export interface Restaurant {
  id: string;
  name: string;
  type: string; // Korean, Western, etc.
  menu: { name: string; price: number }[];
  rating: number; // 0-5
  openTime: string; // HH:mm
  distanceFromCourse: number; // km
  category: 'PRE_ROUND' | 'POST_ROUND';
  address: string;
}

export interface Schedule {
  departureTime: string;
  travelTime: number; // minutes
  breakfastTime?: string;
  arrivalTime: string;
  teeTime: string;
  route: string[]; // List of stop names
}
