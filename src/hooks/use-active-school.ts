import { useEffect, useState } from "react";

const KEY = "simat.activeSchoolId";

export function useActiveSchool() {
  const [schoolId, setSchoolIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEY);
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSchoolIdState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setSchoolId = (id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    setSchoolIdState(id);
    // notify same-tab listeners
    window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: id }));
  };

  return { schoolId, setSchoolId };
}
