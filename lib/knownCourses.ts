export interface KnownCourse {
  id: string;
  aliases: string[];
  golfCourse: string;
  address: string;
  lat: number;
  lng: number;
  phoneNumber?: string;
  homepage?: string;
  typicalDriveFromSeoulMinutes: number;
}

export const SEOUL_CITY_HALL = {
  lat: 37.5663,
  lng: 126.9779,
  address: '서울특별시 중구 태평로1가 31',
};

export const KNOWN_LANDMARKS: { aliases: string[]; lat: number; lng: number; address: string }[] = [
  { aliases: ['서울 시청', '서울시청', '서울'], lat: SEOUL_CITY_HALL.lat, lng: SEOUL_CITY_HALL.lng, address: SEOUL_CITY_HALL.address },
  { aliases: ['미사역', '미사'], lat: 37.5606, lng: 127.1816, address: '경기도 하남시 미사역' },
];

export const KNOWN_COURSES: KnownCourse[] = [
  {
    id: 'elysian-gangchon',
    aliases: [
      '엘리시안강촌',
      '엘리시안 강촌',
      'elysian gangchon',
      'elysian강촌',
      '강촌cc',
    ],
    golfCourse: '엘리시안강촌CC',
    address: '강원특별자치도 춘천시 남산면 북한강변길 688',
    lat: 37.8183,
    lng: 127.5897,
    phoneNumber: '033-260-2000',
    homepage: 'https://www.elysian.co.kr/gangchon/',
    typicalDriveFromSeoulMinutes: 80,
  },
  {
    id: 'bearcreek-chuncheon',
    aliases: ['베어크리크 춘천', '베어크리크춘천', '춘천 베어크리크'],
    golfCourse: '베어크리크 춘천',
    address: '강원특별자치도 춘천시 동산면 조양길 300',
    lat: 37.7742,
    lng: 127.7815,
    typicalDriveFromSeoulMinutes: 85,
  },
  {
    id: 'bearcreek-pocheon',
    aliases: ['베어크리크 포천', '베어크리크포천', '포천 베어크리크'],
    golfCourse: '베어크리크 포천',
    address: '경기도 포천시 신북면 신평로 189',
    lat: 37.9675,
    lng: 127.2068,
    typicalDriveFromSeoulMinutes: 55,
  },
];

export function findKnownCourse(text: string): KnownCourse | null {
  const normalized = text.replace(/\s+/g, '').toLowerCase();
  return (
    KNOWN_COURSES.find((course) =>
      course.aliases.some((alias) => normalized.includes(alias.replace(/\s+/g, '').toLowerCase()))
    ) || null
  );
}

export function findKnownLandmark(text: string): { lat: number; lng: number; address: string } | null {
  const normalized = text.replace(/\s+/g, '').toLowerCase();
  return (
    KNOWN_LANDMARKS.find((spot) =>
      spot.aliases.some((alias) => normalized.includes(alias.replace(/\s+/g, '').toLowerCase()))
    ) || null
  );
}

export function isSeoulArea(text?: string, coords?: { lat: number; lng: number } | null): boolean {
  if (text && /서울|시청|강남|서초|송파|하남|미사|경기 광진|성남/.test(text)) return true;
  if (coords) {
    return coords.lat > 37.4 && coords.lat < 37.7 && coords.lng > 126.7 && coords.lng < 127.3;
  }
  return false;
}
