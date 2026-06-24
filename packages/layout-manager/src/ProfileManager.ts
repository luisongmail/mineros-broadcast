import type { Profile } from './types';

export interface CreateProfileInput {
  id: string;
  name: string;
  templateId: string;
  category?: string;
  tournament?: string;
  season: string;
  platform: string;
  createdBy: string;
  status?: Profile['status'];
  zones?: Profile['zones'];
  scenes?: Profile['scenes'];
  overlayAssignments?: Profile['overlayAssignments'];
  sponsorRules?: Profile['sponsorRules'];
}

function cloneProfile(profile: Profile): Profile {
  return {
    ...profile,
    zones: profile.zones.map((zone) => ({ ...zone, assignedOverlays: [...zone.assignedOverlays] })),
    scenes: [...profile.scenes],
    overlayAssignments: profile.overlayAssignments.map((assignment) => ({ ...assignment })),
    sponsorRules: [...profile.sponsorRules],
  };
}

export class ProfileManager {
  private readonly profiles = new Map<string, Profile>();
  private activeProfileId: string | null = null;

  createProfile(input: CreateProfileInput): Profile {
    if (this.profiles.has(input.id)) {
      throw new Error(`El perfil '${input.id}' ya existe.`);
    }

    const now = new Date().toISOString();
    const profile: Profile = {
      id: input.id,
      name: input.name,
      templateId: input.templateId,
      category: input.category ?? '',
      tournament: input.tournament ?? '',
      season: input.season,
      platform: input.platform,
      createdBy: input.createdBy,
      status: input.status ?? 'active',
      zones: input.zones ? input.zones.map((zone) => ({ ...zone, assignedOverlays: [...zone.assignedOverlays] })) : [],
      scenes: input.scenes ? [...input.scenes] : [],
      overlayAssignments: input.overlayAssignments ? input.overlayAssignments.map((assignment) => ({ ...assignment })) : [],
      sponsorRules: input.sponsorRules ? [...input.sponsorRules] : [],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);

    if (!this.activeProfileId) {
      this.activeProfileId = profile.id;
    }

    return cloneProfile(profile);
  }

  listProfiles(): Profile[] {
    return [...this.profiles.values()].map(cloneProfile);
  }

  getProfile(profileId: string): Profile | null {
    const profile = this.profiles.get(profileId);
    return profile ? cloneProfile(profile) : null;
  }

  updateProfile(profileId: string, changes: Partial<Omit<Profile, 'id' | 'createdAt'>>): Profile {
    const profile = this.profiles.get(profileId);

    if (!profile) {
      throw new Error(`El perfil '${profileId}' no existe.`);
    }

    const updated: Profile = {
      ...profile,
      ...changes,
      zones: changes.zones ? changes.zones.map((zone) => ({ ...zone, assignedOverlays: [...zone.assignedOverlays] })) : profile.zones,
      scenes: changes.scenes ? [...changes.scenes] : profile.scenes,
      overlayAssignments: changes.overlayAssignments
        ? changes.overlayAssignments.map((assignment) => ({ ...assignment }))
        : profile.overlayAssignments,
      sponsorRules: changes.sponsorRules ? [...changes.sponsorRules] : profile.sponsorRules,
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profileId, updated);
    return cloneProfile(updated);
  }

  deleteProfile(profileId: string): void {
    if (!this.profiles.delete(profileId)) {
      throw new Error(`El perfil '${profileId}' no existe.`);
    }

    if (this.activeProfileId === profileId) {
      this.activeProfileId = null;
    }
  }

  cloneProfile(profileId: string, nextId: string, nextName: string): Profile {
    const profile = this.profiles.get(profileId);

    if (!profile) {
      throw new Error(`El perfil '${profileId}' no existe.`);
    }

    return this.createProfile({
      ...cloneProfile(profile),
      id: nextId,
      name: nextName,
      createdBy: profile.createdBy,
    });
  }

  setActiveProfile(profileId: string): void {
    if (!this.profiles.has(profileId)) {
      throw new Error(`El perfil '${profileId}' no existe.`);
    }

    this.activeProfileId = profileId;
  }

  getActiveProfile(): Profile | null {
    return this.activeProfileId ? this.getProfile(this.activeProfileId) : null;
  }
}
