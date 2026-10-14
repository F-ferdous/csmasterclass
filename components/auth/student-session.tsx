"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSignedInStudent } from "@/app/student-actions";
import type { UserProfile } from "@/lib/types";

type StudentSession = {
  /** The signed-in student's profile, or null. */
  student: UserProfile | null;
  /** True until we know whether a student is signed in. */
  loading: boolean;
  /** Re-reads the session (after sign-in, sign-out or a profile change). */
  refresh: () => void;
};

const Ctx = createContext<StudentSession>({ student: null, loading: true, refresh: () => {} });

export const useStudentSession = () => useContext(Ctx);

/** The readable `cs_student` cookie is set alongside the real (HttpOnly) session cookie. */
const mayHaveSession = () => typeof document !== "undefined" && /(?:^|;\s*)cs_student=1/.test(document.cookie);

/** Who is signed in as a student — asked from the server only when a session cookie exists. */
export function StudentSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ student: UserProfile | null; loading: boolean }>({ student: null, loading: true });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let live = true;
    (mayHaveSession() ? getSignedInStudent() : Promise.resolve(null)).then(
      (student) => live && setState({ student, loading: false }),
      () => live && setState({ student: null, loading: false }),
    );
    return () => {
      live = false;
    };
  }, [version]);

  return <Ctx.Provider value={{ ...state, refresh }}>{children}</Ctx.Provider>;
}
