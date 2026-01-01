
import React from 'react';
import { Restaurant, RoundingInfo } from '../types';

interface Props {
  roundingInfo: RoundingInfo;
  teeOffTime: string;
  totalDirectTravelTime: number;
  selectedRestaurantData: Restaurant | null;
  prepTime: number;
}

const ScheduleSection: React.FC<Props> = ({ roundingInfo, teeOffTime, totalDirectTravelTime, selectedRestaurantData, prepTime }) => {
  const arrivalBuffer = 40;
  const mealDuration = 30;

  const parseMinutes = (str?: string) => {
    if (!str) return 0;
    let total = 0;
    const hoursMatch = str.match(/(\d+)\s*시간/);
    const minsMatch = str.match(/(\d+)\s*분/);

    if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) total += parseInt(minsMatch[1]);

    if (total === 0) {
      const simpleMatch = str.match(/\d+/);
      return simpleMatch ? parseInt(simpleMatch[0]) : 0;
    }
    return total;
  };

  const hasMeal = !!selectedRestaurantData && selectedRestaurantData.type === 'before';

  const leg1Time = hasMeal ? parseMinutes(selectedRestaurantData.travelTimeFromHome) : totalDirectTravelTime;
  const leg2Time = hasMeal ? parseMinutes(selectedRestaurantData.travelTimeToGolfCourse) : 0;

  const totalOffset = prepTime + leg1Time + (hasMeal ? mealDuration : 0) + leg2Time + arrivalBuffer;

  const calculateTime = (minutesOffset: number) => {
    if (isNaN(minutesOffset)) return '--:--';

    // Robustly parse HH:mm or H시 M분
    const timeMatch = teeOffTime.match(/(\d+)\D+(\d+)/);
    let h, m;

    if (timeMatch) {
      h = parseInt(timeMatch[1]);
      m = parseInt(timeMatch[2]);
    } else {
      // Fallback: try split if direct match fails
      const parts = teeOffTime.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        h = parts[0];
        m = parts[1];
      } else {
        return '00:00'; // Final fallback
      }
    }

    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() - minutesOffset);
    return date.toTimeString().slice(0, 5);
  };

  const departureTime = calculateTime(totalOffset);
  const restaurantArrivalTime = calculateTime(totalOffset - prepTime - leg1Time);
  const restaurantDepartureTime = calculateTime(totalOffset - prepTime - leg1Time - mealDuration);
  const golfCourseArrivalTime = calculateTime(arrivalBuffer);

  // Google Calendar URL 생성 로직
  const addToCalendar = () => {
    // 날짜 파싱 로직 강화
    // 1. "2025. 12. 27. (토)" -> "2025. 12. 27" -> [2025, 12, 27]
    // 2. "2024-05-20" -> [2024, 5, 20]
    const dateStr = roundingInfo.date;
    const dateParts = dateStr.match(/\d+/g);

    let year, month, day;

    if (dateParts && dateParts.length >= 3) {
      year = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
    } else {
      // Fallback
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      day = now.getDate();
    }

    const [depH, depM] = departureTime.split(':').map(Number);
    const [teeH, teeM] = teeOffTime.split(':').map(Number);

    // Date 생성 시 month는 0-indexed
    const startDate = new Date(year, month - 1, day, depH, depM);
    const endDate = new Date(year, month - 1, day, teeH + 5, teeM); // 라운딩 5시간 예상


    // YYYYMMDDTHHMMSS 형식 변환 (로컬 시간 기준)
    const formatGCalDate = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    const title = `[라운딩] ${roundingInfo.golfCourse}`;
    const location = hasMeal ? `${selectedRestaurantData?.name} 경유 -> ${roundingInfo.golfCourse}` : roundingInfo.golfCourse;
    const details = `집 출발: ${departureTime}\n${hasMeal ? `식사(${selectedRestaurantData?.name}): ${restaurantArrivalTime}\n` : ''}티업 시간: ${teeOffTime}\n라운딩 매니저 생성 일정`;

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGCalDate(startDate)}/${formatGCalDate(endDate)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="luxury-glass rounded-[28px] p-4 md:p-6 border luxury-border shadow-2xl space-y-4 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-600/10 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black flex items-center tracking-tight">
            <i className="fa-solid fa-route mr-3 text-emerald-400"></i>
            스마트 컨시어지 경로
          </h2>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest">
            Live Optimized Path
          </div>
        </div>

        <div className="mb-0 px-2">
          {/* Horizontal Timeline Container */}
          <div className="relative flex items-center justify-between py-12 px-4 md:px-12">

            {/* Connecting Line (Absolute) */}
            <div className="absolute top-1/2 left-12 right-12 h-0.5 -translate-y-1/2 bg-slate-800 -z-0">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500 opacity-30 animate-pulse-slow"></div>
            </div>

            {/* STEP 1: HOME START */}
            <div className="relative z-10 flex flex-col items-center group cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-all duration-300">
                <i className="fa-solid fa-house text-xl"></i>
              </div>
              <div className="absolute -bottom-14 flex flex-col items-center min-w-[120px]">
                <span className="text-xl md:text-2xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                  {totalDirectTravelTime > 0 ? departureTime : '--:--'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/10 mt-1">
                  집 출발
                </span>
              </div>
              {/* Distance Tooltip */}
              <div className="absolute -top-10 bg-slate-800 text-[10px] font-bold text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                이동거리 {hasMeal ? selectedRestaurantData?.distanceFromHome : '약 --km'}
              </div>
            </div>

            {/* STEP 2: RESTAURANT (Conditional) */}
            {hasMeal && (
              <div className="relative z-10 flex flex-col items-center group cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] group-hover:scale-110 transition-all duration-300">
                  <i className="fa-solid fa-utensils text-xl"></i>
                </div>
                <div className="absolute -bottom-14 flex flex-col items-center min-w-[120px]">
                  <span className="text-xl md:text-2xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                    {restaurantArrivalTime}
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-500/20 mt-1">
                    식당 도착
                  </span>
                </div>
                {/* Meal Duration Tooltip */}
                <div className="absolute -top-10 bg-slate-800 text-[10px] font-bold text-amber-400 px-2 py-1 rounded-lg border border-amber-500/30 whitespace-nowrap opacity-100">
                  +30분 식사
                </div>
              </div>
            )}

            {/* STEP 3: GOLF COURSE */}
            <div className="relative z-10 flex flex-col items-center group cursor-default">
              <div className="w-14 h-14 rounded-full bg-emerald-600 border-4 border-slate-900 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                <i className="fa-solid fa-flag text-xl"></i>
              </div>
              <div className="absolute -bottom-14 flex flex-col items-center min-w-[120px]">
                <span className="text-xl md:text-2xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                  {golfCourseArrivalTime}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-1">
                  골프장 도착
                </span>
              </div>

              {/* Tee-off Info */}
              <div className="absolute -top-12 flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold mb-0.5">티업 {arrivalBuffer}분 전</span>
                <div className="bg-emerald-500 text-white text-xs font-black px-2 py-0.5 rounded shadow-lg">
                  {teeOffTime} 티업
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col space-y-6">
            <div>
              <p className="text-emerald-400 font-black mb-1 uppercase text-[7px] tracking-[0.3em]">Recommended Schedule Analysis</p>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl md:text-2xl font-black tracking-tighter">
                  {totalDirectTravelTime > 0 ? `정각 ${departureTime} 출발` : '경로 분석 중...'}
                </h3>

                {/* Google Calendar Button */}
                <button
                  onClick={addToCalendar}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-[10px] shadow-xl shadow-emerald-900/30 transition-all active:scale-95 group/cal"
                >
                  <i className="fa-brands fa-google text-base group-hover/cal:rotate-12 transition-transform"></i>
                  <span>구글 캘린더 등록</span>
                </button>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-[24px] border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                  </div>
                  <p className="text-xs text-slate-300 font-bold">
                    티업 {arrivalBuffer}분 전 클럽하우스 도착
                    {hasMeal && selectedRestaurantData?.distanceToGolfCourse &&
                      ` (식당→골프장 ${selectedRestaurantData.distanceToGolfCourse})`}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <i className="fa-solid fa-car text-xs"></i>
                  </div>
                  <p className="text-xs text-slate-300 font-bold">
                    총 리드타임 {totalOffset}분 적용됨
                    {hasMeal && selectedRestaurantData?.distanceFromHome &&
                      ` (집→식당 ${selectedRestaurantData.distanceFromHome})`}
                    {!hasMeal && totalDirectTravelTime > 0 &&
                      ` (약 ${Math.round(totalDirectTravelTime * 0.8)}km)`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center items-end border-l border-white/10 pl-6">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">여유 시간 확보 완료</span>
                <span className="text-2xl font-black text-emerald-500 tracking-tighter">SUCCESS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSection;
