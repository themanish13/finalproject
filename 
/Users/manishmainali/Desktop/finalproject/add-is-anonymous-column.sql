-- Add is_anonymous column to posts table if it doesn't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

-- Enable RLS if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing posts (allow all authenticated users to see posts)
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
CREATE POLICY "Public posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

-- Create policy for inserting posts (allow authenticated users)
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for updating posts (allow post owner)
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for deleting posts (allow post owner)
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);
</parameter>
