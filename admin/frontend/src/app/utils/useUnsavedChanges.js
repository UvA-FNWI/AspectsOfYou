import { useCallback, useEffect, useState } from 'react';

export function useUnsavedChanges() {
  const [hasChanges, setHasChanges] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const markDirty = useCallback(() => {
    if (dataInitialized) {
      setHasChanges(true);
    }
  }, [dataInitialized]);

  const markClean = useCallback(() => {
    setHasChanges(false);
    setDataInitialized(true);
  }, []);

  const requestNavigation = useCallback((target) => {
    if (hasChanges) {
      setPendingNavigation(target || 'back');
      setShowUnsavedModal(true);
      return false;
    }
    return true;
  }, [hasChanges]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (hasChanges) {
        event.preventDefault();
        setPendingNavigation('back');
        setShowUnsavedModal(true);
        window.history.forward();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasChanges]);

  return {
    hasChanges,
    showUnsavedModal,
    setShowUnsavedModal,
    markDirty,
    markClean,
    requestNavigation,
    pendingNavigation,
    setPendingNavigation,
  };
}
