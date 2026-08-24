import { findKnownCourse, isSeoulArea, SEOUL_CITY_HALL } from './knownCourses';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateTravelMinutes(
  start: { lat: number; lng: number; address?: string } | null,
  dest: { lat?: number; lng?: number; golfCourse?: string; address?: string },
): number {
  const startLat = start?.lat ?? SEOUL_CITY_HALL.lat;
  const startLng = start?.lng ?? SEOUL_CITY_HALL.lng;
  const destLat = dest.lat;
  const destLng = dest.lng;

  const known = dest.golfCourse ? findKnownCourse(dest.golfCourse) : dest.address ? findKnownCourse(dest.address) : null;
  if (known && isSeoulArea(start?.address, start)) {
    return known.typicalDriveFromSeoulMinutes;
  }

  if (destLat == null || destLng == null) {
    return known?.typicalDriveFromSeoulMinutes ?? 70;
  }

  const distRaw = calculateDistanceKm(startLat, startLng, destLat, destLng);
  const distEst = distRaw * 1.3;
  const speed = distEst >= 50 ? 80 : distEst >= 20 ? 60 : 30;
  return Math.max(15, Math.round((distEst / speed) * 60 + 5));
}

export function formatClock(hours: number, minutes: number): string {
  const h = ((hours % 24) + 24) % 24;
  const m = ((minutes % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function subtractMinutesFromTee(teeOffTime: string, minutesOffset: number): string {
  const timeMatch = teeOffTime.match(/(\d+)\D+(\d+)/);
  let h: number;
  let m: number;

  if (timeMatch) {
    h = parseInt(timeMatch[1], 10);
    m = parseInt(timeMatch[2], 10);
  } else {
    const parts = teeOffTime.split(':').map(Number);
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      h = parts[0];
      m = parts[1];
    } else {
      return '--:--';
    }
  }

  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() - minutesOffset);
  return date.toTimeString().slice(0, 5);
}
