import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Check,
} from 'lucide-react';
import { AnimatedPage } from '../components/AnimatedPage';
import { GlassButton, GlassInput } from '../components/ui/glass';
import clsx from 'clsx';

/**
 * Register Page - Sign up page with liquid-glass design
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password validation
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && password !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    // TODO: Implement actual registration logic
    try {
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, redirect to login on success
      navigate('/login');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 animated-gradient flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <img src="/logo.svg" alt="SyncWatch" className="w-10 h-10" />
            <span className="text-xl font-bold text-gradient">SyncWatch</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Register Card */}
          <div className="glass-card p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-accent-cyan" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Create an account
              </h1>
              <p className="text-gray-400 text-sm">
                Join SyncWatch and start watching with friends
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <GlassInput
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="pl-12"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <GlassInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-12"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <GlassInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pl-12 pr-12"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Requirements */}
                {password && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <PasswordRequirement
                      met={passwordRequirements.minLength}
                      text="8+ characters"
                    />
                    <PasswordRequirement
                      met={passwordRequirements.hasUppercase}
                      text="Uppercase"
                    />
                    <PasswordRequirement
                      met={passwordRequirements.hasLowercase}
                      text="Lowercase"
                    />
                    <PasswordRequirement
                      met={passwordRequirements.hasNumber}
                      text="Number"
                    />
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <GlassInput
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-12 pr-12"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="mt-2">
                    <PasswordRequirement
                      met={doPasswordsMatch}
                      text="Passwords match"
                    />
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="text-sm text-gray-400">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-accent-cyan hover:text-white">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-accent-cyan hover:text-white">
                  Privacy Policy
                </Link>
                .
              </div>

              {/* Submit Button */}
              <GlassButton
                type="submit"
                className={clsx(
                  'w-full py-3',
                  isLoading && 'opacity-70 cursor-wait'
                )}
                disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </GlassButton>
            </form>

            {/* Login Link */}
            <p className="mt-8 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-accent-cyan hover:text-white transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </AnimatedPage>
  );
}

/**
 * Password Requirement Indicator
 */
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 text-xs transition-colors',
        met ? 'text-green-400' : 'text-gray-500'
      )}
    >
      <Check className={clsx('w-3 h-3', met ? 'opacity-100' : 'opacity-30')} />
      <span>{text}</span>
    </div>
  );
}

export default RegisterPage;
