import { describe, expect, it } from 'vitest';
import data from '../data/golfCourses.json';
import { courseNameKey, matchCourse, searchCourses, type CourseDirectoryEntry } from './courseDirectory';

const entries = data as CourseDirectoryEntry[];

describe('course directory', () => {
  it('ships the merged nationwide dataset', () => {
    expect(entries.length).toBeGreaterThan(600);
    expect(entries.every((e) => e.n && typeof e.a === 'string')).toBe(true);
  });

  it('normalizes common suffixes', () => {
    expect(courseNameKey('한양컨트리클럽')).toBe(courseNameKey('한양 CC'));
    expect(courseNameKey('남촌CC')).toBe('남촌');
  });

  it('matches course names from booking text', () => {
    const hit = matchCourse(entries, '한양컨트리클럽');
    expect(hit?.a).toContain('고양시');
    expect(matchCourse(entries, '없는골프장이름xyz')).toBeNull();
  });

  it('searches by keyword for autocomplete', () => {
    const list = searchCourses(entries, '베어크리크');
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].n).toContain('베어크리크');
  });
});
