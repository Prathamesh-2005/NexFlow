import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { useToast } from '../components/toast';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const TextPressure = ({ text }) => {
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const { width, height } = rect;

    const rotateX = ((offsetY / height) - 0.5) * -20;
    const rotateY = ((offsetX / width) - 0.5) * 20;

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
        transition: 'transform 0.2s ease-out',
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent"
          style={{
            textShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
        {text}
      </h1>
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const toast = useToast();
  
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
      toast.success('Successfully logged in! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setError(result.error);
      toast.error(result.error || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 overflow-hidden items-start justify-center pt-32">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-indigo-100/30 to-pink-100/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
        
        {/* Floating dots with animation */}
        <div className="absolute top-20 left-20 w-3 h-3 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full opacity-70 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full opacity-60 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full opacity-60 animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full opacity-50 animate-bounce" style={{ animationDuration: '3.2s', animationDelay: '1.5s' }}></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 pointer-events-none">
          {/* Logo with glow effect */}
          <div className="mb-12 pointer-events-auto">
            <div className="w-24 h-24 flex items-center justify-center transform hover:scale-110 transition-all duration-300 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-4 border border-gray-200/50">
                <img src="/logo.png" alt="NexFlow" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Brand Name with TextPressure */}
          <div className="mb-6 pointer-events-auto">
            <TextPressure text="NEXFLOW" />
          </div>

          {/* Tagline with subtle animation */}
          <p className="text-gray-600 text-center max-w-md text-base font-medium animate-fade-in">
            Welcome back to your collaborative workspace
          </p>
          
          {/* Feature highlights */}
          <div className="mt-12 flex gap-8 text-xs text-gray-500 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Fast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
              <span>Reliable</span>
            </div>
          </div>
        </div>

        {/* Bottom code icon with improved styling */}
        <div className="absolute bottom-8 left-8">
          <div className="w-12 h-12 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-gray-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Elegant Separator */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-gray-300/50 to-transparent"></div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-white via-gray-50/30 to-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="bg-white rounded-xl shadow-md p-2 border border-gray-200/50">
                <img src="/logo.png" alt="NexFlow" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">NexFlow</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 hover:shadow-3xl transition-shadow duration-300">
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">Welcome Back</h2>
              <p className="text-gray-500 text-sm">Enter your credentials to access your workspace</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white/50 backdrop-blur-sm text-sm hover:bg-white focus:bg-white hover:border-gray-400"
                    placeholder="test@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white/50 backdrop-blur-sm text-sm hover:bg-white focus:bg-white hover:border-gray-400"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-6 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                <Link to="/signup" className="text-gray-900 font-semibold hover:underline transition-all hover:text-gray-700">
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
      
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}