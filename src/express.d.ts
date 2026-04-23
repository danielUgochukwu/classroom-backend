import type { UserRoles } from "./type.js";
declare global {
  namespace Express {
    interface Request {
      user?: {
        role?: UserRoles;
      };
    }
  }
}
export {};
