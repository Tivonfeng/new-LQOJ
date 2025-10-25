/* eslint-disable react-refresh/only-export-components */
import { addPage, delay, i18n, NamedPage, Notification, request } from '@hydrooj/ui-default';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AVATAR_PRESETS } from './presets';

interface AvatarFormData {
  type: 'upload' | 'preset';
  file?: File;
  presetId?: string;
}

type AvatarType = 'upload' | 'preset';

// Avatar Preview Component
const AvatarPreview: React.FC<{ imageUrl: string | undefined, size?: number }> = ({ imageUrl, size = 80 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '8px',
      backgroundColor: '#f0f0f0',
      border: '2px solid #ddd',
      margin: '10px 0',
      overflow: 'hidden',
    }}
  >
    {imageUrl ? (
      <img
        src={imageUrl}
        alt="Avatar preview"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    ) : (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
          color: '#999',
        }}
      >
        ?
      </div>
    )}
  </div>
);

// Preset Avatar Selector Component
const PresetAvatarSelector: React.FC<{
  onSelect: (presetId: string) => void;
  selectedPresetId?: string;
}> = ({ onSelect, selectedPresetId }) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', fontWeight: 600 }}>
        {i18n('Choose Preset Avatar')}
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
          gap: '10px',
        }}
      >
        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            style={{
              padding: '0',
              border: selectedPresetId === preset.id ? '3px solid #0066cc' : '2px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '70px',
              minWidth: '70px',
              transition: 'all 0.2s',
              boxShadow:
                selectedPresetId === preset.id ? '0 2px 8px rgba(0, 102, 204, 0.3)' : 'none',
              opacity: selectedPresetId === preset.id ? 1 : 0.8,
              overflow: 'hidden',
            }}
            aria-label={preset.description}
          >
            <img
              src={preset.imageUrl}
              alt={preset.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

// Avatar Settings React Component
const AvatarSettingsApp: React.FC = () => {
  const [formData, setFormData] = useState<AvatarFormData>({
    type: 'preset',
    presetId: AVATAR_PRESETS[0].id,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedPreset = formData.presetId ? AVATAR_PRESETS.find((p) => p.id === formData.presetId) : undefined;

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as AvatarType;
    setFormData((prev) => ({ ...prev, type: newType }));
    setMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setMessage({
          type: 'error',
          text: 'Invalid file type. Only JPG and PNG are allowed.',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({
          type: 'error',
          text: 'File size must not exceed 5MB.',
        });
        return;
      }

      setFormData((prev) => ({ ...prev, file }));
      setMessage(null);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    setFormData((prev) => ({ ...prev, type: 'preset', presetId }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.type === 'upload') {
        if (!formData.file) {
          setMessage({
            type: 'error',
            text: 'Please select a file',
          });
          setIsLoading(false);
          return;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.file);

        await request.postFile('/home/avatar', uploadFormData);
        Notification.success('Upload success.');
        setMessage({
          type: 'success',
          text: 'Avatar uploaded successfully!',
        });
      } else if (formData.type === 'preset') {
        if (!formData.presetId) {
          setMessage({
            type: 'error',
            text: 'Please select a preset avatar',
          });
          setIsLoading(false);
          return;
        }

        // Get the preset image URL and store it as url: format
        const preset = selectedPreset;
        if (!preset) {
          setMessage({
            type: 'error',
            text: 'Preset avatar not found',
          });
          setIsLoading(false);
          return;
        }

        // Store preset as URL format for compatibility with Hydro's avatar validation
        // Hydro accepts url: prefix for any image URL
        await request.post('/home/avatar', {
          avatar: `url:${preset.imageUrl}`,
        });
        Notification.success('Avatar updated.');
        setMessage({
          type: 'success',
          text: 'Preset avatar selected successfully!',
        });
      }

      // Clear form
      setFormData({
        type: 'preset',
        presetId: AVATAR_PRESETS[0].id,
      });

      // Reload page after success
      await delay(1000);
      window.location.reload();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update avatar';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
      Notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {message && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#f0f9ff' : '#fdf6f6',
            color: message.type === 'success' ? '#22863a' : '#cb2431',
            border: `1px solid ${message.type === 'success' ? '#a8e6cf' : '#f97a7a'}`,
          }}
        >
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Avatar Type Selector */}
        <div>
          <label htmlFor="avatar-type" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            {i18n('Avatar Source')}
          </label>
          <select
            id="avatar-type"
            className="select"
            value={formData.type}
            onChange={handleTypeChange}
            style={{ width: '100%' }}
          >
            <option value="preset">{i18n('System Presets')}</option>
            <option value="upload">{i18n('Upload')}</option>
          </select>
        </div>

        {/* Preset Avatar Selector */}
        {formData.type === 'preset' && (
          <>
            <AvatarPreview imageUrl={selectedPreset?.imageUrl} />
            <PresetAvatarSelector
              onSelect={handlePresetSelect}
              selectedPresetId={formData.presetId}
            />
          </>
        )}

        {/* File Upload */}
        {formData.type === 'upload' && (
          <div>
            <label htmlFor="avatar-file" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              {i18n('Select Image')} <small>(JPG, PNG, max 5MB)</small>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="avatar-file"
              className="textbox"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
            {formData.file && <p style={{ marginTop: '8px', fontSize: '12px' }}>Selected: {formData.file.name}</p>}
          </div>
        )}

        {/* Submit Button */}
        <div style={{ marginTop: '10px' }}>
          <button
            type="submit"
            className="button rounded primary"
            disabled={
              isLoading
              || (formData.type === 'preset' && !formData.presetId)
              || (formData.type === 'upload' && !formData.file)
            }
            style={{ opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? `${i18n('Saving')}...` : i18n('Change Avatar')}
          </button>
        </div>
      </form>
    </div>
  );
};

// Page registration
addPage(
  new NamedPage('home_account', () => {
    console.log('[Avatar Settings] Page loaded');

    // Mount React component to .changeAvatar
    const mountPoint = document.querySelector('.changeAvatar');
    if (mountPoint) {
      const root = createRoot(mountPoint);
      root.render(<AvatarSettingsApp />);
      console.log('[Avatar Settings] React app mounted successfully');
    } else {
      console.warn('[Avatar Settings] Mount point ".changeAvatar" not found');
    }
  }),
);
