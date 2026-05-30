import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "./db";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

type DevoteeRow = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  accessCode: string | null;
  village: string | null;
  city: string | null;
  tehsil: string | null;
  district: string | null;
  state: string | null;
  totalJap: string;
  sankalpId: string | null;
  sankalpTitle: string | null;
  targetCount: number | null;
  completedCount: string | null;
  startDate: Date | null;
  endDate: Date | null;
  assignedAt: Date | null;
};

type SankalpProgressRow = {
  id: string;
  title: string;
  devoteeName: string;
  targetCount: number;
  completedCount: string;
  startDate: Date;
  endDate: Date;
  assignedAt: Date;
};

type JapEntryRow = {
  id: string;
  devoteeId: string;
  sankalpId: string | null;
  count: number;
  entryDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  devoteeName: string;
  devoteeEmail: string;
  sankalpTitle: string | null;
  targetCount: number | null;
};

const createDevoteeSchema = z.object({
  name: z.string().min(2),
  email: z.string().trim().email(),
  mobile: z.string().trim().optional().nullable(),
  village: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  tehsil: z.string().trim().optional().nullable(),
  district: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
});

const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const devoteeLoginSchema = z.object({
  mobile: z.string().trim().min(7),
  loginPin: z.string().trim().min(4),
});

const forgotDevoteePinSchema = z.object({
  mobile: z.string().trim().min(7),
});

const createSankalpSchema = z.object({
  devoteeId: z.string().uuid(),
  title: z.string().min(2).default("Jap Sankalp"),
  targetCount: z.coerce.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

const createJapEntrySchema = z.object({
  devoteeId: z.string().uuid(),
  sankalpId: z.string().uuid().optional().nullable(),
  count: z.coerce.number().int().positive(),
  entryDate: z.coerce.date(),
  notes: z.string().optional(),
});

function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => Promise<void>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function progressPercent(completedCount: number, targetCount: number) {
  return Math.min(100, Math.round((completedCount / targetCount) * 100));
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function buildLocationWhere(queryParams: express.Request["query"]) {
  const params: string[] = [];
  const clauses = [`u.role = 'DEVOTEE'`];

  for (const field of ["village", "city", "tehsil", "district", "state"]) {
    const value = queryParams[field];

    if (typeof value === "string" && value.trim()) {
      params.push(value.trim());
      clauses.push(`LOWER(u."${field}") = LOWER($${params.length})`);
    }
  }

  return {
    params,
    whereSql: clauses.join(" AND "),
  };
}

function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function jwtSecret() {
  return process.env.JWT_SECRET || "dev-jap-tracker-secret";
}

function signToken(payload: { id: string; role: "ADMIN" | "DEVOTEE"; email: string }) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "7d" });
}

function getAuthUser(req: express.Request) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  try {
    return jwt.verify(header.slice(7), jwtSecret()) as {
      id: string;
      role: "ADMIN" | "DEVOTEE";
      email: string;
    };
  } catch {
    return null;
  }
}

function requireAuth(role?: "ADMIN" | "DEVOTEE") {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = getAuthUser(req);

    if (!user || (role && user.role !== role)) {
      res.status(401).json({ success: false, message: "Login required" });
      return;
    }

    res.locals.user = user;
    next();
  };
}

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Jap Tracker API Running",
  });
});

app.post(
  "/api/auth/admin/login",
  asyncHandler(async (req, res) => {
    const body = adminLoginSchema.parse(req.body);
    const adminEmail = process.env.ADMIN_EMAIL || "admin@japtracker.local";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (body.email !== adminEmail || body.password !== adminPassword) {
      res.status(401).json({ success: false, message: "Invalid admin login" });
      return;
    }

    res.json({
      success: true,
      data: {
        token: signToken({ id: "admin", role: "ADMIN", email: body.email }),
        user: { id: "admin", role: "ADMIN", email: body.email, name: "Admin" },
      },
    });
  })
);

app.post(
  "/api/auth/devotee/login",
  asyncHandler(async (req, res) => {
    const body = devoteeLoginSchema.parse(req.body);
    const devotee = await query<{
      id: string;
      name: string;
      email: string;
      accessCode: string;
    }>(
      `
        SELECT id, name, email, "accessCode"
        FROM "User"
        WHERE mobile = $1 AND "accessCode" = $2 AND role = 'DEVOTEE'
        LIMIT 1
      `,
      [body.mobile, body.loginPin]
    );

    if (!devotee.rows[0]) {
      res.status(401).json({ success: false, message: "Invalid devotee login" });
      return;
    }

    const row = devotee.rows[0];

    res.json({
      success: true,
      data: {
        token: signToken({ id: row.id, role: "DEVOTEE", email: row.email }),
        user: { id: row.id, role: "DEVOTEE", email: row.email, name: row.name },
      },
    });
  })
);

