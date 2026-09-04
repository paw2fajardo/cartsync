import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch (_) {}
});
