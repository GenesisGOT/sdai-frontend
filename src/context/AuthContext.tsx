import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface User {
  id: number;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, companyName: string, contactName: string, phone: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("sdai_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/v1/customers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error("Invalid token"); return r.json(); })
      .then((u: User) => setUser(u))
      .catch(() => {
        localStorage.removeItem("sdai_token");
        localStorage.removeItem("sdai_refresh_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail ?? "Invalid email or password");
    }
    const data = await resp.json();
    localStorage.setItem("sdai_token", data.access_token);
    if (data.refresh_token) localStorage.setItem("sdai_refresh_token", data.refresh_token);
    setToken(data.access_token);
    const me = await fetch(`${API_BASE}/api/v1/customers/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    }).then((r) => r.json());
    setUser(me);
  };

  const signup = async (email: string, password: string, companyName: string, contactName: string, phone: string) => {
    const resp = await fetch(`${API_BASE}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, company_name: companyName, contact_name: contactName, phone }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail ?? "Signup failed");
    }
    const data = await resp.json();
    const accessToken = data.token?.access_token ?? data.access_token;
    const refreshToken = data.token?.refresh_token ?? data.refresh_token;
    localStorage.setItem("sdai_token", accessToken);
    if (refreshToken) localStorage.setItem("sdai_refresh_token", refreshToken);
    setToken(accessToken);
    const me = await fetch(`${API_BASE}/api/v1/customers/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem("sdai_token");
    localStorage.removeItem("sdai_refresh_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
