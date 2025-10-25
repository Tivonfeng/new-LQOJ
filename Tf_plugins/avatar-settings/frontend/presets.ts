/**
 * Avatar Presets Configuration
 * Contains 30 default avatars that users can choose from
 * Users should upload their own 30 images and configure the URLs below
 */

export interface AvatarPreset {
  id: string;
  name: string;
  imageUrl: string; // URL to the preset avatar image
  description: string;
}

/**
 * IMPORTANT: Configure image URLs for your preset avatars
 *
 * Image path format:
 * - Plugin public directory: /tf_plugins/avatar-settings/lqcode_user_avatar1.jpeg
 * - Multiple images: add more image files to Tf_plugins/avatar-settings/public/
 *
 * Current setup:
 * - One test image available: lqcode_user_avatar1.jpeg
 * - Add more images as needed and update URLs below
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  // Series 1 (1-10)
  {
    id: 'avatar_1',
    name: 'Avatar 1',
    imageUrl: '/avatar_preset_1.jpeg',
    description: 'Preset avatar 1',
  },
  {
    id: 'avatar_2',
    name: 'Avatar 2',
    imageUrl: '/avatar_preset_2.webp',
    description: 'Preset avatar 2',
  },
  {
    id: 'avatar_3',
    name: 'Avatar 3',
    imageUrl: '/avatar_preset_3.jpg',
    description: 'Preset avatar 3',
  },
  {
    id: 'avatar_4',
    name: 'Avatar 4',
    imageUrl: '/avatar_preset_4.webp',
    description: 'Preset avatar 4',
  },
  {
    id: 'avatar_5',
    name: 'Avatar 5',
    imageUrl: '/avatar_preset_5.webp',
    description: 'Preset avatar 5',
  },
  {
    id: 'avatar_6',
    name: 'Avatar 6',
    imageUrl: '/avatar_preset_6.jpg',
    description: 'Preset avatar 6',
  },
  {
    id: 'avatar_7',
    name: 'Avatar 7',
    imageUrl: '/avatar_preset_7.webp',
    description: 'Preset avatar 7',
  },
  {
    id: 'avatar_8',
    name: 'Avatar 8',
    imageUrl: '/avatar_preset_8.webp',
    description: 'Preset avatar 8',
  },
  {
    id: 'avatar_9',
    name: 'Avatar 9',
    imageUrl: '/avatar_preset_9.webp',
    description: 'Preset avatar 9',
  },
  {
    id: 'avatar_10',
    name: 'Avatar 10',
    imageUrl: '/avatar_preset_10.jpeg',
    description: 'Preset avatar 10',
  },

  // Series 2 (11-20)
  {
    id: 'avatar_11',
    name: 'Avatar 11',
    imageUrl: '/avatar_preset_11.jpeg',
    description: 'Preset avatar 11',
  },
  {
    id: 'avatar_12',
    name: 'Avatar 12',
    imageUrl: '/avatar_preset_12.jpeg',
    description: 'Preset avatar 12',
  },
  {
    id: 'avatar_13',
    name: 'Avatar 13',
    imageUrl: '/avatar_preset_13.jpeg',
    description: 'Preset avatar 13',
  },
  {
    id: 'avatar_14',
    name: 'Avatar 14',
    imageUrl: '/avatar_preset_14.jpeg',
    description: 'Preset avatar 14',
  },
  {
    id: 'avatar_15',
    name: 'Avatar 15',
    imageUrl: '/avatar_preset_15.jpeg',
    description: 'Preset avatar 15',
  },
  {
    id: 'avatar_16',
    name: 'Avatar 16',
    imageUrl: '/avatar_preset_16.jpeg',
    description: 'Preset avatar 16',
  },
  {
    id: 'avatar_17',
    name: 'Avatar 17',
    imageUrl: '/avatar_preset_17.jpeg',
    description: 'Preset avatar 17',
  },
  {
    id: 'avatar_18',
    name: 'Avatar 18',
    imageUrl: '/avatar_preset_18.jpeg',
    description: 'Preset avatar 18',
  },
  {
    id: 'avatar_19',
    name: 'Avatar 19',
    imageUrl: '/avatar_preset_19.jpeg',
    description: 'Preset avatar 19',
  },
  {
    id: 'avatar_20',
    name: 'Avatar 20',
    imageUrl: '/avatar_preset_20.jpeg',
    description: 'Preset avatar 20',
  },

  // Series 3 (21-30)
  {
    id: 'avatar_21',
    name: 'Avatar 21',
    imageUrl: '/avatar_preset_21.jpeg',
    description: 'Preset avatar 21',
  },
  {
    id: 'avatar_22',
    name: 'Avatar 22',
    imageUrl: '/avatar_preset_22.jpeg',
    description: 'Preset avatar 22',
  },
  {
    id: 'avatar_23',
    name: 'Avatar 23',
    imageUrl: '/avatar_preset_23.jpeg',
    description: 'Preset avatar 23',
  },
  {
    id: 'avatar_24',
    name: 'Avatar 24',
    imageUrl: '/avatar_preset_24.jpeg',
    description: 'Preset avatar 24',
  },
  {
    id: 'avatar_25',
    name: 'Avatar 25',
    imageUrl: '/avatar_preset_25.jpeg',
    description: 'Preset avatar 25',
  },
  {
    id: 'avatar_26',
    name: 'Avatar 26',
    imageUrl: '/avatar_preset_26.jpeg',
    description: 'Preset avatar 26',
  },
  {
    id: 'avatar_27',
    name: 'Avatar 27',
    imageUrl: '/avatar_preset_27.jpeg',
    description: 'Preset avatar 27',
  },
  {
    id: 'avatar_28',
    name: 'Avatar 28',
    imageUrl: '/avatar_preset_28.jpeg',
    description: 'Preset avatar 28',
  },
  {
    id: 'avatar_29',
    name: 'Avatar 29',
    imageUrl: '/avatar_preset_29.jpeg',
    description: 'Preset avatar 29',
  },
  {
    id: 'avatar_30',
    name: 'Avatar 30',
    imageUrl: '/avatar_preset_30.jpeg',
    description: 'Preset avatar 30',
  },
];

/**
 * Get preset avatar by ID
 */
export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get all preset avatars grouped by series (1-10, 11-20, 21-30)
 */
export function getPresetsByCategory(): { [category: string]: AvatarPreset[] } {
  return {
    'Series 1': AVATAR_PRESETS.slice(0, 10),
    'Series 2': AVATAR_PRESETS.slice(10, 20),
    'Series 3': AVATAR_PRESETS.slice(20, 30),
  };
}
