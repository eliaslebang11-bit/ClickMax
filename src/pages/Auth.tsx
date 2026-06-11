import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Loader2, Play, ChevronRight, AlertCircle, CheckCircle2, Eye, EyeOff, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Auth() {
  const { session, isOnboarded, completeOnboarding, refreshProfile } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(() => {
    // Default to login UNLESS state explicitly says signup
    if (location.state?.mode === 'signup') return false;
    if (location.state?.mode === 'login') return true;
    return true; // Fallback default
  });
  
  useEffect(() => {
    if (location.state?.mode === 'signup') {
      setIsLogin(false);
    } else if (location.state?.mode === 'login') {
      setIsLogin(true);
    }
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If session and onboarded are true, Navigate (handled by App.tsx, but good to have a backup)
  useEffect(() => {
    if (session && isOnboarded) {
      navigate('/', { replace: true });
    }
  }, [session, isOnboarded, navigate]);



  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Password is wrong or the account does not exist.');
          } else if (signInError.status === 400 || signInError.message.includes('Email not confirmed')) {
            setError('Please verify your email or check your credentials.');
          } else {
            setError(signInError.message);
          }
          throw signInError;
        }
        
        // Refresh profile state after successful login
        await refreshProfile();
        // Mark as onboarded to trigger redirect immediately
        await completeOnboarding();
        navigate('/', { replace: true });
      } else {
        // Sign up with email/password
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
              signup_completed: true 
            }
          }
        });
        
        if (signUpError) throw signUpError;

        if (data.user) {
          // Use upsert to handle cases where a trigger might have already created a basic record
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: data.user.id, 
              email: email,
              username: email.split('@')[0],
              full_name: email.split('@')[0],
              handle: `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              signup_completed: true,
              bio: "Welcome to my profile!",
              avatar_url: "",
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

          if (profileError) {
            console.error('Profile creation details:', profileError);
          }
          
          // Mark as onboarded in context to trigger immediate redirect
          await completeOnboarding();
          
          if (data.session) {
            await refreshProfile();
            navigate('/', { replace: true });
          } else {
            // Only show success message if we don't have an immediate session (e.g. email confirmation required)
            setSuccess(true);
          }
        }
      }
    } catch (err: any) {
      // Login errors handled above, others just caught
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in, they will be redirected by App.tsx logic
  // which checks session and onboarding state.

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      {/* Left side - Visual/Branding */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 max-w-lg">
          <h1 className="text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
            Share your story with the world.
          </h1>
          <p className="text-zinc-400 text-xl leading-relaxed">
            Join a community of creators and viewers. Stream, upload, and connect 
            like never before on the most premium video platform.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-white mb-3">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-zinc-500 text-lg">
              {isLogin ? 'Sign in to your account' : 'Join our creator community today'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          {success && !session && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-2xl mb-6 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Account created!</p>
                <p className="text-xs opacity-80">Please check your email to confirm your account and start watching videos.</p>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Password</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 hidden" />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 h-14 rounded-2xl pl-12 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white h-14 rounded-2xl font-bold text-lg mt-4 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </form>



            <p className="text-center text-zinc-500 mt-8">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-white font-bold hover:underline underline-offset-4"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>

            <p className="text-center text-zinc-600 text-[13px] mt-8 px-4 leading-relaxed">
              By continuing, you agree to our <a href="https://privacy-policy-lerg.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline cursor-pointer">Privacy Policy</a> and <a href="https://terms-conditions-navy.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline cursor-pointer">Terms & Conditions</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
