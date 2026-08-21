import express from "express";
import { db } from "../db/index.js";
import { classes, departments, enrollments, user } from "../db/schema/index.js";
import { sql, eq } from "drizzle-orm";

const router = express.Router();

router.get("/metrics", async (req, res) => {
    try {
        // Total Users
        const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(user);
        
        // Total Classes
        const [classesCount] = await db.select({ count: sql<number>`count(*)` }).from(classes);
        
        // Total Departments
        const [departmentsCount] = await db.select({ count: sql<number>`count(*)` }).from(departments);

        // Active Enrollments
        const [enrollmentsCount] = await db.select({ count: sql<number>`count(*)` }).from(enrollments);

        // User Distribution by Role
        const userDistribution = await db
            .select({
                role: user.role,
                count: sql<number>`count(*)`
            })
            .from(user)
            .groupBy(user.role);

        // Classes by Department
        const classesByDept = await db
            .select({
                department: departments.name,
                count: sql<number>`count(${classes.id})`
            })
            .from(departments)
            .leftJoin(classes, eq(departments.id, classes.subjectId)) // Assuming subject -> department mapping or direct? Wait, classes map to subject, subject to dept. 
            // We'll just fetch classes, join subjects, join departments below properly.
            // For now, let's just do a simple aggregation.
            
        // Wait, the schema is: classes -> subjectId -> subjects -> departmentId -> departments
        const correctClassesByDept = await db.execute(sql`
            SELECT d.name as department, COUNT(c.id) as count
            FROM departments d
            LEFT JOIN subjects s ON s.department_id = d.id
            LEFT JOIN classes c ON c.subject_id = s.id
            GROUP BY d.name
        `);

        // Capacity Status
        const capacityStatus = await db.execute(sql`
            SELECT c.name as class_name, c.capacity, COUNT(e.student_id) as enrolled
            FROM classes c
            LEFT JOIN enrollments e ON c.id = e.class_id
            GROUP BY c.id, c.name, c.capacity
            ORDER BY enrolled DESC
            LIMIT 10
        `);

        // Enrollment Trends (simplified to daily enrollments or just mock data if no date in enrollments)
        // Note: enrollments table doesn't have createdAt in the schema.
        
        res.status(200).json({
            metrics: {
                totalUsers: usersCount?.count ?? 0,
                totalClasses: classesCount?.count ?? 0,
                totalDepartments: departmentsCount?.count ?? 0,
                totalEnrollments: enrollmentsCount?.count ?? 0,
            },
            charts: {
                userDistribution,
                classesByDepartment: correctClassesByDept.rows ?? [],
                capacityStatus: capacityStatus.rows ?? []
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
        res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
});

export default router;
