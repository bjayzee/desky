import { getAgencyById } from "../models/agency";
import { inviteMemberSchema } from "../config/validations";
import { NextFunction, Request, Response } from "express";
import { sendResponse } from "../utils/response";
import { generateRandomPassword } from "../utils/codeGen";
import { createUser, getUserByEmail } from "../models/user";
import mongoose from "mongoose";
import { createMember } from "../models/members";
import { sendEmail } from "../utils/mailSender";
import httpStatus from "http-status";

export const inviteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const result = await inviteMemberSchema.safeParseAsync(req.body);

        if (!result.success) {
            req.log?.error(result.error);
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Input validation failed", result.error.errors);
        }

        const { email, agencyId } = result.data;
        const trimmedEmail = email.trim().toLowerCase();

        const agency = await getAgencyById(agencyId);

        if (!agency) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Recruiter does not exist");
        }

        const password = generateRandomPassword();

        console.log(password);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create User

            const existingUser = await getUserByEmail(trimmedEmail);
            if (existingUser) {
                return sendResponse(res, httpStatus.CONFLICT, false, "User already exists");
            }

            const user = await createUser({ email: trimmedEmail, userType: "member", password }, session);
            const agencyIds = new mongoose.Types.ObjectId(agencyId as string);

            // create Membership

            const member = await createMember({ userId: user._id as string, agencyId: agencyIds }, session);


            // Send the verification code via email
            await sendEmail(
                trimmedEmail,
                "Email Verification Code",
                `Your organization has invited you to collaborate. Use the following credentials to log in:\nEmail: ${trimmedEmail}\nPassword: ${password}`
            );

            await session.commitTransaction();

            return sendResponse(
                res,
                httpStatus.OK,
                true,
                "Invitation sent successfully",
                member
            );
        } catch (error) {
            await session.abortTransaction();
            req.log?.error(error);
            next(error);
        } finally {
            session.endSession();
        }
        next();
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
}

