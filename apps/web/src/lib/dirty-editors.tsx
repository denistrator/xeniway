import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type DirtyEditor = {
  id: string;
  dirty: boolean;
  pending: boolean;
  onDepartureBlocked?(): void;
  discard(): void;
  save?(): Promise<boolean>;
};

const DirtyEditorsContext = createContext<DirtyEditor[] | null>(null);
const DirtyEditorsRegisterContext = createContext<((editor: DirtyEditor) => () => void) | null>(null);

export function DirtyEditorsProvider({ children }: { children: ReactNode }) {
  const [editors, setEditors] = useState<DirtyEditor[]>([]);

  const register = useCallback((editor: DirtyEditor) => {
    setEditors((current) => [...current.filter(({ id }) => id !== editor.id), editor]);

    return () => {
      setEditors((current) => current.filter(({ id }) => id !== editor.id));
    };
  }, []);

  const value = useMemo(() => editors, [editors]);
  return (
    <DirtyEditorsRegisterContext.Provider value={register}>
      <DirtyEditorsContext.Provider value={value}>{children}</DirtyEditorsContext.Provider>
    </DirtyEditorsRegisterContext.Provider>
  );
}

export function useDirtyEditor(editor: DirtyEditor) {
  const register = useContext(DirtyEditorsRegisterContext);

  useEffect(() => {
    if (!register) {
      return;
    }

    return register(editor);
  }, [editor, register]);
}

export function useDirtyEditors() {
  return useContext(DirtyEditorsContext) ?? [];
}
