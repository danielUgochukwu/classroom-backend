import { eq } from "drizzle-orm";
import express from "express";
import { db } from "../db";
import { classes, classStatusEnum, subjects, user, type ClassStatus, type Schedule } from "../db/schema";
import type { CreateClassDto, UpdateClassDto } from "./class.dto";

const router = express.Router();

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const isPositiveInteger = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value > 0;

const isNullableString = (value: unknown): value is string | null =>
    value === null || typeof value === "string";

const isClassStatus = (value: unknown): value is ClassStatus =>
    typeof value === "string" && classStatusEnum.enumValues.includes(value as ClassStatus);

const isValidSchedule = (value: unknown): value is Schedule => {
    if (!isObject(value)) {
        return false;
    }

    if (!isNonEmptyString(value.day) || !isNonEmptyString(value.startTime) || !isNonEmptyString(value.endTime)) {
        return false;
    }

    if (!Object.hasOwn(value, "location")) {
        return true;
    }

    return value.location === undefined || isNonEmptyString(value.location);
};

const isValidSchedules = (value: unknown): value is Schedule[] =>
    Array.isArray(value) && value.every(isValidSchedule);

const parseCreateClassDto = (payload: unknown): { data?: CreateClassDto; error?: string } => {
    if (!isObject(payload)) {
        return { error: "Request body must be an object." };
    }

    if (!isPositiveInteger(payload.subjectId)) {
        return { error: "subjectId must be a positive integer." };
    }

    if (!isNonEmptyString(payload.teacherId)) {
        return { error: "teacherId must be a non-empty string." };
    }

    if (!isNonEmptyString(payload.inviteCode)) {
        return { error: "inviteCode must be a non-empty string." };
    }

    if (!isNonEmptyString(payload.name)) {
        return { error: "name must be a non-empty string." };
    }

    const dto: CreateClassDto = {
        subjectId: payload.subjectId,
        teacherId: payload.teacherId,
        inviteCode: payload.inviteCode,
        name: payload.name,
    };

    if (Object.hasOwn(payload, "bannerCldPubId")) {
        if (!isNullableString(payload.bannerCldPubId)) {
            return { error: "bannerCldPubId must be a string or null." };
        }
        dto.bannerCldPubId = payload.bannerCldPubId;
    }

    if (Object.hasOwn(payload, "bannerUrl")) {
        if (!isNullableString(payload.bannerUrl)) {
            return { error: "bannerUrl must be a string or null." };
        }
        dto.bannerUrl = payload.bannerUrl;
    }

    if (Object.hasOwn(payload, "description")) {
        if (!isNullableString(payload.description)) {
            return { error: "description must be a string or null." };
        }
        dto.description = payload.description;
    }

    if (Object.hasOwn(payload, "capacity")) {
        if (!isPositiveInteger(payload.capacity)) {
            return { error: "capacity must be a positive integer." };
        }
        dto.capacity = payload.capacity;
    }

    if (Object.hasOwn(payload, "status")) {
        if (!isClassStatus(payload.status)) {
            return { error: "status must be one of: active, inactive, archived." };
        }
        dto.status = payload.status;
    }

    if (Object.hasOwn(payload, "schedules")) {
        if (!isValidSchedules(payload.schedules)) {
            return { error: "schedules must be an array of { day, startTime, endTime, location? }." };
        }
        dto.schedules = payload.schedules;
    }

    return { data: dto };
};

