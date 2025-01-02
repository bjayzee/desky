import { googleEventSchema } from '../config/validations';
import { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
import { getUserByEmail } from '../models/user';
import { sendResponse } from '../utils/response';
import { getAgencyByUserId } from '../models/agency';
import { getMemberByEmail } from '../models/members';
import { generateJwt } from '../utils/jwt';
import httpStatus from 'http-status';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
];

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Generate the Google OAuth URL for authentication.
 */
export const generateAuthUrl = (): string => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required for refresh token
        prompt: 'consent', // Ensures refresh token is always issued
        scope: SCOPES,
    });
};

/**
 * Retrieve OAuth tokens using the provided code.
 */
export const getTokens = async (code: string) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        return tokens;
    } catch (error) {
        console.error('Error retrieving tokens:', error);
        throw new Error('Failed to retrieve tokens');
    }
};

/**
 * Create a Google Calendar event.
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await googleEventSchema.safeParseAsync(req.body);
        if (!result.success) {
            req.log?.error(result.error);
            return sendResponse(
                res,
                httpStatus.BAD_REQUEST,
                false,
                'Input validation failed',
                result.error.errors
            );
        }

        const { summary, description, start, end, attendees } = result.data;
        const event = { summary, description, start, end, attendees };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
        });

        return sendResponse(res, httpStatus.OK, true, 'Event created successfully', response.data);
    } catch (error) {
        req.log?.error(error, 'Error during event creation');
        next(error);
    }
};

/**
 * List Google Calendar events.
 */
export const listEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return sendResponse(res, httpStatus.OK, true, 'Events fetched successfully', response.data.items);
    } catch (error) {
        req.log?.error(error, 'Error fetching events');
        next(error);
    }
};

/**
 * Log in using Google OAuth.
 */
export const loginWithGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { googleToken } = req.body;

        const ticket = await oauth2Client.verifyIdToken({
            idToken: googleToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'Invalid Google token');
        }

        const email = payload.email;

        const [user, agency, member] = await Promise.all([
            getUserByEmail(email),
            getUserByEmail(email).then(user => user ? getAgencyByUserId(user._id as string) : null),
            getMemberByEmail(email),
        ]);

        if (!user || !agency) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'User not found');
        }

        const role = user.userType === 'member' ? 'member' : 'admin';
        const jwtPayload = {
            userId: user._id.toString(),
            userType: user.userType,
            agencyId: agency._id.toString(),
            email: user.email,
            role,
        };

        const tokens = oauth2Client.credentials;
        const token = generateJwt(jwtPayload);

        const foundUser = {
            email: user.email,
            name: user.userType === 'member' ? member?.name : agency.fullName,
            companyName: agency.companyName,
            token,
            refreshToken: tokens.refresh_token, // Issue refresh token
            accessToken: tokens.access_token, // Issue access token
            id: user._id,
            agencyId: agency._id,
        };

        return sendResponse(res, httpStatus.OK, true, 'Login successful', foundUser);
    } catch (error) {
        req.log?.error(error, 'Error during Google login');
        next(error);
    }
};


export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Refresh token is required');
        }

        // Set the OAuth2 client credentials with the provided refresh token
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        // Get a new access token
        const newTokens = await oauth2Client.refreshAccessToken();
        const credentials = newTokens.credentials;

        if (!credentials.access_token) {
            return sendResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, 'Failed to refresh token');
        }

        return sendResponse(
            res,
            httpStatus.OK,
            true,
            'Token refreshed successfully',
            {
                accessToken: credentials.access_token,
                expiresIn: credentials.expiry_date,
                refreshToken: credentials.refresh_token || refreshToken, // Retain existing refresh token if not updated
            }
        );
    } catch (error) {
        req.log?.error(error, 'Error refreshing token');
        next(error);
    }
};

