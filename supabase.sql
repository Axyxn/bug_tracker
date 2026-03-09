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

-- Create RLS policies for bugs
-- Users can read their own bugs
DROP POLICY IF EXISTS "Users can read their own bugs" ON bugs;
CREATE POLICY "Users can read their own bugs"
  ON bugs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert bugs for themselves
DROP POLICY IF EXISTS "Users can insert their own bugs" ON bugs;
CREATE POLICY "Users can insert their own bugs"
  ON bugs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bugs
DROP POLICY IF EXISTS "Users can update their own bugs" ON bugs;
CREATE POLICY "Users can update their own bugs"
  ON bugs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own bugs
DROP POLICY IF EXISTS "Users can delete their own bugs" ON bugs;
CREATE POLICY "Users can delete their own bugs"
  ON bugs FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for comments
-- Users can read comments on bugs they own
DROP POLICY IF EXISTS "Users can read comments on their bugs" ON comments;
CREATE POLICY "Users can read comments on their bugs"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bugs WHERE bugs.id = comments.bug_id AND bugs.user_id = auth.uid()
    )
  );

-- Users can insert comments on their own bugs
DROP POLICY IF EXISTS "Users can insert comments on their own bugs" ON comments;
CREATE POLICY "Users can insert comments on their own bugs"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM bugs WHERE bugs.id = comments.bug_id AND bugs.user_id = auth.uid()
    )
  );

-- Delete comments when bug is deleted (handled by CASCADE above)
