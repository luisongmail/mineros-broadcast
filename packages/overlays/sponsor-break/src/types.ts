export type SponsorType = 'primary' | 'secondary' | 'rotation' | 'institutional' | 'social_cta';

export type SponsorBreakVariant =
  | 'lower_third_compact'
  | 'full_width'
  | 'logo_only'
  | 'sponsor_cta'
  | 'multi_sponsor';

export interface SponsorData {
  sponsorId: string;
  name: string;
  logoAssetId?: string;
}

export interface SponsorBreakData {
  placement: {
    type: SponsorType;
    slot?: string;
  };
  sponsor: SponsorData;
  message?: {
    title?: string;
    subtitle?: string;
  };
  cta?: {
    text?: string;
    handle?: string;
  };
  context?: {
    label?: string;
    durationSeconds?: number;
  };
}

export interface SponsorBreakOverlayProps {
  data: SponsorBreakData;
  variant?: SponsorBreakVariant;
}
