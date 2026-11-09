import React from "react";
import { SignalBars } from "../../custom-components";
import useOnlineStatus from "./useOnlineStatus";
import "./speechX.css";

/**
 * The connection indicator: four bars and the word Online or Offline (a polite live region). During a running speech
 * test the app footer shows it, at its left end (components/Footer.jsx); the focus header no longer carries it.
 */
const ConnectionStatus = () => {
  const online = useOnlineStatus();
  return (
    <span className="sx-conn" data-online={online ? "true" : "false"} role="status">
      <SignalBars level={online ? 4 : 1} tone={online ? "good" : "danger"} label="Connection" statusText={online ? "Online" : "Offline"} />
      <span className="sx-conn__text">{online ? "Online" : "Offline"}</span>
    </span>
  );
};

export default ConnectionStatus;