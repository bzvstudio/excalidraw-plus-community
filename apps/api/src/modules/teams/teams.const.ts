import { z } from "zod";

export const TEAM_NAME_MAX_LENGTH = 60;

export const teamNameSchema = z.string().trim().min(1, "Name the team").max(TEAM_NAME_MAX_LENGTH);
