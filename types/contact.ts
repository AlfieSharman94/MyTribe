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
  paused: boolean;
}; 