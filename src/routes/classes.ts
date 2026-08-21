import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import express from "express";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";
import { db } from "../db/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { search, subject, teacher, page = 1, limit = 10 } = req.query;

        const MAX_LIMIT = 100;
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const currentPage = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
        const limitPerPage = Number.isFinite(parsedLimit)
            ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
            : 10;
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`)
                )
            );
        }

        if (subject) {
            filterConditions.push(ilike(subjects.name, `%${subject}%`));
        }

        if (teacher) {
            filterConditions.push(ilike(user.name, `%${teacher}%`));
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                subject: { ...getTableColumns(subjects) },
                teacher: { ...getTableColumns(user) }
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .offset(offset)
            .limit(limitPerPage);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    } catch (error) {
        console.error("Error fetching classes:", error);
        res.status(500).json({ error: "Failed to get Classes" });
    }
});

router.post("/", requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const { name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId } = req.body;

        const [createdClass] = await db
            .insert(classes)
            .values({
                ...req.body,
                inviteCode: Math.random().toString(36).substring(2, 9),
                schedules: []
            })
            .returning({ id: classes.id });
        if (!createdClass) throw Error;
        res.status(200).json({ createdClass });
    } catch (e) {
        console.error(`POST / Classes error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


//gets the class details with department details

router.get('/:id/users', async (req, res) => {
    try {
        const classId = Number(req.params.id);

        if (!Number.isFinite(classId)) {
            return res.status(400).json({ error: 'No Class Found' });
        }

        const { search, role, page = 1, limit = 10 } = req.query;

        const MAX_LIMIT = 100;
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const currentPage = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
        const limitPerPage = Number.isFinite(parsedLimit)
            ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
            : 10;
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions: SQL[] = [eq(enrollments.classId, classId)];

        if (typeof search === "string" && search.trim()) {
            const searchCondition = or(
                ilike(user.name, `%${search.trim()}%`),
                ilike(user.email, `%${search.trim()}%`)
            );

            if (searchCondition) {
                filterConditions.push(searchCondition);
            }
        }

        const requestedRole = typeof role === "string" && (role === "student" || role === "teacher" || role === "admin")
            ? role
            : undefined;

        if (requestedRole) {
            filterConditions.push(eq(user.role, requestedRole));
        }

        const whereClause = and(...filterConditions);

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .innerJoin(user, eq(enrollments.studentId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const students = await db
            .select({
                ...getTableColumns(user)
            })
            .from(enrollments)
            .innerJoin(user, eq(enrollments.studentId, user.id))
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .offset(offset)
            .limit(limitPerPage);

        res.status(200).json({
            data: students,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    } catch (error) {
        console.error("Error fetching class users:", error);
        res.status(500).json({ error: "Failed to get class users" });
    }
});

router.get('/:id', async (req, res) => {
    const classId = Number(req.params.id);

    if (!Number.isFinite(classId)) return res.status(400).json({ error: 'No Class Found' });

    const [classDetails] = await db.select({
        ...getTableColumns(classes),
        subject: { ...getTableColumns(subjects) },
        department: { ...getTableColumns(departments) },
        teacher: { ...getTableColumns(user) },
    }).from(classes).leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .where(eq(classes.id, classId));

    if (!classDetails) return res.status(400).json({ error: 'No Class Found' });
    res.status(200).json({ data: classDetails });
});

router.patch('/:id', requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const classId = Number(req.params.id);
        if (!Number.isFinite(classId)) return res.status(400).json({ error: 'Invalid ID' });

        const [updatedClass] = await db
            .update(classes)
            .set(req.body)
            .where(eq(classes.id, classId))
            .returning();
            
        if (!updatedClass) return res.status(404).json({ error: 'Class not found' });
        res.status(200).json({ data: updatedClass });
    } catch (e) {
        console.error(`PATCH / Classes error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete('/:id', requireAuth(["admin"]), async (req, res) => {
    try {
        const classId = Number(req.params.id);
        if (!Number.isFinite(classId)) return res.status(400).json({ error: 'Invalid ID' });

        await db.delete(classes).where(eq(classes.id, classId));
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(`DELETE / Classes error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post('/:id/enrollments', requireAuth(["admin","teacher","student"]), async (req, res) => {
    try {
        const classId = Number(req.params.id);
        const { studentId, inviteCode } = req.body;
        
        if (!Number.isFinite(classId) || !studentId) {
            return res.status(400).json({ error: 'Invalid class ID or student ID' });
        }

        // Validate invite code and capacity
        const [targetClass] = await db
            .select()
            .from(classes)
            .where(eq(classes.id, classId));
            
        if (!targetClass) return res.status(404).json({ error: 'Class not found' });
        
        if (targetClass.inviteCode !== inviteCode) {
            return res.status(400).json({ error: 'Invalid invite code' });
        }

        const [enrollmentCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.classId, classId));
            
        if ((enrollmentCount?.count ?? 0) >= targetClass.capacity) {
            return res.status(400).json({ error: 'Class is at full capacity' });
        }

        const [enrollment] = await db
            .insert(enrollments)
            .values({ studentId, classId })
            .returning();
            
        res.status(200).json({ data: enrollment });
    } catch (e) {
        console.error(`POST / Enrollments error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete('/:id/enrollments/:studentId', requireAuth(["admin","teacher","student"]), async (req, res) => {
    try {
        const { id: classId, studentId } = req.params;
        // Guard against missing or non-string params
        if (!classId || !studentId || typeof classId !== 'string' || typeof studentId !== 'string') {
            return res.status(400).json({ error: 'Invalid class ID or student ID' });
        }
        const numClassId = Number(classId);
        if (!Number.isFinite(numClassId)) {
            return res.status(400).json({ error: 'Class ID must be a number' });
        }

        await db
            .delete(enrollments)
            .where(and(eq(enrollments.classId, numClassId), eq(enrollments.studentId, studentId)));
            
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(`DELETE / Enrollments error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

