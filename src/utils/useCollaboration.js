import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { supabase } from '../config/supabaseClient';

export function useCollaboration(pageId, currentUser) {
  const [doc, setDoc] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userEdits, setUserEdits] = useState({});
  const [isReady, setIsReady] = useState(false);
  
  const channelRef = useRef(null);
  const docRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const editTimeoutsRef = useRef({});

  useEffect(() => {
    if (!pageId || !currentUser?.id) return;

    let mounted = true;
    currentUserIdRef.current = currentUser.id;
    
    console.log('🔄 Setting up collaboration for:', currentUser.full_name);

    const setup = async () => {
      try {
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
              self: false, // Don't receive our own broadcasts
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = Object.values(state)
              .flat()
              .filter(u => u.id !== currentUserIdRef.current);
            
            console.log('👥 Active users:', users.length, users);
            setActiveUsers(users);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            newPresences.forEach(user => {
              if (user.id !== currentUserIdRef.current) {
                console.log('✅ User joined:', user.name);
              }
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach(user => {
              if (user.id !== currentUserIdRef.current) {
                console.log('👋 User left:', user.name);
                // Clear their edit indicator
                setUserEdits(prev => {
                  const newEdits = { ...prev };
                  delete newEdits[user.id];
                  return newEdits;
                });
                if (editTimeoutsRef.current[user.id]) {
                  clearTimeout(editTimeoutsRef.current[user.id]);
                  delete editTimeoutsRef.current[user.id];
                }
              }
            });
          })
          .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
            if (docRef.current && payload.update) {
              try {
                const update = new Uint8Array(payload.update);
                Y.applyUpdate(docRef.current, update, 'remote');
                
                // Show who is editing
                if (payload.userId && payload.userId !== currentUserIdRef.current) {
                  console.log('📥 Received update from:', payload.userName);
                  
                  setUserEdits(prev => ({
                    ...prev,
                    [payload.userId]: {
                      name: payload.userName,
                      color: payload.userColor,
                      timestamp: Date.now(),
                    }
                  }));

                  // Clear existing timeout for this user
                  if (editTimeoutsRef.current[payload.userId]) {
                    clearTimeout(editTimeoutsRef.current[payload.userId]);
                  }
                  
                  // Set new timeout to clear edit indicator after 3 seconds
                  editTimeoutsRef.current[payload.userId] = setTimeout(() => {
                    setUserEdits(prev => {
                      const newEdits = { ...prev };
                      delete newEdits[payload.userId];
                      return newEdits;
                    });
                    delete editTimeoutsRef.current[payload.userId];
                  }, 3000);
                }
              } catch (error) {
                console.error('❌ Error applying update:', error);
              }
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && mounted) {
              console.log('✅ Channel subscribed');
              
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

        // Broadcast Y.js updates to other users
        yDoc.on('update', (update, origin) => {
          // Only broadcast local changes (not updates from remote)
          if (origin !== 'remote' && mounted && channelRef.current) {
            console.log('📤 Broadcasting local update to other users');
            channelRef.current.send({
              type: 'broadcast',
              event: 'yjs-update',
              payload: {
                update: Array.from(update),
                userId: currentUser.id,
                userName: currentUser.full_name || currentUser.email,
                userColor: currentUser.color,
              },
            });
          }
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
      currentUserIdRef.current = null;
      
      // Clear all edit timeouts
      Object.values(editTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      editTimeoutsRef.current = {};
      
      if (channelRef.current) {
        console.log('🧹 Cleaning up channel');
        supabase.removeChannel(channelRef.current);
      }
      if (docRef.current) {
        console.log('🧹 Cleaning up Y.js document');
        docRef.current.destroy();
      }
    };
  }, [pageId, currentUser?.id, currentUser?.full_name, currentUser?.email, currentUser?.color, currentUser?.avatar_url]);

  return { 
    doc, 
    activeUsers, 
    userEdits,
    isReady, 
    channel: channelRef.current
  };
}