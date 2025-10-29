import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  async getProjectDetails(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, icon, color, created_at, created_by')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data;
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

  async getUserProjects(userId) {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        role,
        joined_at,
        projects (
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
    
    if (error) throw error;
    return data.map(item => ({
      ...item.projects,
      userRole: item.role
    }));
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
  }
};

export default supabase;