app.post(
  "/api/auth/devotee/forgot-pin",
  asyncHandler(async (req, res) => {
    forgotDevoteePinSchema.parse(req.body);

    res.json({
      success: true,
      data: {
        message:
          "If this mobile number is registered, please contact ashram admin to reset or receive your login PIN.",
      },
    });
  })
);

app.get(
  "/api/devotees",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const locationFilter = buildLocationWhere(req.query);
    const devotees = await query<DevoteeRow>(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u."accessCode",
        u.village,
        u.city,
        u.tehsil,
        u.district,
        u.state,
        COALESCE(SUM(all_entries.count), 0) AS "totalJap",
        active_sankalp.id AS "sankalpId",
        active_sankalp.title AS "sankalpTitle",
        active_sankalp."targetCount",
        active_sankalp."startDate",
        active_sankalp."endDate",
        active_sankalp."createdAt" AS "assignedAt",
        COALESCE(active_total."completedCount", 0) AS "completedCount"
      FROM "User" u
      LEFT JOIN "JapEntry" all_entries ON all_entries."devoteeId" = u.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM "Sankalp" s
        WHERE s."devoteeId" = u.id AND s.status = 'ACTIVE'
        ORDER BY s."createdAt" DESC
        LIMIT 1
      ) active_sankalp ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(je.count), 0) AS "completedCount"
        FROM "JapEntry" je
        WHERE je."sankalpId" = active_sankalp.id
      ) active_total ON TRUE
      WHERE ${locationFilter.whereSql}
      GROUP BY
        u.id,
        active_sankalp.id,
        active_sankalp.title,
        active_sankalp."targetCount",
        active_sankalp."startDate",
        active_sankalp."endDate",
        active_sankalp."createdAt",
        active_total."completedCount"
      ORDER BY u."createdAt" DESC
    `,
      locationFilter.params
    );

    res.json({
      success: true,
      data: devotees.rows.map((devotee) => {
        const completedCount = Number(devotee.completedCount ?? 0);
        const totalJap = Number(devotee.totalJap);

        return {
          id: devotee.id,
          name: devotee.name,
          email: devotee.email,
          mobile: devotee.mobile,
          accessCode: devotee.accessCode,
          village: devotee.village,
          city: devotee.city,
          tehsil: devotee.tehsil,
          district: devotee.district,
          state: devotee.state,
          totalJap,
          activeSankalp:
            devotee.sankalpId && devotee.targetCount
              ? {
                  id: devotee.sankalpId,
                  title: devotee.sankalpTitle,
                  targetCount: devotee.targetCount,
                  startDate: devotee.startDate,
                  endDate: devotee.endDate,
                  assignedAt: devotee.assignedAt,
                  isCompleted: completedCount >= devotee.targetCount,
                  completedCount,
                  progressPercent: progressPercent(completedCount, devotee.targetCount),
                }
              : null,
        };
      }),
    });
  })
);

app.get(
  "/api/locations/options",
  requireAuth("ADMIN"),
  asyncHandler(async (_req, res) => {
    const locations = await query<{
      state: string | null;
      district: string | null;
      tehsil: string | null;
      village: string | null;
      city: string | null;
    }>(`
      SELECT DISTINCT state, district, tehsil, village, city
      FROM "User"
      WHERE role = 'DEVOTEE'
      ORDER BY state NULLS LAST, district NULLS LAST, tehsil NULLS LAST, village NULLS LAST, city NULLS LAST
    `);

    const options = {
      states: new Set<string>(),
      districts: new Set<string>(),
      tehsils: new Set<string>(),
      villages: new Set<string>(),
      cities: new Set<string>(),
    };

    for (const row of locations.rows) {
      if (row.state) options.states.add(row.state);
      if (row.district) options.districts.add(row.district);
      if (row.tehsil) options.tehsils.add(row.tehsil);
      if (row.village) options.villages.add(row.village);
      if (row.city) options.cities.add(row.city);
    }

    res.json({
      success: true,
      data: {
        states: [...options.states].sort(),
        districts: [...options.districts].sort(),
        tehsils: [...options.tehsils].sort(),
        villages: [...options.villages].sort(),
        cities: [...options.cities].sort(),
      },
    });
  })
);

app.get(
  "/api/devotees/:id",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string; role: "ADMIN" | "DEVOTEE" };

    if (authUser.role === "DEVOTEE" && authUser.id !== req.params.id) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const devotee = await query<DevoteeRow>(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.mobile,
          u."accessCode",
          u.village,
          u.city,
          u.tehsil,
          u.district,
          u.state,
          COALESCE(SUM(all_entries.count), 0) AS "totalJap",
          active_sankalp.id AS "sankalpId",
          active_sankalp.title AS "sankalpTitle",
          active_sankalp."targetCount",
          active_sankalp."startDate",
          active_sankalp."endDate",
          active_sankalp."createdAt" AS "assignedAt",
          COALESCE(active_total."completedCount", 0) AS "completedCount"
        FROM "User" u
        LEFT JOIN "JapEntry" all_entries ON all_entries."devoteeId" = u.id
        LEFT JOIN LATERAL (
          SELECT *
          FROM "Sankalp" s
          WHERE s."devoteeId" = u.id AND s.status = 'ACTIVE'
          ORDER BY s."createdAt" DESC
          LIMIT 1
        ) active_sankalp ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(je.count), 0) AS "completedCount"
          FROM "JapEntry" je
          WHERE je."sankalpId" = active_sankalp.id
        ) active_total ON TRUE
        WHERE u.role = 'DEVOTEE' AND u.id = $1
        GROUP BY
          u.id,
          active_sankalp.id,
          active_sankalp.title,
          active_sankalp."targetCount",
          active_sankalp."startDate",
          active_sankalp."endDate",
          active_sankalp."createdAt",
          active_total."completedCount"
        LIMIT 1
      `,
      [req.params.id]
    );

    if (!devotee.rows[0]) {
      res.status(404).json({ success: false, message: "Devotee not found" });
      return;
    }

    const row = devotee.rows[0];
    const completedCount = Number(row.completedCount ?? 0);

    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        accessCode: authUser.role === "ADMIN" ? row.accessCode : undefined,
        village: row.village,
        city: row.city,
        tehsil: row.tehsil,
        district: row.district,
        state: row.state,
        totalJap: Number(row.totalJap),
        activeSankalp:
          row.sankalpId && row.targetCount
            ? {
                id: row.sankalpId,
                title: row.sankalpTitle,
                targetCount: row.targetCount,
                startDate: row.startDate,
                endDate: row.endDate,
                assignedAt: row.assignedAt,
                isCompleted: completedCount >= row.targetCount,
                completedCount,
                progressPercent: progressPercent(completedCount, row.targetCount),
              }
            : null,
      },
    });
  })
);

