-- ⚠️ RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR TO RESET THE DATABASE

-- 1. DROP EXISTING TABLES (Clean Slate)
DROP TABLE IF EXISTS exam_results;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS exams;

-- 2. CREATE EXAMS TABLE
CREATE TABLE exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    duration INTEGER NOT NULL, -- minutes
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    passing_marks INTEGER DEFAULT 40,
    status TEXT DEFAULT 'Upcoming'
);

-- 3. CREATE QUESTIONS TABLE
CREATE TABLE questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL -- 'A', 'B', 'C', or 'D'
);

-- 4. CREATE RESULTS TABLE
CREATE TABLE exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    answers JSONB, -- Stores full answer map { "qId": "A" }
    score INTEGER NOT NULL, -- Percentage
    passed BOOLEAN NOT NULL,
    user_email TEXT,
    student_name TEXT
);

-- 5. SETUP SECURITY POLICIES (Allow Public Access for Prototype)
-- NOTE: in production, you would restrict these to logged-in users only.

-- Exams: Public Read/Write
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Exams" ON exams FOR ALL USING (true);

-- Questions: Public Read/Write
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Questions" ON questions FOR ALL USING (true);

-- Results: Public Read/Write
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Results" ON exam_results FOR ALL USING (true);
