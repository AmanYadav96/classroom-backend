import { and, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema/index.js";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/index.js";

const router = express.Router();

// Define your subject-related routes here get all 
//subjects with optional search,filtering and pagination
router.get("/", async (req, res) => {
    try{
        const { search, department, page = 1, limit = 10 } = req.query;

        const MAX_LIMIT = 100;
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const currentPage = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
        const limitPerPage = Number.isFinite(parsedLimit)
            ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
            : 10;
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions =[];

        //if search query is provided, add it to the filter conditions
        //  subject name or code should match the search term
        if(search){
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            );
        }

        //if department is provided, add it to the filter conditions
        //  match  the department name

        if (department) {
            filterConditions.push(ilike(departments.name, `%${department}%`));
        }

        const whereClause = filterConditions.length > 0 ?  and( ... filterConditions)  : undefined;

        const countResult = await 
        db.select({count: sql<number>`count(*)`})
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const subjectsList = await db
        .select( {
            ...getTableColumns(subjects),
            department: { ...getTableColumns(departments)}
        })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(whereClause)
        .offset(offset)
        .limit(limitPerPage);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    }
    catch(error){
        console.error("Error fetching subjects:", error);
        res.status(500).json({ error: "Failed to get Subjects" });
    }
});

router.post("/", requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const { code, name, description, departmentId } = req.body;
        
        const [createdSubject] = await db
            .insert(subjects)
            .values({ code, name, description, departmentId })
            .returning();
            
        if (!createdSubject) throw Error;
        res.status(200).json({ data: createdSubject });
    } catch (e) {
        console.error(`POST / Subjects error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/:id', async (req, res) => {
    const subjectId = Number(req.params.id);

    if (!Number.isFinite(subjectId)) return res.status(400).json({ error: 'Invalid ID' });

    const [subjectDetails] = await db
        .select({
            ...getTableColumns(subjects),
            department: { ...getTableColumns(departments) }
        })
        .from(subjects)
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(eq(subjects.id, subjectId));

    if (!subjectDetails) return res.status(404).json({ error: 'No Subject Found' });
    res.status(200).json({ data: subjectDetails });
});

router.patch('/:id', requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const subjectId = Number(req.params.id);
        if (!Number.isFinite(subjectId)) return res.status(400).json({ error: 'Invalid ID' });

        const [updatedSubject] = await db
            .update(subjects)
            .set(req.body)
            .where(eq(subjects.id, subjectId))
            .returning();
            
        if (!updatedSubject) return res.status(404).json({ error: 'Subject not found' });
        res.status(200).json({ data: updatedSubject });
    } catch (e) {
        console.error(`PATCH / Subjects error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete('/:id', requireAuth(["admin"]), async (req, res) => {
    try {
        const subjectId = Number(req.params.id);
        if (!Number.isFinite(subjectId)) return res.status(400).json({ error: 'Invalid ID' });

        await db.delete(subjects).where(eq(subjects.id, subjectId));
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(`DELETE / Subjects error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
