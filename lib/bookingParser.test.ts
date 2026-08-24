import { describe, expect, it } from 'vitest';
import { parseBookingLocally, reconstructRoundingInfo } from './bookingParser';
import { estimateTravelMinutes, subtractMinutesFromTee } from './travelEstimate';
import { SEOUL_CITY_HALL } from './knownCourses';

const REAL_BOOKING = `Course: 엘리시안강촌CC Lake
Tee: 2026-08-25 08:08–12:38 Asia/Seoul
Booker: 홍시윤
Green fee: 13만원 (4인 필수)
Arrive 40 minutes early, 마니아회원 required
Location: 엘리시안 강촌CC`;

describe('parseBookingLocally', () => {
  it('parses the real Elysian Gangchon booking text', () => {
    const info = parseBookingLocally(REAL_BOOKING);

    expect(info.golfCourse).toMatch(/엘리시안강촌/);
    expect(info.date).toContain('2026');
    expect(info.date).toContain('8월');
    expect(info.date).toContain('25');
    expect(info.teeOffTime).toBe('08:08');
    expect(info.greenFee).toBe('13만원');
    expect(info.members).toBe(4);
    expect(info.booker).toBe('홍시윤');
    expect(info.arrivalBuffer).toBe(40);
    expect(info.address).toContain('춘천');
    expect(info.lat).toBeCloseTo(37.8183, 2);
    expect(info.lng).toBeCloseTo(127.5897, 2);
  });

  it('accepts Korean SMS-style text', () => {
    const info = parseBookingLocally('[엘리시안 강촌CC] 2026년 8월 25일 티업 08시 08분 4인 그린피 13만원');
    expect(info.golfCourse).toMatch(/엘리시안/);
    expect(info.teeOffTime).toBe('08:08');
    expect(info.date).toContain('2026');
  });

  it('lets manual fields complete a sparse paste', () => {
    const info = parseBookingLocally('마니아회원 필수', {
      golfCourse: '엘리시안강촌CC',
      date: '2026-08-25',
      teeOffTime: '08:08',
    });
    expect(info.golfCourse).toMatch(/엘리시안강촌CC/);
    expect(info.teeOffTime).toBe('08:08');
    expect(info.address).toContain('북한강변길');
  });

  it('throws a Korean error when required fields are missing', () => {
    expect(() => parseBookingLocally('내일 골프 가자')).toThrow(/찾지 못했습니다/);
  });
});

describe('reconstructRoundingInfo', () => {
  it('rebuilds a saved card that lost fullInfo', () => {
    const info = reconstructRoundingInfo({
      golfCourse: '엘리시안강촌CC Lake',
      date: '2026-08-25',
      time: '08:08',
      location: '엘리시안 강촌CC',
    });
    expect(info.teeOffTime).toBe('08:08');
    expect(info.lat).toBeDefined();
    expect(info.lng).toBeDefined();
  });
});

describe('departure plan', () => {
  it('leaves home in time to arrive 40 minutes before 08:08', () => {
    const info = parseBookingLocally(REAL_BOOKING);
    const travel = estimateTravelMinutes(
      { ...SEOUL_CITY_HALL },
      { lat: info.lat, lng: info.lng, golfCourse: info.golfCourse, address: info.address },
    );
    const prepTime = 20;
    const arrivalBuffer = 40;
    const departure = subtractMinutesFromTee(info.teeOffTime, prepTime + travel + arrivalBuffer);

    expect(travel).toBe(80);
    // 08:08 - 80분 이동 - 40분 조기도착 - 20분 준비 = 05:48
    expect(departure).toBe('05:48');
  });
});
