import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("codebidz_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email: string, _password: string) => {
    const found = mockUsers.find((u) => u.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem("codebidz_user", JSON.stringify(found));
      return true;
    }
    // Demo: allow any login
    const demoUser: User = {
      id: `user-${Date.now()}`,
      email,
      name: email.split("@")[0],
      role: email.includes("admin") ? "admin" : "bidder",
      credits: 500,
      createdAt: new Date(),
    };
    setUser(demoUser);
    localStorage.setItem("codebidz_user", JSON.stringify(demoUser));
    return true;
  }, []);

  const register = useCallback(async (name: string, email: string, _password: string, role: UserRole) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role,
      credits: role === "bidder" ? 500 : 0,
      createdAt: new Date(),
    };
    setUser(newUser);
    localStorage.setItem("codebidz_user", JSON.stringify(newUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("codebidz_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
