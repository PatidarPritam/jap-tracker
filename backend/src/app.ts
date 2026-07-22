import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool, query } from "./db";
import { isPushConfigured, pushPublicKey } from "./push";

const isProduction = process.env.NODE_ENV === "production";
const DEV_JWT_SECRET = "dev-jap-tracker-secret";

/**
 * Resolve the JWT secret once at startup. A missing/default secret is fatal in
 * production (otherwise tokens would be forgeable); allowed with a warning in dev.
 */
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === DEV_JWT_SECRET) {
    if (isProduction) {
      throw new Error("JWT_SECRET must be set to a strong, unique value in production.");
    }
    console.warn("[security] Using insecure default JWT secret (development only).");
    return DEV_JWT_SECRET;
  }
  return secret;
})();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@japtracker.local").toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;

if (isProduction && !ADMIN_PASSWORD_HASH) {
  throw new Error(
    "ADMIN_PASSWORD_HASH (a bcrypt hash) must be set in production. Remove any plaintext ADMIN_PASSWORD."
  );
}
if (!ADMIN_PASSWORD_HASH && !ADMIN_PASSWORD) {
  console.warn(
    "[security] No admin credentials configured; using default password 'admin123' (development only)."
  );
}

const app = express();

if (process.env.TRUST_PROXY) {
  // Required for correct client IPs (rate limiting) behind a reverse proxy.
  app.set("trust proxy", 1);
}

// Restrict CORS to configured origins when provided; otherwise reflect all
// origins (convenient for local dev). We use Bearer tokens, not cookies.
const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (isProduction && !corsOrigins?.length) {
  console.warn("[security] CORS_ORIGIN is not set; all origins are allowed.");
}
app.use(cors(corsOrigins?.length ? { origin: corsOrigins } : {}));
app.use(helmet());
app.use(express.json({ limit: "100kb" }));

type DevoteeRow = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  accessCode: string | null;
  isActive: boolean;
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

/**
 * Single sign-in surface: devotees enter mobile + PIN, admins enter email +
 * password, and the role is resolved server-side from the identifier shape.
 */
const unifiedLoginSchema = z.object({
  identifier: z.string().trim().min(1),
  secret: z.string().min(1),
});

const forgotDevoteePinSchema = z.object({
  mobile: z.string().trim().min(7),
});

/**
 * What a devotee may change about themselves. Name and mobile are absent on
 * purpose: the mobile number is their login, so a typo would lock them out,
 * and the name is the ashram's record. Both stay with the admin.
 */