app.post(
  "/api/devotees",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = createDevoteeSchema.parse(req.body);
    const devotee = await query(
      `
        INSERT INTO "User" (
          id, name, email, password, role, "accessCode",
          mobile, village, city, tehsil, district, state, "updatedAt"
        )
        VALUES ($1, $2, $3, $4, 'DEVOTEE', $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING
          id, name, email, role, "accessCode",
          mobile, village, city, tehsil, district, state,
          "createdAt", "updatedAt"
      `,
      [
        randomUUID(),
        body.name,
        body.email,
        "devotee-app-login-pending",
        generateAccessCode(),
        optionalText(body.mobile),
        optionalText(body.village),
        optionalText(body.city),
        optionalText(body.tehsil),
        optionalText(body.district),
        optionalText(body.state),
      ]
    );

    res.status(201).json({ success: true, data: devotee.rows[0] });
  })
);

app.post(
  "/api/devotees/:id/reset-pin",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const newPin = generateAccessCode();
    const devotee = await query<{
      id: string;
      name: string;
      email: string;
      mobile: string | null;
      accessCode: string;
    }>(
      `
        UPDATE "User"
        SET "accessCode" = $1, "updatedAt" = NOW()
        WHERE id = $2 AND role = 'DEVOTEE'
        RETURNING id, name, email, mobile, "accessCode"
      `,
      [newPin, req.params.id]
    );

    if (!devotee.rows[0]) {
      res.status(404).json({ success: false, message: "Devotee not found" });
      return;
    }

    res.json({ success: true, data: devotee.rows[0] });
  })
);

