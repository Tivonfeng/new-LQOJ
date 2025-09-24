# Admin Password Change Plugin Configuration

## Plugin Information
- **Name**: user-password-change
- **Version**: 1.0.0
- **Author**: TivonFeng
- **Description**: Provides password change functionality for administrators

## System Settings

### minPasswordLength
- **Type**: Number
- **Default**: 6
- **Description**: Minimum length required for passwords
- **Usage**: Controls password validation on both frontend and backend

## Routes Configuration

### Admin Routes
- **Path**: `/manage/user/password`
- **Handler**: `PasswordChangeHandler`
- **Permission**: `PRIV_EDIT_SYSTEM`
- **Method**: GET/POST
- **Description**: Interface for administrators to change any user's password

## UI Injection Points

### Control Panel
- **Target**: `ControlPanel`
- **Route**: `manage_user_password_change`
- **Description**: Adds admin password change link to control panel sidebar

## Security Configuration

### Password Validation Rules
- Minimum length check (configurable via `minPasswordLength`)
- Password confirmation matching
- User existence validation
- Target user validation

### Permission Checks
- Admin changes: `PRIV_EDIT_SYSTEM`
- User existence validation
- Target user validation

## Error Handling

### Validation Errors
- `VerifyPasswordError`: Password confirmation mismatch
- `ValidationError`: Various validation failures (password length, required fields)
- `ForbiddenError`: Permission denied
- `UserNotFoundError`: Target user not found

### Frontend Validation
- Real-time form validation
- Password confirmation matching
- Required field validation
- User-friendly error messages

## Technical Details

### Frontend Implementation
- **React Component**: Embedded directly in HTML template using `React.createElement`
- **Fallback Support**: Shows static content if React is not available
- **API Communication**: Uses fetch API with JSON responses
- **State Management**: React hooks for form state and loading states

### Backend Implementation
- **Content Negotiation**: Supports both HTML templates and JSON API responses
- **Error Handling**: Comprehensive try-catch with proper error responses
- **Security**: Input validation, permission checks, and sanitization

## Localization

### Supported Languages
- English (`en.yaml`)
- Chinese (`zh.yaml`)

### Translation Keys
- Form labels and buttons
- Validation messages
- Success/error messages
- Help text and descriptions