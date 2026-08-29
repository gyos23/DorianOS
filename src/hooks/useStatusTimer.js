import { useState, useCallback } from "react";

export function useStatusTimer(doneDelay = 3000, errorDelay = 4000) {
  const [status, setStatus] = useState("idle");

  const set = useCallback(
    (s) => {
      setStatus(s);
      if (s === "done") setTimeout(() => setStatus("idle"), doneDelay);
      if (s === "error") setTimeout(() => setStatus("idle"), errorDelay);
    },
    [doneDelay, errorDelay]
  );

  return [status, set];
}