app.post(
  "/api/sankalps",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = createSankalpSchema.parse(req.body);

    if (body.endDate <= body.startDate) {
      res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
      return;
    }

    await query(
      `
        UPDATE "Sankalp"
        SET status = 'SUPERSEDED', "updatedAt" = NOW()
        WHERE "devoteeId" = $1 AND status = 'ACTIVE'
      `,
      [body.devoteeId]
    );

    const sankalp = await query(
      `
        INSERT INTO "Sankalp"
          (id, "devoteeId", title, "targetCount", "startDate", "endDate", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `,
      [randomUUID(), body.devoteeId, body.title, body.targetCount, body.startDate, body.endDate]
    );

    res.status(201).json({ success: true, data: sankalp.rows[0] });
  })
);

app.get(
  "/api/jap-entries",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string; role: "ADMIN" | "DEVOTEE" };
    const devoteeId =
      typeof req.query.devoteeId === "string" ? req.query.devoteeId : undefined;
    const scopedDevoteeId = authUser.role === "DEVOTEE" ? authUser.id : devoteeId;

    const params = scopedDevoteeId ? [scopedDevoteeId] : [];
    const entries = await query<JapEntryRow>(
      `
        SELECT
          je.*,
          u.name AS "devoteeName",
          u.email AS "devoteeEmail",
          s.title AS "sankalpTitle",
          s."targetCount"
        FROM "JapEntry" je
        JOIN "User" u ON u.id = je."devoteeId"
        LEFT JOIN "Sankalp" s ON s.id = je."sankalpId"
        ${scopedDevoteeId ? `WHERE je."devoteeId" = $1` : ""}
        ORDER BY je."entryDate" DESC
      `,
      params
    );

    res.json({
      success: true,
      data: entries.rows.map((entry) => ({
        id: entry.id,
        devoteeId: entry.devoteeId,
        sankalpId: entry.sankalpId,
        count: entry.count,
        entryDate: entry.entryDate,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        devotee: {
          id: entry.devoteeId,
          name: entry.devoteeName,
          email: entry.devoteeEmail,
        },
        sankalp: entry.sankalpId
          ? {
              id: entry.sankalpId,
              title: entry.sankalpTitle,
              targetCount: entry.targetCount,
            }
          : null,
      })),
    });
  })
);

app.post(
  "/api/jap-entries",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string; role: "ADMIN" | "DEVOTEE" };
    const body = createJapEntrySchema.parse(req.body);
    const devoteeId = authUser.role === "DEVOTEE" ? authUser.id : body.devoteeId;

    if (authUser.role === "DEVOTEE" && body.devoteeId !== authUser.id) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const entry = await query(
      `
        INSERT INTO "JapEntry"
          (id, "devoteeId", "sankalpId", count, "entryDate", notes, "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `,
      [
        randomUUID(),
        devoteeId,
        body.sankalpId || null,
        body.count,
        body.entryDate,
        body.notes || null,
      ]
    );

    res.status(201).json({ success: true, data: entry.rows[0] });
  })
);

