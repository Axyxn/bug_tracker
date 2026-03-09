-- Create bugs table
CREATE TABLE IF NOT EXISTS bugs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  assignee TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bugs_user_id ON bugs(user_id);
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bugs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_bug_id ON comments(bug_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bugs - Allow ALL access
DROP POLICY IF EXISTS "Users can read all bugs" ON bugs;
CREATE POLICY "Allow all access to bugs"
  ON bugs USING (true);

DROP POLICY IF EXISTS "Users can insert their own bugs" ON bugs;
CREATE POLICY "Allow all insert to bugs"
  ON bugs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own bugs" ON bugs;
CREATE POLICY "Allow all update to bugs"
  ON bugs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own bugs" ON bugs;
CREATE POLICY "Allow all delete to bugs"
  ON bugs FOR DELETE USING (true);

-- Create RLS policies for comments - Allow ALL access
DROP POLICY IF EXISTS "Users can read all comments" ON comments;
CREATE POLICY "Allow all access to comments"
  ON comments USING (true);

DROP POLICY IF EXISTS "Users can insert comments on any bug" ON comments;
CREATE POLICY "Allow all insert to comments"
  ON comments FOR INSERT WITH CHECK (true);

-- Delete comments when bug is deleted (handled by CASCADE above)
