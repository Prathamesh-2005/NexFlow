import { create } from 'zustand';
import { supabase } from '../config/supabaseClient';

export const useProjectStore = create((set, get) => ({
  currentProject: null,
  pages: [],
  activities: [],
  loading: false,
  subscriptions: [],

  updateUserProfile: (updatedProfile) => {
  set({ profile: updatedProfile });
},
  setCurrentProject: async (projectId, userId) => {
    set({ loading: true });

    try {
      get().clearSubscriptions();

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (pagesError) throw pagesError;

      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          user:profiles(full_name, avatar_url),
          page:pages(title)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activitiesError) throw activitiesError;

      set({ 
        currentProject: project, 
        pages: pages || [], 
        activities: activities || [],
        loading: false 
      });

      get().setupSubscriptions(projectId);
    } catch (error) {
      console.error('Error loading project:', error);
      set({ loading: false });
      throw error;
    }
  },

  setupSubscriptions: (projectId) => {
    const subscriptions = [];

    const pagesSubscription = supabase
      .channel(`pages-${projectId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pages', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const { pages } = get();
          
          if (payload.eventType === 'INSERT') {
            set({ pages: [...pages, payload.new] });
          } else if (payload.eventType === 'UPDATE') {
            set({ pages: pages.map(p => p.id === payload.new.id ? payload.new : p) });
          } else if (payload.eventType === 'DELETE') {
            set({ pages: pages.filter(p => p.id !== payload.old.id) });
          }
        }
      )
      .subscribe();

    subscriptions.push(pagesSubscription);

    const activitiesSubscription = supabase
      .channel(`activities-${projectId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const { data } = await supabase
            .from('activities')
            .select(`
              *,
              user:profiles(full_name, avatar_url),
              page:pages(title)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const { activities } = get();
            set({ activities: [data, ...activities].slice(0, 20) });
          }
        }
      )
      .subscribe();

    subscriptions.push(activitiesSubscription);

    set({ subscriptions });
  },

  clearSubscriptions: () => {
    const { subscriptions } = get();
    subscriptions.forEach(sub => {
      supabase.removeChannel(sub);
    });
    set({ subscriptions: [] });
  },

  clearCurrentProject: () => {
    get().clearSubscriptions();
    set({ 
      currentProject: null, 
      pages: [], 
      activities: [],
      loading: false
    });
  },

  createPage: async (pageData) => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert(pageData)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activities').insert({
        project_id: pageData.project_id,
        user_id: pageData.created_by,
        activity_type: 'page_created',
        page_id: data.id,
        metadata: { page_title: data.title }
      });

      return data;
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  },

  updatePage: async (pageId, updates) => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating page:', error);
      throw error;
    }
  },

  deletePage: async (pageId) => {
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Update local state
      const { pages } = get();
      set({ pages: pages.filter(p => p.id !== pageId) });
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  },

  duplicatePage: async (pageId) => {
    try {
      const { pages, currentProject } = get();
      const originalPage = pages.find(p => p.id === pageId);
      
      if (!originalPage) throw new Error('Page not found');

      const { data, error } = await supabase
        .from('pages')
        .insert({
          project_id: originalPage.project_id,
          title: `${originalPage.title} (Copy)`,
          content: originalPage.content,
          created_by: originalPage.created_by,
          position: pages.length
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activities').insert({
        project_id: currentProject.id,
        user_id: originalPage.created_by,
        activity_type: 'page_created',
        page_id: data.id,
        metadata: { 
          action: 'page_duplicated',
          original_title: originalPage.title 
        }
      });

      return data;
    } catch (error) {
      console.error('Error duplicating page:', error);
      throw error;
    }
  }
}));