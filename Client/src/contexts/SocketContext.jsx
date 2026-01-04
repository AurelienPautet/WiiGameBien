import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
console.log(SERVER_URL);

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const sock = io(SERVER_URL);

    sock.on("connect", () => {
      setIsConnected(true);
    });

    sock.on("disconnect", () => {
      setIsConnected(false);
    });

    setSocket(sock);

    return () => {
      sock.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
