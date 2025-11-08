import { create } from 'zustand';
import { supabase, supabaseHelpers } from '../config/supabaseClient';

export const useProjectStore = create((set, get) => ({
  currentProject: null,
  pages: [],
  activities: [],
  loading: false,
  error: null,

  setCurrentProject: async (projectId, userId) => {
    set({ loading: true, error: null });
    
    try {
      console.log('📂 Loading project:', projectId);
      
      // Load project and pages in parallel
      const [projectData, activitiesData] = await Promise.all([
        supabaseHelpers.getProjectWithPages(projectId, userId),
        supabaseHelpers.getRecentActivities(projectId, 20)
      ]);

      set({
        currentProject: projectData,
        pages: projectData.pages,
        activities: activitiesData,
        loading: false
      });

    } catch (error) {
      console.error('❌ Error loading project:', error);
      set({ 
        error: error.message, 
        loading: false,
        currentProject: null,
        pages: [],
        activities: []
      });
      throw error;
    }
  },

  clearCurrentProject: () => {
    set({
      currentProject: null,
      pages: [],
      activities: [],
      loading: false,
      error: null
    });
  },

  createPage: async (pageData) => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert([pageData])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        pages: [data, ...state.pages]
      }));

      // Clear cache
      supabaseHelpers.clearProjectDetailsCache(pageData.project_id);

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

      // Update local state
      set(state => ({
        pages: state.pages.map(p => p.id === pageId ? data : p)
      }));

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

      if (error) throw error;

      // Update local state
      set(state => ({
        pages: state.pages.filter(p => p.id !== pageId)
      }));

      // Clear cache
      const project = get().currentProject;
      if (project) {
        supabaseHelpers.clearProjectDetailsCache(project.id);
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  },

  duplicatePage: async (pageId) => {
    try {
      const { data: originalPage, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (fetchError) throw fetchError;

      const duplicatedPage = {
        ...originalPage,
        id: undefined,
        title: `${originalPage.title} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('pages')
        .insert([duplicatedPage])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        pages: [data, ...state.pages]
      }));

      // Clear cache
      supabaseHelpers.clearProjectDetailsCache(originalPage.project_id);

      return data;
    } catch (error) {
      console.error('Error duplicating page:', error);
      throw error;
    }
  }
}));