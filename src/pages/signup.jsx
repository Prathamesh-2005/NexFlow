import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const TextPressure = ({ text }) => {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const { width, height } = rect;

    const rotateX = ((offsetY / height) - 0.5) * -15;
    const rotateY = ((offsetX / width) - 0.5) * 15;

    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block cursor-pointer select-none"
      style={{
        transition: 'transform 0.3s ease-out',
        transform: `perspective(800px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
        {text}
      </h1>
    </div>
  );
};

export default function Signup() {
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await signUp(formData.email, formData.password, formData.fullName);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Section - Branding */}
{/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-50 to-white overflow-hidden items-start justify-center pt-32">        {/* Subtle decorative elements */}
        <div className="absolute top-20 left-20 w-3 h-3 bg-gray-300 rounded-full opacity-60"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-gray-400 rounded-full opacity-40"></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-gray-300 rounded-full opacity-50"></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-gray-400 rounded-full opacity-30"></div>

        {/* Decorative circles */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gray-100 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gray-100 rounded-full opacity-20 blur-3xl"></div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 pointer-events-none">
          {/* Logo */}
          <div className="mb-12 pointer-events-auto">
            <div className="w-24 h-24 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
              <img src="/logo.png" alt="NexFlow" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Brand Name with TextPressure */}
          <div className="mb-6 pointer-events-auto">
            <TextPressure text="NEXFLOW" />
          </div>

          {/* Tagline */}
          <p className="text-gray-600 text-center max-w-md text-base font-medium">
            Join thousands of teams collaborating seamlessly
          </p>
        </div>

        {/* Bottom code icon */}
        <div className="absolute bottom-8 left-8">
          <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md border border-gray-200">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Subtle Separator */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

      {/* Right Section - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="NexFlow" className="w-12 h-12 object-contain" />
              <span className="text-2xl font-bold text-gray-900">NexFlow</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-500 text-sm">Join NexFlow and start collaborating</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">Account created! Redirecting...</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white text-sm"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white text-sm"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white text-sm"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-6 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-gray-900 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-400 text-xs">
              ©2025 NexFlow. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}