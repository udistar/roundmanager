
import React, { useState } from 'react';

interface Props {
  onAnalyze: (message: string, startLocation: string, prepTime: number) => void;
  loading: boolean;
}

const BookingForm: React.FC<Props> = ({ onAnalyze, loading }) => {
  const [message, setMessage] = useState('');
  const [prepTime, setPrepTime] = useState(20);

  // Load default start location from localStorage
  const [startLocation, setStartLocation] = useState(() => {
    const saved = localStorage.getItem('defaultStartLocation');
    return saved || '';
  });

  const handleStartLocationChange = (value: string) => {
    setStartLocation(value);
  };

  const handleStartLocationBlur = () => {
    // When user finishes typing, ask if they want to set as default
    if (startLocation.trim() && startLocation.length >= 2) {
      const currentDefault = localStorage.getItem('defaultStartLocation');

      // Only ask if it's different from current default
      if (currentDefault !== startLocation.trim()) {
        const shouldSave = window.confirm(
          `"${startLocation.trim()}"을(를) 기본 출발지로 설정하시겠습니까?\n\n다음번부터 자동으로 입력됩니다.`
        );

        if (shouldSave) {
          localStorage.setItem('defaultStartLocation', startLocation.trim());
          // Show brief success feedback
          const btn = document.querySelector('[data-location-saved]');
          if (btn) {
            btn.classList.add('ring-2', 'ring-emerald-400');
            setTimeout(() => btn.classList.remove('ring-2', 'ring-emerald-400'), 1000);
          }
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onAnalyze(message, startLocation, prepTime);
    }
  };

  return (
    <div className="luxury-glass rounded-3xl p-8 border luxury-border shadow-2xl transition-all hover:shadow-emerald-900/10">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center">
        <i className="fa-solid fa-calendar-check mr-3 text-emerald-400"></i>
        프리미엄 라운딩 분석
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">예약 확정 메시지</label>
          <textarea
            className="w-full p-4 border-0 rounded-2xl bg-white focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all h-32 font-medium"
            placeholder="메시지를 입력하세요 (예: [가평베네스트] 07:30...)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
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
          type="submit"
          disabled={loading}
          className={`w-full py-5 rounded-2xl font-bold text-lg tracking-wider transition-all flex items-center justify-center space-x-2 ${loading ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-xl hover:shadow-emerald-600/20'
            }`}
        >
          {loading ? (
            <><i className="fa-solid fa-circle-notch animate-spin mr-3"></i> 최적 경로 탐색 중...</>
          ) : (
            <><i className="fa-solid fa-compass mr-3"></i> 컨시어지 서비스 시작</>
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
