import React, { useState, useEffect } from 'react';
import { 
  X, Mail, UserPlus, Shield, Check, AlertCircle, 
  Copy, Trash2, Crown, Lock, ChevronDown, Link, Users
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { useToast } from './toast';

const ROLES = {
  owner: { 
    label: 'Owner', 
    description: 'Full control over project, can delete project',
    color: 'text-purple-600 bg-purple-100 border-purple-200',
    icon: Crown
  },
  admin: { 
    label: 'Admin', 
    description: 'Manage members, settings, and all content',
    color: 'text-blue-600 bg-blue-100 border-blue-200',
    icon: Shield
  },
  editor: { 
    label: 'Editor', 
    description: 'Create and edit pages, manage Kanban cards',
    color: 'text-green-600 bg-green-100 border-green-200',
    icon: UserPlus
  },
  viewer: { 
    label: 'Viewer', 
    description: 'View-only access, cannot edit',
    color: 'text-gray-600 bg-gray-100 border-gray-200',
    icon: Lock
  }
};

export default function ShareProjectModal({ 
  project, 
  currentUserRole, 
  currentUserId, 
  onClose, 
  onSuccess 
}) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingMember, setRemovingMember] = useState(null);
  const toast = useToast();

  const canManageMembers = ['owner', 'admin'].includes(currentUserRole);
  const canChangeRoles = currentUserRole === 'owner';

  useEffect(() => {
    fetchMembers();
  }, [project.id]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', project.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };
const sendEmailInvitation = async (userEmail, userName, role) => {
  try {
    // ✅ Get current session to include auth token in the request
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No active session for sending email');
      return;
    }

    // ✅ Build the payload
    const payload = {
      to: userEmail,
      userName: userName,
      projectName: project.name,
      role: ROLES[role].label,
      projectLink: `${window.location.origin}/project/${project.id}`,
      inviterName: session.user.user_metadata?.full_name || session.user.email,
    };

    // ✅ Call your Supabase Edge Function (production endpoint)
    const response = await fetch(
      'https://xwornhdmzntowndxavrk.supabase.co/functions/v1/resend-email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // important!
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to send email invitation:', result.error || result);
    } else {
      console.log('✅ Email sent successfully:', result);
    }

  } catch (error) {
    console.error('❌ Error sending email:', error);
    // You can show a toast instead of console if you want
  }
};


  const handleInvite = async (e) => {
    e.preventDefault();

    if (!email.trim() || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (members.some(m => m.profiles.email.toLowerCase() === email.toLowerCase())) {
      toast.error('This user is already a member');
      return;
    }

    setInviting(true);

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .single();

      if (profileError || !userProfile) {
        toast.error('User not found. They need to sign up first.');
        setInviting(false);
        return;
      }

      const { data: newMember, error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: userProfile.id,
          role: selectedRole
        })
        .select(`
          id, user_id, role, joined_at,
          profiles (id, email, full_name, avatar_url)
        `)
        .single();

      if (memberError) throw memberError;

      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: userProfile.id,
        title: 'Project Invitation',
        message: `You've been added to "${project.name}" as ${ROLES[selectedRole].label}`,
        type: 'project_invite',
        link: `/project/${project.id}`
      });

      // Send email invitation (non-blocking)
      sendEmailInvitation(
        userProfile.email, 
        userProfile.full_name || userProfile.email,
        selectedRole
      );

      // Log activity with correct type
      await supabase.from('activities').insert({
        project_id: project.id,
        user_id: currentUserId,
        activity_type: 'member_added',
        metadata: {
          action: 'member_added',
          member_email: email,
          member_name: userProfile.full_name || email,
          role: selectedRole
        }
      });

      // Optimistically update UI
      setMembers([...members, newMember]);
      toast.success(`${userProfile.full_name || email} has been added to the project!`);
      setEmail('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error inviting:', err);
      toast.error('Failed to invite user. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, userId, newRole) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Optimistic UI update
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Role Updated',
        message: `Your role in "${project.name}" is now ${ROLES[newRole].label}`,
        type: 'role_change',
        link: `/project/${project.id}`
      });

      await supabase.from('activities').insert({
        project_id: project.id,
        user_id: currentUserId,
        activity_type: 'member_role_changed',
        metadata: { action: 'role_changed', member_id: userId, new_role: newRole }
      });

      toast.success('Role updated successfully');
      setShowRoleMenu(null);
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
      // Revert optimistic update on error
      fetchMembers();
    }
  };

  const handleRemoveMember = async (memberId, userId, memberName) => {
    setRemovingMember({ memberId, userId, memberName });
  };

  const confirmRemoveMember = async () => {
    const { memberId, userId, memberName } = removingMember;

    try {
      await supabase.from('project_members').delete().eq('id', memberId);
      
      // Optimistic UI update
      setMembers(members.filter(m => m.id !== memberId));

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Removed from Project',
        message: `You've been removed from "${project.name}"`,
        type: 'project_removal',
        link: '/dashboard'
      });

      await supabase.from('activities').insert({
        project_id: project.id,
        user_id: currentUserId,
        activity_type: 'member_removed',
        metadata: { action: 'member_removed', member_name: memberName }
      });

      toast.success(`${memberName} has been removed from the project`);
      setRemovingMember(null);
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
      // Revert optimistic update on error
      fetchMembers();
      setRemovingMember(null);
    }
  };

  const copyProjectLink = () => {
    const link = `${window.location.origin}/project/${project.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Project link copied to clipboard!');
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Share Project</h2>
              <p className="text-sm text-gray-600 mt-1">{project.name}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {canManageMembers && (
            <div className="mb-6">
              {/* Invite Form */}
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white transition min-w-[120px]"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviting || !email.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition whitespace-nowrap flex items-center gap-2"
                    >
                      {inviting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Inviting...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Copy Link Button */}
              <button
                onClick={copyProjectLink}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition group"
              >
                <Link className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition">
                  Copy Project Link
                </span>
              </button>

              {/* Info Box */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Invited users must have an account to access the project. 
                  They will receive an in-app notification and email.
                </p>
              </div>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({members.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Loading members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No members yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const RoleIcon = ROLES[member.role].icon;
                  const isCurrentUser = member.user_id === currentUserId;
                  const canModify = canManageMembers && !isCurrentUser && !(member.role === 'owner' && !canChangeRoles);

                  return (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {member.profiles.avatar_url ? (
                          <img 
                            src={member.profiles.avatar_url} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold border-2 border-gray-200">
                            {(member.profiles.full_name?.[0] || member.profiles.email[0]).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-900">
                            {member.profiles.full_name || member.profiles.email}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-blue-600 font-semibold">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 truncate">{member.profiles.email}</p>
                        </div>
                      </div>

                      {/* Role Badge & Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="relative">
                          <button
                            onClick={() => canModify && setShowRoleMenu(showRoleMenu === member.id ? null : member.id)}
                            disabled={!canModify}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${ROLES[member.role].color} ${
                              canModify ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            }`}
                          >
                            <RoleIcon className="w-4 h-4" />
                            <span>{ROLES[member.role].label}</span>
                            {canModify && <ChevronDown className="w-3 h-3" />}
                          </button>

                          {/* Role Dropdown */}
                          {showRoleMenu === member.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowRoleMenu(null)}
                              />
                              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                                {Object.entries(ROLES).map(([roleKey, roleInfo]) => {
                                  if (roleKey === 'owner' && !canChangeRoles) return null;
                                  const Icon = roleInfo.icon;
                                  const isSelected = member.role === roleKey;
                                  return (
                                    <button
                                      key={roleKey}
                                      onClick={() => handleRoleChange(member.id, member.user_id, roleKey)}
                                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-start gap-3 transition ${
                                        isSelected ? 'bg-blue-50' : ''
                                      }`}
                                    >
                                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${roleInfo.color.split(' ')[0]}`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium text-sm text-gray-900">{roleInfo.label}</p>
                                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5">{roleInfo.description}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Remove Button */}
                        {canModify && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user_id, member.profiles.full_name || member.profiles.email)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      {removingMember && (
        <div 
          onClick={() => setRemovingMember(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Member?</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to remove <span className="font-semibold">{removingMember.memberName}</span> from this project?
                </p>
                <p className="text-sm text-red-600 font-medium mt-2">
                  They will lose access immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRemovingMember(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveMember}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}