const updateMeSchema = z.object({
  email: z.string().trim().email(),
  village: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  tehsil: z.string().trim().optional().nullable(),
  district: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const createSankalpSchema = z.object({
  devoteeId: z.string().uuid(),
  title: z.string().min(2).default("Jap Sankalp"),
  targetCount: z.coerce.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

/**
 * What an admin may change about a devotee. Wider than `updateMeSchema` on
 * purpose — name and mobile are the ashram's record to correct, and a
 * registration typo is exactly what this exists to fix.
 */
const updateDevoteeSchema = z.object({
  name: z.string().min(2),
  email: z.string().trim().email(),
  mobile: z.string().trim().optional().nullable(),
  village: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  tehsil: z.string().trim().optional().nullable(),
  district: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
});

/**
 * Sankalp edits. Every field is optional so the client can send just the one
 * being corrected; `status` doubles as the cancel switch.
 */
const updateSankalpSchema = z
  .object({
    title: z.string().min(2).optional(),
    targetCount: z.coerce.number().int().positive().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "CANCELLED", "SUPERSEDED"]).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No fields to update",
  });

/** One CSV row. Kept identical to `createDevoteeSchema` so both paths agree. */
const bulkDevoteeSchema = z.object({
  rows: z.array(createDevoteeSchema).min(1).max(500),
});

const announcementSchema = z.object({
  title: z.string().trim().min(2),
  body: z.string().trim().min(2),
  isPinned: z.coerce.boolean().optional().default(false),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
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

/**
 * Kept to one decimal place. Sankalps run to 100,000 jap over months, so
 * rounding to whole percent showed a devotee 0% for their first few hundred
 * malas — the number never moved and the bar stayed empty.
 */
function progressPercent(completedCount: number, targetCount: number) {
  if (!targetCount) return 0;
  // Floor, not round: 99,999 of 100,000 must not report a completed 100%.
  return Math.min(100, Math.floor((completedCount / targetCount) * 1000) / 10);
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function buildLocationWhere(queryParams: express.Request["query"]) {
  const params: string[] = [];
  // Deactivated devotees stay in the DB for their jap history but must not
  // skew location reports.
  const clauses = [`u.role = 'DEVOTEE'`, `u."isActive" = TRUE`];

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

/**
 * WHERE builder for the paginated devotee list: role + optional location
 * filters + a free-text search across name/email/mobile/PIN/location.
 */
function buildDevoteeFilter(queryParams: express.Request["query"]) {
  const params: unknown[] = [];
  const clauses = [`u.role = 'DEVOTEE'`];

  // Deactivated devotees are hidden unless explicitly asked for, so the admin
  // can still find and reactivate someone.
  if (queryParams.includeInactive !== "true") {
    clauses.push(`u."isActive" = TRUE`);
  }

  for (const field of ["village", "city", "tehsil", "district", "state"]) {
    const value = queryParams[field];
    if (typeof value === "string" && value.trim()) {
      params.push(value.trim());
      clauses.push(`LOWER(u."${field}") = LOWER($${params.length})`);
    }
  }

  const search = typeof queryParams.search === "string" ? queryParams.search.trim() : "";
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    clauses.push(
      `(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.mobile ILIKE $${idx} ` +
        `OR u."accessCode" ILIKE $${idx} OR u.village ILIKE $${idx} OR u.city ILIKE $${idx} ` +
        `OR u.tehsil ILIKE $${idx} OR u.district ILIKE $${idx} OR u.state ILIKE $${idx})`
    );
  }

  return { params, whereSql: clauses.join(" AND ") };
}

/** Parse 1-based page + bounded pageSize from query params. */
function parsePagination(queryParams: express.Request["query"]) {
  const page = Math.max(1, Number(queryParams.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(queryParams.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generate a 6-digit login PIN that is not already in use. The `accessCode`
 * column is UNIQUE, so this avoids hitting the DB constraint on collision.
 */
async function generateUniqueAccessCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateAccessCode();
    const existing = await query<{ id: string }>(
      `SELECT id FROM "User" WHERE "accessCode" = $1 LIMIT 1`,
      [code]
    );
    if (!existing.rows[0]) {
      return code;
    }
  }
  throw new Error("Could not generate a unique login PIN");
}

/** Constant-time string comparison to avoid leaking length/content via timing. */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}

async function verifyAdminPassword(candidate: string): Promise<boolean> {
  if (ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(candidate, ADMIN_PASSWORD_HASH);
  }
  return timingSafeEqualStr(candidate, ADMIN_PASSWORD || "admin123");
}

/**
 * Minimal in-memory fixed-window rate limiter keyed by client IP. Suitable for
 * a single instance; swap for a shared store (Redis) when scaling horizontally.
 */
function rateLimit(options: { windowMs: number; max: number; message: string }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, options.windowMs);
  sweep.unref();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      res.status(429).json({ success: false, message: options.message });
      return;
    }
    next();
  };
}

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

function jwtSecret() {
  return JWT_SECRET;
}

/**
 * Devotees get a long session so the installed app opens straight to their
 * dashboard; admins stay short-lived because the role carries more privilege.
 */
const TOKEN_TTL = {
  ADMIN: "7d",
  DEVOTEE: "90d",
} as const satisfies Record<"ADMIN" | "DEVOTEE", jwt.SignOptions["expiresIn"]>;

function signToken(payload: { id: string; role: "ADMIN" | "DEVOTEE"; email: string }) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: TOKEN_TTL[payload.role] });
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

type AuthSession = {
  token: string;
  user: { id: string; email: string; name: string; role: "ADMIN" | "DEVOTEE" };
};

async function authenticateAdmin(email: string, password: string): Promise<AuthSession | null> {
  const emailMatches = email.toLowerCase() === ADMIN_EMAIL;
  const passwordMatches = await verifyAdminPassword(password);

  if (!emailMatches || !passwordMatches) {
    return null;
  }

  return {
    token: signToken({ id: "admin", role: "ADMIN", email }),
    user: { id: "admin", role: "ADMIN", email, name: "Admin" },
  };
}

async function authenticateDevotee(mobile: string, loginPin: string): Promise<AuthSession | null> {
  const devotee = await query<{ id: string; name: string; email: string }>(
    `
      SELECT id, name, email
      FROM "User"
      WHERE mobile = $1 AND "accessCode" = $2 AND role = 'DEVOTEE'
        AND "isActive" = TRUE
      LIMIT 1
    `,
    [mobile, loginPin]
  );

  const row = devotee.rows[0];
  if (!row) {
    return null;
  }

  return {
    token: signToken({ id: row.id, role: "DEVOTEE", email: row.email }),
    user: { id: row.id, role: "DEVOTEE", email: row.email, name: row.name },
  };
}

/**
 * Unified sign-in. An identifier containing "@" is treated as an admin email;
 * anything else is treated as a devotee mobile number. Failures return the same
 * generic message either way so the endpoint does not reveal which accounts exist.
 */
app.post(
  "/api/auth/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const body = unifiedLoginSchema.parse(req.body);
    const isAdminLogin = body.identifier.includes("@");

    const session = isAdminLogin
      ? await authenticateAdmin(body.identifier, body.secret)
      : await authenticateDevotee(body.identifier, body.secret);

    if (!session) {
      res.status(401).json({
        success: false,
        message: isAdminLogin
          ? "Invalid email or password"
          : "Invalid mobile number or PIN",
      });
      return;
    }

    res.json({ success: true, data: session });
  })
);

