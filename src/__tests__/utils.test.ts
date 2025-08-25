import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatRelativeTime,
  generateSlug,
  calculateRiceScore,
  calculateWsjfScore,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/January 15, 2024/);
    });

    it('should handle string dates', () => {
      const formatted = formatDate('2024-01-15');
      expect(formatted).toMatch(/January 15, 2024/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return \"just now\" for recent dates', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });
  });

  describe('generateSlug', () => {
    it('should create valid slugs', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('Special Characters!')).toBe('special-characters');
      expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(generateSlug('UPPERCASE')).toBe('uppercase');
    });

    it('should handle empty strings', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug('   ')).toBe('');
    });
  });

  describe('calculateRiceScore', () => {
    it('should calculate RICE score correctly', () => {
      // RICE = (Reach * Impact * Confidence) / Effort
      expect(calculateRiceScore(100, 3, 0.8, 2)).toBe(120);
      expect(calculateRiceScore(50, 5, 1, 1)).toBe(250);
    });

    it('should handle zero effort', () => {
      expect(calculateRiceScore(100, 3, 0.8, 0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculateRiceScore(75, 4, 0.5, 1.5)).toBe(100);
    });
  });

  describe('calculateWsjfScore', () => {
    it('should calculate WSJF score correctly', () => {
      // WSJF = Business Value / Job Size
      expect(calculateWsjfScore(100, 10)).toBe(10);
      expect(calculateWsjfScore(75, 5)).toBe(15);
    });

    it('should handle zero job size', () => {
      expect(calculateWsjfScore(100, 0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculateWsjfScore(150, 7.5)).toBe(20);
    });
  });
});