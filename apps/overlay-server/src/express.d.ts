import type { AuthorizedOverlayUser, OverlayActionEnvelope, OverlayOperatorRole } from './types';

declare global {
  namespace Express {
    interface Request {
      overlayEnvelope?: OverlayActionEnvelope;
      overlayRole?: OverlayOperatorRole;
      user?: AuthorizedOverlayUser;
    }
  }
}

export {};