app.post(
  "/api/auth/admin/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const body = adminLoginSchema.parse(req.body);
    const session = await authenticateAdmin(body.email, body.password);

    if (!session) {
      res.status(401).json({ success: false, message: "Invalid admin login" });
      return;
    }

    res.json({ success: true, data: session });
  })
);

app.post(
  "/api/auth/devotee/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const body = devoteeLoginSchema.parse(req.body);
    const session = await authenticateDevotee(body.mobile, body.loginPin);

    if (!session) {
      res.status(401).json({ success: false, message: "Invalid devotee login" });
      return;
    }

    res.json({ success: true, data: session });
  })
);

app.post(
  "/api/auth/devotee/forgot-pin",
  loginRateLimit,
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
    const filter = buildDevoteeFilter(req.query);
    const { page, pageSize, offset } = parsePagination(req.query);

    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM "User" u WHERE ${filter.whereSql}`,
      filter.params
    );
    const total = Number(totalResult.rows[0].count);

    const limitIdx = filter.params.length + 1;
    const offsetIdx = filter.params.length + 2;
    const devotees = await query<DevoteeRow>(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.mobile,
        u."accessCode",
        u."isActive",
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
      WHERE ${filter.whereSql}
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
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      [...filter.params, pageSize, offset]
    );

    res.json({
      success: true,
      data: {
        items: devotees.rows.map((devotee) => {
          const completedCount = Number(devotee.completedCount ?? 0);
          const totalJap = Number(devotee.totalJap);

          return {
            id: devotee.id,
            name: devotee.name,
            email: devotee.email,
            mobile: devotee.mobile,
            accessCode: devotee.accessCode,
            isActive: devotee.isActive,
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
        total,
        page,
        pageSize,
      },
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

/**
 * Shared by `/api/devotees/:id` (admin, or a devotee reading their own record)
 * and `/api/me`, which resolves the id from the session instead of the URL.
 */
async function respondWithDevoteeProfile(
  devoteeId: string,
  authUser: { id: string; role: "ADMIN" | "DEVOTEE" },
  res: express.Response
) {
  {
    const devotee = await query<DevoteeRow>(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.mobile,
          u."accessCode",
          u."isActive",
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
      [devoteeId]
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
        isActive: row.isActive,
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
  }
}

app.get(
  "/api/me",
  requireAuth("DEVOTEE"),
  asyncHandler(async (_req, res) => {
    const authUser = res.locals.user as { id: string; role: "ADMIN" | "DEVOTEE" };
    await respondWithDevoteeProfile(authUser.id, authUser, res);
  })
);

app.patch(
  "/api/me",
  requireAuth("DEVOTEE"),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string; role: "ADMIN" | "DEVOTEE" };
    const body = updateMeSchema.parse(req.body);

    const updated = await query<{ id: string }>(
      `
        UPDATE "User"
        SET email = $1, village = $2, city = $3, tehsil = $4, district = $5,
            state = $6, "updatedAt" = NOW()
        WHERE id = $7 AND role = 'DEVOTEE'
        RETURNING id
      `,
      [
        body.email,
        optionalText(body.village),
        optionalText(body.city),
        optionalText(body.tehsil),
        optionalText(body.district),
        optionalText(body.state),
        authUser.id,
      ]
    );

    if (!updated.rows[0]) {
      res.status(404).json({ success: false, message: "Devotee not found" });
      return;
    }

    // Respond with the same shape as GET /api/me so the client can swap it in.
    await respondWithDevoteeProfile(authUser.id, authUser, res);
  })
);

/** The browser needs the VAPID public key before it can subscribe. */
app.get("/api/push/public-key", (_req, res) => {
  res.json({
    success: true,
    data: { publicKey: pushPublicKey(), enabled: isPushConfigured },
  });
});

app.post(
  "/api/push/subscribe",
  requireAuth("DEVOTEE"),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string };
    const body = pushSubscriptionSchema.parse(req.body);

    // Re-subscribing on the same device must not create a duplicate row, and
    // the endpoint may have previously belonged to another devotee on a
    // shared phone — so take ownership on conflict.
    await query(
      `
        INSERT INTO "PushSubscription" (id, "devoteeId", endpoint, p256dh, auth)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (endpoint) DO UPDATE
        SET "devoteeId" = EXCLUDED."devoteeId",
            p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth
      `,
      [randomUUID(), authUser.id, body.endpoint, body.keys.p256dh, body.keys.auth]
    );

    res.status(201).json({ success: true, data: { subscribed: true } });
  })
);

app.post(
  "/api/push/unsubscribe",
  requireAuth("DEVOTEE"),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string };
    const body = pushUnsubscribeSchema.parse(req.body);

    await query(`DELETE FROM "PushSubscription" WHERE endpoint = $1 AND "devoteeId" = $2`, [
      body.endpoint,
      authUser.id,
    ]);

    res.json({ success: true, data: { subscribed: false } });
  })
);

/** Whether this device's subscription is currently registered. */
app.get(
  "/api/push/status",
  requireAuth("DEVOTEE"),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { id: string };
    const endpoint = String(req.query.endpoint ?? "");

    const existing = await query<{ id: string }>(
      `SELECT id FROM "PushSubscription" WHERE endpoint = $1 AND "devoteeId" = $2 LIMIT 1`,
      [endpoint, authUser.id]
    );

    res.json({
      success: true,
      data: { subscribed: Boolean(existing.rows[0]), enabled: isPushConfigured },
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

    await respondWithDevoteeProfile(String(req.params.id), authUser, res);
  })
);

app.post(
  "/api/devotees",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = createDevoteeSchema.parse(req.body);
    const accessCode = await generateUniqueAccessCode();
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
        accessCode,
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

/**
 * Correct a devotee's record. Registration typos in the name or mobile were
 * previously permanent — the devotee's own `PATCH /api/me` deliberately can't
 * touch either field, so this is the only place they can be fixed.
 */
app.patch(
  "/api/devotees/:id",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = updateDevoteeSchema.parse(req.body);

    // Email is UNIQUE; report the clash rather than leaking a 500.
    const clash = await query<{ id: string }>(
      `SELECT id FROM "User" WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [body.email, req.params.id]
    );
    if (clash.rows[0]) {
      res.status(409).json({ success: false, message: "That email is already registered" });
      return;
    }

    const updated = await query<{ id: string }>(
      `
        UPDATE "User"
        SET name = $1, email = $2, mobile = $3, village = $4, city = $5,
            tehsil = $6, district = $7, state = $8, "updatedAt" = NOW()
        WHERE id = $9 AND role = 'DEVOTEE'
        RETURNING id
      `,
      [
        body.name,
        body.email,
        optionalText(body.mobile),
        optionalText(body.village),
        optionalText(body.city),
        optionalText(body.tehsil),
        optionalText(body.district),
        optionalText(body.state),
        req.params.id,
      ]
    );

    if (!updated.rows[0]) {
      res.status(404).json({ success: false, message: "Devotee not found" });
      return;
    }

    const authUser = res.locals.user as { id: string; role: "ADMIN" | "DEVOTEE" };
    // Same shape as GET /api/devotees/:id so the client can swap it straight in.
    await respondWithDevoteeProfile(String(req.params.id), authUser, res);
  })
);

