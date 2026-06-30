// src/types/index.ts

export enum OnboardingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DECLINED_AGE = 'DECLINED_AGE',
  CANCELLED = 'CANCELLED',
}

export enum OnboardingStep {
  WELCOME = 'WELCOME',
  AGE_GATE = 'AGE_GATE',
  STATEMENT = 'STATEMENT',
  LEGAL = 'LEGAL',
  DONE = 'DONE',
}

export interface UserRecord {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string;
  age_confirmed: boolean;
  legal_accepted: boolean;
  status: OnboardingStatus;
  onboarding_step: OnboardingStep;
  created_at: Date;
  updated_at: Date;
}

export interface OnboardingSession {
  telegram_id: number;
  step: OnboardingStep;
}
