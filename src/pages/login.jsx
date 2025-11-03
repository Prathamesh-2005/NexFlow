import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const TextPressure = ({ text }) => {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const { width, height } = rect;

    // Calculate tilt angle based on cursor position
    const rotateX = ((offsetY / height) - 0.5) * -15; // up/down tilt
    const rotateY = ((offsetX / width) - 0.5) * 15;   // left/right tilt

    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    // Smoothly reset the text to default position
    setTransform({ rotateX: 0, rotateY: 0 });
  };

  
  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="transition-transform duration-300 ease-out select-none cursor-pointer inline-block"
      style={{
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

export default function Login() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-white overflow-hidden items-center justify-center">
        {/* Subtle decorative elements */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-gray-300 rounded-full"></div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <div className="mb-12">
            <div className="w-24 h-24 flex items-center justify-center">
              <img src="/logo.png" alt="NexFlow" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Brand Name with TextPressure */}
          <div className="mb-6">
            <TextPressure text="NEXFLOW" />
          </div>

          {/* Tagline */}
          <p className="text-gray-500 text-center max-w-md text-sm">
            Welcome back to your collaborative workspace
          </p>
        </div>

        {/* Bottom code icon */}
        <div className="absolute bottom-8 left-8">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Vertical Separator */}
      <div className="hidden lg:block w-px bg-gray-200"></div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="NexFlow" className="w-12 h-12 object-contain" />
              <span className="text-2xl font-bold text-gray-900">NexFlow</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-500 text-sm">Enter your credentials to access your workspace</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all bg-white text-sm"
                    placeholder="test@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all bg-white text-sm"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-6"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-gray-900 font-semibold hover:underline">
                  Sign up here
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