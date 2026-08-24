import axios from 'axios';
import { RoundingInfo, WeatherData, Restaurant } from "../types";
import { getGeocode, SEARCH_PROXY_BASE } from './naverService';
import {
  enrichWithKnownCourse,
  mergeManualOverrides,
  parseBookingLocally,
  type ManualBookingFields,
} from '../lib/bookingParser';
import { findKnownCourse } from '../lib/knownCourses';

// 1. 예약 메시지 파싱: 서버 AI가 있으면 사용하고, 실패하면 로컬 파서가 이어간다.
export async function parseBookingMessage(message: string, manual?: ManualBookingFields): Promise<RoundingInfo> {
  let parsed: RoundingInfo | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/api/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, manual }),
        signal: controller.signal,
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.ok && data.info?.golfCourse && data.info?.date && data.info?.teeOffTime) {
          parsed = enrichWithKnownCourse(mergeManualOverrides(data.info, manual));
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.warn('[parseBookingMessage] Server parser unavailable, using local parser', error);
  }

  if (!parsed) {
    parsed = parseBookingLocally(message, manual);
  }

  if (parsed.homepage && !parsed.homepage.startsWith('http')) {
    parsed.homepage = undefined;
  }

  // 네이버 검색은 보강만 하고, 실패해도 로컬 결과를 유지한다.
  if (parsed.golfCourse) {
    try {
      const axios = (await import('axios')).default;

      console.log(`[Naver Search Override] Searching for: ${parsed.golfCourse}`);

      const searchResponse = await axios.get(`${SEARCH_PROXY_BASE}/v1/search/local.json`, {
        params: {
          query: parsed.golfCourse,
          display: 5  // 여러 결과 확인
        },
        headers: {
          'X-Naver-Client-Id': import.meta.env.VITE_NAVER_SEARCH_ID || import.meta.env.VITE_NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': import.meta.env.VITE_NAVER_SEARCH_SECRET || import.meta.env.VITE_NAVER_CLIENT_SECRET
        }
      });

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        // 모든 결과 로깅
        console.log(`[Naver Search Override] Found ${searchResponse.data.items.length} results:`);
        searchResponse.data.items.forEach((item: any, index: number) => {
          const itemName = item.title.replace(/<[^>]*>?/gm, '');
          const itemAddress = item.roadAddress || item.address;
          console.log(`  ${index + 1}. ${itemName} - ${itemAddress}`);
        });

        // 첫 번째 결과 사용 (가장 관련성 높음)
        const item = searchResponse.data.items[0];
        const naverAddress = item.roadAddress || item.address;
        const naverName = item.title.replace(/<[^>]*>?/gm, '');

        // 🔥 Naver Geocoding API를 사용하여 정확한 좌표 획득
        const knownCourse = findKnownCourse(parsed.golfCourse);
        const geo = knownCourse ? null : await getGeocode(naverAddress);
        if (knownCourse) {
          parsed.address = parsed.address || knownCourse.address;
          parsed.lat = parsed.lat || knownCourse.lat;
          parsed.lng = parsed.lng || knownCourse.lng;
        } else if (geo) {
          parsed.address = geo.address;
          parsed.lat = geo.lat;
          parsed.lng = geo.lng;
          console.log(`[Naver Search Override] ✅ Final Coords: (${geo.lat}, ${geo.lng})`);
        } else {
          parsed.address = parsed.address || naverAddress;
          console.warn(`[Naver Search Override] ⚠️ Geocoding failed, using Search API address only.`);
        }

        if (naverName && naverName.length > 0 && !findKnownCourse(parsed.golfCourse)) {
          parsed.golfCourse = naverName;
        }
      } else {
        console.error(`[Naver Search Override] ❌ No results found for: ${parsed.golfCourse}`);
        console.error(`[Naver Search Override] ❌ Falling back to Gemini data`);
      }
    } catch (error) {
      console.error(`[Naver Search Override] Error:`, error);
      console.error(`[Naver Search Override] ❌ Falling back to Gemini data`);
    }
  }

  return parsed;
}

// 2. 이동 시간만 빠르게 계산 (AI 없이 안전한 기본값)
export async function fetchTravelTime(_start: string, _destination: string): Promise<number> {
  return 70;
}

// 3. 날씨 정보 — 클라이언트에서 Gemini 키를 쓰지 않는다. 실패해도 출발 계획을 막지 않는다.
export async function fetchWeather(_info: RoundingInfo): Promise<WeatherData[]> {
  return [];
}


