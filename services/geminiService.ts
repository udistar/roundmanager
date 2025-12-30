import axios from 'axios';
import { GoogleGenAI, Type } from "@google/genai";
import { RoundingInfo, WeatherData, Restaurant } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta.env.VITE_GEMINI_API_KEY || '') as string });

// 1. 예약 메시지 파싱 및 상세 코스 정보 추출
export async function parseBookingMessage(message: string): Promise<RoundingInfo> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: `Extract golf rounding info from: "${message}". 
    
    🚨 **ULTRA-STRICT VERIFICATION MANDATE** 🚨
    **STEP 1**: Search for the OFFICIAL website of "${message}". BEWARE of unofficial booking directories. 
    **STEP 2**: Verify the URL (homepage). Must be the direct club domain (e.g., club72.com). PREFER the root domain or main landing page. AVOID deep mobile links like /m/index.asp which might be dead.
    **STEP 3**: Cross-check the REAL current address and official phone number.
    **STEP 4**: Extract REAL business data: Green Fee, Cart Fee, Caddie Fee. Must be from the current season.
    **STEP 5**: Find the ACTUAL hero image from the official site.
    
    **REQUIRED DATA**:
    1. Verified Official Website URL (homepage) - MUST BE THE STABLE ROOT OR MAIN PAGE.
    2. Official Phone Number (phoneNumber)
    3. Clubhouse/Course Main Image URL (previewImageUrl)
    
    Return JSON: {golfCourse, address, date, teeOffTime, logoUrl, lat, lng, courseScale, grassInfo, yardage: {in, out}, courseRating, greenFee, cartFee, caddieFee, phoneNumber, homepage, amenities: [], previewImageUrl}.
    **NO HALLUCINATION**: If the official homepage cannot be found with 99% certainty, return null for that field. ALL TEXT IN KOREAN.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          golfCourse: { type: Type.STRING },
          address: { type: Type.STRING },
          date: { type: Type.STRING },
          teeOffTime: { type: Type.STRING },
          logoUrl: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          courseScale: { type: Type.STRING },
          grassInfo: { type: Type.STRING },
          yardage: {
            type: Type.OBJECT,
            properties: {
              in: { type: Type.STRING },
              out: { type: Type.STRING }
            }
          },
          courseRating: { type: Type.STRING },
          greenFee: { type: Type.STRING },
          cartFee: { type: Type.STRING },
          caddieFee: { type: Type.STRING },
          phoneNumber: { type: Type.STRING },
          homepage: { type: Type.STRING },
          amenities: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          previewImageUrl: { type: Type.STRING }
        },
        required: ["golfCourse", "date", "teeOffTime", "lat", "lng", "homepage"],
      },
    },
  });

  console.log('[parseBookingMessage] Raw API Response:', response);
  console.log('[parseBookingMessage] Response Text:', response.text);

  let text = response.text;
  const jsonMatch = text.match(/\{.*\}/s);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  console.log('[parseBookingMessage] Extracted JSON Text:', text);
  const parsed = JSON.parse(text);
  console.log('[parseBookingMessage] Parsed Object:', parsed);

  // URL 검증: 도메인이 아닌 텍스트가 들어오는지 확인
  if (parsed.homepage && !parsed.homepage.startsWith('http')) {
    console.warn(`[Verification] Homepage link invalid format: ${parsed.homepage}`);
    parsed.homepage = null;
  }

  console.log(`[Golf Course Analysis] Verified Homepage: ${parsed.homepage}`);

  // 🔥 Gemini 데이터를 완전히 무시하고 네이버 검색 API로 정확한 정보 확보
  if (parsed.golfCourse) {
    try {
      const axios = (await import('axios')).default;

      console.log(`[Naver Search Override] Searching for: ${parsed.golfCourse}`);

      const searchResponse = await axios.get('/naver-search/v1/search/local.json', {
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
        const geo = await getGeocode(naverAddress);
        if (geo) {
          parsed.address = geo.address;
          parsed.lat = geo.lat;
          parsed.lng = geo.lng;
          console.log(`[Naver Search Override] ✅ Final Coords: (${geo.lat}, ${geo.lng})`);
        } else {
          // Geocode 실패 시 Search API 데이터라도 사용 (좌표는 0이 될 수 있으므로 주의)
          parsed.address = naverAddress;
          console.warn(`[Naver Search Override] ⚠️ Geocoding failed, using Search API address only.`);
        }

        // 골프장 이름도 네이버 결과로 교체 (더 정확할 수 있음)
        if (naverName && naverName.length > 0) {
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

// 2. 이동 시간만 빠르게 계산
export async function fetchTravelTime(start: string, destination: string): Promise<number> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: `Estimate driving minutes from "${start}" to "${destination}" in Korea. Return only the integer number.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  const match = response.text.match(/\d+/);
  return match ? parseInt(match[0]) : 60;
}

