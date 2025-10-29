import { create } from 'zustand';
import { supabase, supabaseHelpers } from '../config/supabaseClient';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  pages: [],
  boards: [],
  activities: [],
  loading: false,
  error: null,
  projectChannel: null,
  presenceChannel: null,
  isSettingProject: false,

  loadProjects: async (userId) => {
    try {
      set({ loading: true, error: null });
      const projects = await supabaseHelpers.getUserProjects(userId);
      set({ projects, loading: false });
      return projects;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error loading projects:', error);
    }
  },

  setCurrentProject: async (projectId, userId) => {
    const state = get();
    
    // Prevent concurrent calls
    if (state.isSettingProject) {
      console.log('Already setting project, skipping...');
      return;
    }
    
    // Check if already loaded
    if (state.currentProject?.id === projectId && state.pages.length > 0) {
      console.log('Project already set in store');
      return;
    }

    try {
      set({ isSettingProject: true, loading: true, error: null });
      
      let projectDetails = state.projects.find(p => p.id === projectId);
      
      if (!projectDetails) {
        projectDetails = await supabaseHelpers.getProjectDetails(projectId);
      }
      
      const [pages, boards, activities] = await Promise.all([
        supabaseHelpers.getProjectPages(projectId),
        supabaseHelpers.getProjectBoards(projectId),
        supabaseHelpers.getProjectActivities(projectId)
      ]);
      
      set({
        currentProject: projectDetails,
        pages: pages || [],
        boards: boards || [],
        activities: activities || [],
        loading: false,
        isSettingProject: false
      });

      get().subscribeToProject(projectId);
      
    } catch (error) {
      set({ error: error.message, loading: false, isSettingProject: false });
      console.error('Error setting current project:', error);
    }
  },

  createProject: async (userId, projectData) => {
    try {
      set({ loading: true, error: null });
      const newProject = await supabaseHelpers.createProject(userId, projectData);
      
      set((state) => ({
        projects: [{ ...newProject, userRole: 'owner' }, ...state.projects],
        loading: false
      }));
      
      return newProject;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error creating project:', error);
      throw error;
    }
  },

  subscribeToProject: (projectId) => {
    const currentChannel = get().projectChannel;
    if (currentChannel) {
      supabase.removeChannel(currentChannel);
    }

    const channel = supabaseHelpers.subscribeToProject(projectId, (payload) => {
      console.log('Real-time update:', payload);
      
      if (payload.table === 'pages') {
        get().handlePageUpdate(payload);
      } else if (payload.table === 'cards') {
        get().handleCardUpdate(payload);
      } else if (payload.table === 'activities') {
        get().handleActivityUpdate(payload);
      }
    });

    set({ projectChannel: channel });
  },

  unsubscribeFromProject: () => {
    const channel = get().projectChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ projectChannel: null });
    }
  },

  handlePageUpdate: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    set((state) => {
      let updatedPages = [...state.pages];
      
      if (eventType === 'INSERT') {
        updatedPages.push(newRecord);
      } else if (eventType === 'UPDATE') {
        updatedPages = updatedPages.map(page =>
          page.id === newRecord.id ? newRecord : page
        );
      } else if (eventType === 'DELETE') {
        updatedPages = updatedPages.filter(page => page.id !== oldRecord.id);
      }
      
      return { pages: updatedPages };
    });
  },

  handleCardUpdate: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    set((state) => {
      const updatedBoards = state.boards.map(board => {
        const updatedColumns = board.board_columns.map(column => {
          let updatedCards = [...column.cards];
          
          if (eventType === 'INSERT' && newRecord.column_id === column.id) {
            updatedCards.push(newRecord);
          } else if (eventType === 'UPDATE') {
            updatedCards = updatedCards.map(card =>
              card.id === newRecord.id ? newRecord : card
            );
          } else if (eventType === 'DELETE') {
            updatedCards = updatedCards.filter(card => card.id !== oldRecord.id);
          }
          
          return { ...column, cards: updatedCards };
        });
        
        return { ...board, board_columns: updatedColumns };
      });
      
      return { boards: updatedBoards };
    });
  },

  handleActivityUpdate: (payload) => {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'INSERT') {
      set((state) => ({
        activities: [newRecord, ...state.activities].slice(0, 50)
      }));
    }
  },

  createPage: async (pageData) => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .insert(pageData)
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        pages: [...state.pages, data]
      }));
      
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
      
      set((state) => ({
        pages: state.pages.map(page => page.id === pageId ? data : page)
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
      
      set((state) => ({
        pages: state.pages.filter(page => page.id !== pageId)
      }));
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  },

  createCard: async (cardData) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .insert(cardData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  },

  updateCard: async (cardId, updates) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', cardId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  },

  moveCard: async (cardId, newColumnId, newPosition) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .update({
          column_id: newColumnId,
          position: newPosition
        })
        .eq('id', cardId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error moving card:', error);
      throw error;
    }
  },

  clearCurrentProject: () => {
    get().unsubscribeFromProject();
    set({
      currentProject: null,
      pages: [],
      boards: [],
      activities: [],
      isSettingProject: false
    });
  }
}));