// 3.5 골프장 위치 검색 (정확한 주소 및 좌표 확보용)
export async function searchGolfCourseLocation(courseName: string): Promise<{ address: string, lat: number, lng: number } | null> {
  try {
    const response = await axios.get(`${SEARCH_PROXY_BASE}/v1/search/local.json`, {
      params: {
        query: courseName,
        display: 1
      },
      headers: {
        'X-Naver-Client-Id': import.meta.env.VITE_NAVER_SEARCH_ID || import.meta.env.VITE_NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': import.meta.env.VITE_NAVER_SEARCH_SECRET || import.meta.env.VITE_NAVER_CLIENT_SECRET
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      const address = item.roadAddress || item.address;

      // KATECH -> WGS84 변환 대신 Geocode API 재활용 (정확도 확보)
      const coords = await getGeocode(address);
      if (coords) {
        return {
          address,
          lat: coords.lat,
          lng: coords.lng
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`[searchGolfCourseLocation] Failed for ${courseName}:`, error);
    return null;
  }
}

// 3.6 식당 개별 정보 및 메뉴 보강 검색 (Naver Search API 활용)
const searchRestaurantMenu = async (restaurantName: string, region: string = "") => {
  try {
    const naverId = import.meta.env.VITE_NAVER_SEARCH_ID || import.meta.env.VITE_NAVER_CLIENT_ID;
    const naverSecret = import.meta.env.VITE_NAVER_SEARCH_SECRET || import.meta.env.VITE_NAVER_CLIENT_SECRET;

    const response = await axios.get(`${SEARCH_PROXY_BASE}/v1/search/local.json`, {
      params: {
        query: `${region} ${restaurantName}`.trim(),
        display: 1
      },
      headers: {
        'X-Naver-Client-Id': naverId,
        'X-Naver-Client-Secret': naverSecret
      }
    });

    return response.data.items[0] || null;
  } catch (error) {
    console.error("메뉴 API 호출 에러:", error);
    return null;
  }
};

// 하버사인 공식 (거리 계산)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 4. 식당 추천 가져오기 (Naver Search API 기반으로 전환 - Hallucination 제거)
export async function fetchRestaurants(info: RoundingInfo, _startLocation: string, startCoords?: { lat: number, lng: number } | null, userSearchQuery?: string): Promise<Restaurant[]> {
  const fetchFromNaver = async (query: string, type: 'before' | 'after', sortMethod: 'comment' | 'sim' = 'comment'): Promise<Restaurant[]> => {
    try {
      const response = await axios.get(`${SEARCH_PROXY_BASE}/v1/search/local.json`, {
        params: {
          query: query,
          display: 8, // Reduce from 15 to 8 to minimize subsequent detail calls
          sort: sortMethod
        },
        headers: {
          'X-Naver-Client-Id': import.meta.env.VITE_NAVER_SEARCH_ID || import.meta.env.VITE_NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': import.meta.env.VITE_NAVER_SEARCH_SECRET || import.meta.env.VITE_NAVER_CLIENT_SECRET
        }
      });

      // Process items sequentially to avoid 429 Too Many Requests
      const items = [];
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (const item of response.data.items) {
        const rawName = item.title.replace(/<[^>]*>?/gm, '');
        const address = item.roadAddress || item.address;

        // Use a small delay between detail calls to respect rate limits
        const isTopThree = response.data.items.indexOf(item) < 3;

        if (isTopThree) {
          await sleep(1000); // 1초 대기 (Rate Limit 방지)
        }

        let realData = null;
        if (isTopThree) {
          const regionHint = info.address ? info.address.split(' ').slice(0, 2).join(' ') : '';
          try {
            realData = await searchRestaurantMenu(rawName, regionHint);
          } catch (e) { console.warn("Menu search failed (rate limit?):", e); }
        }

        const name = realData ? realData.title.replace(/<[^>]*>?/gm, '') : rawName;
        const finalAddress = realData ? (realData.roadAddress || realData.address) : address;
        const category = realData ? realData.category : item.category;
        const phoneNumber = realData ? realData.telephone : item.telephone;

        if (realData) {
          console.log(`[Restaurant Search] 실제 데이터 로드 완료: ${name}`);
        } else {
          console.log(`[Restaurant Search] 데이터를 찾을 수 없어 기본값을 사용합니다: ${rawName}`);
        }

        // 주소를 기반으로 위경도 좌표 가져오기
        let coords = null;
        try {
          coords = await getGeocode(finalAddress);
        } catch (e) {
          console.warn(`[Geocode] Failed for ${finalAddress}:`, e);
        }

        // 거리 계산 (골프장 기준 15km 이내인지 확인)
        let distanceToGolf = null;
        if (info.lat && info.lng && coords) {
          distanceToGolf = calculateDistance(info.lat, info.lng, coords.lat, coords.lng);
          console.log(`[Distance Check] ${name}: ${distanceToGolf.toFixed(2)} km`);
        }

        if (distanceToGolf === null) continue;

        // [조식 기준 강화] 우회 시간 및 거리 제약 적용
        if (type === 'before') {
          // 1. 기본 반경 제약 (골프장 기준 10km 이내)
          if (distanceToGolf > 10) continue;

          // 2. 우회(Detour) 및 회항(Backtrack) 제약
          if (startCoords && info.lat && info.lng && coords) {
            const distStartToGolf = calculateDistance(startCoords.lat, startCoords.lng, info.lat, info.lng);
            const distStartToRest = calculateDistance(startCoords.lat, startCoords.lng, coords.lat, coords.lng);

            const detourDist = (distStartToRest + distanceToGolf) - distStartToGolf;

            // 우회 거리 제약: 20분 이내 (평균 60km/h 가정 → 20km)
            if (detourDist > 20) {
              console.log(`[Restaurant Filter] Detour too long: ${detourDist.toFixed(1)}km (≈${Math.round(detourDist)}분) for ${name}`);
              continue;
            }

            // "갔다가 돌아오는" (회항) 제약: 골프장을 지나쳐서 가는 경우 10km 이내
            if (distStartToRest > distStartToGolf && distanceToGolf > 10) {
              console.log(`[Restaurant Filter] Backtrack too long: ${distanceToGolf.toFixed(1)}km for ${name}`);
              continue;
            }
          }
        } else {
          // 라운딩 후 식사: 골프장 기준 10km 이내
          if (distanceToGolf > 10) continue;
        }

        // [조식 필터링] 고기구이 집 & 뷔페 & 냉면 제외 (단, 갈비탕이 있으면 허용)
        if (type === 'before') {
          const cat = (category || '').toLowerCase();
          const desc = (realData?.description || '').toLowerCase();

          // 1. 뷔페 제외
          if (cat.includes('뷔페') || cat.includes('buffet') || desc.includes('뷔페') || desc.includes('buffet')) {
            console.log(`[Breakfast Filter] Excluding buffet: ${name}`);
            continue;
          }

          // 2. 냉면 제외
          if (cat.includes('냉면') || desc.includes('냉면') || name.includes('냉면')) {
            console.log(`[Breakfast Filter] Excluding cold noodles: ${name}`);
            continue;
          }

          // 3. 고기구이 집 제외 (갈비탕 있으면 허용)
          const isGrillRestaurant = cat.includes('고기') || cat.includes('구이') || cat.includes('삼겹살') || cat.includes('갈비');

          if (isGrillRestaurant) {
            // 메뉴에 갈비탕이 있는지 확인
            const hasGalbitang = cat.includes('갈비탕') || desc.includes('갈비탕');

            if (!hasGalbitang) {
              console.log(`[Breakfast Filter] Excluding BBQ restaurant: ${name}`);
              continue;
            }
          }

          // 4. 오픈 시간 검증 (티업 90분 전에 오픈해야 함)
          if (info.teeOffTime) {
            const teeOffMatch = info.teeOffTime.match(/(\d+):(\d+)/);
            if (teeOffMatch) {
              const teeOffHour = parseInt(teeOffMatch[1]);
              const teeOffMin = parseInt(teeOffMatch[2]);
              const requiredOpenTime = new Date();
              requiredOpenTime.setHours(teeOffHour, teeOffMin - 90, 0, 0);

              // 기본 오픈 시간 (05:30)보다 늦게 오픈하면 제외
              const requiredHour = requiredOpenTime.getHours();
              const requiredMin = requiredOpenTime.getMinutes();

              // 대부분의 해장국/국밥집은 새벽 5시~6시에 오픈
              // 티업이 너무 이른 경우 (예: 07:00 티업 → 05:30 오픈 필요)
              if (requiredHour < 5 || (requiredHour === 5 && requiredMin < 30)) {
                console.log(`[Breakfast Filter] Restaurant may not be open early enough for ${info.teeOffTime} tee-off: ${name}`);
                // 너무 이른 티업은 경고만 하고 포함 (대부분 해장국집은 새벽 5시 오픈)
              }
            }
          }
        }

        const verifiedMenus = [{ name: "메뉴 정보", price: "네이버 플레이스 참조" }];

        items.push({
          name,
          category: category || item.category,
          address: finalAddress,
          lat: coords?.lat,
          lng: coords?.lng,
          rating: 4.5,
          openTime: type === 'before' ? '05:30' : '11:00',
          mainMenus: verifiedMenus,
          reason: type === 'before' ? `아침 식사 추천` : (realData?.description || category || `${category} 전문점`).substring(0, 50),
          type,
          placeUrl: realData?.link || `https://map.naver.com/v5/search/${encodeURIComponent(finalAddress)}`,
          phoneNumber,
          verified: true
        });
      }

      return items as Restaurant[];
    } catch (error) {
      console.error(`[Naver Search] Failed for ${query}:`, error);
      return [];
    }
  };

  // 조식 검색을 위한 로직 강화: 특정 메뉴 키워드들을 순차적으로 시도
  const tryFetchBreakfast = async (course: string, address?: string): Promise<Restaurant[]> => {
    // 골프장 이름에서 'CC', 'GC' 등 제거하여 검색 범용성 높임
    const cleanCourse = course.replace(/(CC|GC|클럽|골프장|리조트)/g, '').trim();
    // 주소에서 시/군 정보 추출하여 검색어에 포함 (예: 강원도 춘천시 -> 춘천)
    const region = address ? address.split(' ').slice(0, 2).join(' ') : '';

    // 한식 위주 아침 식사 검색 (브런치/베이커리/뷔페 제외)
    const keywords = [
      `${region} ${cleanCourse} 해장국`,
      `${region} ${cleanCourse} 국밥`,
      `${region} ${cleanCourse} 설렁탕`,
      `${region} ${cleanCourse} 순두부`,
      `${region} ${cleanCourse} 백반`,
      `${region} 골프장 한식`
    ];

    let allResults: Restaurant[] = [];

    // Process keywords sequentially to avoid 429
    for (const kw of keywords) {
      if (allResults.length >= 5) break; // We have enough variety

      const results = await fetchFromNaver(kw, 'before', 'comment');
      results.forEach(res => {
        // 중복 제거 및 검색어에 따른 이유 보강
        if (!allResults.some(r => r.name === res.name)) {
          if (kw.includes('해장국')) res.reason = "IC 근처 해장국 전문점";
          else if (kw.includes('국밥')) res.reason = "든든한 국밥 추천";
          else if (kw.includes('설렁탕') || kw.includes('곰탕')) res.reason = "깔끔한 아침 식사";
          else if (kw.includes('IC')) res.reason = "IC 근처 접근성 좋은 식당";
          else res.reason = "라운딩 전 든든한 조식";
          allResults.push(res);
        }
      });
    }

    // [Fallback Phase] 3개 미만일 경우, 리뷰 수는 적지만 관련성 높은(sim) '설렁탕/해장국' 맛집 추가 검색
    if (allResults.length < 3) {
      console.log(`[Breakfast Search] Found only ${allResults.length} items. Trying broader fallback with Accuracy Sort...`);
      const fallbackKeywords = [
        `${region} 해장국`,
        `${region} 설렁탕`,
        `${region} 아침식사`
      ];

      for (const kw of fallbackKeywords) {
        if (allResults.length >= 5) break; // Fallback으로 최대 5개까지 채움

        // 'sim' (정확도순) 정렬 사용 -> 리뷰 적어도 상호명/메뉴 일치도 높은 곳 노출
        const results = await fetchFromNaver(kw, 'before', 'sim'); // Type 'before' enforces 8km radius

        results.forEach(res => {
          if (!allResults.some(r => r.name === res.name)) {
            res.reason = "지역 주민 추천 숨은 맛집 (정확도순)";
            allResults.push(res);
          }
        });
      }
    }

    console.log(`[Breakfast Search] Found total ${allResults.length} unique breakfast candidates`);
    return allResults;
  };

  const region = info.address ? info.address.split(' ').slice(0, 2).join(' ') : '';

  // 한식 우선 검색 (일식 → 중식 → 서양식 순서로 fallback)
  const searchAfterMeals = async (): Promise<Restaurant[]> => {
    const cuisineKeywords = [
      `${region} 한식`,
      `${region} 일식`,
      `${region} 중식`,
      `${region} 양식`
    ];

    let results: Restaurant[] = [];
    for (const cuisine of cuisineKeywords) {
      if (results.length >= 5) break;
      const res = await fetchFromNaver(cuisine, 'after');
      // 브런치, 베이커리, 뷔페 필터링
      const filtered = res.filter(r => {
        const cat = (r.category || '').toLowerCase();
        return !cat.includes('브런치') &&
          !cat.includes('베이커리') &&
          !cat.includes('빵') &&
          !cat.includes('카페') &&
          !cat.includes('뷔페') &&
          !cat.includes('buffet');
      });
      results.push(...filtered);
    }
    return results.slice(0, 8);
  };

  // [신규 기능] 사용자 선택 메뉴로 검색
  if (userSearchQuery && userSearchQuery.trim().length > 0) {
    console.log(`[Restaurant Search] Using User Query: ${userSearchQuery}`);
    const cleanCourse = info.golfCourse.replace(/(CC|GC|클럽|골프장|리조트)/g, '').trim();

    // 검색어 조합: "지역명 + 골프장 + 메뉴" 형태로 정확도 높임
    // 예: "가평 베네스트 국밥 설렁탕"
    // 사용자가 여러 개를 선택했으므로 각각 분리해서 검색할 필요가 있거나, 하나로 뭉칠 수도 있음.
    // 네이버 검색은 키워드가 너무 많으면 결과가 없을 수 있으므로, region + cleanCourse + query 방식으로 시도.

    const searchKeywords = userSearchQuery.split(' ').filter(q => q.length > 0);
    let userResults: Restaurant[] = [];

    for (const menu of searchKeywords) {
      if (userResults.length >= 8) break;
      // 지역명 + 메뉴, 골프장 + 메뉴 조합 시도
      const kw = `${region} ${cleanCourse} ${menu}`.trim();
      const res = await fetchFromNaver(kw, 'before', 'comment');

      res.forEach(r => {
        if (!userResults.some(ur => ur.name === r.name)) {
          r.reason = `${menu} 맛집 추천`;
          userResults.push(r);
        }
      });
    }

    // 만약 결과가 적으면 "지역명 + 메뉴"로 재시도
    if (userResults.length < 3) {
      for (const menu of searchKeywords) {
        if (userResults.length >= 8) break;
        const kw = `${region} ${menu}`.trim();
        const res = await fetchFromNaver(kw, 'before', 'sim');
        res.forEach(r => {
          if (!userResults.some(ur => ur.name === r.name)) {
            r.reason = `${menu} 숨은 맛집`;
            userResults.push(r);
          }
        });
      }
    }

    // 저녁 식사 추천도 추가 (선택한 메뉴와 무관하게 기존 로직 유지하거나, 아예 아침만 보여줄 수도 있음)
    // 현재 UI 흐름상 "조식 메뉴 선택"이므로 조식만 보여주는 게 맞을 수 있지만, 
    // 기존 앱 구조는 통합 리스트를 반환하므로 저녁도 포함해서 반환.
    const afterResults = await searchAfterMeals();
    return [...userResults, ...afterResults.slice(0, 5)];
  }

  // 기존 로직 (검색어 없을 때)
  const [beforeResults, afterResults] = await Promise.all([
    tryFetchBreakfast(info.golfCourse, info.address),
    searchAfterMeals()
  ]);

  // 후보가 너무 적다면 좀 더 넓은 지역으로 재검색
  // 조식 3개 보장 로직
  let finalBefore = beforeResults.slice(0, 5); // Take up to 5 to have a pool

  if (finalBefore.length < 3 && region) {
    console.log(`[Restaurant Fallback] Still lacking breakfast, searching broad region: ${region}`);
    const fallbackKeywords = [`${region} 해장국 맛집`, `${region} 아침식사`];
    for (const fkw of fallbackKeywords) {
      if (finalBefore.length >= 3) break;
      const fallbackResults = await fetchFromNaver(fkw, 'before');
      fallbackResults.forEach(res => {
        if (!finalBefore.some(b => b.name === res.name)) {
          finalBefore.push(res);
        }
      });
    }
  }

  // 최종 3개 이상 보장이 안될 경우 afterResults에서 가져오되 조식 가능 유무 강조
  if (finalBefore.length < 3 && afterResults.length > 0) {
    const extra = afterResults
      .filter(r => !finalBefore.some(b => b.name === r.name))
      .slice(0, 3 - finalBefore.length)
      .map(r => ({ ...r, type: 'before' as const, reason: "주변 인기 식당 (조식 가능 여부 확인 권장)" }));
    finalBefore.push(...extra);
  }

  finalBefore = finalBefore.slice(0, 4); // 최종 3~4개 노출
  const finalAfter = afterResults.slice(0, 6);

  return [...finalBefore, ...finalAfter];
}


// 5. 유튜브 코스 공략 영상 — 클라이언트 Gemini 호출 없이 로컬 폴백만 사용
export async function fetchCourseVideos(golfCourse: string): Promise<any[]> {
  return getFallbackVideos(golfCourse);
}

// Fallback videos for common golf courses
function getFallbackVideos(golfCourse: string): any[] {
  const courseName = golfCourse.toLowerCase();

  // Bear Creek Chuncheon
  if (courseName.includes('베어크리크') && courseName.includes('춘천')) {
    return [
      {
        title: "춘천베어크리크 l KPGA l 투어프로 l 코스공략",
        channel: "골프존",
        thumbnailUrl: "https://i.ytimg.com/vi/f8Jt_nI7E_E/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=f8Jt_nI7E_E",
        views: "24K",
        duration: "15:30"
      },
      {
        title: "베어크리크 춘천 Out 코스 (1~9번홀) 공략",
        channel: "골프TV",
        thumbnailUrl: "https://i.ytimg.com/vi/f8Jt_nI7E_E/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=f8Jt_nI7E_E",
        views: "1.5K",
        duration: "12:45"
      }
    ];
  }

  // Bear Creek Pocheon
  if (courseName.includes('베어크리크') && courseName.includes('포천')) {
    return [
      {
        title: "[4k] 베어크리크 포천 크리크 코스 라운드 l 코스 공략",
        channel: "골프존",
        thumbnailUrl: "https://i.ytimg.com/vi/f8Jt_nI7E_E/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=f8Jt_nI7E_E",
        views: "15K",
        duration: "18:20"
      }
    ];
  }

  // Shilla CC
  if (courseName.includes('신라')) {
    return [
      {
        title: "신라CC 남코스 5분 코스 공략 가이드",
        channel: "골프TV",
        thumbnailUrl: "https://i.ytimg.com/vi/f8Jt_nI7E_E/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=f8Jt_nI7E_E",
        views: "8K",
        duration: "5:30"
      }
    ];
  }

  // Generic fallback
  return [
    {
      title: `${golfCourse} 코스 공략 영상`,
      channel: "골프존",
      thumbnailUrl: "https://i.ytimg.com/vi/f8Jt_nI7E_E/hqdefault.jpg",
      videoUrl: "https://www.youtube.com/watch?v=f8Jt_nI7E_E",
      views: "-",
      duration: "-"
    }
  ];
}

// 6. 골프장 검색 (이름, 주소, 홈페이지 URL 반환)
export async function searchGolfCourseList(keyword: string): Promise<{ title: string, address: string, link: string }[]> {
  try {
    const naverId = import.meta.env.VITE_NAVER_SEARCH_ID || import.meta.env.VITE_NAVER_CLIENT_ID;
    const naverSecret = import.meta.env.VITE_NAVER_SEARCH_SECRET || import.meta.env.VITE_NAVER_CLIENT_SECRET;

    // "골프장" 키워드 자동 추가로 검색 정확도 향상
    const safeQuery = keyword.includes('골프') || keyword.includes('CC') || keyword.includes('GC')
      ? keyword
      : `${keyword} 골프장`;

    const response = await axios.get('/naver-search/v1/search/local.json', {
      params: {
        query: safeQuery,
        display: 10, // 충분히 가져와서 필터링
        sort: 'random'
      },
      headers: {
        'X-Naver-Client-Id': naverId,
        'X-Naver-Client-Secret': naverSecret
      }
    });

    // 골프장 카테고리 필터링 (골프/스포츠/레저)
    return response.data.items
      .filter((item: any) => {
        const cat = item.category || '';
        const title = item.title || '';
        return cat.includes('골프') ||
          title.includes('CC') ||
          title.includes('GC') ||
          title.includes('컨트리') ||
          title.includes('클럽');
      })
      .slice(0, 5) // 상위 5개만 반환
      .map((item: any) => ({
        title: item.title.replace(/<[^>]*>?/gm, ''),
        address: item.roadAddress || item.address,
        link: item.link || ''
      }));
  } catch (error) {
    console.error("Golf course search failed:", error);
    return [];
  }
}
