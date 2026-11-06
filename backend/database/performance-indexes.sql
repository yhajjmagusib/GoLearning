-- Run once in the Supabase SQL Editor to speed up dashboard/module lookups.
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_student
    ON assignment_submissions (assignment_id, student_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_results_student_module_passed
    ON quiz_results (student_id, module_id, passed);

CREATE INDEX IF NOT EXISTS idx_student_progress_module_student
    ON student_progress (module_id, student_id);
