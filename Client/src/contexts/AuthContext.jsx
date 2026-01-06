import { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./SocketContext";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { socket } = useSocket();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // { field: 'email'|'password'|'username', message: string }
  const [needsGoogleUsername, setNeedsGoogleUsername] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);

  // Check for stored session on mount
  useEffect(() => {
    if (!socket) return;

    const sessionId = localStorage.getItem("session_id");
    if (sessionId) {
      socket.emit("local_session_id", sessionId);
    } else {
      setIsLoading(false);
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // Success handlers
    socket.on("signup_success", (username, email) => {
      setUser({ username, email });
      setAuthError(null);
      setNeedsGoogleUsername(false);
      setPendingGoogleToken(null);
      setIsLoading(false);
    });

    socket.on("login_success", (username, email) => {
      setUser({ username, email });
      setAuthError(null);
      setNeedsGoogleUsername(false);
      setPendingGoogleToken(null);
      setIsLoading(false);
    });

    // Session handlers
    socket.on("session_created", (sessionId) => {
      localStorage.setItem("session_id", sessionId);
    });

    socket.on("session_not_valid", () => {
      localStorage.removeItem("session_id");
      setUser(null);
      setIsLoading(false);
    });

    // Error handlers
    socket.on("signup_fail", (field) => {
      if (field === "username") {
        setAuthError({ field: "username", message: "Username already taken" });
      } else if (field === "email") {
        setAuthError({ field: "email", message: "Email already taken" });
      }
      setIsLoading(false);
    });

    socket.on("login_fail", (field) => {
      if (field === "email") {
        setAuthError({ field: "email", message: "Email not found" });
      } else if (field === "password") {
        setAuthError({ field: "password", message: "Invalid password" });
      } else if (field === "show_username_input") {
        // New Google user needs to provide a username
        setNeedsGoogleUsername(true);
      }
      setIsLoading(false);
    });

    return () => {
      socket.off("signup_success");
      socket.off("login_success");
      socket.off("session_created");
      socket.off("session_not_valid");
      socket.off("signup_fail");
      socket.off("login_fail");
    };
  }, [socket]);

  const login = (email, password) => {
    setAuthError(null);
    socket?.emit("login", email, password);
  };

  const register = (username, email, password) => {
    setAuthError(null);
    socket?.emit("signup", username, email, password);
  };

  const googleLogin = (idToken, username = "") => {
    setAuthError(null);
    setPendingGoogleToken(idToken);
    socket?.emit("google_login", idToken, username);
  };

  const submitGoogleUsername = (username) => {
    if (pendingGoogleToken) {
      setAuthError(null);
      socket?.emit("google_login", pendingGoogleToken, username);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const logout = () => {
    localStorage.removeItem("session_id");
    socket?.emit("logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authError,
        needsGoogleUsername,
        login,
        register,
        googleLogin,
        submitGoogleUsername,
        clearAuthError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
