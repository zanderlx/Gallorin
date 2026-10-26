import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayBirthday, horseDaysOwned, horseAgeLabel, horseAcquisitionDate } from '../public/dates.js';
import { updateHorseField } from '../public/horse-fields.js';
test('birthdays display month-day-year while retaining their saved dates', () => {
  assert.equal(displayBirthday('2020-02-29'), '02-29-2020');
  assert.equal(displayBirthday('2006-10-20'), '10-20-2006');
});
test('horse age counts local calendar days since capture, including midnight and leap days', () => {
  const horse = { caughtAt: new Date(2024, 1, 28, 23, 59).toISOString(), birthday: '2000-01-01' };
  assert.equal(horseAcquisitionDate(horse), '2024-02-28');
  assert.equal(horseDaysOwned(horse, new Date(2024, 1, 28, 23, 59)), 0);
  assert.equal(horseAgeLabel(horse, new Date(2024, 1, 29, 0, 1)), '1 day');
  assert.equal(horseAgeLabel(horse, new Date(2024, 2, 1, 0, 1)), '2 days');
  assert.equal(horseDaysOwned(horse, new Date(2024, 1, 27)), 0);
  assert.equal(horseAgeLabel({}), 'Not caught yet');
  assert.equal(horseDaysOwned({ caughtAt: 'invalid' }), null);
});
test('editing an owned horse birthday changes the acquisition date used by its age', () => {
  const horse = { caughtAt: new Date(2024, 1, 28, 23, 59).toISOString() };
  updateHorseField(horse, 'birthday', '2024-02-29', {}, {});
  assert.equal(horseAcquisitionDate(horse), '2024-02-29');
  assert.equal(horseAgeLabel(horse, new Date(2024, 2, 1, 12)), '1 day');
});
