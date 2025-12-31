
import React, { useEffect, useRef, useState } from 'react';
import { RoundingInfo, Restaurant, GeoLocation } from '../types';
import { getGeocode, getRoute, fetchStaticMapImage } from '../services/naverService';

declare global {
  interface Window {
    naver: any;
  }
}

interface Props {
  startLocation: string;
  startCoords: GeoLocation | null;
  golfCourseInfo: RoundingInfo;
  selectedRestaurant: Restaurant | null;
}

const MapSection: React.FC<Props> = ({ startLocation, startCoords: startCoordsProp, golfCourseInfo, selectedRestaurant }) => {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]); // 마커 추적용
  const polylineRef = useRef<any>(null); // 경로선 추적용
  const mapContainerId = "map-container";
  const [useStaticMap, setUseStaticMap] = useState(false);
  const [staticMapUrl, setStaticMapUrl] = useState<string>('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const [useLeaflet, setUseLeaflet] = useState(false);
  const leafletMapRef = useRef<any>(null);
  const L = (window as any).L;
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Dynamically load Naver Maps SDK with actual client ID
  useEffect(() => {
    const loadNaverMapsSDK = () => {
      if (window.naver && window.naver.maps) {
        setSdkLoaded(true);
        return;
      }

      const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
      if (!clientId) {
        console.warn('[MapSection] No Naver Client ID found, will use Leaflet');
        setUseLeaflet(true);
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
      script.async = true;
      script.onload = () => {
        console.log('[MapSection] Naver Maps SDK loaded successfully');
        setSdkLoaded(true);
      };
      script.onerror = () => {
        console.error('[MapSection] Failed to load Naver Maps SDK');
        setUseLeaflet(true);
      };
      document.head.appendChild(script);
    };

    loadNaverMapsSDK();
  }, []);

  useEffect(() => {
    // Wait for SDK to load
    if (!sdkLoaded && !useLeaflet) {
      console.log('[MapSection] Waiting for SDK to load...');
      return;
    }

    const goalCoords = { lat: golfCourseInfo.lat!, lng: golfCourseInfo.lng! };

    async function initMap() {
      console.log('[MapSection] Initializing map...');
      console.log('[MapSection] Golf Course:', golfCourseInfo.golfCourse, goalCoords.lat, goalCoords.lng);
      console.log('[MapSection] Start Location:', startLocation);
      console.log('[MapSection] Provided Start Coords:', startCoordsProp);

      // Check if Naver Maps SDK is loaded
      if (!window.naver || !window.naver.maps) {
        console.warn('[MapSection] Naver Maps SDK not loaded, falling back to Leaflet');
        setUseLeaflet(true);
        initLeafletMap(startCoordsProp, goalCoords);
        return;
      }

      setMapAuthFailed(false);

      // 1. 좌표 데이터 확정 (Prop 우선, 없으면 Geocoding 시도)
      let startCoords = startCoordsProp;
      if (!startCoords && startLocation) {
        console.log('[MapSection] Fetching geocode for:', startLocation);
        startCoords = await getGeocode(startLocation);

        // Final fallback to Misa Station
        if (!startCoords && startLocation.includes('미사')) {
          startCoords = { lat: 37.5606, lng: 127.1816, address: '미사역' };
        }
      }

      let routeData = null;
      if (startCoords && goalCoords.lat && goalCoords.lng) {
        const waypoints = selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng
          ? [{ lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }]
          : [];

        console.log('[MapSection] Fetching route...');
        routeData = await getRoute(startCoords, goalCoords, waypoints);

        // Fallback: 경로 데이터가 없으면 직선 경로 생성
        if (!routeData || !routeData.path || routeData.path.length === 0) {
          console.warn('[MapSection] Route API failed or returned empty, creating simple path');
          const simplePath: [number, number][] = [
            [startCoords.lng, startCoords.lat]
          ];

          // 식당이 있으면 중간 지점 추가
          if (selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng) {
            simplePath.push([selectedRestaurant.lng, selectedRestaurant.lat]);
          }

          // 골프장 추가
          simplePath.push([goalCoords.lng, goalCoords.lat]);

          routeData = {
            path: simplePath,
            summary: null,
            guide: null
          };
          console.log('[MapSection] Created fallback path with', simplePath.length, 'points');
        }
      } else {
        // 출발지 좌표가 없는 경우에도 골프장만 표시
        console.warn('[MapSection] No start coordinates, will only show golf course');
      }

      // 3. 지도 초기화
      const mapOptions = {
        center: new window.naver.maps.LatLng(goalCoords.lat, goalCoords.lng),
        zoom: 11,
        zoomControl: true,
        mapTypeControl: false,
      };

      if (!mapRef.current) {
        console.log('[MapSection] Creating new map instance');
        mapRef.current = new window.naver.maps.Map(mapContainerId, mapOptions);
      } else {
        console.log('[MapSection] Updating existing map center');
        mapRef.current.setCenter(new window.naver.maps.LatLng(goalCoords.lat, goalCoords.lng));
      }

      const map = mapRef.current;
      setIsMapLoaded(true);

      // 기존 마커와 경로 제거
      console.log('[MapSection] Clearing existing markers and polyline');
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      // 4. 경로 그리기
      if (routeData && routeData.path) {
        console.log('[MapSection] Drawing route with', routeData.path.length, 'points');
        const naverPath = routeData.path.map((p: [number, number]) => new window.naver.maps.LatLng(p[1], p[0]));

        polylineRef.current = new window.naver.maps.Polyline({
          map: map,
          path: naverPath,
          strokeColor: '#10b981',
          strokeWeight: 6,
          strokeOpacity: 0.8,
          strokeLineJoin: 'round'
        });

        // 출발지 마커
        if (startCoords) {
          console.log('[MapSection] Adding start marker');
          const startMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(startCoords.lat, startCoords.lng),
            map: map,
            title: '출발지',
            icon: {
              content: `<div style="width: 16px; height: 16px; border-radius: 50%; background: white; border: 4px solid #3b82f6; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
              anchor: new window.naver.maps.Point(8, 8)
            }
          });
          markersRef.current.push(startMarker);
        }

        // 식당 마커
        if (selectedRestaurant) {
          console.log('[MapSection] Adding restaurant marker');
          const restaurantMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(selectedRestaurant.lat, selectedRestaurant.lng),
            map: map,
            title: selectedRestaurant.name,
            icon: {
              content: `<div style="width: 32px; height: 32px; border-radius: 50%; background: #f59e0b; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.2);"><i class="fa-solid fa-utensils" style="font-size: 12px;"></i></div>`,
              anchor: new window.naver.maps.Point(16, 16)
            }
          });
          markersRef.current.push(restaurantMarker);
        }

        // 목적지 마커
        console.log('[MapSection] Adding goal marker');
        const goalMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(goalCoords.lat, goalCoords.lng),
          map: map,
          title: golfCourseInfo.golfCourse,
          icon: {
            content: `<div style="width: 40px; height: 40px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 12px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 0 0 4px rgba(16,185,129,0.2);"><i class="fa-solid fa-flag-checkered"></i></div>`,
            anchor: new window.naver.maps.Point(20, 20)
          }
        });
        markersRef.current.push(goalMarker);

        const bounds = new window.naver.maps.LatLngBounds(naverPath[0], naverPath[0]);
        naverPath.forEach((p: any) => bounds.extend(p));
        map.panToBounds(bounds, { top: 100, right: 60, bottom: 60, left: 60 });
        console.log('[MapSection] Map bounds adjusted');
      } else {
        console.warn('[MapSection] No route data available');
        // 경로 데이터가 없어도 골프장 마커는 표시
        new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(goalCoords.lat, goalCoords.lng),
          map: map,
          title: golfCourseInfo.golfCourse,
          icon: {
            content: `<div style="width: 40px; height: 40px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 12px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.2);"><i class="fa-solid fa-flag-checkered"></i></div>`,
            anchor: new window.naver.maps.Point(20, 20)
          }
        });
      }
    }



    async function initLeafletMap(start: any, goal: any) {
      if (!L) {
        console.error('[MapSection] Leaflet (L) not found in window');
        setMapAuthFailed(true);
        return;
      }

      console.log('[MapSection] Initializing Leaflet map...');

      // Give DOM time to update if needed
      setTimeout(() => {
        if (!leafletMapRef.current) {
          const map = L.map(mapContainerId).setView([goal.lat, goal.lng], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          leafletMapRef.current = map;
        }

        const map = leafletMapRef.current;

        // Clear existing layers if any
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
          }
        });

        // Goal Marker
        L.marker([goal.lat, goal.lng], {
          icon: L.divIcon({
            html: `<div style="width: 30px; height: 30px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"><i class="fa-solid fa-flag-checkered"></i></div>`,
            className: '',
            iconSize: [30, 30]
          })
        }).addTo(map).bindPopup('골프장: ' + golfCourseInfo.golfCourse);

        // Start Marker
        if (start) {
          L.marker([start.lat, start.lng], {
            icon: L.divIcon({
              html: `<div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"><i class="fa-solid fa-house" style="font-size: 10px;"></i></div>`,
              className: '',
              iconSize: [24, 24]
            })
          }).addTo(map).bindPopup('출발지');
        }

        // Restaurant Marker
        if (selectedRestaurant) {
          L.marker([selectedRestaurant.lat!, selectedRestaurant.lng!], {
            icon: L.divIcon({
              html: `<div style="width: 24px; height: 24px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"><i class="fa-solid fa-utensils" style="font-size: 10px;"></i></div>`,
              className: '',
              iconSize: [24, 24]
            })
          }).addTo(map).bindPopup('식당: ' + selectedRestaurant.name);
        }

        // Draw simple line
        const points = [];
        if (start) points.push([start.lat, start.lng]);
        if (selectedRestaurant) points.push([selectedRestaurant.lat!, selectedRestaurant.lng!]);
        points.push([goal.lat, goal.lng]);

        if (points.length > 1) {
          L.polyline(points as any, { color: '#10b981', weight: 4, opacity: 0.6 }).addTo(map);
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }, 100);
    }

    // Listen for Naver Map authentication failure
    const handleAuthFailure = () => {
      console.warn('[MapSection] Naver Map Auth Failed event received');
      setUseLeaflet(true);
      initLeafletMap(startCoordsProp, goalCoords);
    };

    window.addEventListener('navermap_authFailure', handleAuthFailure);

    initMap();

    return () => {
      window.removeEventListener('navermap_authFailure', handleAuthFailure);
    };
  }, [golfCourseInfo, selectedRestaurant, startLocation, sdkLoaded, useLeaflet]);

  return (
    <div className="luxury-glass rounded-[40px] p-2 border luxury-border shadow-2xl overflow-hidden group">
      <div className="relative h-[450px] w-full bg-slate-900 rounded-[38px] overflow-hidden">
        {mapAuthFailed ? (
          /* Fallback Route Guide when Map Auth Fails */
          <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-md w-full space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <i className="fa-solid fa-route text-emerald-500 text-4xl"></i>
                <h3 className="text-2xl font-black text-white">경로 안내</h3>
                <p className="text-xs text-slate-400">지도 API 인증 대기 중 - 텍스트 경로를 확인하세요</p>
              </div>

              {/* Route Steps */}
              <div className="bg-slate-950/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 space-y-4">
                {/* Start */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                    <i className="fa-solid fa-home text-blue-400 text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-blue-400 uppercase tracking-wider">출발지</div>
                    <div className="text-sm text-white font-medium mt-1">{startLocation || '미사역'}</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <i className="fa-solid fa-arrow-down text-slate-600"></i>
                </div>

                {/* Restaurant */}
                {selectedRestaurant && (
                  <>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
                        <i className="fa-solid fa-utensils text-orange-400 text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black text-orange-400 uppercase tracking-wider">식사</div>
                        <div className="text-sm text-white font-medium mt-1">{selectedRestaurant.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{selectedRestaurant.cuisine}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <i className="fa-solid fa-arrow-down text-slate-600"></i>
                    </div>
                  </>
                )}

                {/* Golf Course */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                    <i className="fa-solid fa-flag-checkered text-green-400 text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-green-400 uppercase tracking-wider">도착지</div>
                    <div className="text-sm text-white font-medium mt-1">{golfCourseInfo.golfCourse}</div>
                    <div className="text-xs text-slate-400 mt-0.5">티업 {golfCourseInfo.teeOffTime}</div>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-amber-500/10 backdrop-blur-sm rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-start space-x-3">
                  <i className="fa-solid fa-info-circle text-amber-400 mt-0.5"></i>
                  <div className="flex-1 text-xs text-amber-200 leading-relaxed">
                    <strong>지도를 표시하려면:</strong><br />
                    네이버 클라우드 콘솔에서 Maps API를 활성화하고<br />
                    Web Service URL에 <code className="bg-black/30 px-1 rounded">http://localhost:3003</code>을 등록하세요.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Map Display - Naver or Leaflet */
          <div id={mapContainerId} className="h-full w-full" />
        )}

        {/* API Status Notice */}
        <div className="absolute top-6 right-6 z-[30]">
          <div className="bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/30 text-[9px] font-bold text-emerald-300 flex items-center space-x-2">
            <i className={`fa-solid ${useLeaflet ? 'fa-globe' : 'fa-check-circle'}`}></i>
            <span>{useLeaflet ? 'OpenStreetMap 모드 (Naver 백업)' : 'Naver 동적 지도 모드'}</span>
          </div>
        </div>

        {/* Route Info Overlay (Static Map Only) */}
        {useStaticMap && selectedRestaurant && (
          <div className="absolute top-20 right-6 z-[30] bg-slate-950/90 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-white max-w-[200px]">
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">경로 정보</div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-300">출발지</span>
              </div>
              <div className="flex items-center space-x-2 pl-3">
                <i className="fa-solid fa-arrow-down text-slate-600 text-[8px]"></i>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-slate-300">{selectedRestaurant.name}</span>
              </div>
              <div className="flex items-center space-x-2 pl-3">
                <i className="fa-solid fa-arrow-down text-slate-600 text-[8px]"></i>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-slate-300">{golfCourseInfo.golfCourse}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 text-[8px] text-slate-500">
              ⚠️ 경로선은 동적 지도에서만 표시됩니다
            </div>
          </div>
        )}

        {/* Overlay Info */}
        <div className="absolute top-6 left-6 z-[20] pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 flex items-center space-x-3 shadow-2xl">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[11px] font-black text-white uppercase tracking-widest">
              {golfCourseInfo.golfCourse} Route Optimized
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-[20] bg-slate-950/90 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-[11px] font-bold text-slate-300">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span>{golfCourseInfo.golfCourse}</span>
            </div>
            {selectedRestaurant && (
              <div className="flex items-center space-x-3 text-[11px] font-bold text-slate-300">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                <span>{selectedRestaurant.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSection;
