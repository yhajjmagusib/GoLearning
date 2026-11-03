CREATE DATABASE IF NOT EXISTS golearning
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE golearning;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS modules (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    learning_objective TEXT NULL,
    lesson_content MEDIUMTEXT NULL,
    youtube_video_url VARCHAR(2048) NULL,
    youtube_video_url_2 VARCHAR(2048) NULL,
    module_order TINYINT UNSIGNED NOT NULL,
    quiz_passing_score DECIMAL(5, 2) NOT NULL DEFAULT 80.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_modules_order (module_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lessons (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    module_id INT UNSIGNED NOT NULL,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    lesson_order SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lessons_module_order (module_id, lesson_order),
    CONSTRAINT fk_lessons_module
        FOREIGN KEY (module_id) REFERENCES modules (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quizzes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    module_id INT UNSIGNED NOT NULL,
    question TEXT NOT NULL,
    answer_choices JSON NOT NULL,
    correct_answer VARCHAR(500) NOT NULL,
    question_order SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quizzes_module_order (module_id, question_order),
    CONSTRAINT fk_quizzes_module
        FOREIGN KEY (module_id) REFERENCES modules (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_results (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id INT UNSIGNED NOT NULL,
    module_id INT UNSIGNED NOT NULL,
    score SMALLINT UNSIGNED NOT NULL,
    total_questions SMALLINT UNSIGNED NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    passed BOOLEAN NOT NULL,
    attempt_number SMALLINT UNSIGNED NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_quiz_attempt (student_id, module_id, attempt_number),
    KEY idx_quiz_results_student_submitted (student_id, submitted_at),
    CONSTRAINT fk_quiz_results_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_quiz_results_module
        FOREIGN KEY (module_id) REFERENCES modules (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assignments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    module_id INT UNSIGNED NOT NULL,
    title VARCHAR(160) NOT NULL,
    instructions TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_assignments_module_active (module_id, is_active),
    CONSTRAINT fk_assignments_module
        FOREIGN KEY (module_id) REFERENCES modules (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    assignment_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    submission_text TEXT NULL,
    file_reference VARCHAR(1024) NULL,
    status ENUM('submitted', 'pending', 'approved', 'rejected')
        NOT NULL DEFAULT 'submitted',
    admin_feedback TEXT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_submissions_student_assignment (student_id, assignment_id),
    CONSTRAINT fk_submissions_assignment
        FOREIGN KEY (assignment_id) REFERENCES assignments (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assignment_checklist_progress (
    assignment_id INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    instructions_state JSON NOT NULL,
    response_state JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (assignment_id, student_id),
    CONSTRAINT fk_checklist_progress_assignment
        FOREIGN KEY (assignment_id) REFERENCES assignments (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_checklist_progress_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_progress (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id INT UNSIGNED NOT NULL,
    module_id INT UNSIGNED NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    first_accessed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_progress_student_module (student_id, module_id),
    CONSTRAINT fk_progress_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_progress_module
        FOREIGN KEY (module_id) REFERENCES modules (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS module_learning_notes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    module_id INT UNSIGNED NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(100) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_module_learning_notes_module (module_id),
    CONSTRAINT fk_module_learning_notes_module
        FOREIGN KEY (module_id) REFERENCES modules (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_certificates (
    student_id INT UNSIGNED NOT NULL,
    certificate_number VARCHAR(50) NOT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id),
    UNIQUE KEY uq_course_certificate_number (certificate_number),
    CONSTRAINT fk_course_certificates_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL,
    session_data MEDIUMTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (session_id),
    KEY idx_sessions_expiration (expires_at)
) ENGINE=InnoDB;
