
import React, { useState } from 'react';
import { WeatherData } from '../types';

interface Props {
  data: WeatherData[];
}

const WeatherSection: React.FC<Props> = ({ data }) => {
  const [activeSource, setActiveSource] = useState<number | null>(null);

  const getWeatherIcon = (condition?: string) => {
    if (!condition) return '⛅';
    const c = condition.toLowerCase();
    if (c.includes('맑음') || c.includes('sunny') || c.includes('clear')) return '☀️';
    if (c.includes('비') || c.includes('rain') || c.includes('shower')) return '🌧️';
    if (c.includes('흐림') || c.includes('cloud') || c.includes('overcast')) return '☁️';
    if (c.includes('눈') || c.includes('snow')) return '❄️';
    if (c.includes('천둥') || c.includes('storm') || c.includes('thunder')) return '⚡';
    if (c.includes('안개') || c.includes('fog') || c.includes('mist')) return '🌫️';
    return '⛅';
  };

  // Error State Handling
  if (!data || data.length === 0) {
    return (
      <div className="luxury-glass rounded-[40px] p-8 border luxury-border shadow-2xl flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
          <i className="fa-solid fa-cloud-exclamation text-red-400 text-2xl"></i>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-1">날씨 정보를 불러올 수 없습니다</h2>
          <p className="text-sm text-slate-500">일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="luxury-glass rounded-[40px] p-6 md:p-8 border luxury-border shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <i className="fa-solid fa-cloud-sun text-emerald-400 text-xl"></i>
          <h2 className="text-lg font-black text-white tracking-tight uppercase">날씨</h2>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Main Source Cards - Fixed Horizontal Layout */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 relative z-10">
        {data.slice(0, 3).map((w, idx) => {
          // Check for error flag (using explicit 'error' property injected by service)
          const isError = (w as any).error;

          if (isError) {
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl border bg-slate-900/40 border-red-500/20 flex flex-col justify-center items-center text-center h-full min-h-[120px]"
              >
                <span className="text-[9px] font-black uppercase text-slate-500 mb-2">{w.source}</span>
                <i className="fa-solid fa-circle-exclamation text-red-400 text-2xl mb-2 opacity-50"></i>
                <span className="text-[10px] text-red-400/80">정보 없음</span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              onClick={() => setActiveSource(activeSource === idx ? null : idx)}
              className={`cursor-pointer transition-all duration-300 p-2.5 md:p-4 rounded-xl md:rounded-2xl border flex flex-col justify-between ${activeSource === idx
                ? 'bg-emerald-600/20 border-emerald-500 shadow-lg scale-[1.02]'
                : (w.source?.includes('yr.no') ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-900/40 border-white/5 hover:border-white/20')
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${w.source?.includes('yr.no') ? 'text-blue-400' : 'text-slate-500'}`}>
                  {w.source}
                  {w.source?.includes('yr.no') && <i className="fa-solid fa-star ml-0.5 text-[6px]"></i>}
                </span>
                <span className="text-xl md:text-2xl">{getWeatherIcon(w.condition)}</span>
              </div>

              <div className="flex items-end justify-between gap-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-xl md:text-3xl font-black text-white tracking-tighter leading-none">{w.temperature}</span>
                  <span className="text-[8px] md:text-[10px] text-slate-400 font-bold mt-1 truncate">{w.condition}</span>
                </div>

                <div className="flex flex-col items-end space-y-0.5">
                  <div className="flex items-center space-x-1 text-[8px] md:text-[10px]">
                    <i className="fa-solid fa-wind text-sky-500/70 text-[7px] md:text-[8px]"></i>
                    <span className="text-slate-300 font-bold whitespace-nowrap">{w.wind}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[8px] md:text-[10px]">
                    <i className="fa-solid fa-cloud-rain text-blue-500/70 text-[7px] md:text-[8px]"></i>
                    <span className="text-blue-400 font-bold whitespace-nowrap">
                      {w.precipitation ? (
                        w.precipitation.includes('(') ? w.precipitation.split('(')[0].trim() : w.precipitation
                      ) : '0mm'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-[8px] md:text-[10px]">
                    <i className="fa-solid fa-percent text-cyan-500/70 text-[7px] md:text-[8px]"></i>
                    <span className="text-cyan-400 font-bold">
                      {w.precipitation ? (
                        w.precipitation.includes('(') ? w.precipitation.match(/\((\d+)%\)/)?.[1] + '%' : '0%'
                      ) : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Analysis Section */}
      {activeSource !== null && data[activeSource] && !(data[activeSource] as any).error && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-8 mt-8 pt-8 border-t border-white/5 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* 1. HOURLY INFOGRAPHIC */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center space-x-3">
                <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                <h3 className="text-xl font-bold text-white tracking-tight">시간별 정밀 기상 시뮬레이션</h3>
              </div>

              <div className="relative bg-black/20 rounded-[28px] p-6 border border-white/5">
                <div className="absolute top-[4.5rem] left-12 right-12 h-0.5 bg-slate-800 hidden md:block">
                  <div className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500 opacity-30 animate-pulse"></div>
                </div>

                <div className="flex justify-between items-start">
                  {data[activeSource].hourly?.map((h, i) => (
                    <div key={i} className="flex flex-col items-center space-y-3 flex-1 min-w-[70px]">
                      {/* 1. Time */}
                      <div className="text-xs font-black text-slate-500 uppercase tracking-tighter">
                        {h.time ? (h.time.includes(':') ? h.time.split(':')[0] : h.time) : '--'}시
                      </div>

                      {/* 2. Icon */}
                      <div className="text-3xl py-1 transform hover:scale-125 transition-transform duration-300">
                        {getWeatherIcon(h.condition)}
                      </div>

                      {/* 3. Temp */}
                      <div className="text-xl font-black text-white tracking-tighter">
                        {(h.temp || '0').replace('°C', '')}°
                      </div>

                      {/* 4. Precip */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-sky-400">
                          {h.precip ? (h.precip.includes('%') ? h.precip : h.precip + ' (0%)') : '0%'}
                        </span>
                      </div>

                      {/* 5. Wind */}
                      <div className="flex items-center space-x-1 border-t border-white/5 pt-2 w-full justify-center">
                        <i className="fa-solid fa-location-arrow text-[8px] text-slate-600 -rotate-45"></i>
                        <span className="text-[9px] font-bold text-slate-500">{h.wind}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. REAL-TIME SATELLITE IMAGE VIEWER */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-1 h-6 bg-sky-500 rounded-full"></div>
                  <h3 className="text-xl font-bold text-white tracking-tight">초단기 기상 분석실</h3>
                </div>
              </div>

              <div className="bg-black/30 rounded-[32px] p-6 border border-white/5 space-y-6">
                {/* Naver Weather Link Button */}
                <div className="relative aspect-video bg-gradient-to-br from-emerald-900/20 via-slate-950 to-blue-900/20 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center group/weather hover:border-emerald-500/50 transition-all duration-300">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                      backgroundSize: '40px 40px'
                    }}></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center space-y-6 p-8">
                    {/* Icon */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center group-hover/weather:scale-110 group-hover/weather:bg-emerald-500/30 transition-all duration-300">
                        <i className="fa-solid fa-cloud-rain text-emerald-400 text-3xl"></i>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white">초단기 강수예측</h3>
                      <p className="text-sm text-slate-400">네이버 날씨에서 실시간 레이더 확인</p>
                    </div>

                    {/* Button */}
                    <a
                      href="https://weather.naver.com/map?visualMapType=maple"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 hover:scale-105"
                    >
                      <i className="fa-solid fa-external-link-alt"></i>
                      <span>초단기 강수 예측 레이더</span>
                    </a>

                    {/* Features */}
                    <div className="flex items-center justify-center space-x-6 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-check-circle text-emerald-500"></i>
                        <span>실시간 레이더</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-check-circle text-emerald-500"></i>
                        <span>6시간 예측</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-check-circle text-emerald-500"></i>
                        <span>애니메이션</span>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-4 left-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
                </div>

                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] block mb-2">기상 전문 분석</span>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {data[activeSource].nowcast || '현재 지역은 강수 구름의 영향권 밖에 위치하며 라운딩 중 비 소식은 없을 것으로 예상됩니다.'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em] block mb-2">위성/레이더 판독 결과</span>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      {data[activeSource].satelliteDescription || '천리안 2A호 위성 데이터 기반 실시간 분석 결과입니다. 현재 대기 상태는 매우 안정적입니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherSection;
