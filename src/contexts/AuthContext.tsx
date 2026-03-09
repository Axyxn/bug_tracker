import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getAvatarColor(name: string): string {
  const avatarColors = [
    "#6366f1",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function supabaseUserToAppUser(
  supabaseUser: SupabaseUser,
  username?: string,
): User {
  return {
    id: supabaseUser.id,
    username: username || supabaseUser.email?.split("@")[0] || "User",
    email: supabaseUser.email || "",
    password: "", // Never store password
    avatar: getAvatarColor(username || supabaseUser.email || ""),
    createdAt: supabaseUser.created_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Get username from user_metadata or use email
        const username =
          session.user.user_metadata?.username ||
          session.user.email?.split("@")[0] ||
          "User";
        setUser(supabaseUserToAppUser(session.user, username));
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const username =
          session.user.user_metadata?.username ||
          session.user.email?.split("@")[0] ||
          "User";
        setUser(supabaseUserToAppUser(session.user, username));
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const username =
          data.user.user_metadata?.username || email.split("@")[0];
        setUser(supabaseUserToAppUser(data.user, username));
        return { success: true };
      }

      return { success: false, error: "Login failed" };
    } catch (err) {
      return { success: false, error: "An error occurred during login" };
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          setUser(supabaseUserToAppUser(data.user, username));
          return { success: true };
        }

        return { success: false, error: "Registration failed" };
      } catch (err) {
        return {
          success: false,
          error: "An error occurred during registration",
        };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
