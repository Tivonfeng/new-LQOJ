# Avatar Settings Plugin - Preset Avatars Guide

## Overview

The avatar-settings plugin now includes 30 beautiful preset avatars that users can quickly select from. These presets are organized into three categories: Animals, Emoticons, and Professions.

## Features

### 1. Preset Avatar Selection
- **Easy Access**: Default avatar source when opening settings
- **Visual Preview**: Large emoji preview showing selected avatar
- **Grid Layout**: Responsive grid layout showing all presets at once
- **Category Organization**: Grouped by Animals, Emoticons, and Professions
- **Selection Feedback**: Visual highlight on selected avatar

### 2. Preset Categories

#### Animals (10 presets)
- 😺 Cat Face
- 🐶 Dog Face
- 🐼 Panda Face
- 🐯 Tiger Face
- 🐵 Monkey Face
- 🐰 Rabbit Face
- 🦁 Lion Face
- 🐻 Bear Face
- 🦊 Fox Face
- 🦉 Owl Face

#### Emoticons (10 presets)
- 😊 Big Smile
- 😎 Cool Face
- 😍 Heart Eyes
- 🤣 Laughing Face
- 🤔 Thinking Face
- 🤓 Nerd Face
- 😉 Winking Face
- 😎 Cool Sunglasses
- 😁 Grinning Face
- 😇 Angel Face

#### Professions (10 presets)
- 👨‍💻 Developer
- 👨‍🔬 Scientist
- 👨‍🎨 Artist
- 👨‍🎓 Student
- 👨‍🏫 Teacher
- 👨‍🚀 Astronaut
- 🏃 Athlete
- 🎵 Musician
- 🤖 Robot
- 👽 Alien

## Usage

### For Users

1. **Navigate to Account Settings**
   - Go to your user settings page
   - Find the avatar section

2. **Select Preset Avatar**
   - The "System Presets" option is selected by default
   - Browse the 30 available preset avatars
   - Click on an avatar to select it
   - The selected avatar is highlighted with a blue border

3. **Preview Selection**
   - Selected avatar is displayed in a preview area above the grid
   - Emoji is shown in a large preview box

4. **Save Avatar**
   - Click the "Save Avatar" button to apply the selected preset
   - Page reloads to show your new avatar

### Switching to Other Avatar Sources

If you want to use other avatar sources instead:

1. Select from the dropdown:
   - **System Presets** - Choose from 30 emoji presets
   - **Gravatar** - Link to your Gravatar account
   - **Github** - Use your Github profile picture
   - **QQ** - Connect via QQ number
   - **Upload** - Upload a custom image

2. Follow the corresponding input/selection process
3. Save your choice

## Technical Details

### Data Structure

Presets are defined in `presets.ts`:

```typescript
interface AvatarPreset {
  id: string;           // Unique identifier (e.g., 'avatar_cat_1')
  name: string;         // Display name
  emoji: string;        // Emoji character
  color: string;        // Background color (hex)
  description: string;  // Accessibility description
}
```

### Storage Format

When a preset is selected and saved, it's stored using the `url:` prefix for compatibility with Hydro's avatar validation:
```
avatar: "url:/preset/avatar_cat_1"
```

The system uses the `url:/preset/` prefix to identify preset avatars, while maintaining compatibility with Hydro's existing avatar validation rules.

### Backend Integration

The preset avatars use the `url:/preset/{id}` format, which:

1. **Validates**: Passes Hydro's avatar field validation (accepts `url:` prefix)
2. **Stores**: Saves as regular URL avatar format in database
3. **Display**: Frontend recognizes `url:/preset/` prefix and displays emoji

### Display Implementation

To display preset avatars in your templates, use the helper functions:

```typescript
import { isPresetAvatar, getAvatarDisplay } from './avatar-display';

// Check if avatar is preset
if (isPresetAvatar(user.avatar)) {
  const emoji = getAvatarDisplay(user.avatar);
  // Use emoji as avatar display
}
```

## Customization

### Adding More Presets

To add more preset avatars:

