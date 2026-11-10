import { ValidationError } from '@/shared/errors/app-error';

export function validateCompensation(min: number | null | undefined, max: number | null | undefined): void {
  for (const amount of [min, max]) {
    if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 9_999_999_999.99)) {
      throw new ValidationError('Compensation must be a non-negative amount below 10 billion.');
    }
  }
  if (min != null && max != null && min > max) throw new ValidationError('Minimum compensation cannot exceed maximum compensation.');
}
