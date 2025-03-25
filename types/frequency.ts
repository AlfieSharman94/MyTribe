export type FrequencyType = 'random' | 'weekday';
export type WeekdayInterval = 'weekly' | 'fortnightly' | 'monthly';

export interface FrequencyOption {
  id: string;
  type: FrequencyType;
  label: string;
  weekday?: number; // 0-6 for Sunday-Saturday
  interval?: WeekdayInterval;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  // Random intervals
  { id: 'r0', type: 'random', label: 'Every 1 minute (Testing)' },
  { id: 'r1', type: 'random', label: 'Daily' },
  { id: 'r2', type: 'random', label: 'Every 3 days' },
  { id: 'r3', type: 'random', label: 'Weekly' },
  { id: 'r4', type: 'random', label: 'Every 2 weeks' },
  { id: 'r5', type: 'random', label: 'Monthly' },
  { id: 'r6', type: 'random', label: 'Every 3 months' },
  { id: 'r7', type: 'random', label: 'Every 6 months' },
  { id: 'r8', type: 'random', label: 'Yearly' },
  // Weekly intervals
  { id: 'w1', type: 'weekday', label: 'Every Monday', weekday: 1, interval: 'weekly' },
  { id: 'w2', type: 'weekday', label: 'Every Tuesday', weekday: 2, interval: 'weekly' },
  { id: 'w3', type: 'weekday', label: 'Every Wednesday', weekday: 3, interval: 'weekly' },
  { id: 'w4', type: 'weekday', label: 'Every Thursday', weekday: 4, interval: 'weekly' },
  { id: 'w5', type: 'weekday', label: 'Every Friday', weekday: 5, interval: 'weekly' },
  { id: 'w6', type: 'weekday', label: 'Every Saturday', weekday: 6, interval: 'weekly' },
  { id: 'w7', type: 'weekday', label: 'Every Sunday', weekday: 0, interval: 'weekly' },
  // Fortnightly intervals
  { id: 'w0_fortnightly', type: 'weekday', label: 'Every other Sunday', weekday: 0, interval: 'fortnightly' },
  { id: 'w1_fortnightly', type: 'weekday', label: 'Every other Monday', weekday: 1, interval: 'fortnightly' },
  { id: 'w2_fortnightly', type: 'weekday', label: 'Every other Tuesday', weekday: 2, interval: 'fortnightly' },
  { id: 'w3_fortnightly', type: 'weekday', label: 'Every other Wednesday', weekday: 3, interval: 'fortnightly' },
  { id: 'w4_fortnightly', type: 'weekday', label: 'Every other Thursday', weekday: 4, interval: 'fortnightly' },
  { id: 'w5_fortnightly', type: 'weekday', label: 'Every other Friday', weekday: 5, interval: 'fortnightly' },
  { id: 'w6_fortnightly', type: 'weekday', label: 'Every other Saturday', weekday: 6, interval: 'fortnightly' },
  // Monthly intervals
  { id: 'w0_monthly', type: 'weekday', label: 'Monthly on Sunday', weekday: 0, interval: 'monthly' },
  { id: 'w1_monthly', type: 'weekday', label: 'Monthly on Monday', weekday: 1, interval: 'monthly' },
  { id: 'w2_monthly', type: 'weekday', label: 'Monthly on Tuesday', weekday: 2, interval: 'monthly' },
  { id: 'w3_monthly', type: 'weekday', label: 'Monthly on Wednesday', weekday: 3, interval: 'monthly' },
  { id: 'w4_monthly', type: 'weekday', label: 'Monthly on Thursday', weekday: 4, interval: 'monthly' },
  { id: 'w5_monthly', type: 'weekday', label: 'Monthly on Friday', weekday: 5, interval: 'monthly' },
  { id: 'w6_monthly', type: 'weekday', label: 'Monthly on Saturday', weekday: 6, interval: 'monthly' },
];

export type Notification = {
  id: number;
  contactId: number;
  name: string;
  date: string;
  actioned?: boolean;
  // ... other notification properties
};

export type Contact = {
  id: number;
  name: string;
  frequency: string;
  lastContacted?: string;
  nextReminder?: string;
  history?: Array<{
    date: string;
    action: string;
    notes?: string;
  }>;
  paused?: boolean;
};