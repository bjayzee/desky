import { z } from 'zod';


export const agencySchema = z.object({
    fullName: z.string().min(3, 'name must be at least 3 characters'),
    email: z.string().email('Invalid email format'),
    companyName: z.string().min(3).max(100),
    website: z.string()
        .url('Invalid website URL format')
        .optional(),
    country: z.string().min(2).max(50),
    password: z.string().min(8, 'Password must contain at least 8 characters').max(255),
    linkedinProfile: z.string()
        .regex(
            /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_]+\/?$/,
            'Invalid LinkedIn profile URL format'
        )
        .optional(),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const resetPasswordSchema = z.object({
    email: z.string().email(),
});

export const verifyResetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(6),
});

export const inviteMemberSchema = z.object({
    email: z.string().email(),
    agencyId: z.string(),
    fullName: z.string(),
});


const WorkPlaceMode = z.enum(["Remote", "On-site", "Hybrid"]);
const JobStatus = z.enum(["Active", "Closed", "Pending"]);
const QuestionSchema = z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()).optional(),
    isRequired: z.boolean(),
    type: z.string(),
});
const JobBoardsSchema = z.object({
    url: z.string(),
    name: z.string(),
    boardLink: z.string().url(),
});
const CollaboratorsSchema = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
});

export const jobSchema = z.object({
    title: z.string(),
    agencyId: z.string(),
    companyName: z.string(),
    department: z.string(),
    experienceLevel: z.string(),
    employmentType: z.string(),
    description: z.string(),
    skills: z.array(z.string()),
    deadlineDate: z.string(),
    officeLocation: z.string(),
    workPlaceMode: WorkPlaceMode,
    employeeLocation: z.string(),
    hourlyRate: z.number().optional(),
    baseSalaryRange: z.number(),
    upperSalaryRange: z.number(),
    otherBenefits: z.array(z.string()),
    status: JobStatus,
    questions: z.array(QuestionSchema),
    jobBoards: z.array(JobBoardsSchema).optional(),
    collaborators: z.array(CollaboratorsSchema).optional(),
});
