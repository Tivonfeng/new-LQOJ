# Admin Password Change Plugin

This plugin provides an interface for administrators to change user passwords in the Hydro Online Judge system.

## Features

- **Admin Password Change**: Administrators can change any user's password without knowing the current password
- **Modern React UI**: Interactive form with real-time validation
- **Security Validation**: 
  - Minimum password length validation (configurable, default 6 characters)
  - Password confirmation validation
  - User existence verification
- **Multilingual Support**: Supports both English and Chinese
- **Permission Control**: Proper permission checks for admin operations

## Installation

1. Copy this plugin to the `Tf_plugins/user-password-change/` directory
2. The plugin will be automatically loaded by the system

## Usage

### For Administrators
1. Access the admin panel
2. Navigate to "User Password Change" in the control panel
3. Enter the User ID and new password
4. Confirm the new password
5. Click "Change Password"

## Configuration

The plugin provides the following system setting:

- `minPasswordLength`: Minimum password length (default: 6)

## Routes

- `/manage/user/password` - Admin password change interface (requires PRIV_EDIT_SYSTEM)

## Permissions

- Admin password changes require `PRIV_EDIT_SYSTEM` privilege

## Templates

- `user_password_change.html` - Admin password change form with embedded React component

## Security Features

- Permission-based access control (admin only)
- User existence validation
- Minimum password length enforcement
- Password confirmation validation
- Input sanitization and error handling
- JSON API response for React component