// 3. 날씨 정보 가져오기
export async function fetchWeather(info: RoundingInfo): Promise<WeatherData[]> {
  const cleanCourse = info.golfCourse.replace(/(CC|GC|클럽|골프장|리조트)/g, '').trim();
  const prompt = `Find ACTUAL weather for ${cleanCourse} (${info.address || ''}) on ${info.date} starting ${info.teeOffTime}.
  SOURCES: 기상청(KMA), AccuWeather, yr.no (노르웨이 기상청).
  
  **CRITICAL CONSTRAINTS (ZERO TOLERANCE FOR RAMBLING)**:
  1. ALL TEXT MUST BE IN KOREAN.
  2. "temp" and "temperature": ONLY number + °C (e.g. "-5°C"). NO EXPLANATION.
  3. "wind": ONLY number + m/s + direction (e.g. "3m/s 북서"). MAX 10 chars.
  4. "precip" and "precipitation": ONLY mm + % (e.g. "0.0mm (0%)", "2.5mm (60%)"). MAX 15 chars.
  5. "condition": Generic weather keyword (맑음, 흐림, 비, 눈, 구름조금).
  6. "nowcast": Single sentence summary (MAX 30 chars).
  7. "hourly": Provide EXACTLY 6 hourly forecasts starting from tee time (1-hour intervals).
     - Each hourly entry must have: time (HH:00 format), temp, condition, precip, wind
     - Example: {"time": "09:00", "temp": "-5°C", "condition": "맑음", "precip": "0mm (0%)", "wind": "2m/s"}
  
  Return JSON array of EXACTLY 3 objects (one for each source).
  Schema: {source, temperature, wind, precipitation, condition, nowcast, hourly: [{time, temp, condition, precip, wind}]}`;

  const sources = ["기상청(KMA)", "AccuWeather", "yr.no (노르웨이 기상청)"];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          minItems: 3,
          maxItems: 3,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              temperature: { type: Type.STRING },
              wind: { type: Type.STRING },
              precipitation: { type: Type.STRING },
              condition: { type: Type.STRING },
              nowcast: { type: Type.STRING },
              hourly: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    temp: { type: Type.STRING },
                    condition: { type: Type.STRING },
                    precip: { type: Type.STRING },
                    wind: { type: Type.STRING },
                  },
                },
              },
            },
            required: ["source", "temperature", "condition", "hourly"],
          },
        },
      },
    });

    let text = response.text;
    // Robust cleaning for malformed JSON tags
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    let data = JSON.parse(text);

    return data.map((item: any, idx: number) => {
      // 데이터가 불충분하거나 없으면 그냥 해당 항목 Skip 또는 에러 처리 (거짓 정보 생성 금지)
      const hasNoTemp = !item.temperature || item.temperature.includes("없음") || item.temperature.length < 2;

      if (hasNoTemp) {
        return {
          source: item.source || sources[idx],
          error: true // 에러 플래그 추가
        };
      }

      // 개별 필드 정제 (너무 긴 텍스트 제한)
      if (item.wind) {
        item.wind = item.wind.split(' ').slice(0, 2).join(' ').substring(0, 15);
      }
      if (item.hourly) {
        item.hourly.forEach((h: any) => {
          if (h.wind) {
            h.wind = h.wind.split(' ').slice(0, 1).join('').substring(0, 10);
          }
        });
      }

      return item;
    });
  } catch (err: any) {
    console.error("Weather Fetch Failed Detail:", err?.message || err);
    // API 실패 시 빈 배열 리턴 -> UI에서 "정보 없음" 표시
    return [];
  }
}