1. **Edit `frontend/presets.ts`**:
   ```typescript
   {
     id: 'avatar_unicorn_1',
     name: 'Unicorn Face',
     emoji: '🦄',
     color: '#FF69B4',
     description: 'Magical unicorn',
   }
   ```

2. **Add to the AVATAR_PRESETS array**

3. **Rebuild the plugin**:
   ```bash
   npm run build
   ```

### Changing Preset Colors

Edit the `color` property in `presets.ts`:
```typescript
{
  id: 'avatar_cat_1',
  name: 'Cat Face',
  emoji: '😺',
  color: '#FF69B4',  // Change this to any hex color
  description: 'Cute cat face',
}
```

### Modifying Preset Categories

To reorganize presets by category:

1. Edit `getPresetsByCategory()` function in `presets.ts`
2. Change the slicing ranges to reorganize groups
3. Rebuild and redeploy

## Displaying User Avatars

When displaying a user with a preset avatar, your frontend needs to handle the `preset:` format:

```typescript
function getAvatarDisplay(avatar: string): string {
  if (avatar.startsWith('preset:')) {
    const presetId = avatar.substring('preset:'.length);
    const preset = getAvatarPreset(presetId);
    return preset?.emoji ?? '👤'; // Default fallback
  }
  // Handle other avatar types (gravatar, github, etc)
  return avatar;
}
```

## User Experience

### Visual Design
- **Grid Layout**: Responsive grid that adapts to screen size
- **Emoji Display**: Large emoji with background color for visibility
- **Selection Indicator**: Blue border and shadow on selected avatar
- **Hover Effects**: Opacity change on hover for better interactivity
- **Preview Box**: Large preview of selected emoji above grid

### Accessibility
- **ARIA Labels**: Each preset button has `aria-label` for screen readers
- **Keyboard Navigation**: Can navigate and select with keyboard
- **Color Contrast**: Colors chosen for sufficient contrast
- **Fallback Text**: Emoji display with text descriptions

### Performance
- **Lazy Loading**: Presets are only rendered when "System Presets" is selected
- **No External Calls**: All presets are defined locally
- **Fast Selection**: Click-based selection is instant
- **Minimal Bundle**: Adds ~2KB to bundle size

## Troubleshooting

### Preset Avatar Not Displaying Correctly

**Problem**: Preset avatar shows as placeholder or default avatar

**Solution**:
1. Check that backend recognizes `preset:` prefix
2. Verify preset ID exists in presets list
3. Ensure display logic handles preset format
4. Check console for errors

### New Presets Not Showing

**Problem**: After adding presets, they don't appear

**Solution**:
1. Rebuild the plugin: `npm run build`
2. Restart Hydro: `pm2 restart hydro`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh page (Ctrl+F5)

### Styling Issues

**Problem**: Preset avatars don't look right

**Solution**:
1. Check CSS is loaded properly
2. Verify preset colors are valid hex values
3. Check for CSS conflicts from other plugins
4. Test in different browsers

## Future Enhancements

Potential improvements for preset avatars:

1. **Custom Uploads**: Allow users to create custom preset libraries
2. **Animated Emojis**: Support for animated emoji variations
3. **Color Customization**: Let users change preset background colors
4. **Favorites**: Save favorite presets for quick access
5. **Seasonal Presets**: Special holiday/seasonal avatars
6. **Community Presets**: Community-created preset packs
7. **Search**: Find presets by name or keyword
8. **Variations**: Multiple variations of same emoji (different skin tones, etc)

## API Reference

### getAvatarPreset(id: string)

Get a preset avatar by ID.

```typescript
const preset = getAvatarPreset('avatar_cat_1');
// Returns: { id, name, emoji, color, description }
```

### getPresetsByCategory()

Get all presets organized by category.

```typescript
const grouped = getPresetsByCategory();
// Returns: { animals: [...], emoticons: [...], professions: [...] }
```

## See Also

- [README.md](README.md) - User guide
- [STRUCTURE.md](STRUCTURE.md) - Architecture documentation
- [QUICK_START.md](QUICK_START.md) - Quick reference

---

**Version**: 1.1.0 (Preset Avatars Added)
**Last Updated**: 2024-10-25
