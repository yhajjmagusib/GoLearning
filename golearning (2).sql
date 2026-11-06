-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 05, 2026 at 08:36 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `golearning`
--

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(160) NOT NULL,
  `instructions` text NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `module_id`, `title`, `instructions`, `is_required`, `requires_approval`, `is_active`, `created_at`) VALUES
(2, 1, 'Digital Safety Checklist', 'Read each statement and check the practices you will follow to stay safe online. \nThen answer the short question at the end.\n\n- [ ] I will use strong and unique passwords.\n- [ ] I will avoid clicking suspicious links.\n- [ ] I will not share my passwords or verification codes.\n- [ ] I will check if online information comes from a reliable source.\n- [ ] I will log out when using a shared computer.\n\nShort question\nWhy is it important to protect your personal information online? \nWrite your answers in 2-3 sentences', 1, 0, 1, '2026-10-29 06:13:01'),
(3, 5, 'Assignment: Improve the Resume', 'Read the career objective below and rewrite it using professional language. \n\n“I want a job because I need money. I can do anything and I am the best employee.”', 1, 0, 1, '2026-10-29 12:15:11'),
(4, 3, 'Assignment: Leadership and Teamwork Reflection Checklist', 'Instructions: Read each statement and check the practices you will follow when working with a team. \nThen answer the short question at the end.\n\nMy Teamwork Checklist\n\nCheck the practices you commit to follow.\n\n☐ I will listen respectfully to the ideas of other team members.\n☐ I will complete my assigned tasks on time.\n☐ I will communicate clearly and politely.\n☐ I will help team members when they need support.\n☐ I will respect different opinions and backgrounds.\n☐ I will help resolve disagreements calmly.\n☐ I will take responsibility for my actions and decisions.\n\nShort Question\nWhy are leadership and teamwork important when completing a group task?', 1, 0, 1, '2026-10-29 13:59:49'),
(5, 2, 'The 24-Hour Active Listening Challenge', 'Objective\n\nPractice active listening to improve focus, comprehension, and empathy in everyday\nconversations.\nTask Instructions\n\n1. Pick One Conversation: Select a 5-to-10-minute conversation with a coworker, friend, or\nfamily member today.\n\n2. Apply the 3-Step Active Listening Rule:\n○ No Interrupting: Let the speaker complete their thought completely before you\nreply.\n○ Reflect & Validate: Before giving your opinion or advice, summarize what you\nheard in your own words (e.g., \"It sounds like you felt frustrated when...\" or \"So\nwhat you\'re saying is...\").\n○ Ask One Open-Ended Question: Ask a question starting with How, What, or Why\nto invite them to elaborate.\n\nReflection Submission (3–5 Sentences)\n\nAfter the conversation, write down brief answers to the following:\n● How did the other person react when you reflected their thoughts back to them?\n● How difficult was it to refrain from jumping in with your own thoughts or advice?\n● What is one thing you learned or noticed during this interaction that you normally would\nhave missed?', 1, 0, 1, '2026-10-30 06:22:32'),
(6, 4, 'Time Management Reflection Checklist', 'Instructions: Read each statement and check the practices you will follow when managing your time. Then answer the short question at the end. \n\nMy Time Management Checklist\n\n- [ ] I will create a to-do list for my daily tasks.\n- [ ] I will prioritize tasks according to their importance and deadlines. \n- [ ] I will follow a realistic schedule. \n- [ ] I will divide large assignments into smaller tasks.\n- [ ] I will avoid unnecessary distractions while working. \n- [ ] I will start assignments before their deadlines. \n- [] I will review my progress and adjust my schedule when needed.\n\n Short Question\nWhy is time management important when completing school or work tasks?', 1, 0, 1, '2026-10-30 06:40:39');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_checklist_progress`
--

CREATE TABLE `assignment_checklist_progress` (
  `assignment_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `instructions_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`instructions_state`)),
  `response_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`response_state`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignment_checklist_progress`
--

INSERT INTO `assignment_checklist_progress` (`assignment_id`, `student_id`, `instructions_state`, `response_state`, `updated_at`) VALUES
(2, 2, '[]', '[true,true,true,true,true]', '2026-11-01 19:10:03'),
(6, 2, '[]', '[true,true,true,true,true,true,true]', '2026-11-01 19:02:37');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

CREATE TABLE `assignment_submissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `assignment_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `submission_text` text DEFAULT NULL,
  `file_reference` varchar(1024) DEFAULT NULL,
  `status` enum('submitted','pending','approved','rejected') NOT NULL DEFAULT 'submitted',
  `admin_feedback` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignment_submissions`
--

