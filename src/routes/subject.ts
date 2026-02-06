import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router();

// GET all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const { search, department } = req.query;
        let { page, limit } = req.query;

        // Handle array values by picking the first element
        const rawPage = Array.isArray(page) ? page[0] : page;
        const rawLimit = Array.isArray(limit) ? limit[0] : limit;

        // Parse and validate page
        const parsedPage = Number.parseInt(String(rawPage), 10);
        const currentPage = (Number.isFinite(parsedPage) && parsedPage >= 1) ? parsedPage : 1;

        // Parse and validate limit with a max cap
        const parsedLimit = Number.parseInt(String(rawLimit), 10);
        const limitPerPage = (Number.isFinite(parsedLimit) && parsedLimit >= 1) ? Math.min(parsedLimit, 100) : 10;

        const skip = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //if search query exists, filter by subjects name OR subject code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            )
        }

        //if department query exists, filter by department
        if (department) {
            filterConditions.push(ilike(departments.name, `%${department}%`))
        }

        // Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number> `count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const subjectList = await db
            .select({
                ...getTableColumns(subjects),
                department: { ...getTableColumns(departments) }
            }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause).orderBy(desc(subjects.createdAt))
            .limit(limitPerPage).offset(skip);

        res.status(200).json({
            data: subjectList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        })

    } catch (e) {
        console.error(`GET /subjects error: ${e}`)
        return res.status(500).json({ error: "Failed to fetch subjects" });
    }
});

export default router; 