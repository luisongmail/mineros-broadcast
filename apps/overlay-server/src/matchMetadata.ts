/**
 * Tipos compartidos para metadatos de partido.
 * Usados por el servidor (matchMetadataRouter) y por el cliente (scoreboardData, BroadcastPage).
 */

export interface MatchMetadata {
  gameId: string;
  branding?: {
    brandName?: string;
    brandLogoAssetId?: string;
  };
  competition?: {
    name?: string;
    tournament?: string;
    category?: string;
  };
  venue?: {
    name?: string;
  };
  game?: {
    gameType?: string;
    remainingTime?: string;
    configuredInnings?: number;
  };
  sponsors?: SponsorEntry[];
}

export interface SponsorEntry {
  sponsorId: string;
  displayName: string;
  logoAssetId?: string;
  text?: string;
  priority?: number;
  active?: boolean;
  campaignId?: string;
}
