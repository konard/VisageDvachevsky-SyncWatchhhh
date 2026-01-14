import { useState } from 'react';
import { Mic, Upload, Trash2, UserMinus, Check, X } from 'lucide-react';
import { SoundSettings } from '../components/settings';
import { useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AnimatedPage } from '../components/AnimatedPage';
import { GlassInput, GlassButton, GlassSlider, GlassDropdown, GlassToggle } from '../components/ui/glass';
import clsx from 'clsx';
import { useProfile, useUpdateProfile, useUpdateAvatar, useChangePassword, useDeleteAccount, useSettings, useUpdateSettings } from '../hooks/useProfile';
import { useFriends, useFriendRequests, useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend } from '../hooks/useFriends';
import { useWatchHistory } from '../hooks/useWatchHistory';

/**
 * Profile Page - User profile page with backend integration
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'history' | 'settings'>('profile');

  // Fetch user data
  const { data: user, isLoading: isLoadingProfile } = useProfile();
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const { data: friends, isLoading: isLoadingFriends } = useFriends();
  const { data: friendRequests, isLoading: isLoadingRequests } = useFriendRequests();
  const { data: history, isLoading: isLoadingHistory } = useWatchHistory(20);

  // Mutations
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const updateSettings = useUpdateSettings();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  // Local state for forms
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize profile form when user data loads
  if (user && !profileForm.username && !isEditingProfile) {
    setProfileForm({ username: user.username, email: user.email });
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(profileForm);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarUrl.trim()) return;
    try {
      await updateAvatar.mutateAsync(avatarUrl);
      setAvatarUrl('');
    } catch (error) {
      console.error('Failed to update avatar:', error);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      alert('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please check your current password.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      await deleteAccount.mutateAsync();
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await updateSettings.mutateAsync({ [key]: value });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      await acceptFriendRequest.mutateAsync(friendshipId);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleDeclineFriend = async (friendshipId: string) => {
    try {
      await declineFriendRequest.mutateAsync(friendshipId);
    } catch (error) {
      console.error('Failed to decline friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      try {
        await removeFriend.mutateAsync(friendshipId);
      } catch (error) {
        console.error('Failed to remove friend:', error);
      }
    }
  };

  const formatWatchDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getVideoTitle = (source: any) => {
    if (source.youtubeVideoId) return `YouTube: ${source.youtubeVideoId}`;
    if (source.externalUrl) return source.externalUrl;
    if (source.fileUrl) return 'Uploaded Video';
    return 'Unknown Video';
  };

  const header = (
    <div className="flex items-center justify-between">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>Back</span>
      </button>
      <h1 className="text-xl font-bold text-white">Profile</h1>
      <div className="w-16"></div>
    </div>
  );

  const content = (
    <div className="flex-1 overflow-auto">
      {/* Tab selector */}
      <div className={clsx(
        'flex gap-2 p-4',
        isMobile ? 'overflow-x-auto' : 'justify-center'
      )}>
        <button
          onClick={() => setActiveTab('profile')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap',
            activeTab === 'profile'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap',
            activeTab === 'friends'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap',
            activeTab === 'history'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap',
            activeTab === 'settings'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          Settings
        </button>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Profile Information</h2>

              {isLoadingProfile ? (
                <div className="text-center text-gray-400">Loading profile...</div>
              ) : user ? (
                <>
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">{user.username}</h3>
                      <p className="text-gray-400">{user.email}</p>
                      <p className="text-sm text-gray-500">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Avatar Upload */}
                  <div className="space-y-2">
                    <label className="block text-gray-300 text-sm">Update Avatar URL</label>
                    <div className="flex gap-2">
                      <GlassInput
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="Enter avatar URL"
                        className="flex-1"
                      />
                      <GlassButton
                        onClick={handleUploadAvatar}
                        disabled={updateAvatar.isPending || !avatarUrl.trim()}
                        size="md"
                      >
                        <span className="flex items-center gap-2">
                          <Upload size={16} />
                          {updateAvatar.isPending ? 'Uploading...' : 'Upload'}
                        </span>
                      </GlassButton>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  {isEditingProfile ? (
                    <div className="space-y-4 pt-4">
                      <GlassInput
                        label="Username"
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      />
                      <GlassInput
                        label="Email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <GlassButton
                          onClick={handleSaveProfile}
                          disabled={updateProfile.isPending}
                          fullWidth
                        >
                          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                        </GlassButton>
                        <GlassButton
                          onClick={() => {
                            setIsEditingProfile(false);
                            setProfileForm({ username: user.username, email: user.email });
                          }}
                          variant="secondary"
                          fullWidth
                        >
                          Cancel
                        </GlassButton>
                      </div>
                    </div>
                  ) : (
                    <GlassButton
                      onClick={() => setIsEditingProfile(true)}
                      fullWidth
                    >
                      Edit Profile
                    </GlassButton>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400">No profile data</div>
              )}
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {/* Friend Requests */}
            {isLoadingRequests ? (
              <div className="text-center text-gray-400">Loading requests...</div>
            ) : friendRequests && (friendRequests.received.length > 0 || friendRequests.sent.length > 0) ? (
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">Friend Requests</h2>

                {friendRequests.received.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Received</h3>
                    <div className="space-y-2">
                      {friendRequests.received.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white font-bold">
                              {request.requester?.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium">{request.requester?.username}</p>
                              <p className="text-sm text-gray-400">{formatDate(request.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <GlassButton
                              onClick={() => handleAcceptFriend(request.id)}
                              disabled={acceptFriendRequest.isPending}
                              variant="success"
                              size="sm"
                              title="Accept"
                            >
                              <Check size={16} />
                            </GlassButton>
                            <GlassButton
                              onClick={() => handleDeclineFriend(request.id)}
                              disabled={declineFriendRequest.isPending}
                              variant="danger"
                              size="sm"
                              title="Decline"
                            >
                              <X size={16} />
                            </GlassButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {friendRequests.sent.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Sent</h3>
                    <div className="space-y-2">
                      {friendRequests.sent.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white font-bold">
                              {request.addressee?.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium">{request.addressee?.username}</p>
                              <p className="text-sm text-gray-400">Pending</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Friends List */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Friends</h2>
              {isLoadingFriends ? (
                <div className="text-center text-gray-400">Loading friends...</div>
              ) : friends && friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((friendship) => (
                    <div key={friendship.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white font-bold overflow-hidden">
                          {friendship.friend.avatarUrl ? (
                            <img src={friendship.friend.avatarUrl} alt={friendship.friend.username} className="w-full h-full object-cover" />
                          ) : (
                            friendship.friend.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{friendship.friend.username}</p>
                          <p className="text-sm text-gray-400">Friends since {new Date(friendship.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <GlassButton
                        onClick={() => handleRemoveFriend(friendship.id)}
                        disabled={removeFriend.isPending}
                        variant="danger"
                        size="sm"
                        title="Remove friend"
                      >
                        <UserMinus size={16} />
                      </GlassButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400">No friends yet</p>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Watch History</h2>
            {isLoadingHistory ? (
              <div className="text-center text-gray-400">Loading history...</div>
            ) : history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-24 h-16 bg-slate-700 rounded flex items-center justify-center text-gray-500 overflow-hidden">
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">No thumbnail</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{getVideoTitle(entry.source)}</h4>
                      <p className="text-sm text-gray-400">
                        Watched {formatDate(entry.watchedAt)} • {formatWatchDuration(entry.watchDurationMs)}
                      </p>
                      <p className="text-xs text-gray-500">{entry.participants.length} participant(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400">No watch history yet</p>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Voice Settings */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Mic className="mr-2" />
                Voice Settings
              </h2>

              {isLoadingSettings ? (
                <div className="text-center text-gray-400">Loading settings...</div>
              ) : settings ? (
                <div className="space-y-6">
                  {/* Voice Mode */}
                  <div>
                    <label className="block text-gray-300 mb-3 text-lg">Voice Mode</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={settings.voiceMode === 'push_to_talk'}
                          onChange={() => handleSettingChange('voiceMode', 'push_to_talk')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-white">Push-to-talk</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={settings.voiceMode === 'voice_activity'}
                          onChange={() => handleSettingChange('voiceMode', 'voice_activity')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-white">Voice activity</span>
                      </label>
                    </div>
                  </div>

                  {/* PTT Key */}
                  {settings.voiceMode === 'push_to_talk' && (
                    <GlassInput
                      label="Push-to-talk Key"
                      type="text"
                      value={settings.pttKey}
                      onChange={(e) => handleSettingChange('pttKey', e.target.value)}
                    />
                  )}

                  {/* VAD Threshold */}
                  {settings.voiceMode === 'voice_activity' && (
                    <div>
                      <GlassSlider
                        label="Voice Detection Threshold"
                        min={0}
                        max={1}
                        step={0.05}
                        value={settings.vadThreshold}
                        onChange={(value) => handleSettingChange('vadThreshold', value)}
                        formatValue={(val) => val.toFixed(2)}
                      />
                      <div className="flex justify-between text-sm text-gray-400 mt-1">
                        <span>More sensitive</span>
                        <span>Less sensitive</span>
                      </div>
                    </div>
                  )}

                  {/* Audio Processing */}
                  <div className="space-y-3">
                    <GlassToggle
                      label="Noise Suppression"
                      checked={settings.noiseSuppression}
                      onChange={(checked) => handleSettingChange('noiseSuppression', checked)}
                    />
                    <GlassToggle
                      label="Echo Cancellation"
                      checked={settings.echoCancellation}
                      onChange={(checked) => handleSettingChange('echoCancellation', checked)}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">No settings found</div>
              )}
            </div>

            {/* General Settings */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4">General Settings</h2>

              {isLoadingSettings ? null : settings ? (
                <div className="space-y-4">
                  <SoundSettings />

                  <GlassToggle
                    label="Notifications"
                    checked={settings.notificationsEnabled}
                    onChange={(checked) => handleSettingChange('notificationsEnabled', checked)}
                  />

                  <GlassDropdown
                    label="Theme"
                    value={settings.theme}
                    onChange={(value) => handleSettingChange('theme', value)}
                    options={[
                      { value: 'dark', label: 'Dark' },
                      { value: 'light', label: 'Light' },
                      { value: 'auto', label: 'Auto' },
                    ]}
                  />
                </div>
              ) : null}
            </div>

            {/* Account Actions */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Account Actions</h2>
              <div className="space-y-3">
                {!showPasswordForm ? (
                  <GlassButton
                    onClick={() => setShowPasswordForm(true)}
                    fullWidth
                  >
                    Change Password
                  </GlassButton>
                ) : (
                  <div className="space-y-3">
                    <GlassInput
                      type="password"
                      placeholder="Current Password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                    <GlassInput
                      type="password"
                      placeholder="New Password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                    <GlassInput
                      type="password"
                      placeholder="Confirm New Password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={handleChangePassword}
                        disabled={changePassword.isPending}
                        fullWidth
                      >
                        {changePassword.isPending ? 'Changing...' : 'Confirm'}
                      </GlassButton>
                      <GlassButton
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        variant="secondary"
                        fullWidth
                      >
                        Cancel
                      </GlassButton>
                    </div>
                  </div>
                )}

                <GlassButton
                  onClick={() => {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    navigate('/login');
                  }}
                  variant="primary"
                  fullWidth
                >
                  Logout
                </GlassButton>

                <GlassButton
                  onClick={handleDeleteAccount}
                  disabled={deleteAccount.isPending}
                  variant="danger"
                  fullWidth
                >
                  <span className="flex items-center justify-center gap-2">
                    <Trash2 size={16} />
                    {showDeleteConfirm ? 'Click again to confirm deletion' : 'Delete Account'}
                  </span>
                </GlassButton>
                {showDeleteConfirm && (
                  <p className="text-sm text-red-400 text-center">
                    Warning: This action cannot be undone!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="min-h-screen flex flex-col">
        <div className="glass-card p-4">
          {header}
        </div>
        {content}
      </div>
    </AnimatedPage>
  );
}
