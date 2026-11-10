import '@testing-library/jest-dom';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
  window.alert = vi.fn();
  window.confirm = vi.fn().mockReturnValue(true);
}
