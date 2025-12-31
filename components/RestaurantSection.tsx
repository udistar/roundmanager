
import React from 'react';
import { Restaurant } from '../types';

interface Props {
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
  selectedRestaurant: Restaurant | null;
}

const RestaurantSection: React.FC<Props> = ({ restaurants, onSelectRestaurant, selectedRestaurant }) => {
  // TOP 3 + 그 외 5개
  const beforeAll = restaurants.filter(r => r.type === 'before');
  const before = beforeAll.slice(0, 3);
  const beforeOthers = beforeAll.slice(3, 8); // 그 외 5개
  const after = restaurants.filter(r => r.type === 'after');

  const renderCard = (r: Restaurant) => (
    <div
      key={r.name}
      onClick={() => onSelectRestaurant(r)}
      className={`relative bg-white/5 rounded-3xl p-6 border transition-all cursor-pointer group flex flex-col ${selectedRestaurant?.name === r.name ? 'border-emerald-500 shadow-emerald-500/20 shadow-2xl ring-2 ring-emerald-500/20' : 'border-white/5 hover:border-white/20'
        }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{r.name}</h3>
            {r.verified && (
              <div className="bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 rounded-full flex items-center">
                <i className="fa-solid fa-check-circle text-emerald-400 text-[8px] mr-1"></i>
                <span className="text-[8px] text-emerald-400 font-black uppercase tracking-wider">거리 확인됨</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1 block">{r.category}</span>
        </div>
        <div className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-xl flex items-center">
          <i className="fa-solid fa-star text-[10px] mr-1"></i>
          <span className="text-sm font-black">{r.rating}</span>
        </div>
      </div>

      {/* Travel info to Golf Course */}
      {(r.distanceToGolfCourse || r.travelTimeToGolfCourse) && (
        <div className="mb-4 flex space-x-2">
          <div className="bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-lg flex items-center text-[10px] text-sky-400 font-bold">
            <i className="fa-solid fa-location-arrow mr-2"></i>
            골프장까지 {r.distanceToGolfCourse}
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg flex items-center text-[10px] text-emerald-400 font-bold">
            <i className="fa-solid fa-car mr-2"></i>
            {r.travelTimeToGolfCourse} 소요
          </div>
        </div>
      )}

      {r.reason && <p className="text-sm text-slate-400 mb-6 leading-relaxed italic line-clamp-2">"{r.reason}"</p>}

      {r.mainMenus && r.mainMenus.length > 0 && (
        <div className="space-y-3 mb-6 bg-black/20 p-4 rounded-2xl flex-grow">
          {r.mainMenus.map((m, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-300 font-medium">{m.name}</span>
              <span className="text-emerald-500 font-bold">{m.price}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-white/5 flex flex-col space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span className="flex items-center"><i className="fa-regular fa-clock mr-2"></i> 오픈 {r.openTime}</span>
          {r.phoneNumber && <span className="flex items-center"><i className="fa-solid fa-phone mr-2"></i> {r.phoneNumber}</span>}
        </div>

        <div className="flex items-center justify-between">
          {r.placeUrl ? (
            <a
              href={r.placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 transition-colors flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <i className="fa-solid fa-map-location-dot mr-2 text-emerald-500"></i>
              지도에서 확인
            </a>
          ) : <div />}
          {selectedRestaurant?.name === r.name && <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">선택됨</span>}
        </div>
      </div>

      {selectedRestaurant?.name === r.name && (
        <div className="absolute top-3 right-3 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
          <i className="fa-solid fa-check text-[8px]"></i>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-10 w-1 bg-amber-500"></div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            라운딩 전 조식 추천 (TOP 3) <span className="text-slate-500 text-lg font-light ml-2">Morning Concierge</span>
          </h2>
        </div>
        <div className="flex flex-col gap-6">
          {before.map(renderCard)}
        </div>

        {/* 그 외 옵션 */}
        {beforeOthers.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-400 mb-4 flex items-center">
              <i className="fa-solid fa-list mr-2"></i>
              그 외
            </h3>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="space-y-3">
                {beforeOthers.map((r, index) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-3 rounded-lg transition-colors cursor-pointer"
                    onClick={() => onSelectRestaurant(r)}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-slate-500 font-bold text-sm">{index + 4}.</span>
                      <div>
                        <span className="text-white font-bold">{r.name}</span>
                        <span className="text-slate-400 text-sm ml-3">{r.category}</span>
                      </div>
                    </div>
                    {r.distanceToGolfCourse && (
                      <span className="text-xs text-slate-500">골프장까지 {r.distanceToGolfCourse}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-10 w-1 bg-emerald-500"></div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            라운딩 후 식사 추천 <span className="text-slate-500 text-lg font-light ml-2">After Rounding</span>
          </h2>
        </div>
        <div className="flex flex-col gap-6">
          {after.map(renderCard)}
        </div>
      </div>
    </div>
  );
};

export default RestaurantSection;
