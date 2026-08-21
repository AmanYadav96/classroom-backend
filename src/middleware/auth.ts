import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

type AllowedRole = "admin" | "teacher" | "student";

const requireAuth = (allowedRoles?: AllowedRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const role = (session.user as any).role as AllowedRole ?? "student";
      req.user = { role };

      if (allowedRoles?.length && !allowedRoles.includes(role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return next();
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
};

export { requireAuth };
