
import React, { useState } from 'react';
import type { ManualBookingFields } from '../lib/bookingParser';

export interface AnalyzeRequest {
  message: string;
  startLocation: string;
  prepTime: number;
  manual?: ManualBookingFields;
}

interface Props {
  onAnalyze: (request: AnalyzeRequest) => void;
  loading: boolean;
}

const BookingForm: React.FC<Props> = ({ onAnalyze, loading }) => {
  const [message, setMessage] = useState('');
  const [prepTime, setPrepTime] = useState(20);
  const [showManual, setShowManual] = useState(false);
  const [golfCourse, setGolfCourse] = useState('');
  const [date, setDate] = useState('');
  const [teeOffTime, setTeeOffTime] = useState('');

  const [startLocation, setStartLocation] = useState(() => {
    const saved = localStorage.getItem('defaultStartLocation');
    return saved || '';
  });

  const handleStartLocationChange = (value: string) => {
    setStartLocation(value);
  };

  const handleStartLocationBlur = () => {
    if (startLocation.trim() && startLocation.length >= 2) {
      const currentDefault = localStorage.getItem('defaultStartLocation');

      if (currentDefault !== startLocation.trim()) {
        const shouldSave = window.confirm(
          `"${startLocation.trim()}"을(를) 기본 출발지로 설정하시겠습니까?\n\n다음번부터 자동으로 입력됩니다.`
        );

        if (shouldSave) {
          localStorage.setItem('defaultStartLocation', startLocation.trim());
          const btn = document.querySelector('[data-location-saved]');
          if (btn) {
            btn.classList.add('ring-2', 'ring-emerald-400');
            setTimeout(() => btn.classList.remove('ring-2', 'ring-emerald-400'), 1000);
          }
        }
      }
    }
  };

  const canSubmit = Boolean(
    message.trim() || (golfCourse.trim() && date.trim() && teeOffTime.trim())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAnalyze({
      message,
      startLocation,
      prepTime,
      manual: {
        golfCourse: golfCourse.trim() || undefined,
        date: date.trim() || undefined,
        teeOffTime: teeOffTime.trim() || undefined,
      },
    });
  };

  return (
    <div id="booking" className="luxury-glass rounded-3xl p-8 border luxury-border shadow-2xl transition-all hover:shadow-emerald-900/10">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center">
        <i className="fa-solid fa-calendar-check mr-3 text-emerald-400"></i>
        프리미엄 라운딩 분석
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">예약 확정 메시지</label>
          <textarea
            className="w-full p-4 border-0 rounded-2xl bg-white focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all h-32 font-medium"
            placeholder="메시지를 입력하세요 (예: [엘리시안강촌CC] 08:08...)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center justify-between">
              <span>출발지 주소</span>
              {localStorage.getItem('defaultStartLocation') && (
                <span className="text-[10px] text-emerald-400 flex items-center">
                  <i className="fa-solid fa-star mr-1 text-[8px]"></i>기본값 적용됨
                </span>
              )}
            </label>
            <input
              type="text"
              className="w-full p-4 border-0 rounded-2xl bg-white focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all font-medium"
              placeholder="예: 서울 서초구..."
              value={startLocation}
              onChange={(e) => handleStartLocationChange(e.target.value)}
              onBlur={handleStartLocationBlur}
              data-location-saved
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
              집에서 출발 준비 시간 <span>{prepTime}분</span>
            </label>
            <div className="flex items-center space-x-4 h-[56px] px-4 bg-slate-800/50 rounded-2xl border border-white/5">
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                className="w-full accent-emerald-500"
                value={prepTime}
                onChange={(e) => setPrepTime(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManual((prev) => !prev)}
          className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <i className={`fa-solid ${showManual ? 'fa-chevron-up' : 'fa-pen'} mr-2`}></i>
          {showManual ? '직접 입력 닫기' : 'AI 없이 직접 입력'}
        </button>

        {showManual && (
          <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/5">
            <p className="text-xs text-slate-500">예약 문구 분석이 안 되면 아래 항목만으로도 출발 계획을 만들 수 있습니다.</p>
            <input
              type="text"
              className="w-full p-3 border-0 rounded-xl bg-white outline-none font-medium"
              placeholder="골프장 (예: 엘리시안강촌CC)"
              value={golfCourse}
              onChange={(e) => setGolfCourse(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="w-full p-3 border-0 rounded-xl bg-white outline-none font-medium"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="w-full p-3 border-0 rounded-xl bg-white outline-none font-medium"
                value={teeOffTime}
                onChange={(e) => setTeeOffTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={`w-full py-5 rounded-2xl font-bold text-lg tracking-wider transition-all flex items-center justify-center space-x-2 ${loading || !canSubmit ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-xl hover:shadow-emerald-600/20'
            }`}
        >
          {loading ? (
            <><i className="fa-solid fa-circle-notch animate-spin mr-3"></i> 최적 경로 탐색 중...</>
          ) : (
            <><i className="fa-solid fa-compass mr-3"></i> 라운딩 저장하기</>
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