/**
 * Deactivate or reactivate a devotee. Deliberately not a DELETE: the FK from
 * JapEntry cascades, so removing the row would erase the record of jap they
 * already offered. This only takes them out of the lists and blocks login.
 */
app.patch(
  "/api/devotees/:id/status",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const { isActive } = z.object({ isActive: z.coerce.boolean() }).parse(req.body);

    const updated = await query<{ id: string; name: string; isActive: boolean }>(
      `
        UPDATE "User"
        SET "isActive" = $1, "updatedAt" = NOW()
        WHERE id = $2 AND role = 'DEVOTEE'
        RETURNING id, name, "isActive"
      `,
      [isActive, req.params.id]
    );

    if (!updated.rows[0]) {
      res.status(404).json({ success: false, message: "Devotee not found" });
      return;
    }

    // A deactivated devotee should not keep receiving daily jap reminders.
    if (!isActive) {
      await query(`DELETE FROM "PushSubscription" WHERE "devoteeId" = $1`, [req.params.id]);
    }

    res.json({ success: true, data: updated.rows[0] });
  })
);

/**
 * CSV-backed bulk registration. Runs in a single transaction: a partial import
 * would leave the admin guessing which of 200 rows landed, so either every row
 * is created or none are, and the failing row index is reported back.
 */
