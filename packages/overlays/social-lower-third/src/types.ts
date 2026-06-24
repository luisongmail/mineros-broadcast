export type SocialMessageType = 'follow' | 'live' | 'share' | 'tag' | 'subscribe' | 'register';
export type SocialLowerThirdVariant = 'lower_third_compact' | 'minimal_handle' | 'dual_channel';

export interface SocialChannel {
  handle: string;
  label?: string;
}

export interface SocialLowerThirdData {
  social: {
    primaryHandle: string;
    instagram?: SocialChannel;
    youtube?: SocialChannel;
  };
  message: {
    type?: SocialMessageType;
    title: string;
    subtitle?: string;
    cta?: string;
  };
}

export interface SocialLowerThirdOverlayProps {
  data: SocialLowerThirdData;
  variant?: SocialLowerThirdVariant;
}
