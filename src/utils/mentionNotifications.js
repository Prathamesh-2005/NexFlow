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
  
  // Get the parent paragraph or containing element
  let container = mentionElement.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
  if (!container) container = mentionElement.parentElement;
  
  let context = container ? container.textContent : '';
  
  // Trim context to max length
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
 */
export function getNewMentions(oldContent, newContent) {
  const oldMentions = extractMentions(oldContent || '');
  const newMentions = extractMentions(newContent || '');
  
  const oldMentionIds = new Set(oldMentions.map(m => m.userId));
  
  // Return only the mentions that weren't in the old content
  return newMentions.filter(m => !oldMentionIds.has(m.userId));
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
    // Create the page link
    const pageLink = `${window.location.origin}/project/${projectId}/page/${pageId}`;
    
    console.log('📧 Sending mention notification to:', mentionedUserEmail);
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-mention-email', {
      body: {
        to: mentionedUserEmail,
        mentionedUserName,
        mentionerName,
        pageTitle,
        pageLink,
        context,
        projectName,
      },
    });

    if (error) {
      console.error('Error sending mention notification:', error);
      return { success: false, error };
    }

    console.log('✅ Mention notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in sendMentionNotification:', error);
    return { success: false, error };
  }
}

/**
 * Store mention notification in database for tracking
 */
export async function storeMentionNotification({
  pageId,
  mentionedUserId,
  mentionerId,
  notifiedAt = new Date().toISOString(),
}) {
  try {
    const { data, error } = await supabase
      .from('mention_notifications')
      .insert({
        page_id: pageId,
        mentioned_user_id: mentionedUserId,
        mentioner_id: mentionerId,
        notified_at: notifiedAt,
        read: false,
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, just log and continue
      console.warn('Could not store mention notification (table may not exist):', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error storing mention notification:', error);
    return { success: false, error };
  }
}

/**
 * Process mentions and send notifications
 * This is the main function to call when content is updated
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
    // Find new mentions
    const newMentions = getNewMentions(oldContent, newContent);
    
    if (newMentions.length === 0) {
      return { success: true, count: 0 };
    }

    console.log('🔔 Processing', newMentions.length, 'new mentions');

    // Send notifications for each new mention
    const notifications = [];
    
    for (const mention of newMentions) {
      // Don't notify if user mentions themselves
      if (mention.userId === currentUser.id) {
        continue;
      }

      // Find user details from mentionUsers
      const mentionedUser = mentionUsers.find(u => u.id === mention.userId);
      
      if (!mentionedUser) {
        console.warn('Could not find user details for:', mention.userId);
        continue;
      }

      // Get context around the mention
      const context = getMentionContext(newContent, mention.userId);

      // Send email notification
      const emailResult = await sendMentionNotification({
        mentionedUserId: mention.userId,
        mentionedUserName: mentionedUser.label,
        mentionedUserEmail: mentionedUser.email || mentionedUser.label, // fallback to label if email not available
        mentionerName: currentUser.full_name || currentUser.email,
        pageId,
        pageTitle,
        projectId,
        projectName,
        context,
      });

      // Store in database (optional, won't fail if table doesn't exist)
      if (emailResult.success) {
        await storeMentionNotification({
          pageId,
          mentionedUserId: mention.userId,
          mentionerId: currentUser.id,
        });
        
        notifications.push({
          user: mentionedUser.label,
          success: true,
        });
      } else {
        notifications.push({
          user: mentionedUser.label,
          success: false,
        });
      }
    }

    // Show toast notification
    const successCount = notifications.filter(n => n.success).length;
    if (successCount > 0) {
      if (toast) {
        toast.success(
          successCount === 1 
            ? `Notified ${notifications[0].user}` 
            : `Notified ${successCount} user${successCount > 1 ? 's' : ''}`
        );
      }
    }

    return { 
      success: true, 
      count: successCount,
      notifications,
    };
  } catch (error) {
    console.error('Error processing mention notifications:', error);
    return { success: false, error };
  }
}

/**
 * Debounced version of processMentionNotifications
 * Use this to avoid sending multiple notifications while typing
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