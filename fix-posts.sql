-- Add is_anonymous column to posts table if it doesn't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

-- Enable RLS if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert posts
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON posts;
CREATE POLICY "Allow insert for authenticated users" ON posts
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to read all posts
DROP POLICY IF EXISTS "Allow read for authenticated users" ON posts;
CREATE POLICY "Allow read for authenticated users" ON posts
FOR SELECT TO authenticated
USING (true);

-- Create policy to allow users to update their own posts
DROP POLICY IF EXISTS "Allow update for own posts" ON posts;
CREATE POLICY "Allow update for own posts" ON posts
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own posts
DROP POLICY IF EXISTS "Allow delete for own posts" ON posts;
CREATE POLICY "Allow delete for own posts" ON posts
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Also ensure post_likes table has proper policies
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert likes for authenticated users" ON post_likes;
CREATE POLICY "Allow insert likes for authenticated users" ON post_likes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete likes for authenticated users" ON post_likes;
CREATE POLICY "Allow delete likes for authenticated users" ON post_likes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Ensure post_comments table has proper policies
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert comments for authenticated users" ON post_comments;
CREATE POLICY "Allow insert comments for authenticated users" ON post_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete comments for authenticated users" ON post_comments;
CREATE POLICY "Allow delete comments for authenticated users" ON post_comments
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

SELECT 'Posts table fixed successfully!' as result;