app.post(
  "/api/devotees/bulk",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const { rows } = bulkDevoteeSchema.parse(req.body);

    // Catch duplicates within the upload itself — Postgres would only report
    // the first one, and the admin needs to fix the file, not guess.
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const email = row.email.toLowerCase();
      if (seen.has(email)) {
        res.status(400).json({
          success: false,
          message: `Row ${index + 1}: "${row.email}" appears more than once in the file`,
        });
        return;
      }
      seen.add(email);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const created: unknown[] = [];

      for (const [index, row] of rows.entries()) {
        const existing = await client.query(
          `SELECT id FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [row.email]
        );
        if (existing.rows[0]) {
          await client.query("ROLLBACK");
          res.status(409).json({
            success: false,
            message: `Row ${index + 1}: "${row.email}" is already registered. No devotees were imported.`,
          });
          return;
        }

        // Reuse the collision-checked generator so PINs stay unique.
        const accessCode = await generateUniqueAccessCode();
        const inserted = await client.query(
          `
            INSERT INTO "User" (
              id, name, email, password, role, "accessCode",
              mobile, village, city, tehsil, district, state, "updatedAt"
            )
            VALUES ($1, $2, $3, $4, 'DEVOTEE', $5, $6, $7, $8, $9, $10, $11, NOW())
            RETURNING id, name, email, "accessCode", mobile, village, city, tehsil, district, state
          `,
          [
            randomUUID(),
            row.name,
            row.email,
            "devotee-app-login-pending",
            accessCode,
            optionalText(row.mobile),
            optionalText(row.village),
            optionalText(row.city),
            optionalText(row.tehsil),
            optionalText(row.district),
            optionalText(row.state),
          ]
        );
        created.push(inserted.rows[0]);
      }

      await client.query("COMMIT");
      res.status(201).json({ success: true, data: { imported: created.length, devotees: created } });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

app.post(
  "/api/devotees/:id/reset-pin",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const newPin = await generateUniqueAccessCode();
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

/**
 * Full sankalp history — active, completed, cancelled and superseded. The
 * dashboard only ever exposed the current active one, so past sankalps were
 * invisible even though the rows were right there.
 */
app.get(
  "/api/sankalps",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = parsePagination(req.query);
    const params: unknown[] = [];
    const clauses: string[] = [];

    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    if (status && status !== "ALL") {
      params.push(status);
      clauses.push(`s.status = $${params.length}`);
    }

    const devoteeId = typeof req.query.devoteeId === "string" ? req.query.devoteeId.trim() : "";
    if (devoteeId) {
      params.push(devoteeId);
      clauses.push(`s."devoteeId" = $${params.length}`);
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(u.name ILIKE $${params.length} OR s.title ILIKE $${params.length})`);
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const [rows, total] = await Promise.all([
      query<{
        id: string;
        devoteeId: string;
        devoteeName: string;
        title: string;
        targetCount: number;
        completedCount: string;
        startDate: Date;
        endDate: Date;
        status: string;
        createdAt: Date;
      }>(
        `
          SELECT
            s.id, s."devoteeId", u.name AS "devoteeName", s.title,
            s."targetCount", s."startDate", s."endDate", s.status, s."createdAt",
            COALESCE((
              SELECT SUM(j.count) FROM "JapEntry" j WHERE j."sankalpId" = s.id
            ), 0) AS "completedCount"
          FROM "Sankalp" s
          JOIN "User" u ON u.id = s."devoteeId"
          ${whereSql}
          ORDER BY s."createdAt" DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, pageSize, offset]
      ),
      query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM "Sankalp" s
          JOIN "User" u ON u.id = s."devoteeId"
          ${whereSql}
        `,
        params
      ),
    ]);

    const items = rows.rows.map((row) => {
      const completedCount = Number(row.completedCount);
      return {
        ...row,
        completedCount,
        progressPercent: progressPercent(completedCount, row.targetCount),
        isCompleted: completedCount >= row.targetCount,
      };
    });

    res.json({
      success: true,
      data: { items, total: Number(total.rows[0]?.count ?? 0), page, pageSize },
    });
  })
);

