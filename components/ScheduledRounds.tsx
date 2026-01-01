
import React, { useState, useEffect } from 'react';

import { RoundingInfo } from '../types';

// Mock data type for development
export interface RoundingPlan {
    id: string;
    golfCourse: string;
    date: string;
    time: string;
    members: number;
    location: string;
    startLocation?: string; // 출발지 정보 추가
    startCoords?: { lat: number; lng: number; address?: string }; // 출발지 좌표 추가
    fullInfo?: RoundingInfo;
}

const ScheduledRounds: React.FC<{
    rounds: RoundingPlan[],
    onDelete: (id: string) => void,
    onView: (round: RoundingPlan) => void,
    onUpdate?: (id: string, updates: Partial<RoundingPlan>) => void
}> = ({ rounds, onDelete, onView, onUpdate }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ date: string, time: string, startLocation: string }>({ date: '', time: '', startLocation: '' });

    if (rounds.length === 0) return null;

    const handleStartEdit = (round: RoundingPlan) => {
        setEditingId(round.id);
        setEditForm({
            date: round.date,
            time: round.time,
            startLocation: round.startLocation || '서울 시청'
        });
    };

    const handleSaveEdit = (id: string) => {
        if (onUpdate) {
            onUpdate(id, editForm);
        }
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ date: '', time: '', startLocation: '' });
    };

    return (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between border-l-4 border-amber-400 pl-4 py-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">예정된 라운드 <span className="text-amber-400 text-sm font-normal ml-2">{rounds.length}건</span></h2>
                <button className="text-slate-500 hover:text-white transition-colors" title="새로고침">
                    <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {rounds.map((round) => {
                    const isEditing = editingId === round.id;

                    return (
                        <div
                            key={round.id}
                            className="relative bg-slate-900/50 border border-slate-700 rounded-2xl p-6 hover:border-amber-400/80 hover:shadow-2xl hover:shadow-amber-400/20 transition-all duration-300 group overflow-hidden"
                        >
                            {/* Animated Background Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-400/10 transition-all duration-500"></div>

                            {/* Sparkle Effect on Hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute top-4 right-4 w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                                <div className="absolute top-8 right-12 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-75"></div>
                                <div className="absolute top-12 right-8 w-1 h-1 bg-blue-400 rounded-full animate-ping delay-150"></div>
                            </div>

                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-amber-400 mb-1">{round.golfCourse}</h3>
                                        <p className="text-slate-400 text-xs flex items-center">
                                            <i className="fa-solid fa-location-dot mr-1.5 text-slate-500"></i>
                                            {round.location}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                        HOT
                                    </span>
                                </div>

                                {isEditing ? (
                                    /* 수정 모드 */
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center space-x-2">
                                            <i className="fa-regular fa-calendar-check w-6 text-amber-400/80"></i>
                                            <input
                                                type="text"
                                                value={editForm.date}
                                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 !text-white placeholder:text-slate-400 text-sm focus:border-amber-400 outline-none"
                                                style={{ color: 'white' }}
                                                placeholder="예: 2025년 12월 30일"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <i className="fa-regular fa-clock w-6 text-amber-400/80"></i>
                                            <input
                                                type="text"
                                                value={editForm.time}
                                                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 !text-white placeholder:text-slate-400 text-sm font-mono focus:border-amber-400 outline-none"
                                                style={{ color: 'white' }}
                                                placeholder="예: 10:20"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <i className="fa-solid fa-house w-6 text-amber-400/80"></i>
                                            <input
                                                type="text"
                                                value={editForm.startLocation}
                                                onChange={(e) => setEditForm({ ...editForm, startLocation: e.target.value })}
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 !text-white placeholder:text-slate-400 text-sm focus:border-amber-400 outline-none"
                                                style={{ color: 'white' }}
                                                placeholder="출발지 (예: 미사역)"
                                            />
                                        </div>
                                        <div className="flex items-center text-slate-400 text-sm">
                                            <span className="w-6"></span>
                                            <span>{round.members}인 라운드</span>
                                        </div>
                                    </div>
                                ) : (
                                    /* 보기 모드 */
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center text-slate-200">
                                            <i className="fa-regular fa-calendar-check w-6 text-amber-400/80"></i>
                                            <span>{round.date}</span>
                                        </div>
                                        <div className="flex items-center text-slate-200">
                                            <i className="fa-regular fa-clock w-6 text-amber-400/80"></i>
                                            <span className="font-mono">{round.time}</span>
                                        </div>
                                        {round.startLocation && (
                                            <div className="flex items-center text-slate-400 text-sm">
                                                <i className="fa-solid fa-house w-6 text-slate-500"></i>
                                                <span>출발: {round.startLocation}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center text-slate-400 text-sm">
                                            <span className="w-6"></span>
                                            <span>{round.members}인 라운드</span>
                                        </div>
                                    </div>
                                )}

                                {isEditing ? (
                                    /* 수정 모드 버튼 */
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleSaveEdit(round.id)}
                                            className="py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center space-x-2 text-sm shadow-lg">
                                            <i className="fa-solid fa-check"></i>
                                            <span>저장</span>
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 text-sm">
                                            <i className="fa-solid fa-xmark"></i>
                                            <span>취소</span>
                                        </button>
                                    </div>
                                ) : (
                                    /* 보기 모드 버튼 */
                                    <div className="grid grid-cols-[1fr_1.5fr_auto_auto] gap-3 items-center">
                                        <button
                                            onClick={() => handleStartEdit(round)}
                                            className="py-2.5 px-4 rounded-xl border border-blue-400/30 text-blue-200 hover:bg-blue-400/10 hover:border-blue-400 transition-all flex items-center justify-center space-x-2 text-sm">
                                            <i className="fa-solid fa-pen"></i>
                                            <span>수정</span>
                                        </button>
                                        <button
                                            onClick={() => onView(round)}
                                            className="py-2.5 px-4 rounded-xl bg-amber-400 text-slate-900 font-bold hover:bg-amber-300 transition-all flex items-center justify-center shadow-lg shadow-amber-400/20 text-sm">
                                            시작
                                        </button>
                                        <button className="p-3 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-800 transition-colors" title="공유">
                                            <i className="fa-solid fa-share-nodes"></i>
                                        </button>
                                        <button
                                            onClick={() => onDelete(round.id)}
                                            className="p-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors"
                                            title="삭제">
                                            <i className="fa-regular fa-trash-can"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScheduledRounds;
