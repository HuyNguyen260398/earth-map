import { describe, expect, it } from 'vitest';
import { nextBand } from './zoomLevels';

describe('nextBand', () => {
  it('stays in globe band at default altitude', () => {
    expect(nextBand('globe', 2.5)).toBe('globe');
  });

  it('enters countries band when zooming in past 1.8', () => {
    expect(nextBand('globe', 1.79)).toBe('countries');
  });

  it('never enters the detail band by zooming — that needs a country pick', () => {
    expect(nextBand('countries', 0.3)).toBe('countries');
    expect(nextBand('globe', 0.3)).toBe('countries');
  });

  it('applies hysteresis between globe and countries', () => {
    // 1.9 is between enter (1.8) and exit (2.0): current band wins
    expect(nextBand('globe', 1.9)).toBe('globe');
    expect(nextBand('countries', 1.9)).toBe('countries');
    // leaving countries requires altitude >= 2.0
    expect(nextBand('countries', 2.0)).toBe('globe');
  });

  it('leaves the detail band when zooming out past 0.8', () => {
    expect(nextBand('detail', 0.79)).toBe('detail');
    expect(nextBand('detail', 0.8)).toBe('countries');
  });

  it('jumps from detail straight to globe when zooming far out', () => {
    expect(nextBand('detail', 2.5)).toBe('globe');
  });
});
