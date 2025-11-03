import { supabase } from '../config/supabaseClient';

export function extractMentions(htmlContent) {
  if (!htmlContent) return [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const mentionElements = doc.querySelectorAll('[data-type="mention"]');
  
  const mentions = [];
  mentionElements.forEach(element => {
    const userId = element.getAttribute('data-id');
    const userName = element.textContent;
    if (userId) {
      mentions.push({
        userId,
        userName: userName.replace('@', ''),
      });
    }
  });
  
  return mentions;
}

/**
 * Get context around a mention (surrounding text)
 */
export function getMentionContext(htmlContent, userId, maxLength = 150) {
  if (!htmlContent) return '';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const mentionElement = doc.querySelector(`[data-type="mention"][data-id="${userId}"]`);
  
  if (!mentionElement) return '';
  
  let container = mentionElement.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
  if (!container) container = mentionElement.parentElement;
  
  let context = container ? container.textContent : '';
  
  if (context.length > maxLength) {
    const mentionIndex = context.indexOf(mentionElement.textContent);
    const start = Math.max(0, mentionIndex - maxLength / 2);
    const end = Math.min(context.length, mentionIndex + maxLength / 2);
    context = (start > 0 ? '...' : '') + 
              context.substring(start, end) + 
              (end < context.length ? '...' : '');
  }
  
  return context.trim();
}

/**
 * Compare old and new content to find new mentions
 * Returns ALL current mentions if oldContent is empty/null
 */
export function getNewMentions(oldContent, newContent) {
  const newMentions = extractMentions(newContent || '');
  
  // If no old content, all mentions are new
  if (!oldContent || oldContent.trim() === '') {
    return newMentions;
  }
  
  const oldMentions = extractMentions(oldContent);
  
  // Create a Set of old mention contexts (userId + position in content)
  // This helps detect if a mention was re-added after being removed
  const oldMentionContexts = new Set(
    oldMentions.map((m, idx) => `${m.userId}-${idx}`)
  );
  
  const newMentionContexts = newMentions.map((m, idx) => `${m.userId}-${idx}`);
  
  // Find mentions that are truly new (not just repositioned)
  const trulyNewMentions = newMentions.filter((mention, idx) => {
    const context = `${mention.userId}-${idx}`;
    return !oldMentionContexts.has(context);
  });
  
  return trulyNewMentions;
}

/**
 * Send mention notification via Supabase Edge Function
 */
export async function sendMentionNotification({
  mentionedUserId,
  mentionedUserName,
  mentionedUserEmail,
  mentionerName,
  pageId,
  pageTitle,
  projectId,
  projectName,
  context,
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('❌ No active session for sending mention email');
      return { success: false, error: 'No active session' };
    }

    const pageLink = `${window.location.origin}/project/${projectId}/page/${pageId}`;
    
    console.log('📧 Sending mention notification to:', mentionedUserEmail);
    
    const payload = {
      to: mentionedUserEmail,
      mentionedUserName,
      mentionerName,
      pageTitle,
      pageLink,
      context,
      projectName,
    };

    const response = await fetch(
      `https://xwornhdmzntowndxavrk.supabase.co/functions/v1/mention-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send mention email:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ Mention notification sent:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error in sendMentionNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store mention in database (using your schema's mentions table)
 */
export async function storeMention({
  pageId,
  mentionedUserId,
  mentionerId,
}) {
  try {
    const { data, error } = await supabase
      .from('mentions')
      .insert({
        page_id: pageId,
        mentioned_user_id: mentionedUserId,
        mentioned_by: mentionerId,
        card_id: null,
        comment_id: null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Could not store mention:', error);
      return { success: false, error };
    }
    
    console.log('✅ Mention stored in database');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error storing mention:', error);
    return { success: false, error };
  }
}

/**
 * Create notification for the mentioned user
 */
export async function createNotification({
  userId,
  title,
  message,
  type = 'mention',
  link,
}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Could not create notification:', error);
      return { success: false, error };
    }
    
    console.log('✅ Notification created in database');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return { success: false, error };
  }
}

/**
 * Process mentions and send notifications
 */
export async function processMentionNotifications({
  oldContent,
  newContent,
  pageId,
  pageTitle,
  projectId,
  projectName,
  currentUser,
  mentionUsers,
  toast,
}) {
  try {
    // Get all current mentions (not just new ones)
    const allMentions = extractMentions(newContent || '');
    
    if (allMentions.length === 0) {
      console.log('ℹ️ No mentions found in content');
      return { success: true, count: 0 };
    }

    console.log('🔔 Found', allMentions.length, 'total mentions');

    // Get mentions that were already notified from database
    const { data: existingMentions } = await supabase
      .from('mentions')
      .select('mentioned_user_id')
      .eq('page_id', pageId)
      .eq('mentioned_by', currentUser.id);

    const notifiedUserIds = new Set(
      existingMentions?.map(m => m.mentioned_user_id) || []
    );

    console.log('📋 Already notified users:', Array.from(notifiedUserIds));

    const notifications = [];
    
    for (const mention of allMentions) {
      // Skip if user mentions themselves
      if (mention.userId === currentUser.id) {
        console.log('⏭️ Skipping self-mention');
        continue;
      }

      // Skip if already notified (check database)
      if (notifiedUserIds.has(mention.userId)) {
        console.log(`⏭️ User ${mention.userId} already notified, skipping`);
        continue;
      }

      const mentionedUser = mentionUsers.find(u => u.id === mention.userId);
      
      if (!mentionedUser) {
        console.warn('⚠️ Could not find user details for:', mention.userId);
        continue;
      }

      const context = getMentionContext(newContent, mention.userId);

      console.log(`📤 Sending notification to ${mentionedUser.label}...`);

      // 1. Send email notification
      const emailResult = await sendMentionNotification({
        mentionedUserId: mention.userId,
        mentionedUserName: mentionedUser.label,
        mentionedUserEmail: mentionedUser.email || mentionedUser.label,
        mentionerName: currentUser.full_name || currentUser.email,
        pageId,
        pageTitle,
        projectId,
        projectName,
        context,
      });

      if (emailResult.success) {
        // 2. Store mention in database
        await storeMention({
          pageId,
          mentionedUserId: mention.userId,
          mentionerId: currentUser.id,
        });

        // 3. Create in-app notification
        await createNotification({
          userId: mention.userId,
          title: `${currentUser.full_name || currentUser.email} mentioned you`,
          message: `in "${pageTitle}"`,
          type: 'mention',
          link: `/project/${projectId}/page/${pageId}`,
        });
        
        notifications.push({
          user: mentionedUser.label,
          success: true,
        });
      } else {
        console.error(`❌ Failed to notify ${mentionedUser.label}:`, emailResult.error);
        notifications.push({
          user: mentionedUser.label,
          success: false,
          error: emailResult.error,
        });
      }
    }

    const successCount = notifications.filter(n => n.success).length;
    
    if (successCount > 0 && toast) {
      toast.success(
        successCount === 1 
          ? `✅ Notified ${notifications.find(n => n.success).user}` 
          : `✅ Notified ${successCount} user${successCount > 1 ? 's' : ''}`
      );
    }

    const failureCount = notifications.filter(n => !n.success).length;
    if (failureCount > 0 && toast) {
      toast.error(`❌ Failed to notify ${failureCount} user${failureCount > 1 ? 's' : ''}`);
    }

    return { 
      success: true, 
      count: successCount,
      notifications,
    };
  } catch (error) {
    console.error('❌ Error processing mention notifications:', error);
    if (toast) {
      toast.error('Failed to process mentions');
    }
    return { success: false, error };
  }
}

/**
 * Debounced version - use this in your editor
 */
let mentionNotificationTimeout = null;
export function debouncedProcessMentionNotifications(params, delay = 3000) {
  if (mentionNotificationTimeout) {
    clearTimeout(mentionNotificationTimeout);
  }

  mentionNotificationTimeout = setTimeout(() => {
    processMentionNotifications(params);
  }, delay);
}