import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface UnsavedChangesContextValue {
  register: (key: string, dirty: boolean) => void;
  requestDiscard: (action: () => void) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  register: () => undefined,
  requestDiscard: (action) => action(),
});

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const hasUnsavedChanges = dirtyKeys.size > 0;
  const blocker = useBlocker(hasUnsavedChanges);

  const register = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((current) => {
      const next = new Set(current);
      if (dirty) next.add(key);
      else next.delete(key);
      if (next.size === current.size && [...next].every((item) => current.has(item)))
        return current;
      return next;
    });
  }, []);

  const requestDiscard = useCallback((action: () => void) => {
    setPendingAction(() => action);
  }, []);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [hasUnsavedChanges],
    ),
  );

  const context = useMemo(() => ({ register, requestDiscard }), [register, requestDiscard]);
  const confirmationOpen = blocker.state === "blocked" || pendingAction !== null;

  const stay = () => {
    if (blocker.state === "blocked") blocker.reset();
    setPendingAction(null);
  };

  const discard = () => {
    if (blocker.state === "blocked") {
      blocker.proceed();
      return;
    }
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  };

  return (
    <UnsavedChangesContext.Provider value={context}>
      {children}
      <Dialog open={confirmationOpen} onOpenChange={(open) => !open && stay()}>
        <DialogContent showClose={false} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your edits have not been saved. Leaving now will permanently discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="text-sm text-slate-700">
            Stay on this screen to review or save your changes.
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={stay}>
              Stay here
            </Button>
            <Button variant="destructive" onClick={discard}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnsavedChanges(key: string, dirty: boolean) {
  const context = useContext(UnsavedChangesContext);

  useEffect(() => {
    context.register(key, dirty);
    return () => context.register(key, false);
  }, [context, dirty, key]);

  return {
    requestDiscard: useCallback(
      (action: () => void) => {
        if (dirty) context.requestDiscard(action);
        else action();
      },
      [context, dirty],
    ),
  };
}
