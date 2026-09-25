import React, { useState } from 'react';

// Windy 공식 임베드 위젯 (https://embed.windy.com) — 키 불필요.
// 약관: 위젯의 Windy 로고는 보이고 클릭 가능해야 하며(위젯 자체에 포함), 날씨 앱/상업 사이트 용도는 불가.
// 공식 임베드 파라미터에는 날짜/시각 지정이 없으므로, 지점 예보(detail)로 티업 날짜까지의 예보를 함께 보여준다.
type Overlay = 'wind' | 'rain' | 'clouds';

const OVERLAYS: { id: Overlay; label: string; icon: string }[] = [
  { id: 'wind', label: '바람', icon: 'fa-wind' },
  { id: 'rain', label: '비·뇌우', icon: 'fa-cloud-rain' },
  { id: 'clouds', label: '구름', icon: 'fa-cloud' },
];

export function windyEmbedUrl(lat: number, lng: number, overlay: Overlay = 'wind'): string {
  const la = +lat.toFixed(3);
  const lo = +lng.toFixed(3);
  const params = [
    'type=map',
    'location=coordinates',
    'metricRain=mm',
    `metricTemp=${encodeURIComponent('°C')}`,
    `metricWind=${encodeURIComponent('m/s')}`,
    'zoom=9',
    `overlay=${overlay}`,
    'product=ecmwf',
    'level=surface',
    `lat=${la}`,
    `lon=${lo}`,
    `detailLat=${la}`,
    `detailLon=${lo}`,
    'detail=true',
  ];
  return `https://embed.windy.com/embed.html?${params.join('&')}`;
}

interface Props {
  lat?: number;
  lng?: number;
  golfCourse?: string;
  date?: string;
  teeOffTime?: string;
}

const WindyMap: React.FC<Props> = ({ lat, lng, golfCourse, date, teeOffTime }) => {
  const [overlay, setOverlay] = useState<Overlay>('wind');
  if (!lat || !lng) return null; // 좌표가 없으면 표시하지 않음

  return (
    <div className="luxury-glass rounded-[28px] p-4 md:p-6 border luxury-border shadow-2xl space-y-3" id="windy">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <i className="fa-solid fa-wind text-sky-400 text-xl"></i>
          <h2 className="text-lg font-black text-white tracking-tight">바람 지도</h2>
          <span className="text-[10px] text-slate-400">{golfCourse} · 티업 {date} {teeOffTime}</span>
        </div>
        <div className="flex gap-1">
          {OVERLAYS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOverlay(o.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${overlay === o.id ? 'bg-sky-500/20 border-sky-400 text-sky-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
            >
              <i className={`fa-solid ${o.icon} mr-1`}></i>{o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
        <iframe
          key={overlay}
          title="Windy 바람 지도"
          src={windyEmbedUrl(lat, lng, overlay)}
          className="w-full h-full"
          loading="lazy"
          frameBorder={0}
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="text-[10px] text-slate-500">
        지도 하단 타임라인에서 티업 시각으로 이동해 보세요. 아래 지점 예보에 티업 날짜까지 표시됩니다. 지도 제공:{' '}
        <a href="https://www.windy.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">Windy.com</a>
      </p>
    </div>
  );
};

export default WindyMap;
