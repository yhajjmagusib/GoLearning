ALTER TABLE student_progress
    ADD COLUMN first_accessed_at TIMESTAMP NULL AFTER is_unlocked;
