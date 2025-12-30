
export interface RoundingInfo {
  golfCourse: string;
  address?: string; // 정밀 위치 탐색을 위한 주소 추가
  date: string;
  teeOffTime: string;
  logoUrl?: string;
  lat?: number;
  lng?: number;
  // 추가된 코스 상세 정보
  courseScale?: string;      // 예: 퍼블릭 18홀
  grassInfo?: string;       // 예: 페어웨이 안양중지 / 그린 벤트그라스
  yardage?: {
    in: string;
    out: string;
  };
  courseRating?: string;
  greenFee?: string;        // 예: 평일 20만원 / 주말 26만원
  cartFee?: string;         // 예: 10만원
  caddieFee?: string;       // 예: 15만원
  phoneNumber?: string;     // 예: 031-123-4567
  homepage?: string;        // 공식 홈페이지 URL
  amenities?: string[];     // 예: ["그늘집", "프로샵", "사우나"]
  previewImageUrl?: string; // 골프장 전경 혹은 공식 홈페이지 캡쳐 이미지
}

export interface HourlyWeather {
  time: string;
  temp: string;
  condition: string;
  precip: string;
  wind: string;
}

export interface WeatherData {
  source: string;
  temperature: string;
  wind: string;
  precipitation: string;
  condition: string;
  hourly: HourlyWeather[];
  satelliteDescription?: string;
  satelliteImageUrl?: string;
  nowcast?: string;
}

export interface MenuItem {
  name: string;
  price: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface Restaurant {
  name: string;
  category: string;
  address?: string;
  rating: number;
  openTime: string;
  mainMenus: MenuItem[];
  reason: string;
  type: 'before' | 'after';
  distanceToGolfCourse?: string;
  travelTimeToGolfCourse?: string;
  distanceFromHome?: string;
  travelTimeFromHome?: string;
  lat?: number;
  lng?: number;
  verified?: boolean; // 거리 검증 완료 여부
  placeUrl?: string;  // 식당 상세 지도 URL
  phoneNumber?: string; // 식당 전화번호
}

export interface ScheduleAdvice {
  travelTimeMinutes: number;
  departureTime: string;
  explanation: string;
}

export interface SavedCredential {
  id: string;
  golfCourse: string;
  username: string;
  password: string;
  url: string;
}
