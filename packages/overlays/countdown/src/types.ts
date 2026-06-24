export type CountdownType = 'broadcast_start' | 'game_start' | 'resume' | 'ceremony_start' | 'interview_start' | 'segment_start';
export type CountdownVariant = 'lower_third_compact' | 'minimal_timer';

export interface CountdownData {
  countdown: {
    targetTime: string;
    type: CountdownType;
    label?: string;
  };
  event?: {
    title?: string;
    subtitle?: string;
    venue?: string;
    status?: string;
  };
}

export interface CountdownOverlayProps {
  data: CountdownData;
  variant?: CountdownVariant;
}
