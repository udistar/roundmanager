'use client';

import { useState } from 'react';
import RoundingForm from '@/components/RoundingForm';
import WeatherTimeline from '@/components/WeatherTimeline';
import RestaurantList from '@/components/RestaurantList';
import ScheduleView from '@/components/ScheduleView';
import { RoundingInfo, WeatherData, Schedule, Restaurant } from '@/types';
import { Card } from '@/components/ui/Card';
import { getCourseWeather } from '@/lib/services/weatherService';
import { getRecommendations } from '@/lib/services/restaurantService';
import { calculateSchedule } from '@/lib/services/routeService';
import Link from 'next/link';

export default function Home() {
  const [plan, setPlan] = useState<RoundingInfo | null>(null);
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (info: RoundingInfo) => {
    setLoading(true);
    try {
      const [weatherData, scheduleData] = await Promise.all([
        getCourseWeather(info.courseName, info.date, info.teeTime),
        calculateSchedule(info)
      ]);

      setPlan(info);
      setWeather(weatherData);
      setSchedule(scheduleData);
    } catch (error) {
      console.error("Failed to generate plan", error);
      alert("Something went wrong generating your plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-12 text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Rounding Manager
        </h1>
        <p className="text-slate-400 text-lg">
          Your Total Solution for the Perfect Golf Day
        </p>
      </header>

      {!plan ? (
        <section className="animate-fade-in-up">
          <RoundingForm onSubmit={handleFormSubmit} isLoading={loading} />
        </section>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Summary Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Your Itinerary</h2>
            <button
              onClick={() => setPlan(null)}
              className="text-sm text-slate-400 hover:text-white underline"
            >
              Start Over
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Route & Schedule */}
            <div className="lg:col-span-1 space-y-6">
              {schedule && <ScheduleView schedule={schedule} hasBreakfast={plan.hasBreakfast} />}
            </div>

            {/* Middle Column: Weather & Dining */}
            <div className="lg:col-span-1 space-y-6">
              <WeatherTimeline weather={weather} courseName={plan.courseName} />

              {plan.hasBreakfast && (
                <RestaurantList title="Pre-Round (Breakfast)" restaurants={preRoundDining} />
              )}
            </div>

            {/* Right Column: Post Dining */}
            <div className="lg:col-span-1 space-y-6">
              {plan.hasDinner && (
                <RestaurantList title="Post-Round (Dinner)" restaurants={postRoundDining} />
              )}

              {/* Quick Links / Auto-Login Placeholder */}
              <Card title="Quick Actions">
                <button className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white mb-2 transition">
                  Navigate to Course (Tmap)
                </button>
                <Link href="/courses">
                  <button className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition width-full">
                    Course Booking Page (Auto-Login)
                  </button>
                </Link>
              </Card>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
