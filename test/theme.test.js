import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { themeInitScript } from '../src/lib/theme.js';

function initialTheme(saved, blocked = false) {
  const classes = new Set(['dark']);
  runInNewContext(themeInitScript, {
    localStorage: { getItem: () => { if (blocked) throw new Error('Storage blocked'); return saved; } },
    window: { matchMedia: () => { throw new Error('System theme must not decide the default'); } },
    document: { documentElement: { classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) } } },
  });
  return classes.has('dark') ? 'dark' : 'light';
}

test('theme defaults to light without consulting system dark mode', () => {
  for (const saved of [null, undefined, '', 'invalid', 'light']) assert.equal(initialTheme(saved), 'light');
});
test('theme restores an explicit dark preference and tolerates blocked storage', () => {
  assert.equal(initialTheme('dark'), 'dark');
  assert.equal(initialTheme(null, true), 'light');
});
