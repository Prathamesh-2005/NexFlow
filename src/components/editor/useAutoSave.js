import { useRef, useCallback, useEffect } from 'react';

export function useAutoSave(saveFn, delay = 2000) {
  const timeoutRef = useRef(null);
  const pendingChangesRef = useRef(false);
  const saveInProgressRef = useRef(false);

  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerSave = useCallback((data) => {
    cancelSave();
    pendingChangesRef.current = true;

    timeoutRef.current = setTimeout(async () => {
      if (saveInProgressRef.current) {
        console.log('⏳ Save already in progress, will retry...');
        triggerSave(data);
        return;
      }

      try {
        saveInProgressRef.current = true;
        await saveFn(data);
        pendingChangesRef.current = false;
        console.log('✅ Autosave successful');
      } catch (error) {
        console.error('❌ Autosave failed:', error);
        setTimeout(() => {
          if (pendingChangesRef.current) {
            triggerSave(data);
          }
        }, 5000);
      } finally {
        saveInProgressRef.current = false;
      }
    }, delay);
  }, [saveFn, delay, cancelSave]);

  useEffect(() => {
    return () => cancelSave();
  }, [cancelSave]);

  return { triggerSave, cancelSave };
}