import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeCsv, isoDateStamp, rowsToCsv } from '../export.js';

test('escapes CSV commas, quotes and line breaks safely', () => {
  assert.equal(escapeCsv('plain'), 'plain');
  assert.equal(escapeCsv('camera, tripod'), '"camera, tripod"');
  assert.equal(escapeCsv('He said "ready"'), '"He said ""ready"""');
  assert.equal(escapeCsv('line 1\nline 2'), '"line 1\nline 2"');
});

test('serializes rows using CRLF for spreadsheet compatibility', () => {
  assert.equal(
    rowsToCsv([
      ['Name', 'Status'],
      ['Microscope', 'Available'],
    ]),
    'Name,Status\r\nMicroscope,Available',
  );
});

test('creates deterministic local date stamps', () => {
  assert.equal(isoDateStamp(new Date(2026, 8, 14, 12, 0, 0)), '2026-09-14');
});
