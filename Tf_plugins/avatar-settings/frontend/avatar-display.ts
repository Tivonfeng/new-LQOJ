/**
 * Avatar Display Helper
 * Extends Hydro's avatar system to support preset avatars
 */

import { AVATAR_PRESETS } from './presets';

/**
 * Get avatar emoji from preset ID
 * Used when displaying user avatars with preset format
 */
export function getPresetAvatar(presetId: string): string {
  const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
  return preset?.emoji || '👤'; // Default fallback
}

/**
 * Parse avatar string and determine type and value
 */
export function parseAvatar(avatar: string): { type: string, value: string } {
  const colonIndex = avatar.indexOf(':');
  if (colonIndex === -1) {
    return { type: 'gravatar', value: avatar };
  }
  const type = avatar.substring(0, colonIndex);
  const value = avatar.substring(colonIndex + 1);
  return { type, value };
}

/**
 * Check if avatar is a preset avatar
 */
export function isPresetAvatar(avatar: string): boolean {
  return avatar.startsWith('url:/preset/');
}

/**
 * Extract preset ID from avatar string
 */
export function getPresetIdFromAvatar(avatar: string): string | null {
  if (!isPresetAvatar(avatar)) return null;
  return avatar.substring('url:/preset/'.length);
}

/**
 * Display avatar emoji for preset avatar
 * Call this when rendering user avatars
 */
export function getAvatarDisplay(avatar: string): string {
  if (isPresetAvatar(avatar)) {
    const presetId = getPresetIdFromAvatar(avatar);
    if (presetId) {
      return getPresetAvatar(presetId);
    }
  }
  return '👤'; // Default fallback for unknown avatars
}
