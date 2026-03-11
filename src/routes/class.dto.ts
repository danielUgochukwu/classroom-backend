import type { ClassStatus, Schedule } from "../db/schema";

export interface CreateClassDto {
    subjectId: number;
    teacherId: string;
    inviteCode: string;
    name: string;
    bannerCldPubId?: string | null;
    bannerUrl?: string | null;
    description?: string | null;
    capacity?: number;
    status?: ClassStatus;
    schedules?: Schedule[];
}

export interface UpdateClassDto {
    subjectId?: number;
    teacherId?: string;
    inviteCode?: string;
    name?: string;
    bannerCldPubId?: string | null;
    bannerUrl?: string | null;
    description?: string | null;
    capacity?: number;
    status?: ClassStatus;
    schedules?: Schedule[];
}
