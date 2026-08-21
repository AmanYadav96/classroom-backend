import { and, desc, eq, getTableColumns, ilike, or, sql, type SQL } from "drizzle-orm";
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { departments } from "../db/schema/index.js";
import { db } from "../db/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

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
                    ilike(departments.name, `%${search}%`),
                    ilike(departments.code, `%${search}%`)
                )
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(departments)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const departmentsList = await db
            .select({ ...getTableColumns(departments) })
            .from(departments)
            .where(whereClause)
            .orderBy(desc(departments.createdAt))
            .offset(offset)
            .limit(limitPerPage);

        res.status(200).json({
            data: departmentsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    } catch (error) {
        console.error("Error fetching departments:", error);
        res.status(500).json({ error: "Failed to get Departments" });
    }
});

router.post("/", requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const { code, name, description } = req.body;

        const [createdDepartment] = await db
            .insert(departments)
            .values({ code, name, description })
            .returning();
            
        if (!createdDepartment) throw Error;
        res.status(200).json({ data: createdDepartment });
    } catch (e) {
        console.error(`POST / Departments error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/:id', async (req, res) => {
    const departmentId = Number(req.params.id);

    if (!Number.isFinite(departmentId)) return res.status(400).json({ error: 'Invalid ID' });

    const [departmentDetails] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, departmentId));

    if (!departmentDetails) return res.status(404).json({ error: 'No Department Found' });
    res.status(200).json({ data: departmentDetails });
});

router.patch('/:id', requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const departmentId = Number(req.params.id);
        if (!Number.isFinite(departmentId)) return res.status(400).json({ error: 'Invalid ID' });

        const [updatedDepartment] = await db
            .update(departments)
            .set(req.body)
            .where(eq(departments.id, departmentId))
            .returning();
            
        if (!updatedDepartment) return res.status(404).json({ error: 'Department not found' });
        res.status(200).json({ data: updatedDepartment });
    } catch (e) {
        console.error(`PATCH / Departments error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete('/:id', requireAuth(["admin"]), async (req, res) => {
    try {
        const departmentId = Number(req.params.id);
        if (!Number.isFinite(departmentId)) return res.status(400).json({ error: 'Invalid ID' });

        await db.delete(departments).where(eq(departments.id, departmentId));
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(`DELETE / Departments error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
