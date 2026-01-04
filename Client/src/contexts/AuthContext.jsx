import { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { socket } = useSocket();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem("auth_token");
    if (token && socket) {
      socket.emit("verify_token", { token });
    } else {
      setIsLoading(false);
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on("auth_success", (userData) => {
      setUser(userData);
      setIsLoading(false);
    });

    socket.on("auth_failure", () => {
      localStorage.removeItem("auth_token");
      setUser(null);
      setIsLoading(false);
    });

    socket.on("register_success", (userData) => {
      setUser(userData);
      if (userData.token) {
        localStorage.setItem("auth_token", userData.token);
      }
    });

    socket.on("login_success", (userData) => {
      setUser(userData);
      if (userData.token) {
        localStorage.setItem("auth_token", userData.token);
      }
    });

    return () => {
      socket.off("auth_success");
      socket.off("auth_failure");
      socket.off("register_success");
      socket.off("login_success");
    };
  }, [socket]);

  const login = (email, password) => {
    socket?.emit("login", { email, password });
  };

  const register = (username, email, password) => {
    socket?.emit("register", { username, email, password });
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