/**
 * Edit or cancel a sankalp. A mistyped target (10,00,000 instead of 1,00,000)
 * previously had no way back — the only option was assigning a fresh sankalp,
 * which silently superseded the original and orphaned its progress.
 */
app.patch(
  "/api/sankalps/:id",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = updateSankalpSchema.parse(req.body);

    const existing = await query<{
      id: string;
      devoteeId: string;
      startDate: Date;
      endDate: Date;
      status: string;
    }>(`SELECT id, "devoteeId", "startDate", "endDate", status FROM "Sankalp" WHERE id = $1`, [
      req.params.id,
    ]);
    const current = existing.rows[0];

    if (!current) {
      res.status(404).json({ success: false, message: "Sankalp not found" });
      return;
    }

    // Validate against the merged result, not just the incoming fields — a lone
    // startDate edit can still invert the range.
    const startDate = body.startDate ?? current.startDate;
    const endDate = body.endDate ?? current.endDate;
    if (endDate <= startDate) {
      res.status(400).json({ success: false, message: "End date must be after start date" });
      return;
    }

    // One ACTIVE sankalp per devotee is an invariant the assign flow relies on.
    if (body.status === "ACTIVE" && current.status !== "ACTIVE") {
      const active = await query<{ id: string }>(
        `SELECT id FROM "Sankalp" WHERE "devoteeId" = $1 AND status = 'ACTIVE' AND id <> $2 LIMIT 1`,
        [current.devoteeId, current.id]
      );
      if (active.rows[0]) {
        res.status(409).json({
          success: false,
          message: "This devotee already has an active sankalp. Cancel it first.",
        });
        return;
      }
    }

    const updated = await query(
      `
        UPDATE "Sankalp"
        SET title = COALESCE($1, title),
            "targetCount" = COALESCE($2, "targetCount"),
            "startDate" = COALESCE($3, "startDate"),
            "endDate" = COALESCE($4, "endDate"),
            status = COALESCE($5, status),
            "updatedAt" = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        body.title ?? null,
        body.targetCount ?? null,
        body.startDate ?? null,
        body.endDate ?? null,
        body.status ?? null,
        req.params.id,
      ]
    );

    res.json({ success: true, data: updated.rows[0] });
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

/**
 * Notice board. Devotees see only live notices (published, not expired);
 * admins get everything so they can manage scheduled and retired ones.
 */
app.get(
  "/api/announcements",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const authUser = res.locals.user as { role: "ADMIN" | "DEVOTEE" };
    const isAdminView = authUser.role === "ADMIN" && req.query.all === "true";

    const whereSql = isAdminView
      ? ""
      : `WHERE "publishedAt" <= NOW() AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`;

    const rows = await query(
      `
        SELECT id, title, body, "isPinned", "publishedAt", "expiresAt", "createdAt", "updatedAt"
        FROM "Announcement"
        ${whereSql}
        ORDER BY "isPinned" DESC, "publishedAt" DESC
        LIMIT 100
      `
    );

    res.json({ success: true, data: rows.rows });
  })
);

app.post(
  "/api/announcements",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = announcementSchema.parse(req.body);

    const created = await query(
      `
        INSERT INTO "Announcement" (id, title, body, "isPinned", "publishedAt", "expiresAt", "updatedAt")
        VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6, NOW())
        RETURNING *
      `,
      [
        randomUUID(),
        body.title,
        body.body,
        body.isPinned,
        body.publishedAt ?? null,
        body.expiresAt ?? null,
      ]
    );

    res.status(201).json({ success: true, data: created.rows[0] });
  })
);

app.patch(
  "/api/announcements/:id",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = announcementSchema.partial().parse(req.body);

    const updated = await query(
      `
        UPDATE "Announcement"
        SET title = COALESCE($1, title),
            body = COALESCE($2, body),
            "isPinned" = COALESCE($3, "isPinned"),
            "publishedAt" = COALESCE($4, "publishedAt"),
            "expiresAt" = $5,
            "updatedAt" = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        body.title ?? null,
        body.body ?? null,
        body.isPinned ?? null,
        body.publishedAt ?? null,
        // Nullable by design: clearing the expiry makes a notice permanent.
        body.expiresAt ?? null,
        req.params.id,
      ]
    );

    if (!updated.rows[0]) {
      res.status(404).json({ success: false, message: "Announcement not found" });
      return;
    }

    res.json({ success: true, data: updated.rows[0] });
  })
);

