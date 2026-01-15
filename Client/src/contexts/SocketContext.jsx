import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.PROD
  ? "https://wiitank.pautet.net"
  : "http://localhost:8000";
console.log(SERVER_URL);

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const sock = io(SERVER_URL);

    sock.on("connect", () => {
      setIsConnected(true);
    });

    sock.on("disconnect", () => {
      setIsConnected(false);
    });

    sock.on("online_count", (count) => {
      setOnlineCount(count);
    });

    setSocket(sock);

    return () => {
      sock.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineCount }}>
      {children}
    </SocketContext.Provider>
  );
};
