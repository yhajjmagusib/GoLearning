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