app.delete(
  "/api/announcements/:id",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const deleted = await query<{ id: string }>(
      `DELETE FROM "Announcement" WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (!deleted.rows[0]) {
      res.status(404).json({ success: false, message: "Announcement not found" });
      return;
    }

    res.json({ success: true, data: deleted.rows[0] });
  })
);

app.get(
  "/api/dashboard",
  requireAuth("ADMIN"),
  asyncHandler(async (_req, res) => {
    const [devotees, totalJap, sankalps] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) FROM "User" WHERE role = 'DEVOTEE' AND "isActive" = TRUE`
      ),
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

/**
 * Movement, not just totals: the dashboard counters answer "how much" but
 * never "is it growing". Daily series + this/last month + top devotees.
 */
app.get(
  "/api/reports/trends",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));

    const [daily, months, top] = await Promise.all([
      // generate_series so days with no jap come back as 0 rather than being
      // missing — otherwise the chart silently compresses quiet stretches.
      query<{ day: Date; total: string }>(
        `
          SELECT d.day::date AS day, COALESCE(SUM(j.count), 0) AS total
          FROM generate_series(
            CURRENT_DATE - ($1 || ' days')::interval,
            CURRENT_DATE,
            '1 day'
          ) AS d(day)
          LEFT JOIN "JapEntry" j ON j."entryDate"::date = d.day::date
          GROUP BY d.day
          ORDER BY d.day ASC
        `,
        [String(days - 1)]
      ),
      query<{ thisMonth: string; lastMonth: string; activeDevotees: string }>(
        `
          SELECT
            COALESCE(SUM(count) FILTER (
              WHERE "entryDate" >= date_trunc('month', CURRENT_DATE)
            ), 0) AS "thisMonth",
            COALESCE(SUM(count) FILTER (
              WHERE "entryDate" >= date_trunc('month', CURRENT_DATE) - interval '1 month'
                AND "entryDate" < date_trunc('month', CURRENT_DATE)
            ), 0) AS "lastMonth",
            COUNT(DISTINCT "devoteeId") FILTER (
              WHERE "entryDate" >= date_trunc('month', CURRENT_DATE)
            ) AS "activeDevotees"
          FROM "JapEntry"
        `
      ),
      query<{ id: string; name: string; total: string }>(
        `
          SELECT u.id, u.name, COALESCE(SUM(j.count), 0) AS total
          FROM "User" u
          JOIN "JapEntry" j ON j."devoteeId" = u.id
          WHERE u.role = 'DEVOTEE' AND u."isActive" = TRUE
            AND j."entryDate" >= date_trunc('month', CURRENT_DATE)
          GROUP BY u.id, u.name
          ORDER BY total DESC
          LIMIT 5
        `
      ),
    ]);

    const summary = months.rows[0];
    const thisMonth = Number(summary?.thisMonth ?? 0);
    const lastMonth = Number(summary?.lastMonth ?? 0);

    res.json({
      success: true,
      data: {
        days,
        daily: daily.rows.map((row) => ({
          date: row.day.toISOString().slice(0, 10),
          count: Number(row.total),
        })),
        thisMonth,
        lastMonth,
        activeDevotees: Number(summary?.activeDevotees ?? 0),
        // Null rather than 0 when there's no baseline — "+100%" from nothing
        // would be misleading, so the UI hides the delta instead.
        changePercent:
          lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
        topDevotees: top.rows.map((row) => ({
          id: row.id,
          name: row.name,
          total: Number(row.total),
        })),
      },
    });
  })
);

