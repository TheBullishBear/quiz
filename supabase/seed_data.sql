-- Sample Data for Quiz Application
-- Run this in Supabase Dashboard → SQL Editor

-- ============================================
-- 1. SAMPLE QUESTIONS
-- ============================================

-- Round 1 Questions (Easy)
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, round_number, question_order) VALUES
('What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 'C', 1, 1),
('What is 2 + 2?', '3', '4', '5', '6', 'B', 1, 2),
('Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'B', 1, 3),
('What is the largest ocean on Earth?', 'Atlantic', 'Indian', 'Arctic', 'Pacific', 'D', 1, 4),
('Who wrote "Romeo and Juliet"?', 'Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain', 'B', 1, 5),
('What is the chemical symbol for gold?', 'Go', 'Gd', 'Au', 'Ag', 'C', 1, 6),
('Which gas do plants absorb from the atmosphere?', 'Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen', 'C', 1, 7),
('What is the smallest prime number?', '0', '1', '2', '3', 'C', 1, 8),
('In which year did World War II end?', '1943', '1944', '1945', '1946', 'C', 1, 9),
('What is the speed of light in vacuum?', '299,792,458 m/s', '300,000,000 m/s', '250,000,000 m/s', '350,000,000 m/s', 'A', 1, 10);

-- Round 2 Questions (Medium)
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, round_number, question_order) VALUES
('What is the square root of 144?', '10', '11', '12', '13', 'C', 2, 1),
('Which element has the atomic number 6?', 'Nitrogen', 'Carbon', 'Oxygen', 'Boron', 'B', 2, 2),
('What is the longest river in the world?', 'Amazon', 'Nile', 'Mississippi', 'Yangtze', 'B', 2, 3),
('Who painted the Mona Lisa?', 'Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo', 'C', 2, 4),
('What is the formula for water?', 'H2O', 'CO2', 'O2', 'NaCl', 'A', 2, 5),
('Which country is home to the kangaroo?', 'New Zealand', 'Australia', 'South Africa', 'Brazil', 'B', 2, 6),
('What is the largest mammal in the world?', 'Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus', 'B', 2, 7),
('In which continent is the Sahara Desert located?', 'Asia', 'Africa', 'Australia', 'South America', 'B', 2, 8),
('What is the capital of Japan?', 'Seoul', 'Beijing', 'Tokyo', 'Bangkok', 'C', 2, 9),
('Who discovered penicillin?', 'Marie Curie', 'Alexander Fleming', 'Louis Pasteur', 'Robert Koch', 'B', 2, 10);

-- Round 3 Questions (Semifinal - Hard)
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, round_number, question_order) VALUES
('What is the value of π (pi) to two decimal places?', '3.12', '3.14', '3.16', '3.18', 'B', 3, 1),
('Which planet has the most moons?', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'B', 3, 2),
('What is the hardest natural substance on Earth?', 'Gold', 'Iron', 'Diamond', 'Platinum', 'C', 3, 3),
('Who wrote "1984"?', 'Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H.G. Wells', 'B', 3, 4),
('What is the smallest country in the world?', 'Monaco', 'Vatican City', 'San Marino', 'Liechtenstein', 'B', 3, 5),
('Which gas makes up most of Earth''s atmosphere?', 'Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon', 'C', 3, 6),
('What is the largest organ in the human body?', 'Liver', 'Lungs', 'Skin', 'Intestines', 'C', 3, 7),
('In which year did the Berlin Wall fall?', '1987', '1988', '1989', '1990', 'C', 3, 8),
('What is the chemical symbol for silver?', 'Si', 'Sv', 'Ag', 'Au', 'C', 3, 9),
('Who composed "The Four Seasons"?', 'Bach', 'Mozart', 'Vivaldi', 'Beethoven', 'C', 3, 10);

-- Round 4 Questions (Final - Very Hard)
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, round_number, question_order) VALUES
('What is the speed of sound in air at room temperature?', '330 m/s', '343 m/s', '350 m/s', '360 m/s', 'B', 4, 1),
('Which mathematician is known for the theorem a² + b² = c²?', 'Euclid', 'Pythagoras', 'Archimedes', 'Newton', 'B', 4, 2),
('What is the deepest point in the ocean?', 'Mariana Trench', 'Puerto Rico Trench', 'Java Trench', 'South Sandwich Trench', 'A', 4, 3),
('Who wrote "The Great Gatsby"?', 'Ernest Hemingway', 'F. Scott Fitzgerald', 'John Steinbeck', 'William Faulkner', 'B', 4, 4),
('What is the largest desert in the world?', 'Sahara', 'Gobi', 'Antarctic', 'Arabian', 'C', 4, 5),
('Which blood type is known as the universal donor?', 'A', 'B', 'AB', 'O', 'D', 4, 6),
('What is the molecular formula for glucose?', 'C6H12O6', 'C6H10O5', 'C5H10O5', 'C6H11O6', 'A', 4, 7),
('In which year did the first moon landing occur?', '1967', '1968', '1969', '1970', 'C', 4, 8),
('What is the largest planet in our solar system?', 'Saturn', 'Jupiter', 'Neptune', 'Uranus', 'B', 4, 9),
('Who painted "Starry Night"?', 'Pablo Picasso', 'Vincent van Gogh', 'Claude Monet', 'Salvador Dali', 'B', 4, 10);

-- ============================================
-- 2. SAMPLE USERS (These will need to be created via Auth first)
-- ============================================
-- Note: You'll need to create these users via the app's signup or admin script first
-- Then update their profiles to approved status

-- After creating users, run this to approve them:
-- UPDATE public.profiles 
-- SET status = 'approved' 
-- WHERE email IN ('student1@quiz.test', 'student2@quiz.test', ...);

-- ============================================
-- 3. SAMPLE QUIZ SESSION
-- ============================================

-- Create a sample quiz session
INSERT INTO public.quiz_sessions (name, status, current_round, time_limit_seconds)
VALUES ('Practice Quiz Session', 'not_started', 1, 60)
RETURNING id;

-- Note: The session ID will be returned. You can use it to:
-- 1. Add questions to the session
-- 2. Add users to the session

-- Example: Add some questions to the session (replace SESSION_ID with actual ID)
-- INSERT INTO public.session_questions (session_id, question_id, question_order)
-- SELECT 
--   'SESSION_ID_HERE',
--   id,
--   ROW_NUMBER() OVER (ORDER BY round_number, question_order)
-- FROM public.questions
-- WHERE round_number IN (1, 2)
-- LIMIT 10;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check questions count by round
SELECT round_number, COUNT(*) as question_count
FROM public.questions
GROUP BY round_number
ORDER BY round_number;

-- Check all questions
SELECT id, round_number, question_order, LEFT(question_text, 50) as question_preview
FROM public.questions
ORDER BY round_number, question_order;