INSERT INTO `assignment_submissions` (`id`, `assignment_id`, `student_id`, `submission_text`, `file_reference`, `status`, `admin_feedback`, `submitted_at`, `reviewed_at`) VALUES
(7, 2, 4, 'ewan', NULL, 'submitted', NULL, '2026-10-31 06:50:22', NULL),
(8, 5, 4, 'iwan ku', NULL, 'submitted', NULL, '2026-10-31 06:53:47', NULL),
(9, 4, 4, 'murao', NULL, 'submitted', NULL, '2026-10-31 06:56:59', NULL),
(10, 6, 4, 'ckret', NULL, 'submitted', NULL, '2026-10-31 07:01:53', NULL),
(12, 3, 4, 'galit yarn?', NULL, 'submitted', NULL, '2026-10-31 07:21:42', NULL),
(20, 6, 2, '- [ ] I will create a to-do list for my daily tasks.\n- [ ]  I will prioritize tasks according to their importance and deadlines.\n- [ ]  I will follow a realistic schedule.\n- [ ]  I will divide large assignments into smaller tasks.\n- [ ]  I will avoid unnecessary distractions while working.\n- [ ]  I will start assignments before their deadlines.\n- [ ]  I will review my progress and adjust my schedule when needed.', NULL, 'submitted', NULL, '2026-11-01 18:52:03', NULL),
(21, 2, 2, '- [ ]  I will use strong and unique passwords.\n- [ ]  I will avoid clicking suspicious links.\n- [ ]  I will not share my passwords or verification codes.\n- [ ]  I will check if online information comes from a reliable source.\n- [ ] I will log out when using a shared computer.', NULL, 'submitted', NULL, '2026-11-01 19:09:56', NULL),
(23, 3, 2, 'dad', NULL, 'submitted', NULL, '2026-11-05 07:02:50', NULL),
(24, 5, 2, 'dasd', NULL, 'submitted', NULL, '2026-11-05 07:03:04', NULL),
(25, 4, 2, 'dad', NULL, 'submitted', NULL, '2026-11-05 07:03:16', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `course_certificates`
--

CREATE TABLE `course_certificates` (
  `student_id` int(10) UNSIGNED NOT NULL,
  `certificate_number` varchar(50) NOT NULL,
  `issued_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `course_certificates`
--

INSERT INTO `course_certificates` (`student_id`, `certificate_number`, `issued_at`) VALUES
(2, 'GL-A99B02E0-5703-43BD-90F7-5B2335A144B2', '2026-10-28 17:50:23'),
(4, 'GL-2E9DAFEB-81B7-4EF7-9922-648AA60C2777', '2026-10-31 07:06:17');

-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(160) NOT NULL,
  `content` text NOT NULL,
  `lesson_order` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lessons`
--

INSERT INTO `lessons` (`id`, `module_id`, `title`, `content`, `lesson_order`) VALUES
(1, 1, 'Basic Computer and Internet Skills', 'Learn how to use common computer hardware, operating systems, files, browsers, and search engines.', 1),
(2, 1, 'Digital Tools and Online Safety', 'Practice using everyday digital tools and protecting personal information online.', 2),
(3, 2, 'Verbal and Written Communication', 'Practice organizing ideas and communicating clearly in speech, messages, and documents.', 1),
(4, 2, 'Professional Communication', 'Learn respectful workplace communication, active listening, and appropriate tone.', 2),
(5, 3, 'Leadership', 'Explore responsible leadership, setting goals, and supporting a team.', 1),
(6, 3, 'Cooperation and Teamwork', 'Practice collaboration, sharing responsibilities, and resolving disagreements.', 2),
(7, 3, 'Decision-Making', 'Use a simple process to compare options and make thoughtful decisions.', 3),
(8, 4, 'Planning and Prioritizing Tasks', 'Set goals, break work into manageable tasks, and prioritize deadlines.', 1),
(9, 4, 'Productivity', 'Build focused work habits and review progress without overloading your schedule.', 2),
(10, 5, 'Resume and Interview Preparation', 'Create a clear resume and prepare concise examples for common interview questions.', 1),
(11, 5, 'Professionalism and Interview Preparation', 'Practice workplace expectations, interview etiquette, and follow-up.', 2);

-- --------------------------------------------------------

--
-- Table structure for table `modules`
--

CREATE TABLE `modules` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(160) NOT NULL,
  `description` text NOT NULL,
  `learning_objective` text DEFAULT NULL,
  `lesson_content` mediumtext DEFAULT NULL,
  `youtube_video_url` varchar(2048) DEFAULT NULL,
  `youtube_video_url_2` varchar(2048) DEFAULT NULL,
  `module_order` tinyint(3) UNSIGNED NOT NULL,
  `quiz_passing_score` decimal(5,2) NOT NULL DEFAULT 80.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `modules`
--

INSERT INTO `modules` (`id`, `title`, `description`, `learning_objective`, `lesson_content`, `youtube_video_url`, `youtube_video_url_2`, `module_order`, `quiz_passing_score`, `is_active`, `created_at`) VALUES
(1, 'Digital Literacy', 'Build essential computer, internet, and online safety skills.', 'After completing this module, learners should be able to:\n- Identify the basic functions of a computer and its common parts.\n- Explain how to use the internet and digital tools for learning and work. \n- Recognize common online risks and practice safe internet use.\n- Identify ways to create strong passwords and protect personal information.', '**Video Lesson Summary: Being Safe on the Internet**\n\nThe internet allows us to communicate with friends, share pictures, play video games, watch videos, and learn new things. However, we should always be careful when using the internet because not everyone online can be trusted.\nOne important way to stay safe online is to protect our personal information. We should avoid sharing private details, such as our home address, phone number, passwords, and other sensitive information with strangers. We should also think carefully before posting pictures or sharing information online because other people may save or share them.\n\nWe should be careful when talking to people online, especially those we do not know personally. Some people may pretend to be someone else, so it is important not to trust strangers easily. We should also avoid clicking suspicious links or opening unknown files because they may contain scams or harmful content.\n\nAnother way to stay safe is to use strong passwords and keep them private. We should also use privacy settings on our social media accounts and report or block people who make us feel uncomfortable. If something online makes us feel worried, threatened, or unsafe, we should tell a trusted adult or someone who can help us.\n\nBeing safe on the internet means making smart decisions, respecting others, protecting our privacy, and thinking before we post or share anything. By practicing these habits, we can enjoy the internet while reducing the risks of online dangers.', 'https://www.youtube.com/watch?v=HxySrSbSY7o', NULL, 1, 80.00, 1, '2026-10-19 15:23:02'),
(2, 'Communication Skills', 'Develop clear, respectful communication for learning and work.', '● After completing this module, learners should be able to:\n\n● Identify Core Communication Channels: Differentiate between verbal, non-verbal,\nactive listening, written, and emotional components of workplace communication and\nselect the appropriate channel for various scenarios.\n\n● Demonstrate Active Listening Practices: Apply core active listening techniques - such\nas maintaining focused attention, clarifying, and summarizing - to ensure accurate\nunderstanding during interpersonal interactions.\n\n● Draft Professional Business Emails: Compose structured, concise, and professional\nworkplace emails with appropriate subject lines, greetings, call-to-action requests, and\nfollow-ups.\n\n● Utilize Effective In-Person Conversation Techniques: Apply professional speaking\nhabits, appropriate non-verbal cues, and proactive clarification tactics when interacting\nwith colleagues, supervisors, and clients.\n\n● Distinguish Directions of Workplace Communication: Classify organizational\ncommunication flows (e.g., upward communication) and evaluate their role in\nprofessional settings.', '**Video Lesson Summary: **\n\n5 Practical Ways to Improve Effective Communication Skills Every Day.\n\n This video by Young Entrepreneurs Forum outlines five practical strategies to enhance daily communication. First, focus on active listening by giving full attention and confirming understanding. Second, keep language simple and clear rather than using complex vocabulary. \nThird, pay attention to body language, tone, and facial expressions, as non-verbal cues heavily impact messages. Fourth, show genuine empathy to connect with others\' emotions and build trust. Last, treat communication as a lifelong practice by setting small daily goals and reflecting on interactions to steadily build confidence and minimize misunderstandings over time.', 'https://www.youtube.com/watch?v=cPajChiAZPU', NULL, 2, 80.00, 1, '2026-10-19 15:23:02'),
(3, 'Leadership and Teamwork', 'Learn to contribute to teams, lead responsibly, and make decisions.', 'After completing this module, learners should be able to:\n\n- Define leadership and teamwork and explain their importance. \n - Identify the qualities of an effective leader and team member.\n - Explain how communication and cooperation contribute to team success. \n - Recognize common teamwork challenges and ways to resolve them.\n - Demonstrate responsible decision-making and respect for others when working in a team.', '**Video Lesson Summary: Understanding Leadership and Teamwork**\n\nLeadership is the ability to guide, motivate, and influence people to achieve a common goal. An effective leader listens to team members, communicates clearly, makes responsible decisions, and helps others improve their skills. A good leader does not simply give orders but also sets a positive example.\n\nTeamwork is the ability of people to work together, share responsibilities, and support one another to complete a task. Every team member has an important role, and cooperation helps the group achieve better results. Good teamwork requires trust, respect, communication, patience, and accountability.\n\nSometimes, team members may have different opinions or experience misunderstandings. Instead of blaming one another, they should listen carefully, discuss possible solutions, and work toward a fair decision. For example, when students prepare a group presentation, one member may research the topic, another may create the slides, and another may present the information. By working together and respecting each person\'s contribution, the group can complete the project successfully.\n\nLeadership and teamwork are important in school, the workplace, and everyday life. By developing these skills, learners can become responsible leaders, supportive team members, and effective problem-solvers.\n\n**After watching the video, learners should be able to:**\n\n Explain the meaning and importance of leadership and teamwork.\n- Identify the characteristics of a good leader.\n-  Describe the responsibilities of a team member.\n-  Recognize the importance of communication and cooperation.\n- Explain how to handle disagreements and make decisions as a team.', 'https://www.youtube.com/watch?v=vjqrYafrttU', NULL, 3, 80.00, 1, '2026-10-19 15:23:02'),
(4, 'Time Management', 'Plan work, prioritize tasks, and build productive routines.', 'After completing this module, learners should be able to:\n\n• Define time management and explain its importance.\n\n• Identify effective ways to plan and prioritize tasks. Explain how to use to-do lists, schedules, and time blocking. \n\n• Recognize common causes of procrastination and ways to avoid it. \n\n• Apply time management strategies to deadlines and daily responsibilities.', '**Video Lesson Summary: Time Management**\n\nThe video focuses on the importance of managing time effectively to become more productive and organized.\n Good time management involves planning daily activities, creating a to-do list, prioritizing important tasks, and setting realistic goals. It also encourages students to avoid procrastination and use their time wisely, especially when handling multiple assignments and deadlines.\n By developing these habits, students can complete their responsibilities on time, reduce stress, and maintain a better balance between schoolwork and personal activities.\n\nAfter watching the video, learners should be able to:\n\n- Explain the importance of effective time management. \n- Identify and prioritize tasks according to their importance and urgency. \n- Create a to-do list and organize daily activities.\n - Plan schedules and complete tasks before their deadlines. \n- Apply strategies to avoid procrastination and improve productivity.', 'https://www.youtube.com/watch?v=TjwBnacqco8', NULL, 4, 80.00, 1, '2026-10-19 15:23:02'),
(5, 'Career and Employment Skills', 'Prepare for job applications, interviews, and professional life.', 'After completing this module, learners should be able to:\n\n- Identify the important parts of a resume and explain their purpose.\n\n- Apply basic tips for writing a clear, accurate, and professional resume.\n \n- Explain how to prepare for a job interview and answer common interview questions. \n\n- Demonstrate professional behavior, effective communication, teamwork, and accountability in the workplace. \n\n- Recognize appropriate ways to handle workplace problems, feedback, and responsibilities.\n\n- Explain the importance of continuous learning and career development.', '**Video Lesson Summary: Resume Writing and Preparation**\n\nA resume is a professional document that presents an applicant’s educational\nbackground, skills, qualifications, and relevant experience. It is usually\nsubmitted when applying for a job, internship, or other professional\nopportunity.\n\nA good resume should be clear, organized, accurate, and easy to read. It\ncommonly includes contact information, a career objective or professional\nsummary, educational background, skills and qualifications, and work\nexperience or relevant activities. Students and fresh graduates can also include school projects, volunteer work, internships, and leadership\nexperiences to demonstrate their abilities.\n\nTo make a resume effective, applicants should customize it according to the job description, use action words, focus on relevant information, and check their grammar and spelling. They should also avoid providing false information or using an unprofessional email address.\n\nCreating a professional resume helps applicants present their qualifications and make a positive impression on potential employers.\n\n**After watching the video and reading the summary, learners should be able to:\n**\n- Identify the main parts of a resume.\n- Explain how to write a clear and professional resume.\n- Recognize common resume mistakes and ways to avoid them.\n- Apply basic resume-writing tips when preparing for job applications.\n\n**Video Lesson Summary: Job Interview Skills **\n\nA job interview is a conversation between an employer and an applicant. It\nallows employers to evaluate an applicant’s qualifications, communication skills, attitude, and suitability for a position. It also gives applicants an\nopportunity to learn more about the company and the responsibilities of the job. \n\nPreparing for an interview includes researching the company, understanding the job description, practicing common questions, preparing the necessary documents, dressing appropriately, and arriving on time.\n\nApplicants should communicate clearly, answer questions honestly, and provide examples that demonstrate their skills and experiences. The STAR method is also useful for answering behavioral questions by explaining the Situation, Task, Action, and Result.\n\nProfessional behavior during and after an interview is important. Applicants should listen carefully, avoid interrupting, thank the interviewer, and follow any instructions about receiving updates.\n\nProper preparation, honesty, confidence, and effective communication can help applicants make a positive impression and become more prepared for future job opportunities.\n\n**After watching the video and reading the summary, learners should be able to:\n**\n- Explain why job interviews are important in the hiring process.\n- Identify the steps involved in preparing for a job interview.\n- Describe how to answer interview questions effectively.\n- Demonstrate confidence, honesty, and professionalism during an interview.\n- Apply the STAR method when answering behavioral interview questions', 'https://www.youtube.com/watch?v=UF6Ge6g1Ifg', 'https://www.youtube.com/watch?v=98dhvMKF9Ug', 5, 80.00, 1, '2026-10-19 15:23:02');

-- --------------------------------------------------------

--
-- Table structure for table `module_learning_notes`
--

CREATE TABLE `module_learning_notes` (
  `id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `original_file_name` varchar(255) NOT NULL,
  `stored_file_name` varchar(100) NOT NULL,
  `file_size` int(10) UNSIGNED NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `module_learning_notes`
--

INSERT INTO `module_learning_notes` (`id`, `module_id`, `original_file_name`, `stored_file_name`, `file_size`, `uploaded_at`, `updated_at`) VALUES
(5, 3, 'Module 3 Leadership and Teamwork Learning Notes.pdf', '148d4d2b-487a-46bf-be4f-aefcc6bdd21e.pdf', 5258948, '2026-10-31 07:55:41', '2026-10-31 07:55:41'),
(6, 4, 'Module 4 Time Management Learning Notes.pdf', 'a22bbcf0-ecb4-4520-86f5-a91c440e1fd5.pdf', 5924386, '2026-10-31 06:42:24', '2026-10-31 06:42:24'),
(7, 2, 'Module - 2 Communication Skills Learning notes.pdf', '33f6291e-42a7-496a-aeed-44ab186f17aa.pdf', 6078628, '2026-10-31 07:19:40', '2026-10-31 07:19:40'),
(8, 1, 'GoLearning_Module_1_Digital_Literacy_Learning_Notes.-1.pdf', '2061233b-4873-4ea0-a214-6f55035b3bc6.pdf', 453313, '2026-10-31 10:59:14', '2026-10-31 10:59:14'),
(13, 5, 'Module 5 - Job readiness and Career preparation.pdf', 'e4018484-571f-4086-b9b2-c8a66f5a8ba7.pdf', 6093094, '2026-10-31 07:15:56', '2026-10-31 07:15:56');

-- --------------------------------------------------------

--
-- Table structure for table `quizzes`
--

CREATE TABLE `quizzes` (
  `id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `question` text NOT NULL,
  `answer_choices` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`answer_choices`)),
  `correct_answer` varchar(500) NOT NULL,
  `question_order` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `quizzes`
--

INSERT INTO `quizzes` (`id`, `module_id`, `question`, `answer_choices`, `correct_answer`, `question_order`) VALUES
(1, 1, 'What is digital literacy?', '[\"A. The ability to repair all computer problems\",\"B. The ability to use digital devices, the internet, and online tools effectively and safely\",\"C. The ability to type very quickly\",\"D. The ability to use social media only\"]', 'B. The ability to use digital devices, the internet, and online tools effectively and safely', 1),
(2, 2, 'Which of the following best defines verbal communication?', '[\"A. Communication using written words\",\"B. Communication using spoken words and language\",\"C. Communication using body language only\",\"D. The exchange of messages without any words\"]', 'B. Communication using spoken words and language', 1),
(4, 4, 'What is time management?', '[\"A. Doing all tasks at the last minute\",\"B. Planning and organizing time to complete tasks\",\"C. Avoiding difficult responsibilities\",\"D. Working without a schedule\"]', 'B. Planning and organizing time to complete tasks', 1),
(5, 5, 'What is the main purpose of a resume?', '[\"A. To tell personal stories unrelated to the job\",\"B. To present relevant qualifications and skills\",\"C. To guarantee employment\",\"D. To replace the interview\"]', 'B. To present relevant qualifications and skills', 1),
(6, 1, 'Which computer part is mainly used for typing letters and numbers?', '[\"A. Monitor\",\"B. Printer\",\"C. Keyboard\",\"D. Speaker\"]', 'C. Keyboard', 2),
(7, 2, 'Written communication is most suitable when you need to:', '[\"A. Get an immediate answer\",\"B. Share emotions and feelings\",\"C. Create a permanent record of information\",\"D. Resolve a misunderstanding quickly\"]', 'C. Create a permanent record of information', 2),
(8, 5, 'Which information should be included in a resume?', '[\"A. False work experience\",\"B. Unrelated private details\",\"C. Relevant education and skills\",\"D. Made-up qualifications\"]', 'C. Relevant education and skills', 2),
(9, 5, 'What should you do before a job interview?', '[\"A. Research the company and practice answers\",\"B. Arrive without preparation\",\"C. Memorize false experiences\",\"D. Ignore the job description\"]', 'A. Research the company and practice answers', 3),
(10, 5, 'If an interviewer asks about software, you have never used, what should you do?', '[\"A. Claim you are an expert\",\"B. Change the subject\",\"C. Make up an answer\",\"D. Be honest and explain that you are willing to learn\"]', 'D. Be honest and explain that you are willing to learn', 4),
(11, 5, 'Which behavior shows professionalism?', '[\"A. Frequently interrupting coworkers\",\"B. Meeting deadlines and communicating respectfully\",\"C. Ignoring company policies\",\"D. Blaming others for every mistake\"]', 'B. Meeting deadlines and communicating respectfully', 5),
(12, 5, 'What is the best response when you receive constructive feedback?', '[\"A. Listen and use it to improve\",\"B. Ignore your supervisor\",\"C. Argue immediately\",\"D. Refuse to make corrections\"]', 'A. Listen and use it to improve', 6),
(13, 5, 'How should confidential company information be handled?', '[\"A. Share it with all coworkers\",\"B. Post it online\",\"C. Protect it and share only with authorized people\",\"D. Send it to personal contacts\"]', 'C. Protect it and share only with authorized people', 7),
(14, 5, 'Why is adaptability important in the workplace?', '[\"A. It prevents employees from learning\",\"B. It helps employees adjust to new tools and situations\",\"C. It removes the need for teamwork\",\"D. It guarantees promotion\"]', 'B. It helps employees adjust to new tools and situations', 8),
(15, 5, 'Which is an example of professional communication?', '[\"A. Sending unclear messages\",\"B. Using disrespectful language\",\"C. Ignoring important emails\",\"D. Writing clear and respectful emails\"]', 'D. Writing clear and respectful emails', 9),
(16, 5, 'What is career development?', '[\"A. A one-time activity before employment\",\"B. A process of continuously improving skills and career opportunities\",\"C. A requirement only for managers\",\"D. A way to avoid learning new skills\"]', 'B. A process of continuously improving skills and career opportunities', 10),
(17, 3, 'What is leadership?', '[\"A. Giving orders without listening to others\",\"B. Guiding and motivating people toward a common goal\",\"C. Doing all the tasks alone\",\"D. Allowing others to make every decision\"]', 'B. Guiding and motivating people toward a common goal', 1),
(19, 3, 'Which is a quality of an effective leader?', '[\"A. Dishonesty\",\"B. Irresponsibility\",\"C. Good communication\",\"D. Ignoring team members\"]', 'C. Good communication', 2),
(20, 3, 'What is teamwork?', '[\"A. Competing against every member\",\"B. Working together to achieve a common goal\",\"C. Letting one person do all the work\",\"D. Avoiding responsibilities\"]', 'B. Working together to achieve a common goal', 3),
(21, 3, 'Why is communication important in a team?', '[\"A. It prevents members from sharing ideas\",\"B. It makes tasks more confusing\",\"C. It helps members understand tasks and exchange ideas\",\"D. It allows leaders to ignore feedback\"]', 'C. It helps members understand tasks and exchange ideas', 4),
(22, 3, 'What should a team member do when another member needs help?', '[\"A. Ignore the member\",\"B. Blame the member\",\"C. Refuse to cooperate\",\"D. Offer appropriate help and support\"]', 'D. Offer appropriate help and support', 5),
(23, 3, 'What is the best way to handle disagreement in a team?', '[\"A. Listen to different opinions and discuss solutions respectfully\",\"B. Shout until someone agrees\",\"C. Stop communicating with the group\",\"D. Blame one person immediately\"]', 'A. Listen to different opinions and discuss solutions respectfully', 6),
(24, 3, 'Which action demonstrates responsibility?', '[\"A. Missing deadlines without informing anyone\",\"B. Completing assigned tasks on time\",\"C. Ignoring group instructions\",\"D. Depending on others to do everything\"]', 'B. Completing assigned tasks on time', 7),
(25, 3, 'What is decision-making?', '[\"A. Avoiding difficult situations\",\"B. Allowing conflicts to continue\",\"C. Choosing the best option among alternatives\",\"D. Following others without thinking\"]', 'C. Choosing the best option among alternatives', 8),
(26, 3, 'A group is running out of time to finish a project. What should the leader do?', '[\"A. Cancel the project immediately\",\"B. Blame the slowest member\",\"C. Do nothing and wait\",\"D. Review the tasks and organize the remaining work\"]', 'D. Review the tasks and organize the remaining work', 9),
(27, 3, 'What is one major benefit of leadership and teamwork in the workplace?', '[\"A. It eliminates every possible problem\",\"B. It helps people cooperate and achieve shared goals\",\"C. It removes individual responsibility\",\"D. It prevents employees from sharing ideas\"]', 'B. It helps people cooperate and achieve shared goals', 10),
(28, 1, 'What is the main purpose of an internet browser?', '[\"A. To access websites\",\"B. To print documents only\",\"C. To protect every account automatically\",\"D. To create computer hardware\"]', 'A. To access websites', 3),
(29, 1, 'Which of the following is an example of a search engine?', '[\"A. Microsoft Word\",\"B. Google\",\"C. Windows Calculator\",\"D. Paint\"]', 'B. Google', 4),
(30, 1, 'Which digital tool is most appropriate for creating a formal letter?', '[\"A. A word processor\",\"B. A music player\",\"C. A photo gallery\",\"D. A calculator only\"]', 'A. A word processor', 5),
(31, 1, 'What should you do if you receive a suspicious link from an unknown sender?', '[\"A. Click it immediately\",\"B. Forward it to everyone\",\"C. Open it to see what happens\",\"D. Avoid clicking it and verify the sender\"]', 'D. Avoid clicking it and verify the sender', 6),
(32, 1, 'Which password is the safest choice?', '[\"A. 123456\",\"B. Your birthday\",\"C. A long, unique password that is difficult to guess\",\"D. Your first name\"]', 'C. A long, unique password that is difficult to guess', 7),
(33, 1, 'Why should you check the reliability of an online source?', '[\"A. To make the website load faster\",\"B. To help ensure the information is accurate and trustworthy\",\"C. To avoid reading the information\",\"D. To make every website look the same\"]', 'B. To help ensure the information is accurate and trustworthy', 8),
(34, 1, 'What should you do when using your account on a shared computer?', '[\"A. Save your password for everyone\",\"B. Leave your account open\",\"C. Log out after using your account\",\"D. Share your verification code\"]', 'C. Log out after using your account', 9),
(35, 1, 'What is one benefit of digital literacy in the workplace?', '[\"A. It removes the need to communicate\",\"B. It helps workers use digital tools to organize information and complete tasks\",\"C. It guarantees employment\",\"D. It prevents every possible online threat\"]', 'B. It helps workers use digital tools to organize information and complete tasks', 10),
(36, 2, 'The \"4 Cs\" of effective written communication are:', '[\"A. Clear, Creative, Clever, Concise\",\"B. Complete, Concise, Correct, Clear\",\"C. Calm, Courteous, Clear, Correct\",\"D. Complete, Creative, Concise, Consistent\"]', 'B. Complete, Concise, Correct, Clear', 3),
(37, 2, 'Active listening means:', '[\"A. Hearing every word without speaking\",\"B. Nodding your head while someone speaks\",\"C. Paying full attention and confirming understanding\",\"D. Interrupting politely to ask questions\"]', 'C. Paying full attention and confirming understanding', 4),
(38, 2, 'Which subject line follows professional email best practice?', '[\"A. Help me please!!!\",\"B. Question about Monday\'s meeting\",\"C. Urgent - read now\",\"D. Hi there\"]', 'B. Question about Monday\'s meeting', 5),
(39, 2, 'When delivering a professional presentation, you should:', '[\"A. Avoid making eye contact with the audience\",\"B. Read directly from your notes word for word\",\"C. Speak clearly and adjust your pace\",\"D. Apologize for being nervous at the start\"]', 'C. Speak clearly and adjust your pace', 6),
(40, 2, 'Feedback in communication is important because it:', '[\"A. Confirms the message was understood\",\"B. Gives the sender a chance to speak again\",\"C. Makes the conversation last longer\",\"D. Shows you are listening even if you\'re not\"]', 'A. Confirms the message was understood', 7),
(41, 2, 'Which of the following is an example of upward communication?', '[\"A. A manager speaking to their team\",\"B. Colleagues chatting during a break\",\"C. An employee sending a report to their supervisor\",\"D. Two teammates discussing a project\"]', 'C. An employee sending a report to their supervisor', 8),
(42, 2, 'What is the biggest disadvantage of written communication?', '[\"A. It cannot be saved for later reference\",\"B. It usually takes longer to get feedback\",\"C. It is always less professional than speaking\",\"D. It is not taken seriously in business\"]', 'B. It usually takes longer to get feedback', 9),
(43, 2, 'If you don\'t understand what someone said during a conversation, you should:', '[\"A. Pretend you understood to be polite\",\"B. Ask them to please repeat or clarify\",\"C. Change the subject quickly\",\"D. Ask someone else later instead\"]', 'B. Ask them to please repeat or clarify', 10),
(44, 4, 'What is the main purpose of a to-do list?', '[\"A. To make tasks more complicated\",\"B. To avoid setting deadlines\",\"C. To record tasks that need to be completed\",\"D. To replace all schedules\"]', 'C. To record tasks that need to be completed', 2),
(45, 4, 'What does prioritizing tasks mean?', '[\"A. Choosing tasks based on importance and urgency\",\"B. Doing the easiest tasks only\",\"C. Ignoring deadlines\",\"D. Completing tasks randomly\"]', 'A. Choosing tasks based on importance and urgency', 3),
(46, 4, 'What is time blocking?', '[\"A. Cancelling scheduled activities\",\"B. Doing several tasks without planning\",\"C. Avoiding breaks throughout the day\",\"D. Assigning specific time periods to activities\"]', 'D. Assigning specific time periods to activities', 4),
(47, 4, 'A student has an assignment due tomorrow and another due next week. What should the student generally do first?', '[\"A. Ignore both assignments\",\"B. Work on the assignment due tomorrow\",\"C. Wait until both deadlines are near\",\"D. Complete unrelated activities first\"]', 'B. Work on the assignment due tomorrow', 5),
(48, 4, 'What is procrastination?', '[\"A. Planning tasks ahead of time\",\"B. Completing work before the deadline\",\"C. Delaying tasks that need to be done\",\"D. Organizing a daily schedule\"]', 'C. Delaying tasks that need to be done', 6),
(49, 4, 'Which is an effective way to avoid procrastination?', '[\"A. Break a large task into smaller steps\",\"B. Wait until you feel motivated\",\"C. Keep checking social media while studying\",\"D. Ignore the deadline\"]', 'A. Break a large task into smaller steps', 7),
(50, 4, 'Why is goal setting useful?', '[\"A. It removes the need for planning\",\"B. It guarantees that every task is easy\",\"C. It encourages people to ignore schedules\",\"D. It provides a clear direction for actions\"]', 'D. It provides a clear direction for actions', 8),
(51, 4, 'A student realizes they cannot finish all assigned tasks on time. What is the best action?', '[\"A. Avoid telling the group\",\"B. Review priorities and make a realistic schedule\",\"C. Stop working on every task\",\"D. Blame other team members\"]', 'B. Review priorities and make a realistic schedule', 9),
(52, 4, 'What is one major benefit of effective time management?', '[\"A. It eliminates every problem\",\"B. It removes all responsibilities\",\"C. It improves organization and productivity\",\"D. It makes deadlines unnecessary\"]', 'C. It improves organization and productivity', 10);

-- --------------------------------------------------------

--
-- Table structure for table `quiz_results`
--

CREATE TABLE `quiz_results` (
  `id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `score` smallint(5) UNSIGNED NOT NULL,
  `total_questions` smallint(5) UNSIGNED NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `passed` tinyint(1) NOT NULL,
  `attempt_number` smallint(5) UNSIGNED NOT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `quiz_results`
--

INSERT INTO `quiz_results` (`id`, `student_id`, `module_id`, `score`, `total_questions`, `percentage`, `passed`, `attempt_number`, `submitted_at`) VALUES
(1, 2, 1, 1, 2, 50.00, 0, 1, '2026-10-21 10:22:37'),
(2, 2, 1, 2, 2, 100.00, 1, 2, '2026-10-28 17:46:17'),
(3, 2, 2, 1, 1, 100.00, 1, 1, '2026-10-28 17:46:51'),
(4, 2, 3, 0, 1, 0.00, 0, 1, '2026-10-28 17:47:11'),
(5, 2, 3, 1, 1, 100.00, 1, 2, '2026-10-28 17:49:09'),
(6, 2, 4, 1, 1, 100.00, 1, 1, '2026-10-28 17:49:28'),
(7, 2, 5, 1, 1, 100.00, 1, 1, '2026-10-28 17:50:15'),
(8, 3, 1, 2, 2, 100.00, 1, 1, '2026-10-29 05:37:58'),
(9, 3, 2, 0, 2, 0.00, 0, 1, '2026-10-29 05:41:30'),
(10, 4, 1, 10, 10, 100.00, 1, 1, '2026-10-31 06:49:17'),
(11, 4, 2, 10, 10, 100.00, 1, 1, '2026-10-31 06:53:27'),
(12, 4, 3, 10, 10, 100.00, 1, 1, '2026-10-31 06:55:28'),
(13, 4, 4, 10, 10, 100.00, 1, 1, '2026-10-31 07:01:41'),
(14, 4, 5, 10, 10, 100.00, 1, 1, '2026-10-31 07:04:43');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `session_data` mediumtext NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `session_data`, `expires_at`) VALUES
('vZt2Zx9RpkBwTG3TP6gfWlTMSranlEPk', '{\"cookie\":{\"originalMaxAge\":28800000,\"expires\":\"2026-11-05T15:02:37.606Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":2,\"fullName\":\"Yhajj F. Magusib\",\"email\":\"yhajjmagusib@gmail.com\",\"role\":\"student\"}}', '2026-11-05 23:33:45');

-- --------------------------------------------------------

--
-- Table structure for table `student_progress`
--

CREATE TABLE `student_progress` (
  `id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `is_unlocked` tinyint(1) NOT NULL DEFAULT 0,
  `first_accessed_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_progress`
--

INSERT INTO `student_progress` (`id`, `student_id`, `module_id`, `is_completed`, `is_unlocked`, `first_accessed_at`, `completed_at`) VALUES
(1, 2, 1, 1, 1, '2026-10-19 15:37:00', '2026-10-28 17:46:17'),
(12, 2, 2, 1, 1, '2026-10-28 17:46:44', '2026-10-28 17:46:51'),
(13, 2, 3, 1, 1, '2026-10-28 17:47:03', '2026-10-28 17:49:09'),
(14, 2, 4, 1, 1, '2026-10-28 17:49:17', '2026-10-28 17:49:28'),
(15, 2, 5, 1, 1, '2026-10-19 16:22:35', '2026-10-28 17:50:15'),
(63, 3, 1, 1, 1, '2026-10-29 05:37:36', '2026-10-29 05:38:04'),
(148, 3, 2, 0, 1, '2026-10-29 05:38:57', NULL),
(153, 4, 1, 1, 1, '2026-10-29 12:23:46', '2026-10-31 06:50:22'),
(158, 5, 1, 0, 1, '2026-10-30 05:59:32', NULL),
(178, 4, 2, 1, 1, '2026-10-31 06:51:28', '2026-10-31 06:53:47'),
(188, 4, 3, 1, 1, '2026-10-31 06:53:56', '2026-10-31 06:56:59'),
(198, 4, 4, 1, 1, '2026-10-31 06:57:05', '2026-10-31 07:01:53'),
(212, 4, 5, 1, 1, '2026-10-31 07:02:00', '2026-10-31 07:04:54');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(160) NOT NULL,
  `email` varchar(254) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','admin') NOT NULL DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'System Admin', 'admin@gmail.com', '$2b$12$7XYNOzLok/yTKROj.lTwLuKsiB76pyRHgHp/kkkY2uQdfpnstaaXW', 'admin', '2026-10-19 15:24:05'),
(2, 'Yhajj F. Magusib', 'yhajjmagusib@gmail.com', '$2b$12$EcY0yMii7u3bMWThOa8ZkeLEEQ5y.81j6EOU4TpMgJemasFDdhZiK', 'student', '2026-10-19 15:29:08'),
(3, 'Princess Nicole Lusdoc', 'princesslusdoc@gmail.com', '$2b$12$poBwZMlkbPh4XywS4VXuiu2b2HCsxtqw5Jd.135KREu.OcibGFbKC', 'student', '2026-10-21 12:29:58'),
(4, 'Marwin Molina', 'johnmarwinmolina019@gmail.com', '$2b$12$5JccpRQsYWqRkYAoqZL0TupPIt.4y9Su2ozlzmTuewWFtX3773Nha', 'student', '2026-10-29 12:23:32'),
(5, 'Princess Anne A. Murao', 'princessmurao@gmail.com', '$2b$12$82VaSYpUrkKIiiEJMIQAxesHwlAazkPxQQUURxzN/dwV17JdHe/Ki', 'student', '2026-10-29 13:33:41');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignments_module_active` (`module_id`,`is_active`);

--
-- Indexes for table `assignment_checklist_progress`
--
ALTER TABLE `assignment_checklist_progress`
  ADD PRIMARY KEY (`assignment_id`,`student_id`),
  ADD KEY `fk_checklist_progress_student` (`student_id`);

--
-- Indexes for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_submissions_student_assignment` (`student_id`,`assignment_id`),
  ADD KEY `fk_submissions_assignment` (`assignment_id`);

--
-- Indexes for table `course_certificates`
--
ALTER TABLE `course_certificates`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `uq_course_certificate_number` (`certificate_number`);

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_lessons_module_order` (`module_id`,`lesson_order`);

--
-- Indexes for table `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_modules_order` (`module_order`);

--
-- Indexes for table `module_learning_notes`
--
ALTER TABLE `module_learning_notes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_module_learning_notes_module` (`module_id`);

--
-- Indexes for table `quizzes`
--
ALTER TABLE `quizzes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_quizzes_module_order` (`module_id`,`question_order`);

--
-- Indexes for table `quiz_results`
--
ALTER TABLE `quiz_results`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_quiz_attempt` (`student_id`,`module_id`,`attempt_number`),
  ADD KEY `idx_quiz_results_student_submitted` (`student_id`,`submitted_at`),
  ADD KEY `fk_quiz_results_module` (`module_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `idx_sessions_expiration` (`expires_at`);

--
-- Indexes for table `student_progress`
--
ALTER TABLE `student_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_progress_student_module` (`student_id`,`module_id`),
  ADD KEY `fk_progress_module` (`module_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `lessons`
--
ALTER TABLE `lessons`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `modules`
--
ALTER TABLE `modules`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `module_learning_notes`
--
ALTER TABLE `module_learning_notes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `quizzes`
--
ALTER TABLE `quizzes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `quiz_results`
--
ALTER TABLE `quiz_results`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `student_progress`
--
ALTER TABLE `student_progress`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=345;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `fk_assignments_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_checklist_progress`
--
ALTER TABLE `assignment_checklist_progress`
  ADD CONSTRAINT `fk_checklist_progress_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_checklist_progress_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `fk_submissions_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_submissions_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `course_certificates`
--
ALTER TABLE `course_certificates`
  ADD CONSTRAINT `fk_course_certificates_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lessons`
--
ALTER TABLE `lessons`
  ADD CONSTRAINT `fk_lessons_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `module_learning_notes`
--
ALTER TABLE `module_learning_notes`
  ADD CONSTRAINT `fk_module_learning_notes_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quizzes`
--
ALTER TABLE `quizzes`
  ADD CONSTRAINT `fk_quizzes_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quiz_results`
--
ALTER TABLE `quiz_results`
  ADD CONSTRAINT `fk_quiz_results_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_quiz_results_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_progress`
--
ALTER TABLE `student_progress`
  ADD CONSTRAINT `fk_progress_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_progress_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
