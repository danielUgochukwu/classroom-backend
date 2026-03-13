import type { UserRoles } from "./type";
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
