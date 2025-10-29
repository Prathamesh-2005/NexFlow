import { create } from 'zustand';
import { supabase, supabaseHelpers } from '../config/supabaseClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,

  ensureProfileExists: async (user) => {
    try {
      if (!user) return null;

      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (selectError) console.error('Profile fetch error:', selectError);

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              avatar_url: user.user_metadata?.avatar_url || '',
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        return newProfile;
      }

      return profile;
    } catch (error) {
      console.error('ensureProfileExists error:', error);
      return null;
    }
  },

  initialize: async () => {
    const state = get();
    if (state.initialized) {
      console.log('Auth already initialized');
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error('Session error:', sessionError);

      const user = session?.user || null;
      if (user) {
        const profile = await get().ensureProfileExists(user);
        set({ user, profile, loading: false, initialized: true });
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        const newUser = session?.user || null;
        const profile = newUser ? await get().ensureProfileExists(newUser) : null;
        set({ user: newUser, profile, loading: false });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: error.message, loading: false, initialized: true });
    }
  },

  signUp: async (email, password, fullName) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      const user = data?.user;
      if (user) {
        await supabase.from('profiles').insert([
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
          },
        ]);
      }

      set({ loading: false });
      return { success: true };
    } catch (error) {
      console.error('Sign-up error:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const user = data?.user || data?.session?.user;
      const profile = await get().ensureProfileExists(user);

      set({ user, profile, loading: false });
      return { success: true };
    } catch (error) {
      console.error('Sign-in error:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null });
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  },

  resetPassword: async (email) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      set({ loading: false });
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  updateProfile: async (updates) => {
    try {
      const userId = get().user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;

      const profile = await supabaseHelpers.getCurrentUser();
      set({ profile });
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  },
}));