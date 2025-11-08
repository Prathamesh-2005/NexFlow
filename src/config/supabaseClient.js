import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const projectCache = new Map();
const userProjectsCache = new Map();
const projectDetailsCache = new Map();
const CACHE_DURATION = 60000;

export const supabaseHelpers = {
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return profile;
    }
    return null;
  },

  async getUserProjects(userId) {
    const cached = userProjectsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          role,
          joined_at,
          projects!inner (
            id,
            name,
            description,
            icon,
            color,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const projects = data.map(member => ({
        ...member.projects,
        userRole: member.role,
        memberSince: member.joined_at
      }));

      userProjectsCache.set(userId, {
        data: projects,
        timestamp: Date.now()
      });
      
      return projects;
    } catch (error) {
      throw error;
    }
  },

  async deleteProject(projectId) {
    try {
      const { data: pages } = await supabase
        .from('pages')
        .select('id')
        .eq('project_id', projectId);
      
      const pageIds = pages?.map(p => p.id) || [];
      
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', projectId);
      
      const boardIds = boards?.map(b => b.id) || [];

      await supabase.from('activities').delete().eq('project_id', projectId);
      
      if (pageIds.length > 0) {
        await supabase.from('page_presence').delete().in('page_id', pageIds);
        await supabase.from('page_versions').delete().in('page_id', pageIds);
        await supabase.from('comments').delete().in('page_id', pageIds);
        await supabase.from('mentions').delete().in('page_id', pageIds);
      }
      
      await supabase.from('pages').delete().eq('project_id', projectId);
      
      if (boardIds.length > 0) {
        const { data: cards } = await supabase
          .from('cards')
          .select('id')
          .in('board_id', boardIds);
        
        const cardIds = cards?.map(c => c.id) || [];
        
        if (cardIds.length > 0) {
          await supabase.from('card_labels').delete().in('card_id', cardIds);
          await supabase.from('mentions').delete().in('card_id', cardIds);
        }
        
        await supabase.from('cards').delete().in('board_id', boardIds);
        await supabase.from('board_columns').delete().in('board_id', boardIds);
      }
      
      await supabase.from('boards').delete().eq('project_id', projectId);
      await supabase.from('labels').delete().eq('project_id', projectId);
      await supabase.from('notifications').delete().eq('link', `%/project/${projectId}%`);
      await supabase.from('project_members').delete().eq('project_id', projectId);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;

      this.clearProjectDetailsCache(projectId);
      this.clearUserProjectsCache();
      projectCache.delete(projectId);
      
    } catch (error) {
      throw new Error(error.message || 'Failed to delete project');
    }
  },

  async getProjectDetails(projectId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          icon,
          color,
          created_at,
          created_by,
          pages (
            id,
            title,
            icon,
            updated_at
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async updatePageContent(pageId, content) {
    const { data, error } = await supabase
      .from('pages')
      .update({ content })
      .eq('id', pageId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async checkPermission(userId, projectId, requiredRole) {
    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();
    
    if (error) return false;
    
    const roleHierarchy = { viewer: 1, editor: 2, admin: 3, owner: 4 };
    const userLevel = roleHierarchy[data.role];
    const requiredLevel = roleHierarchy[requiredRole];
    
    return userLevel >= requiredLevel;
  },

  async createProject(userId, projectData) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        icon: projectData.icon || '📁',
        color: projectData.color || '#3B82F6',
        created_by: userId
      })
      .select()
      .single();
    
    if (projectError) throw projectError;

    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: userId,
        role: 'owner'
      });
    
    if (memberError) throw memberError;

    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        project_id: project.id,
        name: 'Main Board',
        description: 'Default kanban board'
      })
      .select()
      .single();
    
    if (boardError) throw boardError;

    const columns = [
      { name: 'To Do', position: 0, color: '#6B7280' },
      { name: 'In Progress', position: 1, color: '#F59E0B' },
      { name: 'Done', position: 2, color: '#10B981' }
    ];

    const { error: columnsError } = await supabase
      .from('board_columns')
      .insert(columns.map(col => ({
        board_id: board.id,
        ...col
      })));
    
    if (columnsError) throw columnsError;

    // Clear the user projects cache so it refreshes
    this.clearUserProjectsCache(userId);

    return project;
  },

  async getProjectPages(projectId) {
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        created_by_profile:profiles!created_by(full_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('position', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getProjectBoards(projectId) {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_columns (
          *,
          cards (
            *,
            assignee:profiles!assignee_id(full_name, avatar_url),
            card_labels (
              labels (*)
            )
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getProjectActivities(projectId, limit = 50) {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        user:profiles!user_id(full_name, avatar_url),
        page:pages!page_id(title),
        card:cards!card_id(title)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  subscribeToProject(projectId, callback) {
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pages', filter: `project_id=eq.${projectId}` },
        callback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        (payload) => {
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `project_id=eq.${projectId}` },
        callback
      )
      .subscribe();
    
    return channel;
  },

  subscribeToPagePresence(pageId, userId, onPresenceUpdate) {
    const channel = supabase.channel(`page:${pageId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        onPresenceUpdate(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return channel;
  },

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  async getProjectWithPages(projectId, userId) {
    const cacheKey = `${projectId}_${userId}`;
    const cached = projectDetailsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, icon, color, created_at, created_by')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch pages separately to avoid ordering issues
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('id, title, icon, updated_at, parent_id, created_by, position')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (pagesError) throw pagesError;

      // Fetch member role
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (memberError) throw memberError;

      const data = {
        ...project,
        pages: pages || [],
        userRole: member?.role || 'viewer'
      };

      projectDetailsCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error in getProjectWithPages:', error);
      throw error;
    }
  },

  async getRecentActivities(projectId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          activity_type,
          metadata,
          created_at,
          user:profiles!activities_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          page:pages (
            id,
            title
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  },

  clearProjectDetailsCache(projectId) {
    if (projectId) {
      for (const key of projectDetailsCache.keys()) {
        if (key.startsWith(`${projectId}_`)) {
          projectDetailsCache.delete(key);
        }
      }
    } else {
      projectDetailsCache.clear();
    }
  },

  clearAllCaches() {
    projectCache.clear();
    userProjectsCache.clear();
    projectDetailsCache.clear();
  },

  clearUserProjectsCache(userId = null) {
    if (userId) {
      userProjectsCache.delete(userId);
    } else {
      userProjectsCache.clear();
    }
  },

  clearProjectCache(projectId) {
    if (projectId) {
      projectCache.delete(projectId);
    } else {
      projectCache.clear();
    }
  },
};

export default supabase;