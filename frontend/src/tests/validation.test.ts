import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Client-Side Form Validation Schemas', () => {
  const loginSchema = z.object({
    email: z.string().email('Please enter a valid institutional email address'),
    password: z.string().min(1, 'Password is required'),
  });

  const academicYearSchema = z.string().regex(/^\d{4}-\d{4}$/, 'Must be in YYYY-YYYY format');

  const correctionSchema = z.object({
    attendanceRecordId: z.string().min(1, 'Record ID is required'),
    requestedStatus: z.enum(['present', 'late', 'excused']),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
  });

  it('validates email format strictly on login form', () => {
    expect(loginSchema.safeParse({ email: 'valid@apex.edu', password: 'secretPassword' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'notanemail', password: 'secretPassword' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: '', password: 'secretPassword' }).success).toBe(false);
  });

  it('validates academic year regex (YYYY-YYYY)', () => {
    expect(academicYearSchema.safeParse('2024-2025').success).toBe(true);
    expect(academicYearSchema.safeParse('2024-25').success).toBe(false);
    expect(academicYearSchema.safeParse('2024').success).toBe(false);
    expect(academicYearSchema.safeParse('abcd-efgh').success).toBe(false);
  });

  it('validates attendance correction request fields', () => {
    expect(
      correctionSchema.safeParse({
        attendanceRecordId: '64b8f102c4',
        requestedStatus: 'present',
        reason: 'Camera disconnected during lecture',
      }).success,
    ).toBe(true);

    expect(
      correctionSchema.safeParse({
        attendanceRecordId: '',
        requestedStatus: 'present',
        reason: 'short',
      }).success,
    ).toBe(false);

    expect(
      correctionSchema.safeParse({
        attendanceRecordId: '64b8f102c4',
        requestedStatus: 'unverified', // not allowed as requested status
        reason: 'Valid reason here',
      }).success,
    ).toBe(false);
  });
});