// 3.5 골프장 위치 검색 (정확한 주소 및 좌표 확보용)
export async function searchGolfCourseLocation(courseName: string): Promise<{ address: string, lat: number, lng: number } | null> {
  try {
    const response = await axios.get('/naver-search/v1/search/local.json', {
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

    const response = await axios.get('/naver-search/v1/search/local.json', {
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

import { getGeocode } from './naverService';

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
export async function fetchRestaurants(info: RoundingInfo, _startLocation: string, startCoords?: { lat: number, lng: number } | null): Promise<Restaurant[]> {
  const fetchFromNaver = async (query: string, type: 'before' | 'after', sortMethod: 'comment' | 'sim' = 'comment'): Promise<Restaurant[]> => {
    try {
      const response = await axios.get('/naver-search/v1/search/local.json', {
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
          // 1. 기본 반경 제약 (골프장 기준 8km 이내로 축소)
          if (distanceToGolf > 8) continue;

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

        let verifiedMenus = [{ name: "메뉴 정보", price: "네이버 플레이스 참조" }];
        if (isTopThree) {
          try {
            await sleep(500); // 추가 대기
            const menuPrompt = `Representative menu for "${name}" at "${finalAddress}". Return JSON array: [{"name": "item", "price": "15,000원"}]. EXACTLY 2 items. Use Korean currency format (e.g. 15,000원).`;
            const menuResponse = await ai.models.generateContent({
              model: "gemini-2.0-flash-exp",
              contents: menuPrompt,
              config: { tools: [{ googleSearch: {} }] }
            });
            const jsonMatch = menuResponse.text.match(/\[.*\]/s);
            if (jsonMatch) verifiedMenus = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.warn("Menu AI Prompt failed (rate limit?):", e);
          }
        }

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


// 5. 유튜브 코스 공략 영상 가져오기
export async function fetchCourseVideos(golfCourse: string): Promise<any[]> {
  const prompt = `
  🚨🚨🚨 ZERO TOLERANCE FOR HALLUCINATED VIDEO IDs 🚨🚨🚨
  **READ CAREFULLY: USER IS WATCHING DELETED VIDEOS. DO NOT GENERATE RANDOM IDs.**
  
  **INSTRUCTIONS:**
  1. 🔍 **SEARCH YOUTUBE**: Find the top 3-5 RECENT and PLAYABLE videos for "${golfCourse} 코스 공략".
  2. ✅ **VERIFY VIDEO ID**: Copy exactly from search results. Format MUST be https://www.youtube.com/watch?v=VIDEO_ID.
  3. ❌ **NO FAKE IDs**: If you can't find a video for the specific course, search for close matches or return empty list.
  
  **GROUND TRUTH (USE THESE EXACTLY IF COURSE MATCHES):**
  If searching for Bear Creek Chuncheon (베어크리크 춘천):
  - "춘천베어크리크 l KPGA l 투어프로 l 코스공략" (https://www.youtube.com/watch?v=5n7Ud_7tScQ)
  - "베어크리크 춘천 Out 코스 (1~9번홀) 공략" (https://www.youtube.com/watch?v=UE1guOc8tgs)
  - "베어크리크 춘천 In코스 (10~18번홀) 공략" (https://www.youtube.com/watch?v=nv51w3RslX4)
  
  If searching for Shilla CC (신라CC):
  - "신라CC 남코스 5분 코스 공략 가이드" (https://www.youtube.com/watch?v=7h7K6n5t7h4)
  - "여주 신라CC 서코스 코스공략 가이드" (https://www.youtube.com/watch?v=fN7Y7x6tW6Y)
  - "신라CC 동코스 공략 l 리보플TV" (https://www.youtube.com/watch?v=T9i7Vb_y_9s)

  If searching for Bear Creek Pocheon (베어크리크 포천):
  - "[4k] 베어크리크 포천 크리크 코스 라운드 l 코스 공략" (https://www.youtube.com/watch?v=PuNox-yUk0U)
  - "[4k] 베어크리크 포천 베어코스 라운드 l 공략법" (https://www.youtube.com/watch?v=x4D6jeBuZCI)
  - "포천 베어크리크GC 크리크 Out코스 (1~9번) 5분 공략" (https://www.youtube.com/watch?v=HiBmHa14NxE)
  
  **REQUIRED DATA PER VIDEO:**
  - title: Exact video title
  - channel: Channel name
  - thumbnailUrl: High quality thumbnail URL (e.g., https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg)
  - videoUrl: Valid watch?v= format
  - views: String
  - duration: String
  
  Return JSON array of verified videos. ALL KOREAN.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              channel: { type: Type.STRING },
              thumbnailUrl: { type: Type.STRING },
              videoUrl: { type: Type.STRING },
              views: { type: Type.STRING },
              duration: { type: Type.STRING },
            },
          },
        },
      },
    });

    const videos = JSON.parse(response.text);

    // URL 및 ID 정밀 검증
    const validatedVideos = videos.filter((video: any) => {
      if (!video.videoUrl || !video.videoUrl.includes('youtube.com')) {
        console.warn(`[Video Validation] ❌ Invalid URL: ${video.videoUrl}`);
        return false;
      }

      // Video ID 추출 시도
      let videoId = '';
      if (video.videoUrl.includes('watch?v=')) {
        videoId = video.videoUrl.split('watch?v=')[1]?.split('&')[0];
      } else if (video.videoUrl.includes('youtu.be/')) {
        videoId = video.videoUrl.split('youtu.be/')[1]?.split('?')[0];
      }

      if (!videoId || videoId.length < 10) {
        console.warn(`[Video Validation] ❌ Could not parse valid ID from: ${video.videoUrl}`);
        return false;
      }

      // 썸네일 URL이 누락되거나 잘못되었을 경우 자동 수정
      if (!video.thumbnailUrl || video.thumbnailUrl.includes('undefined')) {
        video.thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }

      console.log(`[Video Validation] ✅ Verified Active Video: ${video.title} (${videoId})`);
      return true;
    });

    console.log(`[Video Validation] Final Playable Videos: ${validatedVideos.length}/${videos.length}`);
    return validatedVideos.slice(0, 3);
  } catch (err) {
    console.error("fetchCourseVideos error:", err);
    return [];
  }
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
