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

