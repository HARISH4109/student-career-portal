DO $$
DECLARE
    rec RECORD;
    canonical_id UUID;
BEGIN
    FOR rec IN
        SELECT department_id, name
        FROM academic_programs
        GROUP BY department_id, name
        HAVING COUNT(*) > 1
    LOOP
        -- Choose earliest row as canonical
        SELECT id INTO canonical_id
        FROM academic_programs
        WHERE department_id = rec.department_id AND name = rec.name
        ORDER BY created_at ASC, id ASC
        LIMIT 1;

        -- Update student_profiles pointing to duplicates
        UPDATE student_profiles
        SET program_id = canonical_id
        WHERE program_id IN (
            SELECT id FROM academic_programs
            WHERE department_id = rec.department_id AND name = rec.name AND id <> canonical_id
        );

        -- Update academic_streams pointing to duplicates
        UPDATE academic_streams
        SET program_id = canonical_id
        WHERE program_id IN (
            SELECT id FROM academic_programs
            WHERE department_id = rec.department_id AND name = rec.name AND id <> canonical_id
        );

        -- Update opportunity_eligibility pointing to duplicates
        UPDATE opportunity_eligibility
        SET program_id = canonical_id
        WHERE program_id IN (
            SELECT id FROM academic_programs
            WHERE department_id = rec.department_id AND name = rec.name AND id <> canonical_id
        );

        -- Delete duplicate academic_programs rows
        DELETE FROM academic_programs
        WHERE department_id = rec.department_id AND name = rec.name AND id <> canonical_id;
    END LOOP;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academic_programs_dept_name_idx" ON "academic_programs" USING btree ("department_id","name");

