import { Request, Response, NextFunction } from 'express';
import { agencySchema, loginSchema } from '../config/validations';
import { sendResponse } from '../utils/response';
import { sendEmail } from "../utils/mailSender";
import httpStatus from 'http-status';
import { getAgencyByEmail, createAgency, verifyPassword, updateAgencyById } from '../models/agency';
import { generateSixDigitCode } from '../utils/codeGen';
import { createToken, findToken } from '../models/token';
import { TokenType } from '../types/enums';
import { generateJwt } from '../utils/jwt';



export const registerAgency = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const result = await agencySchema.safeParseAsync(req.body);

        if (!result.success) {
            req.log?.error(result.error);
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Input validation failed", result.error.errors);
        }

        const { email } = result.data;

        // Check if the user already exists
        const existingUser = await getAgencyByEmail(email);
        if (existingUser) {
            return sendResponse(res, httpStatus.CONFLICT, false, "User already exists");
        }

        // Create the new agency
        const agency = await createAgency(result.data);


        // Generate a six-digit verification code
        const verificationCode = generateSixDigitCode();

        // Save the verification code to the database

        await createToken({
            token: verificationCode,
            userId: agency._id as string,
            type: TokenType.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + 3600000)
        });


        // Send the verification code via email
        await sendEmail(email, "Email Verification Code", `Your verification code is ${verificationCode}`);

        return sendResponse(res, httpStatus.CREATED, true, "User registered successfully, please check your email for the verification code", agency);
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};


export const login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    try {

        // Validate request body
        const result = await loginSchema.safeParseAsync(req.body);

        if (!result.success) {
            req.log?.error(result.error);
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Input validation failed", result.error.errors);
        }


        // Check if the user already exists
        const user = await getAgencyByEmail(email);
        if (!user) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, "Invalid email or password");
        }


        // Check if the user is verified

        if (!user.isVerified) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, "User not verified");
        }

        const isMatch = await verifyPassword(user.password, password);
        if (!isMatch) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, "Invalid email or password");
        }

        // Generate JWT token
        const payload = {
            agencyId: user._id as string,
            email: user.email,
            role: "admin",
        };

        const token = generateJwt(payload);

        const foundUser = {
            email: user.email,
            name: user.fullName,
            token: token,
            id: user._id
        }

        return sendResponse(res, httpStatus.OK, true, "login success", foundUser);
    } catch (error) {
        req.log.error(error, "Error during login attempt for email: " + email);
        next(error);
    }
};

// email verification

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { token } = req.body;

        if (!token) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Token is required");
        }

        const foundToken = await findToken(token as string);

        if (!foundToken) {
            return sendResponse(res, httpStatus.NOT_FOUND, false, "Invalid or expired token");
        }

        // Check if the token has expired

        if (new Date() > foundToken.expiresAt) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Token has expired");
        }

        // update user as verified in the database

        const agencyId = foundToken.userId;
        const agency = await updateAgencyById(agencyId, { isVerified: true });

        if (!agency) {
            return sendResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, "Failed to verify email");
        }

        // delete the token from database

        await foundToken.deleteOne();


        return sendResponse(res, httpStatus.OK, true, "Email successfully verified", agency);
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};

// reset password

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Email is required');
        }

        // Check if the user exists by email

        const agency = await getAgencyByEmail(email);
        if (!agency) {
            return sendResponse(res, httpStatus.NOT_FOUND, false, 'User not found');
        }

        // Generate a six-digit code for email verification

        const verificationCode = generateSixDigitCode();

        // Save the verification code in the database with an expiration date

        await createToken({
            token: verificationCode,
            userId: agency._id as string,
            type: TokenType.PASSWORD_RESET,
            expiresAt: new Date(Date.now() + 3600000)
        });

        //Send the verification code to the user via email

        await sendEmail(email, 'Password Reset Code', `Your password reset code is ${verificationCode}`);

        return sendResponse(res, httpStatus.OK, true, 'Password reset code sent to email');
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};


export const verifyResetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Token and new password are required');
        }

        // Find the token in the database and check if it's valid

        const foundToken = await findToken(token);
        if (!foundToken) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Invalid or expired token');
        }

        // Check if the token has expired

        if (foundToken.expiresAt < new Date()) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Token has expired');
        }

        // Update the user's password

        const agency = await updateAgencyById(foundToken.userId, { password: newPassword });
        if (!agency) {
            return sendResponse(res, httpStatus.NOT_FOUND, false, 'User not found');
        }

        // Delete the token after it’s been used

        await foundToken.deleteOne();


        return sendResponse(res, httpStatus.OK, true, 'Password has been reset successfully');
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};