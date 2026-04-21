"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { api } from "./api.js";
import { GlorbitStore, type Selection } from "./store.js";
import { RoomSocket, roomWsUrl } from "./ws.js";

interface Ctx {
  store: GlorbitStore;
  refreshMessages(selection: Selection): Promise<void>;
}

const StoreContext = createContext<Ctx | null>(null);

export function GlorbitProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<GlorbitStore | null>(null);
  if (!storeRef.current) storeRef.current = new GlorbitStore();
  const store = storeRef.current;

  const refreshMessages = useMemo(() => {
    return async (selection: Selection) => {
      const params =
        selection.kind === "view"
          ? { view: selection.view }
          : { agent: selection.handle };
      const [agentsRes, msgRes] = await Promise.all([
        api.listAgents(),
        api.listMessages(params),
      ]);
      store.hydrate(agentsRes.agents, msgRes.messages, msgRes.counts);
    };
  }, [store]);

  useEffect(() => {
    void (async () => {
      try {
        const [agentsRes, msgRes] = await Promise.all([
          api.listAgents(),
          api.listMessages({ view: "all" }),
        ]);
        store.hydrate(agentsRes.agents, msgRes.messages, msgRes.counts);
      } catch (err) {
        console.warn("initial hydrate failed", err);
      }
    })();

    const socket = new RoomSocket(roomWsUrl(), {
      onOpen: () => store.setConnected(true),
      onClose: () => store.setConnected(false),
    });
    const off = socket.on((event) => store.apply(event));
    socket.connect();
    return () => {
      off();
      socket.close();
    };
  }, [store]);

  return (
    <StoreContext.Provider value={{ store, refreshMessages }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useGlorbit(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useGlorbit must be used within <GlorbitProvider>");
  return ctx;
}
