'use client';

import { useState } from 'react';
import { RoundingInfo } from '@/types';
import { Card } from './ui/Card';
import { Calendar, Clock, MapPin, Flag } from 'lucide-react';

interface RoundingFormProps {
    onSubmit: (info: RoundingInfo) => void;
    isLoading?: boolean;
}

export default function RoundingForm({ onSubmit, isLoading }: RoundingFormProps) {
    const [formData, setFormData] = useState<RoundingInfo>({
        date: new Date().toISOString().split('T')[0],
        teeTime: '08:00',
        courseName: '',
        startLocation: '',
        hasBreakfast: true,
        hasDinner: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Card title="Rounding Details" className="w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Date & Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-300">
                            <Calendar className="w-4 h-4 mr-2 text-emerald-400" />
                            Date
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="w-full p-3 glass-input rounded-lg text-white"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-300">
                            <Clock className="w-4 h-4 mr-2 text-emerald-400" />
                            Tee-Off Time
                        </label>
                        <input
                            type="time"
                            name="teeTime"
                            value={formData.teeTime}
                            onChange={handleChange}
                            className="w-full p-3 glass-input rounded-lg text-white"
                            required
                        />
                    </div>
                </div>

                {/* Location Row */}
                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-300">
                        <Flag className="w-4 h-4 mr-2 text-emerald-400" />
                        Golf Course Name
                    </label>
                    <input
                        type="text"
                        name="courseName"
                        value={formData.courseName}
                        onChange={handleChange}
                        placeholder="e.g. Sky72 Lake Course"
                        className="w-full p-3 glass-input rounded-lg text-white placeholder-slate-500"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-300">
                        <MapPin className="w-4 h-4 mr-2 text-emerald-400" />
                        Start Location (Home/Office)
                    </label>
                    <input
                        type="text"
                        name="startLocation"
                        value={formData.startLocation}
                        onChange={handleChange}
                        placeholder="e.g. Gangnam Station, Seoul"
                        className="w-full p-3 glass-input rounded-lg text-white placeholder-slate-500"
                        required
                    />
                </div>

                {/* Preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition">
                        <input
                            type="checkbox"
                            name="hasBreakfast"
                            checked={formData.hasBreakfast}
                            onChange={handleChange}
                            className="w-5 h-5 accent-emerald-500 rounded focus:ring-emerald-500"
                        />
                        <span className="text-gray-200 text-sm">Recommend Breakfast (Pre-round)</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition">
                        <input
                            type="checkbox"
                            name="hasDinner"
                            checked={formData.hasDinner}
                            onChange={handleChange}
                            className="w-5 h-5 accent-emerald-500 rounded focus:ring-emerald-500"
                        />
                        <span className="text-gray-200 text-sm">Recommend Dinner (Post-round)</span>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Calculating Plan...' : 'Generate Rounding Plan'}
                </button>
            </form>
        </Card>
    );
}
