import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { useProjectStore } from '../stores/projectstore';
import { supabase } from '../config/supabaseClient';
import { useToast } from '../components/toast';
import { hasPermission } from '../utils/permissions';
import { 
  Plus, 
  ArrowLeft,
  Search,
  Users,
  ChevronDown,
  Lock
} from 'lucide-react';
import KanbanColumn from '../components/KanbanColumn';
import CreateCardModal from '../components/CreateCardModal';
import EditCardModal from '../components/EditCardModal';
import CreateColumnModal from '../components/CreateColumnModal';

const logCardActivity = async (supabase, projectId, userId, activityType, metadata) => {
  try {
    await supabase.from('activities').insert({
      project_id: projectId,
      user_id: userId,
      activity_type: 'card_updated',
      metadata: {
        action: activityType,
        ...metadata
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export default function KanbanBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { currentProject } = useProjectStore();
  const toast = useToast();
  
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectLabels, setProjectLabels] = useState([]);
  const [projectPages, setProjectPages] = useState([]);
  const [draggedCard, setDraggedCard] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [showCreateCard, setShowCreateCard] = useState(null);
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Fetch user's role in the project
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!projectId || !profile?.id) return;

      try {
        const { data, error } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', profile.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setCurrentUserRole('viewer');
          return;
        }

        setCurrentUserRole(data?.role || 'viewer');
        console.log('👤 User role in Kanban:', data?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setCurrentUserRole('viewer');
      }
    };

    fetchUserRole();
  }, [projectId, profile?.id]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select(`
          *,
          board_columns (
            id,
            name,
            position,
            color
          )
        `)
        .eq('project_id', projectId)
        .single();

      if (boardError) throw boardError;

      if (boardData) {
        const columnsWithCards = await Promise.all(
          (boardData.board_columns || [])
            .sort((a, b) => a.position - b.position)
            .map(async (column) => {
              const { data: cards, error: cardsError } = await supabase
                .from('cards')
                .select(`
                  *,
                  assignee:profiles!cards_assignee_id_fkey (
                    id,
                    full_name,
                    avatar_url
                  ),
                  linked_page:pages!cards_linked_page_id_fkey (
                    id,
                    title,
                    icon
                  )
                `)
                .eq('column_id', column.id)
                .order('position', { ascending: true });

              if (cardsError) {
                console.error('Error fetching cards:', cardsError);
                return { ...column, cards: [] };
              }

              const cardsWithLabels = await Promise.all(
                (cards || []).map(async (card) => {
                  const { data: cardLabels } = await supabase
                    .from('card_labels')
                    .select(`
                      label_id,
                      labels (
                        id,
                        name,
                        color
                      )
                    `)
                    .eq('card_id', card.id);

                  return {
                    ...card,
                    labels: cardLabels?.map(cl => cl.labels) || []
                  };
                })
              );

              return { ...column, cards: cardsWithLabels };
            })
        );

        setBoard(boardData);
        setColumns(columnsWithCards);
      }
    } catch (error) {
      console.error('Error fetching board data:', error);
      toast.error('Failed to load board data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setProjectMembers(data.map(m => m.profiles));
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchProjectLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setProjectLabels(data || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  };

  const fetchProjectPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, icon')
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('title');

      if (error) throw error;
      setProjectPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchBoardData();
      fetchProjectMembers();
      fetchProjectLabels();
      fetchProjectPages();
    }
  }, [projectId]);

  useEffect(() => {
    if (!board?.id) return;

    const cardsSubscription = supabase
      .channel('cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `board_id=eq.${board.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newCard } = await supabase
              .from('cards')
              .select(`
                *,
                assignee:profiles!cards_assignee_id_fkey (
                  id,
                  full_name,
                  avatar_url
                ),
                linked_page:pages!cards_linked_page_id_fkey (
                  id,
                  title,
                  icon
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (newCard) {
              const { data: cardLabels } = await supabase
                .from('card_labels')
                .select(`
                  label_id,
                  labels (
                    id,
                    name,
                    color
                  )
                `)
                .eq('card_id', newCard.id);

              newCard.labels = cardLabels?.map(cl => cl.labels) || [];

              setColumns(prev => prev.map(col => {
                if (col.id === newCard.column_id) {
                  return {
                    ...col,
                    cards: [...(col.cards || []), newCard]
                  };
                }
                return col;
              }));
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data: updatedCard } = await supabase
              .from('cards')
              .select(`
                *,
                assignee:profiles!cards_assignee_id_fkey (
                  id,
                  full_name,
                  avatar_url
                ),
                linked_page:pages!cards_linked_page_id_fkey (
                  id,
                  title,
                  icon
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (updatedCard) {
              const { data: cardLabels } = await supabase
                .from('card_labels')
                .select(`
                  label_id,
                  labels (
                    id,
                    name,
                    color
                  )
                `)
                .eq('card_id', updatedCard.id);

              updatedCard.labels = cardLabels?.map(cl => cl.labels) || [];

              setColumns(prev => prev.map(col => {
                const filteredCards = col.cards.filter(c => c.id !== updatedCard.id);
                
                if (col.id === updatedCard.column_id) {
                  return {
                    ...col,
                    cards: [...filteredCards, updatedCard].sort((a, b) => a.position - b.position)
                  };
                }
                
                return { ...col, cards: filteredCards };
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            setColumns(prev => prev.map(col => ({
              ...col,
              cards: col.cards.filter(c => c.id !== payload.old.id)
            })));
          }
        }
      )
      .subscribe();

    const labelsSubscription = supabase
      .channel('card-labels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'card_labels'
        },
        async (payload) => {
          const cardId = payload.new?.card_id || payload.old?.card_id;
          if (cardId) {
            const { data: cardLabels } = await supabase
              .from('card_labels')
              .select(`
                label_id,
                labels (
                  id,
                  name,
                  color
                )
              `)
              .eq('card_id', cardId);

            setColumns(prev => prev.map(col => ({
              ...col,
              cards: col.cards.map(card => 
                card.id === cardId 
                  ? { ...card, labels: cardLabels?.map(cl => cl.labels) || [] }
                  : card
              )
            })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cardsSubscription);
      supabase.removeChannel(labelsSubscription);
    };
  }, [board?.id]);

  const handleDragStart = (e, card, columnId) => {
    // Check permission before allowing drag
    if (!hasPermission(currentUserRole, 'canEditCards')) {
      e.preventDefault();
      toast.error('You do not have permission to move cards');
      return;
    }

    setDraggedCard({ card, columnId });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedCard(null);
    setDraggedOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDraggedOverColumn(null);
    }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCard) return;

    // Double check permission
    if (!hasPermission(currentUserRole, 'canEditCards')) {
      handleDragEnd();
      toast.error('You do not have permission to move cards');
      return;
    }

    const { card, columnId: sourceColumnId } = draggedCard;

    if (sourceColumnId === targetColumnId) {
      handleDragEnd();
      return;
    }

    try {
      const sourceColumn = columns.find(c => c.id === sourceColumnId);
      const targetColumn = columns.find(c => c.id === targetColumnId);
      const newPosition = targetColumn.cards?.length || 0;

      setColumns(prevColumns => {
        return prevColumns.map(col => {
          if (col.id === sourceColumnId) {
            return {
              ...col,
              cards: col.cards.filter(c => c.id !== card.id)
            };
          }
          if (col.id === targetColumnId) {
            return {
              ...col,
              cards: [...(col.cards || []), { ...card, column_id: targetColumnId, position: newPosition }]
            };
          }
          return col;
        });
      });

      const { error } = await supabase
        .from('cards')
        .update({ 
          column_id: targetColumnId, 
          position: newPosition 
        })
        .eq('id', card.id);

      if (error) throw error;

      await logCardActivity(supabase, projectId, profile.id, 'card_moved', {
        card_id: card.id,
        card_title: card.title,
        from_column: sourceColumn.name,
        to_column: targetColumn.name
      });

      toast.success('Card moved successfully');
    } catch (error) {
      console.error('Error moving card:', error);
      toast.error('Failed to move card');
      fetchBoardData();
    } finally {
      handleDragEnd();
    }
  };

  const handleCreateCard = async (columnId, cardData) => {
    // Check permission
    if (!hasPermission(currentUserRole, 'canCreateCards')) {
      toast.error('You do not have permission to create cards');
      return;
    }

    try {
      const column = columns.find(c => c.id === columnId);
      const position = column?.cards?.length || 0;
      
      const { data, error } = await supabase
        .from('cards')
        .insert({
          board_id: board.id,
          column_id: columnId,
          title: cardData.title,
          description: cardData.description,
          priority: cardData.priority,
          due_date: cardData.due_date || null,
          assignee_id: cardData.assignee_id || null,
          linked_page_id: cardData.linked_page_id || null,
          position: position,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      if (cardData.label_ids && cardData.label_ids.length > 0) {
        const labelInserts = cardData.label_ids.map(labelId => ({
          card_id: data.id,
          label_id: labelId
        }));

        const { error: labelError } = await supabase
          .from('card_labels')
          .insert(labelInserts);

        if (labelError) console.error('Error adding labels:', labelError);
      }

      await logCardActivity(supabase, projectId, profile.id, 'card_created', {
        card_id: data.id,
        card_title: cardData.title,
        column_name: column.name
      });

      setShowCreateCard(null);
      toast.success('Card created successfully');
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error('Failed to create card');
    }
  };

  const handleUpdateCard = async (cardId, updates) => {
    // Check permission
    if (!hasPermission(currentUserRole, 'canEditCards')) {
      toast.error('You do not have permission to edit cards');
      return;
    }

    try {
      const { label_ids, ...cardUpdates } = updates;
      
      const currentCard = columns.flatMap(c => c.cards).find(c => c.id === cardId);
      
      const sanitizedUpdates = {
        ...cardUpdates,
        assignee_id: cardUpdates.assignee_id || null,
        linked_page_id: cardUpdates.linked_page_id || null,
        due_date: cardUpdates.due_date || null
      };
      
      const { error } = await supabase
        .from('cards')
        .update(sanitizedUpdates)
        .eq('id', cardId);

      if (error) throw error;

      if (label_ids !== undefined) {
        await supabase
          .from('card_labels')
          .delete()
          .eq('card_id', cardId);

        if (label_ids.length > 0) {
          const labelInserts = label_ids.map(labelId => ({
            card_id: cardId,
            label_id: labelId
          }));

          await supabase
            .from('card_labels')
            .insert(labelInserts);
        }
      }

      await logCardActivity(supabase, projectId, profile.id, 'card_updated', {
        card_id: cardId,
        card_title: currentCard?.title || 'Unknown card'
      });

      if (cardUpdates.assignee_id && currentCard?.assignee_id !== cardUpdates.assignee_id) {
        const assignee = projectMembers.find(m => m.id === cardUpdates.assignee_id);
        
        await logCardActivity(supabase, projectId, profile.id, 'card_assigned', {
          card_id: cardId,
          card_title: currentCard?.title,
          assignee_name: assignee?.full_name || assignee?.email
        });

        await supabase.from('notifications').insert({
          user_id: cardUpdates.assignee_id,
          title: 'Card Assigned',
          message: `You've been assigned to "${currentCard?.title}"`,
          type: 'assignment',
          link: `/project/${projectId}/board/main`
        });
      }

      toast.success('Card updated successfully');
    } catch (error) {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
    }
  };

  const handleDeleteCard = async (cardId) => {
    // Check permission
    if (!hasPermission(currentUserRole, 'canDeleteCards')) {
      toast.error('You do not have permission to delete cards');
      return;
    }

    try {
      const card = columns.flatMap(c => c.cards).find(c => c.id === cardId);
      
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      await logCardActivity(supabase, projectId, profile.id, 'card_deleted', {
        card_id: cardId,
        card_title: card?.title || 'Unknown card'
      });

      toast.success('Card deleted successfully');
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  };

  const handleDeleteColumn = async (columnId) => {
    // Check permission (typically owner/admin only)
    if (!hasPermission(currentUserRole, 'canManageSettings')) {
      toast.error('You do not have permission to delete columns');
      return;
    }

    try {
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      setColumns(prev => prev.filter(col => col.id !== columnId));
      toast.success('Column deleted successfully');
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error('Failed to delete column');
    }
  };

  const handleCreateColumn = async (columnData) => {
    // Check permission
    if (!hasPermission(currentUserRole, 'canManageSettings')) {
      toast.error('You do not have permission to create columns');
      return;
    }

    try {
      const position = columns.length;
      
      const { data, error } = await supabase
        .from('board_columns')
        .insert({
          board_id: board.id,
          name: columnData.name,
          color: columnData.color,
          position: position
        })
        .select()
        .single();

      if (error) throw error;

      setColumns(prev => [...prev, { ...data, cards: [] }]);
      setShowCreateColumn(false);
      toast.success('Column created successfully');
    } catch (error) {
      console.error('Error creating column:', error);
      toast.error('Failed to create column');
    }
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    cards: (column.cards || []).filter(card => {
      const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           card.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee = filterAssignee === 'all' || card.assignee_id === filterAssignee;
      return matchesSearch && matchesAssignee;
    })
  }));

  const getSelectedMember = () => {
    if (filterAssignee === 'all') return null;
    return projectMembers.find(m => m.id === filterAssignee);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No board found.</p>
        </div>
      </div>
    );
  }

  const selectedMember = getSelectedMember();
  const canEditCards = hasPermission(currentUserRole, 'canEditCards');
  const canCreateCards = hasPermission(currentUserRole, 'canCreateCards');
  const canManageSettings = hasPermission(currentUserRole, 'canManageSettings');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
              <p className="text-sm text-gray-600">{currentProject?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="flex items-center gap-2 pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white cursor-pointer hover:bg-gray-50 transition min-w-[200px]"
              >
                {selectedMember ? (
                  <>
                    {selectedMember.avatar_url ? (
                      <img
                        src={selectedMember.avatar_url}
                        alt={selectedMember.full_name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                        {selectedMember.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="flex-1 text-left">{selectedMember.full_name || selectedMember.email}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-left text-gray-700">All Assignees</span>
                  </>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showAssigneeDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilterAssignee('all');
                      setShowAssigneeDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 ${
                      filterAssignee === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Users className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">All Assignees</span>
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  {projectMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setFilterAssignee(member.id);
                        setShowAssigneeDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 ${
                        filterAssignee === member.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-6 h-6 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {member.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="flex-1">{member.full_name || member.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {!canEditCards && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-yellow-700" />
            <p className="text-sm text-yellow-800">
              You are viewing this board in read-only mode. You do not have permission to edit cards.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${(columns.length + 1) * 320}px` }}>
          {filteredColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              isDraggedOver={draggedOverColumn === column.id && isDragging}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              onDragStart={(e, card, columnId) => {
                handleDragStart(e, card, columnId);
                e.target.addEventListener('dragend', handleDragEnd, { once: true });
              }}
              onCreateCard={() => setShowCreateCard(column.id)}
              onEditCard={setEditingCard}
              onDeleteCard={handleDeleteCard}
              onUpdateCard={handleUpdateCard}
              onDeleteColumn={handleDeleteColumn}
              canEditCards={canEditCards}
              canCreateCards={canCreateCards}
              canManageSettings={canManageSettings}
            />
          ))}

          {canManageSettings && (
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => setShowCreateColumn(true)}
                className="w-full h-full min-h-[200px] bg-white/50 hover:bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
              >
                <Plus className="w-8 h-8" />
                <span className="font-medium">Add Column</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateCard && (
        <CreateCardModal
          columnId={showCreateCard}
          onClose={() => setShowCreateCard(null)}
          onCreate={handleCreateCard}
          projectMembers={projectMembers}
          projectLabels={projectLabels}
          projectPages={projectPages}
        />
      )}

      {editingCard && (
        <EditCardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onUpdate={handleUpdateCard}
          projectMembers={projectMembers}
          projectLabels={projectLabels}
          projectPages={projectPages}
          projectId={projectId}
        />
      )}

      {showCreateColumn && (
        <CreateColumnModal
          onClose={() => setShowCreateColumn(false)}
          onCreate={handleCreateColumn}
          boardId={board.id}
          existingColumns={columns}
        />
      )}
    </div>
  );
}