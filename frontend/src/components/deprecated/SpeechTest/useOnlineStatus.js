import { useEffect, useState } from "react";

/**
 * Whether the browser currently has a network connection, kept up to date as it
 * comes and goes.
 *
 * This is the browser's own flag, so it reliably notices a lost connection
 * (Wi-Fi off, cable out, airplane mode). It cannot tell a connected-but-useless
 * network from a working one.
 */
const useOnlineStatus = () => {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
};

export default useOnlineStatus;
