import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useProfile,
  useUpdateProfile,
  useUpdateAvatar,
  useChangePassword,
  useDeleteAccount,
  useSettings,
  useUpdateSettings,
} from '../hooks/useProfile';
import { User, UserCircle, Lock, Trash2, Mic, Volume2, Settings, Save } from 'lucide-react';
import { SoundSettings } from '../components/settings';

// Validation schemas
const profileSchema = z.object({
  username: z.string().min(3).max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const avatarSchema = z.object({
  avatarUrl: z.string().url('Please enter a valid URL'),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type AvatarFormData = z.infer<typeof avatarSchema>;

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'ui' | 'security'>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const updateSettings = useUpdateSettings();

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || '',
      email: profile?.email || '',
    },
  });

  // Avatar form
  const avatarForm = useForm<AvatarFormData>({
    resolver: zodResolver(avatarSchema),
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const updates: { username?: string; email?: string } = {};
      if (data.username && data.username !== profile?.username) {
        updates.username = data.username;
      }
      if (data.email && data.email !== profile?.email) {
        updates.email = data.email;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile.mutateAsync(updates);
        alert('Profile updated successfully');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const onAvatarSubmit = async (data: AvatarFormData) => {
    try {
      await updateAvatar.mutateAsync(data.avatarUrl);
      avatarForm.reset();
      alert('Avatar updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update avatar');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      alert('Password changed successfully. Please login again.');
      window.location.href = '/login';
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await deleteAccount.mutateAsync();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateSettings.mutateAsync({ [key]: value });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update settings');
    }
  };

  if (profileLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-white mb-8">Profile & Settings</h1>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <UserCircle className="inline mr-2 w-5 h-5" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'voice'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Mic className="inline mr-2 w-5 h-5" />
            Voice
          </button>
          <button
            onClick={() => setActiveTab('ui')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ui'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Settings className="inline mr-2 w-5 h-5" />
            UI & Display
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            <Lock className="inline mr-2 w-5 h-5" />
            Security
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <User className="mr-2" />
                Profile Picture
              </h2>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <form onSubmit={avatarForm.handleSubmit(onAvatarSubmit)} className="flex-1">
                  <div className="flex space-x-2">
                    <input
                      {...avatarForm.register('avatarUrl')}
                      type="text"
                      placeholder="Enter avatar URL"
                      className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={updateAvatar.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateAvatar.isPending ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                  {avatarForm.formState.errors.avatarUrl && (
                    <p className="text-red-400 text-sm mt-1">
                      {avatarForm.formState.errors.avatarUrl.message}
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* Profile Info */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Account Information</h2>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Username</label>
                  <input
                    {...profileForm.register('username')}
                    type="text"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                  {profileForm.formState.errors.username && (
                    <p className="text-red-400 text-sm mt-1">
                      {profileForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Email</label>
                  <input
                    {...profileForm.register('email')}
                    type="email"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="text-sm text-gray-400">
                  <p>Account created: {new Date(profile?.createdAt || '').toLocaleDateString()}</p>
                </div>

                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <Save className="mr-2 w-4 h-4" />
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Voice Settings Tab */}
        {activeTab === 'voice' && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Mic className="mr-2" />
              Voice Settings
            </h2>

            <div className="space-y-6">
              {/* Voice Mode */}
              <div>
                <label className="block text-gray-300 mb-3 text-lg">Voice Mode</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings?.voiceMode === 'push_to_talk'}
                      onChange={() => handleSettingChange('voiceMode', 'push_to_talk')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-white">Push-to-talk</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings?.voiceMode === 'voice_activity'}
                      onChange={() => handleSettingChange('voiceMode', 'voice_activity')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-white">Voice activity</span>
                  </label>
                </div>
              </div>

              {/* PTT Key */}
              {settings?.voiceMode === 'push_to_talk' && (
                <div>
                  <label className="block text-gray-300 mb-2">Push-to-talk Key</label>
                  <input
                    type="text"
                    value={settings?.pttKey || 'Space'}
                    onChange={(e) => handleSettingChange('pttKey', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* VAD Threshold */}
              {settings?.voiceMode === 'voice_activity' && (
                <div>
                  <label className="block text-gray-300 mb-2">
                    Voice Detection Threshold: {settings?.vadThreshold?.toFixed(2) || 0.5}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings?.vadThreshold || 0.5}
                    onChange={(e) => handleSettingChange('vadThreshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>More sensitive</span>
                    <span>Less sensitive</span>
                  </div>
                </div>
              )}

              {/* Audio Processing */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.noiseSuppression || false}
                    onChange={(e) => handleSettingChange('noiseSuppression', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-white">Noise Suppression</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.echoCancellation || false}
                    onChange={(e) => handleSettingChange('echoCancellation', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-white">Echo Cancellation</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* UI Settings Tab */}
        {activeTab === 'ui' && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Volume2 className="mr-2" />
              UI & Display Settings
            </h2>

            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="block text-gray-300 mb-3 text-lg">Theme</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings?.theme === 'dark'}
                      onChange={() => handleSettingChange('theme', 'dark')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-white">Dark</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings?.theme === 'light'}
                      onChange={() => handleSettingChange('theme', 'light')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-white">Light</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={settings?.theme === 'auto'}
                      onChange={() => handleSettingChange('theme', 'auto')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-white">Auto (System)</span>
                  </label>
                </div>
              </div>

              {/* Sound Effects */}
              <SoundSettings />

              {/* Notifications */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.notificationsEnabled || false}
                    onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-white">Notifications</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <Lock className="mr-2" />
                Change Password
              </h2>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Current Password</label>
                  <input
                    {...passwordForm.register('currentPassword')}
                    type="password"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">New Password</label>
                  <input
                    {...passwordForm.register('newPassword')}
                    type="password"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {changePassword.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Delete Account */}
            <div className="glass-card p-6 border-2 border-red-900">
              <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center">
                <Trash2 className="mr-2" />
                Danger Zone
              </h2>
              <p className="text-gray-300 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
                className={`px-6 py-2 rounded-lg font-medium ${
                  showDeleteConfirm
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-900 hover:bg-red-800 text-red-200'
                } disabled:opacity-50`}
              >
                {deleteAccount.isPending
                  ? 'Deleting...'
                  : showDeleteConfirm
                  ? 'Click again to confirm deletion'
                  : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
