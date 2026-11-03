ALTER TABLE modules
    ADD COLUMN learning_objective TEXT NULL AFTER description,
    ADD COLUMN lesson_content MEDIUMTEXT NULL AFTER learning_objective;
