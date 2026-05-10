// FlagsContext is no longer used — flag operations now go directly through the API.
// Kept as a stub so any stale imports don't break.
import { createContext, useContext } from "react";

const FlagsContext = createContext({ flags: [], addFlag: () => {}, resolveFlag: () => {} });

export function FlagsProvider({ children }) {
  return <FlagsContext.Provider value={{ flags: [], addFlag: () => {}, resolveFlag: () => {} }}>
    {children}
  </FlagsContext.Provider>;
}

export function useFlags() {
  return useContext(FlagsContext);
}
