import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";
import type { Bug, Comment } from "../types";

interface BugContextType {
  bugs: Bug[];
  addBug: (
    bug: Omit<Bug, "id" | "comments" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateBug: (id: string, updates: Partial<Bug>) => Promise<void>;
  deleteBug: (id: string) => Promise<void>;
  addComment: (
    bugId: string,
    comment: Omit<Comment, "id" | "createdAt">,
  ) => Promise<void>;
  getBugById: (id: string) => Bug | undefined;
  getStats: () => {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
    critical: number;
  };
  loading: boolean;
}

const BugContext = createContext<BugContextType | null>(null);

export function BugProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch bugs from Supabase
  useEffect(() => {
    if (!user) {
      setBugs([]);
      return;
    }

    const fetchBugs = async () => {
      setLoading(true);
      try {
        const { data: bugsData, error: bugsError } = await supabase
          .from("bugs")
          .select("*")
          .order("created_at", { ascending: false });

        if (bugsError) throw bugsError;

        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("*")
          .in("bug_id", bugsData?.map((b) => b.id) || []);

        if (commentsError) throw commentsError;

        // Map Supabase data to Bug objects
        const bugsWithComments: Bug[] = (bugsData || []).map((bug) => ({
          id: bug.id,
          title: bug.title,
          description: bug.description,
          priority: bug.priority,
          status: bug.status,
          assignee: bug.assignee || "",
          reporter: bug.user_id,
          reporterName: bug.reporter_name || user.username,
          tags: bug.tags || [],
          comments: (commentsData || [])
            .filter((c: any) => c.bug_id === bug.id)
            .map((c: any) => ({
              id: c.id,
              bugId: c.bug_id,
              userId: c.user_id,
              username: c.username,
              text: c.text,
              createdAt: c.created_at,
            })),
          createdAt: bug.created_at,
          updatedAt: bug.updated_at,
        }));

        setBugs(bugsWithComments);
      } catch (error) {
        console.error("Error fetching bugs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBugs();
  }, [user]);

  const addBug = useCallback(
    async (bug: Omit<Bug, "id" | "comments" | "createdAt" | "updatedAt">) => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("bugs")
          .insert([
            {
              title: bug.title,
              description: bug.description,
              priority: bug.priority,
              status: bug.status,
              assignee: bug.assignee,
              user_id: user.id,
              reporter_name: user.username,
              tags: bug.tags,
            },
          ])
          .select();

        if (error) throw error;

        const newBug: Bug = {
          ...data[0],
          reporter: user.id,
          reporterName: user.username,
          comments: [],
        };

        setBugs((prev) => [newBug, ...prev]);
      } catch (error) {
        console.error("Error adding bug:", error);
      }
    },
    [user],
  );

  const updateBug = useCallback(async (id: string, updates: Partial<Bug>) => {
    try {
      const { error } = await supabase
        .from("bugs")
        .update({
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          status: updates.status,
          assignee: updates.assignee,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setBugs((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, ...updates, updatedAt: new Date().toISOString() }
            : b,
        ),
      );
    } catch (error) {
      console.error("Error updating bug:", error);
    }
  }, []);

  const deleteBug = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("bugs").delete().eq("id", id);

      if (error) throw error;

      setBugs((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Error deleting bug:", error);
    }
  }, []);

  const addComment = useCallback(
    async (bugId: string, comment: Omit<Comment, "id" | "createdAt">) => {
      try {
        const { data, error } = await supabase
          .from("comments")
          .insert([
            {
              bug_id: bugId,
              user_id: comment.userId,
              username: comment.username,
              text: comment.text,
            },
          ])
          .select();

        if (error) throw error;

        const newComment: Comment = {
          id: data[0].id,
          bugId: data[0].bug_id,
          userId: data[0].user_id,
          username: data[0].username,
          text: data[0].text,
          createdAt: data[0].created_at,
        };

        setBugs((prev) =>
          prev.map((b) =>
            b.id === bugId
              ? {
                  ...b,
                  comments: [...b.comments, newComment],
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        );
      } catch (error) {
        console.error("Error adding comment:", error);
      }
    },
    [],
  );

  const getBugById = useCallback(
    (id: string) => {
      return bugs.find((b) => b.id === id);
    },
    [bugs],
  );

  const getStats = useCallback(() => {
    return {
      open: bugs.filter((b) => b.status === "open").length,
      inProgress: bugs.filter((b) => b.status === "in-progress").length,
      resolved: bugs.filter((b) => b.status === "resolved").length,
      closed: bugs.filter((b) => b.status === "closed").length,
      total: bugs.length,
      critical: bugs.filter(
        (b) => b.priority === "critical" && b.status !== "closed",
      ).length,
    };
  }, [bugs]);

  return (
    <BugContext.Provider
      value={{
        bugs,
        addBug,
        updateBug,
        deleteBug,
        addComment,
        getBugById,
        getStats,
        loading,
      }}
    >
      {children}
    </BugContext.Provider>
  );
}

export function useBugs() {
  const context = useContext(BugContext);
  if (!context) throw new Error("useBugs must be used within BugProvider");
  return context;
}
