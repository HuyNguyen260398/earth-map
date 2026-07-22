import { describe, expect, it } from 'vitest';
import { nextBand } from './zoomLevels';

describe('nextBand', () => {
  it('stays in globe band at default altitude', () => {
    expect(nextBand('globe', 2.5)).toBe('globe');
  });

  it('enters countries band when zooming in past 1.8', () => {
    expect(nextBand('globe', 1.79)).toBe('countries');
  });

  it('enters detail band when zooming in past 0.6', () => {
    expect(nextBand('countries', 0.59)).toBe('detail');
    expect(nextBand('globe', 0.59)).toBe('detail'); // fast zoom skips a band
  });

  it('applies hysteresis between globe and countries', () => {
    // 1.9 is between enter (1.8) and exit (2.0): current band wins
    expect(nextBand('globe', 1.9)).toBe('globe');
    expect(nextBand('countries', 1.9)).toBe('countries');
    // leaving countries requires altitude >= 2.0
    expect(nextBand('countries', 2.0)).toBe('globe');
  });

  it('applies hysteresis between countries and detail', () => {
    // 0.7 is between enter (0.6) and exit (0.75): current band wins
    expect(nextBand('countries', 0.7)).toBe('countries');
    expect(nextBand('detail', 0.7)).toBe('detail');
    // leaving detail requires altitude >= 0.75
    expect(nextBand('detail', 0.75)).toBe('countries');
  });

  it('jumps from detail straight to globe when zooming far out', () => {
    expect(nextBand('detail', 2.5)).toBe('globe');
  });
});
