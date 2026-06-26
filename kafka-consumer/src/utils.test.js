const { getDistance, deg2rad, calculateMedian, stdDev } = require('./utils');

describe('Utility Functions', () => {
  describe('deg2rad', () => {
    it('converts 180 degrees to PI radians', () => {
      expect(deg2rad(180)).toBeCloseTo(Math.PI);
    });
    
    it('converts 90 degrees to PI/2 radians', () => {
      expect(deg2rad(90)).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('getDistance', () => {
    it('calculates distance correctly between two same points', () => {
      expect(getDistance(40.7128, -74.0060, 40.7128, -74.0060)).toBeCloseTo(0);
    });

    it('calculates distance correctly between New York and London', () => {
      // NY: 40.7128° N, 74.0060° W
      // London: 51.5074° N, 0.1278° W
      // Distance is ~5570 km
      const distance = getDistance(40.7128, -74.0060, 51.5074, -0.1278);
      expect(distance).toBeGreaterThan(5500);
      expect(distance).toBeLessThan(5650);
    });
  });

  describe('calculateMedian', () => {
    it('returns 0 for empty array', () => {
      expect(calculateMedian([])).toBe(0);
    });

    it('calculates median for odd-length array', () => {
      expect(calculateMedian([3, 1, 4, 1, 5])).toBe(3);
    });

    it('calculates median for even-length array', () => {
      expect(calculateMedian([3, 1, 4, 2])).toBe(2.5); // sorted: 1, 2, 3, 4
    });
  });

  describe('stdDev', () => {
    it('returns 0 for array with 1 or fewer elements', () => {
      expect(stdDev([], 0)).toBe(0);
      expect(stdDev([5], 5)).toBe(0);
    });

    it('calculates sample standard deviation correctly', () => {
      // Data: 2, 4, 4, 4, 5, 5, 7, 9
      // Mean: 5
      // Variance: ((2-5)^2 + 3*(4-5)^2 + 2*(5-5)^2 + (7-5)^2 + (9-5)^2) / 7 = (9 + 3 + 0 + 4 + 16) / 7 = 32 / 7 ≈ 4.5714
      // StdDev: sqrt(32/7) ≈ 2.138
      const arr = [2, 4, 4, 4, 5, 5, 7, 9];
      expect(stdDev(arr, 5)).toBeCloseTo(2.138089935299395);
    });
  });
});
