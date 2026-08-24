
import React, { useState } from 'react';
import Header from './components/Header';
import BookingForm, { AnalyzeRequest } from './components/BookingForm';
import WeatherSection from './components/WeatherSection';
import RestaurantSection from './components/RestaurantSection';
import ScheduleSection from './components/ScheduleSection';
import MapSection from './components/MapSection';
import FavoriteSites from './components/FavoriteSites';
import { parseBookingMessage, fetchWeather, fetchRestaurants, fetchCourseVideos, searchGolfCourseLocation } from './services/geminiService';
import { getGeocode, getRoute, searchLocation } from './services/naverService';
import { RoundingInfo, WeatherData, Restaurant, GeoLocation } from './types';
import { getGolfCourseAssets } from './constants/golfCourseAssets';
import ScheduledRounds, { RoundingPlan } from './components/ScheduledRounds';
import { BookingParseError, reconstructRoundingInfo } from './lib/bookingParser';
import { findKnownCourse, findKnownLandmark, SEOUL_CITY_HALL } from './lib/knownCourses';
import { calculateDistanceKm, estimateTravelMinutes } from './lib/travelEstimate';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateDistanceKm(lat1, lon1, lat2, lon2);
}

function scrollToId(id: string) {
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

async function resolveStartCoords(location: string, saved?: GeoLocation | null): Promise<GeoLocation> {
  if (saved?.lat && saved?.lng) {
    return { lat: saved.lat, lng: saved.lng, address: saved.address || location };
  }

  try {
    const geo = await getGeocode(location);
    if (geo) return geo;
  } catch (error) {
    console.warn('[resolveStartCoords] geocode failed', error);
  }

  try {
    const search = await searchLocation(location);
    if (search) return search;
  } catch (error) {
    console.warn('[resolveStartCoords] search failed', error);
  }

  const landmark = findKnownLandmark(location);
  if (landmark) return landmark;
  return { ...SEOUL_CITY_HALL };
}

function ensureCourseCoords(info: RoundingInfo): RoundingInfo {
  if (info.lat && info.lng) return info;
  const known = findKnownCourse(`${info.golfCourse} ${info.address || ''}`);
  if (!known) return info;
  return {
    ...info,
    lat: known.lat,
    lng: known.lng,
    address: info.address || known.address,
    phoneNumber: info.phoneNumber || known.phoneNumber,
    homepage: info.homepage || known.homepage,
  };
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [roundingInfo, setRoundingInfo] = useState<RoundingInfo | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [travelTime, setTravelTime] = useState<number | null>(null);
  const [prepTime, setPrepTime] = useState(20);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStartLocation, setCurrentStartLocation] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [startCoords, setStartCoords] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [scheduledRounds, setScheduledRounds] = useState<RoundingPlan[]>([]);
  const [roundsHydrated, setRoundsHydrated] = useState(false);
  const [extrasReady, setExtrasReady] = useState(false);

  // State for Breakfast Menu Selection
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [isMenuConfirmed, setIsMenuConfirmed] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const MENU_OPTIONS = ['곰탕', '국밥', '해장국', '설렁탕', '순대국', '갈비탕', '백반', '중식'];

  const toggleMenu = (menu: string) => {
    setSelectedMenus(prev =>
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const handleMenuConfirm = async () => {
    if (selectedMenus.length === 0) {
      alert("최소 한 가지 메뉴를 선택해주세요.");
      return;
    }

    setIsMenuConfirmed(true);
    setLoading(true); // Show loading indicator while fetching restaurants

    try {
      if (roundingInfo) {
        // Use selected menus as search query
        const searchQuery = selectedMenus.join(' ');
        console.log(`Searching restaurants with query: ${searchQuery}`);

        // Pass the query to fetchRestaurants (need to update fetchRestaurants signature or logic if it doesn't support query)
        // Assuming fetchRestaurants can handle query or we pass it as part of info
        // Since fetchRestaurants currently takes (info, startLoc, coords), we might need to modify it or append query to info temporarily

        // Or simpler: Just rely on default logic but append query to keyword
        // Let's check fetchRestaurants implementation first in geminiService.ts. 
        // Wait, fetchRestaurants calls getRecommendations.

        // For now, let's just trigger the fetch.
        const restaurantsData = await fetchRestaurants({
          ...roundingInfo,
          // Assuming we can infiltrate the query somehow or fetchRestaurants uses golfCourse name + "맛집"
        }, currentStartLocation, startCoords, searchQuery); // We will need to update fetchRestaurants to accept searchQuery

        setRestaurants(restaurantsData);
      }
    } catch (e) {
      console.error("Failed to fetch restaurants after menu select:", e);
      setError("맛집 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 1. 앱이 처음 켜질 때 핸드폰 저장소에서 데이터 꺼내오기
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('myGolfRounds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setScheduledRounds(parsed);
          console.log('[LocalStorage] Loaded rounds:', parsed.length);
        }
      }
    } catch (e) {
      console.error('[LocalStorage] Load failed:', e);
    } finally {
      setRoundsHydrated(true);
    }
  }, []);

  // 2. 라운딩 목록이 바뀔 때마다 핸드폰에 자동 저장
  React.useEffect(() => {
    if (!roundsHydrated) return;
    localStorage.setItem('myGolfRounds', JSON.stringify(scheduledRounds));
    console.log('[LocalStorage] Saved rounds:', scheduledRounds.length);
  }, [scheduledRounds, roundsHydrated]);

  const openDeparturePlan = async (
    infoInput: RoundingInfo,
    startLoc: string,
    customPrep: number,
    savedStartCoords?: GeoLocation | null,
  ) => {
    const info = ensureCourseCoords({ ...infoInput });
    const courseAssets = getGolfCourseAssets(info.golfCourse);
    info.logoUrl = info.logoUrl || courseAssets.logo;

    setPrepTime(customPrep);
    setCurrentStartLocation(startLoc);
    setWeatherData([]);
    setRestaurants([]);
    setVideos([]);
    setTravelTime(null);
    setSelectedRestaurant(null);
    setSelectedMenus([]);
    setIsMenuConfirmed(false);
    setExtrasReady(false);
    setLogoError(false);

    const coords = await resolveStartCoords(startLoc, savedStartCoords);
    setStartCoords(coords);
    if (coords.address) setCurrentStartLocation(coords.address);

    try {
      const verifiedLocation = await searchGolfCourseLocation(info.golfCourse);
      if (verifiedLocation) {
        info.address = verifiedLocation.address || info.address;
        info.lat = verifiedLocation.lat || info.lat;
        info.lng = verifiedLocation.lng || info.lng;
      }
    } catch (error) {
      console.warn('[openDeparturePlan] course search skipped', error);
    }

    try {
      const golfCoords = await getGeocode(info.address || info.golfCourse);
      if (golfCoords) {
        info.lat = golfCoords.lat;
        info.lng = golfCoords.lng;
        info.address = golfCoords.address || info.address;
      }
    } catch (error) {
      console.warn('[openDeparturePlan] course geocode skipped', error);
    }

    const resolved = ensureCourseCoords(info);
    setRoundingInfo(resolved);

    let directTime = 0;
    if (coords && resolved.lat && resolved.lng) {
      try {
        const route = await getRoute(coords, { lat: resolved.lat, lng: resolved.lng });
        if (route) {
          directTime = Math.round(route.summary.duration / 60000);
        }
      } catch (error) {
        console.warn('[openDeparturePlan] route API skipped', error);
      }
    }
    if (!directTime) {
      directTime = estimateTravelMinutes(coords, resolved);
    }
    setTravelTime(directTime);

    try {
      const [weather, videosData] = await Promise.all([
        fetchWeather(resolved),
        fetchCourseVideos(resolved.golfCourse),
      ]);
      setWeatherData(weather);
      setVideos(videosData);
    } catch (error) {
      console.warn('[openDeparturePlan] extras skipped', error);
      setWeatherData([]);
      setVideos([]);
    } finally {
      setExtrasReady(true);
    }

    return { info: resolved, coords, startLoc };
  };

  const handleAnalyze = async ({ message, startLocation: location, prepTime: customPrep, manual }: AnalyzeRequest) => {
    setLoading(true);
    setError(null);
    setPrepTime(customPrep);

    const finalLocation = location.trim() || '서울 시청';
    setCurrentStartLocation(finalLocation);

    try {
      const info = await parseBookingMessage(message, manual);
      const { info: resolved, coords } = await openDeparturePlan(info, finalLocation, customPrep);

      const newRound: RoundingPlan = {
        id: Date.now().toString(),
        golfCourse: resolved.golfCourse,
        date: resolved.date,
        time: resolved.teeOffTime,
        members: resolved.members || 4,
        location: resolved.address || '위치 정보 확인 중',
        startLocation: finalLocation,
        startCoords: coords,
        prepTime: customPrep,
        fullInfo: resolved,
      };

      setScheduledRounds(prev => {
        if (prev.some(r => r.date === newRound.date && r.time === newRound.time && r.golfCourse === newRound.golfCourse)) {
          return prev.map(r =>
            r.date === newRound.date && r.time === newRound.time && r.golfCourse === newRound.golfCourse
              ? { ...r, ...newRound, id: r.id }
              : r
          );
        }
        return [newRound, ...prev];
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof BookingParseError ? err.message : '예약 문구를 읽지 못했습니다. 직접 입력으로 출발 계획을 만들 수 있습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = async (selected: Restaurant) => {
    const isDeselect = selectedRestaurant?.name === selected.name;
    const selection = isDeselect ? null : selected;
    setSelectedRestaurant(selection);

    if (!isDeselect && roundingInfo) {
      if (!startCoords) {
        // Retry getting start coords or warn
        console.warn("Start coordinates missing, attempting to use address only.");
      }

      const startAddr = startCoords?.address || currentStartLocation;
      const restaurantAddr = selected.address || selected.name;
      const golfAddr = roundingInfo.address || roundingInfo.golfCourse;

      if (selected.lat && selected.lng) {
        // 주소 복사
        if (selected.address) {
          navigator.clipboard.writeText(selected.address);
          setCopyFeedback(`${selected.name} 주소가 복사되었습니다.`);
          setTimeout(() => setCopyFeedback(null), 3000);
        }

        // 경로 및 시간 계산 (Home -> Restaurant -> Golf Course)
        try {
          let time1, time2, dist1, dist2;

          // 1. Try Naver Maps API first (Accurate)
          if (startCoords) {
            try {
              const [route1, route2] = await Promise.all([
                getRoute(startCoords, { lat: selected.lat, lng: selected.lng }),
                getRoute({ lat: selected.lat, lng: selected.lng }, { lat: roundingInfo.lat!, lng: roundingInfo.lng! })
              ]);

              if (route1) {
                time1 = Math.round(route1.summary.duration / 60000);
                dist1 = (route1.summary.distance / 1000).toFixed(1) + 'km';
              }
              if (route2) {
                time2 = Math.round(route2.summary.duration / 60000);
                dist2 = (route2.summary.distance / 1000).toFixed(1) + 'km';
              }
            } catch (e) {
              console.warn("Naver Route API failed, falling back to Estimate", e);
            }
          }

          // 2. Fallback: Coordinate-based Estimation (Robust & Fast)
          // API 실패하거나 좌표가 없는 경우, 하버사인 공식으로 직선거리를 구하고 보정 계수를 적용
          if (!time1 || !time2) {
            console.log("Using Coordinate Estimation for travel time fallback...");

            // 좌표 확보 (없으면 서울 시청/기본값 사용 불가피)
            const sLat = startCoords?.lat || 37.5665;
            const sLng = startCoords?.lng || 126.9780;
            const rLat = selected.lat;
            const rLng = selected.lng;
            const gLat = roundingInfo.lat || rLat; // 골프장 좌표 없으면 식당 좌표로 대체
            const gLng = roundingInfo.lng || rLng;

            // 직선 거리 계산 (km)
            const d1_raw = calculateDistance(sLat, sLng, rLat, rLng);
            const d2_raw = calculateDistance(rLat, rLng, gLat, gLng);

            // 도로 굴곡 보정: 직선거리 대비 실제 주행거리 비율 (보통 1.3배 적용)
            const d1_est = d1_raw * 1.3;
            const d2_est = d2_raw * 1.3;

            // 동적 속도 적용: 거리가 멀수록 고속도로 이용 확률 높음
            // 50km 이상: 80km/h (고속도로 위주)
            // 20km 이상: 60km/h (국도/고속도로 혼합)
            // 20km 미만: 30km/h (시내 주행)
            const getSpeed = (dist: number) => {
              if (dist >= 50) return 80;
              if (dist >= 20) return 60;
              return 30;
            };

            const speed1 = getSpeed(d1_est);
            const speed2 = getSpeed(d2_est);

            // 예상 시간 계산 (분) + 기본 버퍼 5분
            const t1_est = Math.round((d1_est / speed1) * 60 + 5);
            const t2_est = Math.round((d2_est / speed2) * 60 + 5);

            if (!time1) {
              time1 = t1_est;
              dist1 = `약 ${d1_est.toFixed(1)}km`;
            }
            if (!time2) {
              time2 = t2_est;
              dist2 = `약 ${d2_est.toFixed(1)}km`;
            }
          }

          if (time1 !== undefined && time2 !== undefined) {
            // 식당 데이터 및 선택된 식당 상태 업데이트
            const updatedFields = {
              travelTimeFromHome: `${time1}분`,
              distanceFromHome: dist1 || '-',
              travelTimeToGolfCourse: `${time2}분`,
              distanceToGolfCourse: dist2 || '-'
            };

            setRestaurants(prev => prev.map(r =>
              r.name === selected.name ? { ...r, ...updatedFields } : r
            ));

            setSelectedRestaurant(prev => prev && prev.name === selected.name ? { ...prev, ...updatedFields } : prev);
          } else {
            setError("경로를 계산할 수 없습니다. 잠시 후 다시 시도해주세요.");
          }

        } catch (e) {
          console.error("Route calculation fully failed:", e);
          setError("경로 계산중 오류가 발생했습니다.");
        }
      }
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-emerald-500 selection:text-white">
      <Header onNavigate={(target) => {
        if (target === 'service') {
          setRoundingInfo(null);
          scrollToId('booking');
        } else if (target === 'analytics') {
          if (roundingInfo) {
            scrollToId('schedule');
          } else {
            scrollToId('rounds');
          }
        } else {
          if (!roundingInfo) scrollToId('vault');
          else scrollToId('vault');
        }
      }} />

      <main className="max-w-md mx-auto px-4 py-8 space-y-10">
        {!roundingInfo && !loading && (
          <div className="grid grid-cols-1 gap-12 items-start animate-in fade-in duration-1000">
            <div className="space-y-12">
              <div className="mb-4">
                <h1 className="text-3xl font-black text-white leading-tight">
                  럭셔리 라운딩의 시작,<br />
                  <span className="text-emerald-500 text-2xl">라운딩매니저</span>
                </h1>

              </div>
              <BookingForm onAnalyze={handleAnalyze} loading={loading} />

              <div id="rounds">
              <ScheduledRounds
                rounds={scheduledRounds}
                onDelete={(id) => setScheduledRounds(prev => prev.filter(r => r.id !== id))}
                onUpdate={(id, updates) => {
                  console.log('[ScheduledRounds] Updating round:', id, 'with:', updates);
                  setScheduledRounds(prev => {
                    const updated = prev.map(r => {
                      if (r.id !== id) return r;
                      const next = { ...r, ...updates };
                      if (next.fullInfo) {
                        next.fullInfo = {
                          ...next.fullInfo,
                          date: updates.date || next.fullInfo.date,
                          teeOffTime: updates.time || next.fullInfo.teeOffTime,
                          address: updates.startLocation ? next.fullInfo.address : next.fullInfo.address,
                        };
                      }
                      return next;
                    });
                    console.log('[ScheduledRounds] Updated rounds:', updated);
                    return updated;
                  });
                }}
                onView={async (round) => {
                  setLoading(true);
                  setError(null);
                  try {
                    const info = reconstructRoundingInfo({
                      golfCourse: round.golfCourse,
                      date: round.date,
                      time: round.time,
                      location: round.location,
                      fullInfo: round.fullInfo,
                    });
                    const startLoc = round.startLocation || '서울 시청';
                    const opened = await openDeparturePlan(info, startLoc, round.prepTime ?? prepTime, round.startCoords);

                    setScheduledRounds(prev => prev.map(r => r.id === round.id ? {
                      ...r,
                      fullInfo: opened.info,
                      startCoords: opened.coords,
                      location: opened.info.address || r.location,
                    } : r));
                  } catch (err) {
                    console.error("Failed to load round details:", err);
                    setError(err instanceof BookingParseError ? err.message : "라운드 상세 정보를 불러오는 중 오류가 발생했습니다.");
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              </div>

              <div id="vault">
                <FavoriteSites />
              </div>

              {/* <EliteServicesSection /> */}

            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/50 border border-rose-500/30 text-rose-200 px-6 py-4 rounded-2xl flex items-center backdrop-blur-sm animate-bounce">
            <i className="fa-solid fa-triangle-exclamation mr-3 text-rose-500"></i>
            {error}
          </div>
        )}

        {copyFeedback && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center animate-in slide-in-from-top-4 duration-300">
            <i className="fa-solid fa-circle-check mr-3"></i>
            {copyFeedback}
          </div>
        )}

        {roundingInfo && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Rounding Summary Card */}
            <div className="luxury-glass p-6 rounded-[32px] shadow-2xl border luxury-border flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>

              {!logoError && (
                <div className="bg-slate-900 w-20 h-20 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner overflow-hidden mb-4">
                  {roundingInfo.logoUrl ? (
                    <img
                      src={roundingInfo.logoUrl}
                      alt={roundingInfo.golfCourse}
                      className="w-full h-full object-contain p-2"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="text-emerald-500 text-3xl">
                      <i className="fa-solid fa-flag"></i>
                    </div>
                  )}
                </div>
              )}

              <h2 className="text-3xl font-black text-white tracking-tight mb-2">{roundingInfo.golfCourse}</h2>

              <div className="flex flex-wrap justify-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-6">
                <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5 flex items-center">
                  <i className="fa-regular fa-calendar-check mr-2 text-emerald-400"></i> {roundingInfo.date}
                </span>
                <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5 flex items-center">
                  <i className="fa-regular fa-clock mr-2 text-emerald-400"></i> {roundingInfo.teeOffTime}
                </span>
              </div>

              <div className="flex flex-col space-y-3 w-full relative z-10">
                <button
                  onClick={() => {
                    setRoundingInfo(null);
                    setTravelTime(null);
                    setWeatherData([]);
                    setRestaurants([]);
                    setIsMenuConfirmed(false);
                    setSelectedMenus([]);
                  }}
                  className="w-full py-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all font-bold text-sm"
                >
                  <i className="fa-solid fa-house mr-2"></i>
                  메인으로
                </button>
              </div>
            </div>


            {/* Weather Section - Moved above route */}
            {
              extrasReady ? (
                <WeatherSection data={weatherData} />
              ) : (
                <div className="luxury-glass p-12 rounded-3xl border luxury-border flex flex-col items-center justify-center animate-pulse">
                  <i className="fa-solid fa-cloud-sun text-slate-700 text-4xl mb-4"></i>
                  <p className="text-slate-500 font-bold">기상 분석 중...</p>
                </div>
              )
            }

            {/* Map & Timeline Vertical Layout */}
            <div className="space-y-12">
              <div className="w-full" id="schedule">
                {travelTime !== null ? (
                  <ScheduleSection
                    roundingInfo={roundingInfo}
                    teeOffTime={roundingInfo.teeOffTime}
                    totalDirectTravelTime={travelTime}
                    prepTime={prepTime}
                    selectedRestaurantData={selectedRestaurant}
                  />
                ) : (
                  <div className="luxury-glass p-12 rounded-3xl border luxury-border flex flex-col items-center justify-center animate-pulse">
                    <i className="fa-solid fa-car-side text-slate-700 text-4xl mb-4"></i>
                    <p className="text-slate-500 font-bold">스케줄링 중...</p>
                  </div>
                )}
              </div>
              <div className="w-full h-[500px]">
                <MapSection
                  startLocation={currentStartLocation}
                  startCoords={startCoords}
                  golfCourseInfo={roundingInfo}
                  selectedRestaurant={selectedRestaurant}
                />
              </div>
            </div>

            {
              !isMenuConfirmed ? (
                <div className="luxury-glass p-8 rounded-3xl border luxury-border space-y-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <i className="fa-solid fa-utensils text-emerald-500 text-xl"></i>
                    <h3 className="text-xl font-bold text-white">아침 식사 메뉴 선택</h3>
                  </div>

                  <p className="text-slate-400 text-sm">
                    원하시는 조식 메뉴를 선택해주세요. 선택하신 메뉴 위주로 주변 맛집을 추천해드립니다.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MENU_OPTIONS.map(menu => (
                      <button
                        key={menu}
                        onClick={() => toggleMenu(menu)}
                        className={`p-4 rounded-xl text-sm font-bold transition-all duration-300 border ${selectedMenus.includes(menu)
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105'
                          : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-white/20'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{menu}</span>
                          {selectedMenus.includes(menu) && <i className="fa-solid fa-check text-xs"></i>}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleMenuConfirm}
                    disabled={selectedMenus.length === 0}
                    className="w-full py-4 mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <i className="fa-solid fa-spinner animate-spin"></i>
                    ) : (
                      <i className="fa-solid fa-magnifying-glass"></i>
                    )}
                    <span>맛집 검색하기</span>
                  </button>
                </div>
              ) : (
                restaurants.length > 0 ? (
                  <RestaurantSection
                    restaurants={restaurants}
                    onSelectRestaurant={handleSelectRestaurant}
                    selectedRestaurant={selectedRestaurant}
                  />
                ) : (
                  <div className="luxury-glass p-12 rounded-3xl border luxury-border flex flex-col items-center justify-center animate-pulse">
                    <i className="fa-solid fa-utensils text-slate-700 text-4xl mb-4"></i>
                    <p className="text-slate-500 font-bold">맛집 탐색 중...</p>
                  </div>
                )
              )
            }

            {/* YouTube 코스 공략 영상 */}
            <div className="luxury-glass rounded-[40px] p-8 md:p-12 border luxury-border shadow-2xl space-y-8">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-1 bg-red-500"></div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
                  코스 공략 유튜브 추천 <span className="text-slate-500 text-lg font-light ml-2">Course Strategy</span>
                </h2>
              </div>

              {extrasReady && videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <i className="fa-brands fa-youtube text-slate-700 text-6xl mb-4"></i>
                  <p className="text-slate-400 font-bold mb-2">코스 공략 영상을 찾지 못했습니다.</p>
                  <p className="text-slate-500 text-sm">출발 계획과 별개로 나중에 다시 확인할 수 있습니다.</p>
                </div>
              ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {videos.map((video, idx) => (
                    <a
                      key={idx}
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-white/5 rounded-3xl overflow-hidden border border-white/5 hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-slate-900">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                            <i className="fa-solid fa-play text-white text-xl ml-1"></i>
                          </div>
                        </div>
                        {/* Duration Badge */}
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white">
                            {video.duration}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center">
                            <i className="fa-brands fa-youtube text-red-500 mr-2"></i>
                            {video.channel}
                          </span>
                          {video.views && (
                            <span className="flex items-center">
                              <i className="fa-solid fa-eye mr-1"></i>
                              {video.views}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <i className="fa-brands fa-youtube text-slate-700 text-6xl mb-4"></i>
                  <p className="text-slate-400 font-bold mb-2">코스 공략 영상을 찾는 중입니다...</p>
                  <p className="text-slate-500 text-sm">잠시만 기다려주세요.</p>
                </div>
              )}
            </div>

            {/* <EliteServicesSection /> */}

            <div id="vault">
              <FavoriteSites />
            </div>

          </div >
        )}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-8 animate-pulse">
            <div className="relative">
              <div className="w-24 h-24 border-[8px] border-white/5 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500">
                <i className="fa-solid fa-compass text-2xl animate-pulse"></i>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-white tracking-widest uppercase">Initializing</h3>
              <p className="text-slate-500 mt-2 text-xs font-medium">예약 정보를 분석 중입니다.</p>
            </div>
          </div>
        )}
      </main >

      {/* 
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div className="bg-slate-900/80 backdrop-blur-xl text-white px-8 py-5 rounded-[40px] shadow-2xl flex items-center justify-between border border-white/10 ring-1 ring-white/5">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center"><i className="fa-solid fa-crown text-[10px]"></i></div>
            <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-sky-500 flex items-center justify-center"><i className="fa-solid fa-star text-[10px]"></i></div>
          </div>
          <span className="text-xs font-black tracking-[0.2em] uppercase text-emerald-400">Elite Manager</span>
          <i className="fa-solid fa-fingerprint text-white/40"></i>
        </div>
      </div>
      */}
    </div >
  );
};

export default App;
