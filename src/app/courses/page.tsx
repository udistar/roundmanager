'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Plus, Trash2, ExternalLink, Key, Check } from 'lucide-react';
import Link from 'next/link';

interface CourseCredential {
    id: string;
    name: string;
    url: string;
    username: string;
    isLoggedIn: boolean;
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<CourseCredential[]>([
        { id: '1', name: 'Sky72 Golf Club', url: 'https://www.sky72.com', username: 'golfer123', isLoggedIn: false },
        { id: '2', name: 'Nam Seoul CC', url: 'https://nscc.co.kr', username: 'pro_korea', isLoggedIn: false },
    ]);

    const [isAdding, setIsAdding] = useState(false);
    const [newCourse, setNewCourse] = useState({ name: '', url: '', username: '' });

    const handleLogin = (id: string) => {
        // Simulate auto-login process
        setCourses(prev => prev.map(c =>
            c.id === id ? { ...c, isLoggedIn: true } : c
        ));
        // In real app, this would trigger a puppet script or open a window with injected scripts
        // Here we just simulate success
        setTimeout(() => {
            alert("Auto-login simulation: Successfully logged into " + courses.find(c => c.id === id)?.name);
        }, 500);
    };

    const handleAdd = () => {
        setCourses(prev => [...prev, { ...newCourse, id: Date.now().toString(), isLoggedIn: false }]);
        setIsAdding(false);
        setNewCourse({ name: '', url: '', username: '' });
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Course Management</h1>
                <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">
                    &larr; Back to Dashboard
                </Link>
            </div>

            <Card title="My Favorite Courses">
                <div className="space-y-4">
                    {courses.map(course => (
                        <div key={course.id} className="flex flex-col md:flex-row justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex-1 mb-4 md:mb-0">
                                <h3 className="font-bold text-lg text-white">{course.name}</h3>
                                <p className="text-xs text-slate-500">{course.url}</p>
                                <div className="flex items-center text-xs text-slate-400 mt-1">
                                    <Key className="w-3 h-3 mr-1" /> ID: {course.username}
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleLogin(course.id)}
                                    disabled={course.isLoggedIn}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition ${course.isLoggedIn
                                        ? 'bg-emerald-900/50 text-emerald-500 cursor-default border border-emerald-900'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                                        }`}
                                >
                                    {course.isLoggedIn ? (
                                        <>
                                            <Check className="w-4 h-4 mr-1" /> Ready
                                        </>
                                    ) : (
                                        <>
                                            <ExternalLink className="w-4 h-4 mr-1" /> Auto-Login
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setCourses(prev => prev.filter(c => c.id !== course.id))}
                                    className="p-2 text-slate-500 hover:text-red-400 transition"
                                    aria-label="Delete course"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {isAdding ? (
                        <div className="mt-6 bg-slate-800/80 p-4 rounded-xl border border-slate-600 animate-fade-in">
                            <h4 className="font-bold text-white mb-4">Add New Course</h4>
                            <div className="space-y-3">
                                <input
                                    placeholder="Course Name"
                                    className="w-full glass-input p-2 rounded"
                                    value={newCourse.name}
                                    onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                                />
                                <input
                                    placeholder="Booking URL"
                                    className="w-full glass-input p-2 rounded"
                                    value={newCourse.url}
                                    onChange={e => setNewCourse({ ...newCourse, url: e.target.value })}
                                />
                                <input
                                    placeholder="Username / ID"
                                    className="w-full glass-input p-2 rounded"
                                    value={newCourse.username}
                                    onChange={e => setNewCourse({ ...newCourse, username: e.target.value })}
                                />
                                <div className="flex space-x-2 pt-2">
                                    <button onClick={handleAdd} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-500">Save</button>
                                    <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-700 text-white py-2 rounded hover:bg-slate-600">Cancel</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-4 mt-4 border-2 border-dashed border-slate-700 text-slate-400 rounded-xl hover:border-emerald-500 hover:text-emerald-500 transition flex justify-center items-center"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Add Course
                        </button>
                    )}
                </div>
            </Card>

            <div className="mt-8 text-center text-xs text-slate-500">
                <p>Security Note: Credentials are stored locally in your browser session for this prototype.</p>
            </div>
        </main>
    );
}
