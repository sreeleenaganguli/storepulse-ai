import { useState, useEffect } from "react";
import { ENDPOINTS } from "../config";

export function useHealth() {
  const [health, setHealth] = useState({ online: false, checking: true });

  const check = async () => {
    try {
      const res = await fetch(ENDPOINTS.HEALTH);
      if (res.ok) {
        const data = await res.json();
        setHealth({ online: true, checking: false, ...data });
      } else {
        setHealth({ online: false, checking: false });
      }
    } catch {
      setHealth({ online: false, checking: false });
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return health;
}
