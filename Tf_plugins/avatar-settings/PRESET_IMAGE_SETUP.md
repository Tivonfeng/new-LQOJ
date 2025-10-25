# Preset Avatar Images Setup Guide

## Overview

The avatar-settings plugin supports 30 customizable preset avatars. You need to provide your own images and configure their URLs in the `presets.ts` file.

## Step 1: Prepare Your Images

### Image Requirements
- **Format**: PNG, JPG/JPEG, or WebP
- **Recommended Size**: 256x256 pixels or larger
- **Quality**: High quality for best appearance
- **Quantity**: 30 images (avatar-1.png through avatar-30.png)

### Recommended Tools
- Use any image editor (Photoshop, GIMP, Krita, Figma, etc.)
- Or download free avatar packs from:
  - Unsplash
  - Pexels
  - Pixabay
  - OpenMoji
  - Custom character designs

## Step 2: Host Your Images

### Option A: Hydro's Public Directory (Recommended)

1. Create a directory for your preset avatars:
   ```bash
   mkdir -p packages/ui-default/public/avatar-presets
   ```

2. Place your 30 images in this directory:
   ```bash
   avatar-1.png
   avatar-2.png
   ...
   avatar-30.png
   ```

3. The images will be accessible at: `/avatar-presets/avatar-1.png`

### Option B: External CDN

1. Upload your images to a CDN service:
   - Amazon S3
   - Cloudflare
   - Azure Blob Storage
   - Aliyun OSS
   - Or any static file hosting

2. Get the public URLs for each image

### Option C: Absolute URLs

Use any publicly accessible image URL:
```
https://cdn.example.com/avatars/avatar-1.png
https://api.example.com/static/avatar-2.png
```

## Step 3: Configure Image URLs

Edit `frontend/presets.ts` and replace the imageUrl values:

### For Hydro Public Directory:

```typescript
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar_1',
    name: 'Avatar 1',
    imageUrl: '/avatar-presets/avatar-1.png',  // ← Update this
    description: 'Preset avatar 1',
  },
  {
    id: 'avatar_2',
    name: 'Avatar 2',
    imageUrl: '/avatar-presets/avatar-2.png',  // ← Update this
    description: 'Preset avatar 2',
  },
  // ... continue for all 30
];
```

### For External CDN:

```typescript
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar_1',
    name: 'Avatar 1',
    imageUrl: 'https://cdn.example.com/avatars/avatar-1.png',  // ← Full URL
    description: 'Preset avatar 1',
  },
  // ...
];
```

## Step 4: Update Names and Descriptions (Optional)

Customize the name and description for each avatar:

```typescript
{
  id: 'avatar_1',
  name: 'Brave Knight',      // ← Customize name
  imageUrl: '/avatar-presets/avatar-1.png',
  description: 'A noble knight avatar',  // ← Customize description
},
```

## Step 5: Build and Deploy

1. Build the plugin:
   ```bash
   npm run build
   ```

2. Restart Hydro:
   ```bash
   pm2 restart hydro
   ```

3. Visit your avatar settings page to test

## Testing

### How to Verify Images Work

1. Open browser Developer Tools (F12)
2. Go to Account Settings
3. Select "System Presets" avatar source
4. Check that:
   - [ ] All 30 images display correctly
   - [ ] Images load without errors (check Network tab)
   - [ ] Clicking each image selects it (blue border shows)
   - [ ] Preview shows the selected image
   - [ ] Saving the avatar works

### Troubleshooting

#### Images don't load
- Check the image URLs in `presets.ts`
- Verify images exist in the specified location
- Check browser console for 404 errors
- For CDN: Verify URL is publicly accessible

#### Wrong image displayed
- Verify image filenames match the URLs
- Check for typos in image paths
- Clear browser cache (Ctrl+Shift+Delete)

#### Grid layout looks wrong
- Images should be at least 70x70 pixels
- Square images (1:1 aspect ratio) display best
- Responsive grid adapts to screen size

#### Performance issues
- Optimize image file sizes (compress before uploading)
- Consider using WebP format for smaller file sizes
- Use a CDN for faster loading

## Image Size Optimization

### Compress Images

Use online tools or command line:

```bash
# Using ImageMagick
mogrify -quality 85 -resize 256x256 *.png

# Using FFmpeg
ffmpeg -i input.jpg -q:v 5 output.jpg
```

### Convert to WebP (smaller file size)

```bash
# Using cwebp
cwebp -q 80 input.png -o output.webp
```

Then update presets.ts to use .webp files:
```typescript
imageUrl: '/avatar-presets/avatar-1.webp',
```

## Best Practices

### Image Organization

**Option 1: By Category**
- Series 1 (1-10): Animals
- Series 2 (11-20): Emoticons
- Series 3 (21-30): Professions

**Option 2: By Style**
- Cartoon style
- Realistic style
- Minimalist style

**Option 3: By Theme**
- Nature themed
- Technology themed
- Fantasy themed

### Naming Convention

Use clear names for better user experience:

```typescript
{
  id: 'avatar_1',
  name: 'Forest Spirit',      // Clear, descriptive name
  imageUrl: '/avatar-presets/avatar-1.png',
  description: 'A mystical forest spirit avatar',  // Help text
},
```

### Accessibility

Ensure descriptions are helpful:
```typescript
description: 'A friendly cat character with green eyes',
// Better than just "cat" or "avatar 1"
```

## Example Configuration

Here's a complete example with meaningful names:

```typescript
// Animals Series (1-10)
{
  id: 'avatar_1',
  name: 'Wise Owl',
  imageUrl: '/avatar-presets/avatar-1.png',
  description: 'A wise owl with knowledge',
},
{
  id: 'avatar_2',
  name: 'Fox Friend',
  imageUrl: '/avatar-presets/avatar-2.png',
  description: 'A clever fox character',
},
// ... continue for all 30
```

## Updating Preset Images Later

To change preset images:

1. Replace old images with new ones in the directory
2. OR update the URLs in `presets.ts`
3. Rebuild: `npm run build`
4. Restart Hydro: `pm2 restart hydro`
5. Users will see new avatars immediately

## FAQ

**Q: Can I use different image formats?**
A: Yes! PNG, JPG, WebP are all supported. Mix and match.

**Q: What if an image fails to load?**
A: The browser will show a broken image icon. Check the console for errors.

**Q: Can I add more than 30 presets?**
A: Yes, add more entries to the AVATAR_PRESETS array.

**Q: Do images need to be square?**
A: No, but square images (1:1) display best in the grid.

**Q: Can I use external URLs?**
A: Yes, as long as the URL is publicly accessible and CORS allows it.

**Q: How do users see the preset avatars?**
A: Users with `url:{imageUrl}` format in their avatar field will see the image. The system displays it as a normal image avatar.

## Support

If you have issues:
1. Check the setup steps above
2. Verify image URLs are correct
3. Check browser console for errors
4. Verify Hydro is rebuilt and restarted
5. Clear browser cache

---

**Last Updated**: 2024-10-25
**Version**: 1.1.0
