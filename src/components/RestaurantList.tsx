import { useState, useEffect } from 'react';
import { Restaurant } from '@/types';
import { Card } from '@/components/ui/Card';
import { Star, Clock, MapPin, Utensils, Loader2 } from 'lucide-react';
import { getRecommendations } from '../lib/services/restaurantService';

interface RestaurantListProps {
    title: string;
    locationName: string;
    type: 'PRE_ROUND' | 'POST_ROUND';
}

export default function RestaurantList({ title, locationName, type }: RestaurantListProps) {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRealData = async () => {
            if (!locationName) return;
            setLoading(true);
            try {
                const data = await getRecommendations(locationName, '', type);
                setRestaurants(data);
            } catch (error) {
                console.error("Failed to load restaurants:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRealData();
    }, [locationName, type]);

    if (loading) {
        return (
            <Card title={title}>
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-400" />
                    <p className="text-sm">Finding best restaurants...</p>
                </div>
            </Card>
        );
    }

    if (restaurants.length === 0) return null;

    return (
        <Card title={title}>
            <div className="space-y-4">
                {restaurants.map(rest => (
                    <div key={rest.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white text-lg flex items-center">
                                {rest.name}
                                <span className="ml-2 px-2 py-0.5 text-xs bg-slate-700 rounded-full text-slate-300 font-normal">
                                    {rest.type}
                                </span>
                            </h4>
                            <div className="flex items-center text-yellow-400 font-bold text-sm">
                                <Star className="w-4 h-4 fill-yellow-400 mr-1" />
                                {rest.rating.toFixed(1)}
                            </div>
                        </div>

                        <div className="flex space-x-4 text-xs text-slate-400 mb-3">
                            <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Opens {rest.openTime}
                            </div>
                            <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {rest.distanceFromCourse}km
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs text-emerald-400 font-semibold mb-1 flex items-center">
                                <Utensils className="w-3 h-3 mr-1" /> Representative Menu
                            </p>
                            {rest.menu.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm text-slate-300">
                                    <span>{item.name}</span>
                                    <span className="text-slate-500">{item.price.toLocaleString()} W</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3">
                            <p className="text-[10px] text-slate-500 truncate">{rest.address}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
