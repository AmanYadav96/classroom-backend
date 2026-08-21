import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { user } from "../db/schema/index.js";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/index.js";

const router = express.Router();

// Define your user-related routes here get all
// users with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const { search, role, page = 1, limit = 10 } = req.query;

        const MAX_LIMIT = 100;
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const currentPage = Number.isFinite(parsedPage) ? Math.max(1, Math.trunc(parsedPage)) : 1;
        const limitPerPage = Number.isFinite(parsedLimit)
            ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(parsedLimit)))
            : 10;
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // if search query is provided, add it to the filter conditions
        // user name or email should match the search term
        if (search) {
            filterConditions.push(
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`)
                )
            );
        }

        // if role is provided, add it to the filter conditions
        // match the role exactly
        if (role) {
            filterConditions.push(eq(user.role, role as any));
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const usersList = await db
            .select({
                ...getTableColumns(user)
            })
            .from(user)
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .offset(offset)
            .limit(limitPerPage);

        res.status(200).json({
            data: usersList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to get users" });
    }
});

router.post("/", requireAuth(["admin"]), async (req, res) => {
    try {
        const { name, email, role, image, emailVerified } = req.body;
        
        const [createdUser] = await db
            .insert(user)
            .values({
                id: typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}`,
                name,
                email,
                emailVerified: Boolean(emailVerified),
                role: role ?? "student",
                image,
            })
            .returning();
            
        if (!createdUser) throw Error;
        res.status(200).json({ data: createdUser });
    } catch (e) {
        console.error(`POST / Users error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/:id', async (req, res) => {
    const userId = req.params.id;

    if (!userId) return res.status(400).json({ error: 'Invalid ID' });

    const [userDetails] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId as string));

    if (!userDetails) return res.status(404).json({ error: 'No User Found' });
    res.status(200).json({ data: userDetails });
});

router.patch('/:id', requireAuth(["admin","teacher"]), async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) return res.status(400).json({ error: 'Invalid ID' });

        const [updatedUser] = await db
            .update(user)
            .set({ ...req.body, updatedAt: new Date() })
            .where(eq(user.id, sql`${userId}`))
            .returning();
            
        if (!updatedUser) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ data: updatedUser });
    } catch (e) {
        console.error(`PATCH / Users error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.delete('/:id', requireAuth(["admin"]), async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'Invalid ID' });

        await db.delete(user).where(eq(user.id, userId as string));
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(`DELETE / Users error ${e}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
