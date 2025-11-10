import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { supabase } from '../config/supabaseClient';

export function useCollaboration(pageId, currentUser, initialContent) {
  const [doc, setDoc] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userEdits, setUserEdits] = useState({});
  const [isReady, setIsReady] = useState(false);
  
  const channelRef = useRef(null);
  const docRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const editTimeoutsRef = useRef({});
  const isApplyingRemoteUpdate = useRef(false);
  const hasLoadedInitialContent = useRef(false);

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

        // Load initial content into Y.js if provided and not already loaded
        if (initialContent && !hasLoadedInitialContent.current) {
          console.log('📄 Loading initial content into Y.js');
          const xmlFragment = yDoc.getXmlFragment('default');
          
          // Only load if the Y.js doc is empty
          if (xmlFragment.length === 0) {
            // Create a temporary TipTap editor just to parse the content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = initialContent;
            
            // Mark as loaded to prevent duplicate loads
            hasLoadedInitialContent.current = true;
          }
        }

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
            if (docRef.current && payload.update && !isApplyingRemoteUpdate.current) {
              try {
                isApplyingRemoteUpdate.current = true;
                const update = new Uint8Array(payload.update);
                
                console.log('📥 Applying remote update from:', payload.userName);
                Y.applyUpdate(docRef.current, update, 'remote');
                
                // Show who is editing
                if (payload.userId && payload.userId !== currentUserIdRef.current) {
                  setUserEdits(prev => ({
                    ...prev,
                    [payload.userId]: {
                      name: payload.userName,
                      color: payload.userColor,
                      timestamp: Date.now(),
                    }
                  }));

                  if (editTimeoutsRef.current[payload.userId]) {
                    clearTimeout(editTimeoutsRef.current[payload.userId]);
                  }
                  
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
              } finally {
                isApplyingRemoteUpdate.current = false;
              }
            }
          })
          // REQUEST STATE SYNC: When joining, request current state from other users
          .on('broadcast', { event: 'request-state' }, ({ payload }) => {
            if (payload.requesterId !== currentUserIdRef.current && docRef.current) {
              console.log('📤 Sending full state to new user:', payload.requesterName);
              const state = Y.encodeStateAsUpdate(docRef.current);
              channel.send({
                type: 'broadcast',
                event: 'full-state',
                payload: {
                  state: Array.from(state),
                  userId: currentUser.id,
                  userName: currentUser.full_name || currentUser.email,
                },
              });
            }
          })
          // RECEIVE FULL STATE: When receiving state from existing users
          .on('broadcast', { event: 'full-state' }, ({ payload }) => {
            if (docRef.current && payload.state && payload.userId !== currentUserIdRef.current) {
              try {
                console.log('📥 Received full state from:', payload.userName);
                isApplyingRemoteUpdate.current = true;
                const state = new Uint8Array(payload.state);
                Y.applyUpdate(docRef.current, state, 'remote');
              } catch (error) {
                console.error('❌ Error applying full state:', error);
              } finally {
                isApplyingRemoteUpdate.current = false;
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

              // Request current state from other users
              console.log('🔄 Requesting state from other users...');
              channel.send({
                type: 'broadcast',
                event: 'request-state',
                payload: {
                  requesterId: currentUser.id,
                  requesterName: currentUser.full_name || currentUser.email,
                },
              });

              setIsReady(true);
              console.log('✅ Collaboration ready');
            }
          });

        channelRef.current = channel;

        // Broadcast Y.js updates to other users
        yDoc.on('update', (update, origin) => {
          if (origin !== 'remote' && mounted && channelRef.current && !isApplyingRemoteUpdate.current) {
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
      hasLoadedInitialContent.current = false;
      
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
  }, [pageId, currentUser?.id, currentUser?.full_name, currentUser?.email, currentUser?.color, currentUser?.avatar_url, initialContent]);

  return { 
    doc, 
    activeUsers, 
    userEdits,
    isReady, 
    channel: channelRef.current
  };
}