app.get(
  "/api/dashboard",
  requireAuth("ADMIN"),
  asyncHandler(async (_req, res) => {
    const [devotees, totalJap, sankalps] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM "User" WHERE role = 'DEVOTEE'`),
      query<{ total: string }>(`SELECT COALESCE(SUM(count), 0) AS total FROM "JapEntry"`),
      query<SankalpProgressRow>(`
        SELECT
          s.id,
          s.title,
          u.name AS "devoteeName",
          s."targetCount",
          COALESCE(SUM(je.count), 0) AS "completedCount",
          s."startDate",
          s."endDate",
          s."createdAt" AS "assignedAt"
        FROM "Sankalp" s
        JOIN "User" u ON u.id = s."devoteeId"
        LEFT JOIN "JapEntry" je ON je."sankalpId" = s.id
        WHERE s.status = 'ACTIVE'
        GROUP BY s.id, u.name
        ORDER BY s."createdAt" DESC
      `),
    ]);

    const sankalpData = sankalps.rows.map((sankalp) => {
      const completedCount = Number(sankalp.completedCount);

      return {
        id: sankalp.id,
        title: sankalp.title,
        devoteeName: sankalp.devoteeName,
        targetCount: sankalp.targetCount,
        completedCount,
        progressPercent: progressPercent(completedCount, sankalp.targetCount),
        startDate: sankalp.startDate,
        endDate: sankalp.endDate,
        assignedAt: sankalp.assignedAt,
        isCompleted: completedCount >= sankalp.targetCount,
      };
    });

    res.json({
      success: true,
      data: {
        devotees: Number(devotees.rows[0].count),
        totalJap: Number(totalJap.rows[0].total),
        activeSankalps: sankalpData.length,
        completedSankalps: sankalpData.filter(
          (sankalp) => sankalp.completedCount >= sankalp.targetCount
        ).length,
        sankalps: sankalpData,
      },
    });
  })
);

app.get(
  "/api/reports/location",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const locationFilter = buildLocationWhere(req.query);
    const [summary, devotees, grouped] = await Promise.all([
      query<{
        devotees: string;
        totalJap: string;
        activeSankalps: string;
        completedSankalps: string;
      }>(
        `
          WITH devotee_totals AS (
            SELECT
              u.id,
              COALESCE(SUM(je.count), 0) AS total_jap
            FROM "User" u
            LEFT JOIN "JapEntry" je ON je."devoteeId" = u.id
            WHERE ${locationFilter.whereSql}
            GROUP BY u.id
          ),
          active_sankalps AS (
            SELECT
              s.id,
              s."targetCount",
              COALESCE(SUM(je.count), 0) AS completed_count
            FROM "Sankalp" s
            JOIN "User" u ON u.id = s."devoteeId"
            LEFT JOIN "JapEntry" je ON je."sankalpId" = s.id
            WHERE ${locationFilter.whereSql} AND s.status = 'ACTIVE'
            GROUP BY s.id
          )
          SELECT
            (SELECT COUNT(*) FROM devotee_totals) AS devotees,
            (SELECT COALESCE(SUM(total_jap), 0) FROM devotee_totals) AS "totalJap",
            (SELECT COUNT(*) FROM active_sankalps) AS "activeSankalps",
            (
              SELECT COUNT(*)
              FROM active_sankalps
              WHERE completed_count >= "targetCount"
            ) AS "completedSankalps"
        `,
        locationFilter.params
      ),
      query<{
        id: string;
        name: string;
        email: string;
        mobile: string | null;
        village: string | null;
        city: string | null;
        tehsil: string | null;
        district: string | null;
        state: string | null;
        totalJap: string;
        activeTarget: number | null;
        completedCount: string;
      }>(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.mobile,
            u.village,
            u.city,
            u.tehsil,
            u.district,
            u.state,
            COALESCE(SUM(all_entries.count), 0) AS "totalJap",
            active_sankalp."targetCount" AS "activeTarget",
            COALESCE(active_total."completedCount", 0) AS "completedCount"
          FROM "User" u
          LEFT JOIN "JapEntry" all_entries ON all_entries."devoteeId" = u.id
          LEFT JOIN LATERAL (
            SELECT *
            FROM "Sankalp" s
            WHERE s."devoteeId" = u.id AND s.status = 'ACTIVE'
            ORDER BY s."createdAt" DESC
            LIMIT 1
          ) active_sankalp ON TRUE
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(je.count), 0) AS "completedCount"
            FROM "JapEntry" je
            WHERE je."sankalpId" = active_sankalp.id
          ) active_total ON TRUE
          WHERE ${locationFilter.whereSql}
          GROUP BY
            u.id,
            active_sankalp."targetCount",
            active_total."completedCount"
          ORDER BY u.name ASC
        `,
        locationFilter.params
      ),
      query<{
        state: string | null;
        district: string | null;
        tehsil: string | null;
        village: string | null;
        city: string | null;
        devotees: string;
        totalJap: string;
      }>(
        `
          SELECT
            u.state,
            u.district,
            u.tehsil,
            u.village,
            u.city,
            COUNT(DISTINCT u.id) AS devotees,
            COALESCE(SUM(je.count), 0) AS "totalJap"
          FROM "User" u
          LEFT JOIN "JapEntry" je ON je."devoteeId" = u.id
          WHERE ${locationFilter.whereSql}
          GROUP BY u.state, u.district, u.tehsil, u.village, u.city
          ORDER BY devotees DESC, "totalJap" DESC
        `,
        locationFilter.params
      ),
    ]);

    const totals = summary.rows[0];

    res.json({
      success: true,
      data: {
        summary: {
          devotees: Number(totals.devotees),
          totalJap: Number(totals.totalJap),
          activeSankalps: Number(totals.activeSankalps),
          completedSankalps: Number(totals.completedSankalps),
        },
        grouped: grouped.rows.map((row) => ({
          ...row,
          devotees: Number(row.devotees),
          totalJap: Number(row.totalJap),
        })),
        devotees: devotees.rows.map((row) => {
          const completedCount = Number(row.completedCount);

          return {
            ...row,
            totalJap: Number(row.totalJap),
            completedCount,
            progressPercent: row.activeTarget
              ? progressPercent(completedCount, row.activeTarget)
              : 0,
          };
        }),
      },
    });
  })
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({
        success: false,
        message: "A devotee with this email already exists",
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
);

export default app;
