DELETE older
FROM assignment_submissions older
JOIN assignment_submissions newer
    ON newer.assignment_id = older.assignment_id
    AND newer.student_id = older.student_id
    AND newer.id > older.id;

ALTER TABLE assignment_submissions
    DROP INDEX idx_submissions_student_assignment,
    ADD UNIQUE KEY uq_submissions_student_assignment (student_id, assignment_id);

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