const parseUpdateClassDto = (payload: unknown): { data?: UpdateClassDto; error?: string } => {
    if (!isObject(payload)) {
        return { error: "Request body must be an object." };
    }

    const dto: UpdateClassDto = {};

    if (Object.hasOwn(payload, "subjectId")) {
        if (!isPositiveInteger(payload.subjectId)) {
            return { error: "subjectId must be a positive integer." };
        }
        dto.subjectId = payload.subjectId;
    }

    if (Object.hasOwn(payload, "teacherId")) {
        if (!isNonEmptyString(payload.teacherId)) {
            return { error: "teacherId must be a non-empty string." };
        }
        dto.teacherId = payload.teacherId;
    }

    if (Object.hasOwn(payload, "inviteCode")) {
        if (!isNonEmptyString(payload.inviteCode)) {
            return { error: "inviteCode must be a non-empty string." };
        }
        dto.inviteCode = payload.inviteCode;
    }

    if (Object.hasOwn(payload, "name")) {
        if (!isNonEmptyString(payload.name)) {
            return { error: "name must be a non-empty string." };
        }
        dto.name = payload.name;
    }

    if (Object.hasOwn(payload, "bannerCldPubId")) {
        if (!isNullableString(payload.bannerCldPubId)) {
            return { error: "bannerCldPubId must be a string or null." };
        }
        dto.bannerCldPubId = payload.bannerCldPubId;
    }

    if (Object.hasOwn(payload, "bannerUrl")) {
        if (!isNullableString(payload.bannerUrl)) {
            return { error: "bannerUrl must be a string or null." };
        }
        dto.bannerUrl = payload.bannerUrl;
    }

    if (Object.hasOwn(payload, "description")) {
        if (!isNullableString(payload.description)) {
            return { error: "description must be a string or null." };
        }
        dto.description = payload.description;
    }

    if (Object.hasOwn(payload, "capacity")) {
        if (!isPositiveInteger(payload.capacity)) {
            return { error: "capacity must be a positive integer." };
        }
        dto.capacity = payload.capacity;
    }

    if (Object.hasOwn(payload, "status")) {
        if (!isClassStatus(payload.status)) {
            return { error: "status must be one of: active, inactive, archived." };
        }
        dto.status = payload.status;
    }

    if (Object.hasOwn(payload, "schedules")) {
        if (!isValidSchedules(payload.schedules)) {
            return { error: "schedules must be an array of { day, startTime, endTime, location? }." };
        }
        dto.schedules = payload.schedules;
    }

    if (Object.keys(dto).length === 0) {
        return { error: "Provide at least one field to update." };
    }

    return { data: dto };
};

const subjectExists = async (subjectId: number): Promise<boolean> => {
    const result = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    return result.length > 0;
};

const isTeacherRoleAllowed = async (teacherId: string): Promise<boolean> => {
    const result = await db.select({ role: user.role }).from(user).where(eq(user.id, teacherId)).limit(1);
    const teacher = result[0];

    if (!teacher) {
        return false;
    }

    return teacher.role === "teacher" || teacher.role === "admin";
};

router.post("/", async (req, res) => {
    try {
        const { data, error } = parseCreateClassDto(req.body);
        if (error || !data) {
            return res.status(400).json({ error: error ?? "Invalid request body." });
        }

        const doesSubjectExist = await subjectExists(data.subjectId);
        if (!doesSubjectExist) {
            return res.status(400).json({ error: "subjectId does not reference an existing subject." });
        }

        const canAssignTeacher = await isTeacherRoleAllowed(data.teacherId);
        if (!canAssignTeacher) {
            return res.status(400).json({ error: "teacherId must reference a user with role 'teacher' or 'admin'." });
        }

        const createdClass = await db.insert(classes).values(data).returning();
        return res.status(201).json({ data: createdClass[0] });
    } catch (e) {
        console.error(`POST /classes error: ${e}`);
        return res.status(500).json({ error: "Failed to create class." });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const classId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({ error: "Class id must be a positive integer." });
        }

        const { data, error } = parseUpdateClassDto(req.body);
        if (error || !data) {
            return res.status(400).json({ error: error ?? "Invalid request body." });
        }

        if (data.subjectId !== undefined) {
            const doesSubjectExist = await subjectExists(data.subjectId);
            if (!doesSubjectExist) {
                return res.status(400).json({ error: "subjectId does not reference an existing subject." });
            }
        }

        if (data.teacherId !== undefined) {
            const canAssignTeacher = await isTeacherRoleAllowed(data.teacherId);
            if (!canAssignTeacher) {
                return res.status(400).json({ error: "teacherId must reference a user with role 'teacher' or 'admin'." });
            }
        }

        const updatedClass = await db
            .update(classes)
            .set(data)
            .where(eq(classes.id, classId))
            .returning();

        if (updatedClass.length === 0) {
            return res.status(404).json({ error: "Class not found." });
        }

        return res.status(200).json({ data: updatedClass[0] });
    } catch (e) {
        console.error(`PUT /classes/:id error: ${e}`);
        return res.status(500).json({ error: "Failed to update class." });
    }
});

export default router;
