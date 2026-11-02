import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createRoomClient,
  type RoomClient,
} from "./multiplayerRoomClient";

export const useRoomClient = () => {
  const [client] = useState<RoomClient>(() => createRoomClient());
  const state = useSyncExternalStore(
    client.subscribe,
    client.getState,
    client.getState,
  );

  useEffect(() => {
    return () => client.disconnect();
  }, [client]);

  return { client, state };
};