app.get(
  "/api/reports/expiring",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    // Default window is a month — long enough for the ashram to actually call
    // the devotee before the sankalp lapses.
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));

    const rows = await query<{
      id: string;
      devoteeId: string;
      devoteeName: string;
      mobile: string | null;
      title: string;
      targetCount: number;
      completedCount: string;
      endDate: Date;
      daysLeft: string;
    }>(
      `
        SELECT
          s.id, s."devoteeId", u.name AS "devoteeName", u.mobile,
          s.title, s."targetCount", s."endDate",
          COALESCE((SELECT SUM(j.count) FROM "JapEntry" j WHERE j."sankalpId" = s.id), 0)
            AS "completedCount",
          -- Negative when already past the end date; the UI flags those.
          (s."endDate"::date - CURRENT_DATE) AS "daysLeft"
        FROM "Sankalp" s
        JOIN "User" u ON u.id = s."devoteeId"
        WHERE s.status = 'ACTIVE' AND u."isActive" = TRUE
          AND s."endDate" <= CURRENT_DATE + ($1 || ' days')::interval
        ORDER BY s."endDate" ASC
        LIMIT 100
      `,
      [String(days)]
    );

    // Finished sankalps aren't a follow-up: the devotee already hit the target.
    const items = rows.rows
      .map((row) => {
        const completedCount = Number(row.completedCount);
        return {
          ...row,
          completedCount,
          daysLeft: Number(row.daysLeft),
          progressPercent: progressPercent(completedCount, row.targetCount),
          isCompleted: completedCount >= row.targetCount,
        };
      })
      .filter((row) => !row.isCompleted);

    res.json({ success: true, data: { items, days } });
  })
);

app.get(
  "/api/reports/inactive",
  requireAuth("ADMIN"),
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 15));

    const rows = await query<{
      id: string;
      name: string;
      mobile: string | null;
      village: string | null;
      city: string | null;
      tehsil: string | null;
      district: string | null;
      state: string | null;
      lastEntryDate: Date | null;
      daysSince: string | null;
      totalJap: string;
      hasActiveSankalp: boolean;
    }>(
      `
        WITH last_entry AS (
          SELECT
            "devoteeId",
            MAX("entryDate") AS last_date,
            COALESCE(SUM(count), 0) AS total_jap
          FROM "JapEntry"
          GROUP BY "devoteeId"
        )
        SELECT
          u.id, u.name, u.mobile, u.village, u.city, u.tehsil, u.district, u.state,
          le.last_date AS "lastEntryDate",
          (CURRENT_DATE - le.last_date::date) AS "daysSince",
          COALESCE(le.total_jap, 0) AS "totalJap",
          EXISTS (
            SELECT 1 FROM "Sankalp" s
            WHERE s."devoteeId" = u.id AND s.status = 'ACTIVE'
          ) AS "hasActiveSankalp"
        FROM "User" u
        LEFT JOIN last_entry le ON le."devoteeId" = u.id
        WHERE u.role = 'DEVOTEE' AND u."isActive" = TRUE
          -- Never recorded anything, or nothing recently.
          AND (le.last_date IS NULL OR le.last_date < CURRENT_DATE - ($1 || ' days')::interval)
        -- NULLs last: devotees who never started are the coldest leads, but the
        -- ones who stopped recently are the most likely to come back.
        ORDER BY le.last_date DESC NULLS LAST
        LIMIT 200
      `,
      [String(days)]
    );

    const items = rows.rows.map((row) => ({
      ...row,
      totalJap: Number(row.totalJap),
      daysSince: row.daysSince === null ? null : Number(row.daysSince),
    }));

    res.json({
      success: true,
      data: {
        items,
        days,
        neverStarted: items.filter((row) => row.lastEntryDate === null).length,
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
      const constraint = (error as { constraint?: string }).constraint;
      res.status(409).json({
        success: false,
        message:
          constraint === "User_accessCode_key"
            ? "Could not generate a unique login PIN. Please try again."
            : "A devotee with this email already exists",
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
