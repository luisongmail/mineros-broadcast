export type AnnouncementType = 'club_notice' | 'clinic' | 'registration' | 'schedule_change' | 'venue_info' | 'social_cta' | 'alert' | 'manual';
export type AnnouncementVariant = 'lower_third_compact' | 'minimal' | 'alert' | 'clinic_card';

export interface AnnouncementData {
  announcement: {
    type: AnnouncementType;
    title: string;
    subtitle?: string;
    detail?: string;
    place?: string;
    date?: string;
    categories?: string;
    action?: string;
    socialHandle?: string;
  };
}

export interface AnnouncementOverlayProps {
  data: AnnouncementData;
  variant?: AnnouncementVariant;
}
