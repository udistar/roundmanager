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

    // State for Breakfast Menu Selection
    const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
    const [isMenuConfirmed, setIsMenuConfirmed] = useState(false);

    const MENU_OPTIONS = ['곰탕', '국밥', '해장국', '설렁탕', '순대국', '갈비탕', '백반', '중식'];

    const toggleMenu = (menu: string) => {
        setSelectedMenus(prev =>
            prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
        );
    };

    const handleMenuConfirm = () => {
        if (selectedMenus.length === 0) {
            alert("Please select at least one menu option.");
            return;
        }
        setIsMenuConfirmed(true);
    };

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
                            onClick={() => {
                                setPlan(null);
                                setIsMenuConfirmed(false);
                                setSelectedMenus([]);
                            }}
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
                                !isMenuConfirmed ? (
                                    <Card title="Select Breakfast Menu">
                                        <div className="space-y-4">
                                            <p className="text-sm text-slate-400">Choose your preferred breakfast menus to find the best spots.</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {MENU_OPTIONS.map(menu => (
                                                    <button
                                                        key={menu}
                                                        onClick={() => toggleMenu(menu)}
                                                        className={`p-3 rounded-lg text-sm font-bold transition-all border ${selectedMenus.includes(menu)
                                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg scale-105'
                                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {menu}
                                                        {selectedMenus.includes(menu) && <span className="ml-2 text-xs">✓</span>}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={handleMenuConfirm}
                                                disabled={selectedMenus.length === 0}
                                                className="w-full py-3 mt-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                Search Restaurants
                                            </button>
                                        </div>
                                    </Card>
                                ) : (
                                    <RestaurantList
                                        title="Pre-Round (Breakfast)"
                                        locationName={plan.courseName}
                                        type="PRE_ROUND"
                                        searchQuery={selectedMenus}
                                    />
                                )
                            )}
                        </div>

                        {/* Right Column: Post Dining */}
                        <div className="lg:col-span-1 space-y-6">
                            {plan.hasDinner && (
                                <RestaurantList
                                    title="Post-Round (Dinner)"
                                    locationName={plan.courseName}
                                    type="POST_ROUND"
                                />
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
