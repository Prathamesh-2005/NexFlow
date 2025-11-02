import { useEffect, useState, useRef,useCallback } from 'react';
import * as Y from 'yjs';
import { supabase } from '../config/supabaseClient';

export function useCollaboration(pageId, currentUser) {
  const [doc, setDoc] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  const [isReady, setIsReady] = useState(false);
  
  const channelRef = useRef(null);
  const docRef = useRef(null);

  useEffect(() => {
    if (!pageId || !currentUser?.id) return;

    let mounted = true;
    console.log('🔄 useCollaboration effect running for:', currentUser.id);

    const setup = async () => {
      try {
        console.log('🚀 Setting up collaboration for page:', pageId);

        // Create Y.js document
        const yDoc = new Y.Doc();
        docRef.current = yDoc;

        // Create Supabase Realtime channel
        const channel = supabase.channel(`page:${pageId}`, {
          config: {
            presence: {
              key: currentUser.id,
            },
            broadcast: {
              self: false,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = Object.values(state)
              .flat()
              .filter(u => u.id !== currentUser.id);
            setActiveUsers(users);
            
            // Update cursor positions from presence state
            const cursors = {};
            users.forEach(user => {
              if (user.cursor) {
                cursors[user.id] = {
                  position: user.cursor,
                  name: user.name,
                  color: user.color,
                };
              }
            });
            setCursorPositions(cursors);
            
            console.log('👥 Active users:', users.length);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            console.log('✅ User joined:', newPresences[0]?.name);
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            console.log('👋 User left:', leftPresences[0]?.name);
            // Remove cursor for user who left
            const leftUserId = leftPresences[0]?.id;
            if (leftUserId) {
              setCursorPositions(prev => {
                const updated = { ...prev };
                delete updated[leftUserId];
                return updated;
              });
            }
          })
          .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
            if (docRef.current && payload.update) {
              const update = new Uint8Array(payload.update);
              Y.applyUpdate(docRef.current, update, 'remote');
              console.log('📨 Applied remote update');
            }
          })
          .on('broadcast', { event: 'cursor-update' }, ({ payload }) => {
            // Handle cursor updates from other users
            if (payload.userId !== currentUser.id) {
              console.log('👆 Received cursor from:', payload.name, 'at position:', payload.position);
              setCursorPositions(prev => ({
                ...prev,
                [payload.userId]: {
                  position: payload.position,
                  name: payload.name,
                  color: payload.color,
                },
              }));
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && mounted) {
              await channel.track({
                id: currentUser.id,
                name: currentUser.full_name || currentUser.email,
                color: currentUser.color,
                avatar: currentUser.avatar_url,
                online_at: new Date().toISOString(),
              });

              setIsReady(true);
              console.log('✅ Collaboration ready');
            }
          });

        channelRef.current = channel;

        // Broadcast Y.js updates
        yDoc.on('update', (update, origin) => {
          if (origin === 'remote') return;

          channel.send({
            type: 'broadcast',
            event: 'yjs-update',
            payload: {
              update: Array.from(update),
            },
          });
        });

        if (mounted) {
          setDoc(yDoc);
        }

      } catch (error) {
        console.error('❌ Collaboration setup error:', error);
      }
    };

    setup();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (docRef.current) {
        docRef.current.destroy();
      }
    };
  }, [pageId, currentUser?.id]); // Only depend on ID, not whole object!

  const broadcastCursor = useCallback((position) => {
    if (channelRef.current && currentUser) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor-update',
        payload: {
          userId: currentUser.id,
          position,
          name: currentUser.full_name || currentUser.email,
          color: currentUser.color,
        },
      });

      // Also update presence
      channelRef.current.track({
        id: currentUser.id,
        name: currentUser.full_name || currentUser.email,
        color: currentUser.color,
        avatar: currentUser.avatar_url,
        online_at: new Date().toISOString(),
        cursor: position,
      });
    }
  }, [currentUser]); // Only recreate when currentUser changes

  return { doc, activeUsers, cursorPositions, isReady, broadcastCursor };
}