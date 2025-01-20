import { googleEventSchema } from '../config/validations';
import { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
import { createUser, getUserByEmail } from '../models/user';
import { sendResponse } from '../utils/response';
import { createAgency, getAgencyByUserId } from '../models/agency';
import { generateJwt } from '../utils/jwt';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { getMemberByUserId } from '../models/members';

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
    process.env.REDIRECT_URI,
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Generate the Google OAuth URL for authentication.
 */
export const generateAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES,
        });

        return sendResponse(res, httpStatus.OK, true, "url fetched successfully", response);
    } catch (error) {
        console.error('Error generating authorization URL:', error);
        next(error);
    }
};


/**
 * Retrieve OAuth tokens using the provided code.
 */
// export const getTokens = async (req: Request, res: Response) => {
//     try {
//         const code = req.query.code as string;

//         console.log("code", code)
        
//         const { tokens } = await oauth2Client.getToken(code);
//         oauth2Client.setCredentials(tokens);
        
//     } catch (error) {
//         console.error('Error retrieving tokens:', error);
//         throw new Error('Failed to retrieve tokens');
//     }
// };

/**
 * Automatically refresh the access token if expired.
 */
const ensureAccessToken = async () => {
    const { credentials } = oauth2Client;
    if (!credentials.expiry_date || Date.now() > credentials.expiry_date) {
        const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(newTokens);
    }
};


/**
 * Create a Google Calendar event.
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {

        await ensureAccessToken();

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

        const { summary, description, start, end, attendees, timeZone } = result.data;

        const event = {
            summary,
            description,
            start: {
                dateTime: start,
                timeZone,
            },
            end: {
                dateTime: end,
                timeZone,
            },
            attendees: attendees,
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, 
                    { method: 'popup', minutes: 10 }, 
                ],
            },
            conferenceData: {
                createRequest: {
                    requestId: `event-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet', 
                    },
                    status: {
                        statusCode: 'success',
                    },
                },
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            sendNotifications: true,
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

        await ensureAccessToken();


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

        // Ensure googleToken is available
        if (!googleToken) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Google token is required');
        }

        // Exchange the authorization code for tokens
        const { tokens } = await oauth2Client.getToken(googleToken);
        if (!tokens || !tokens.access_token) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'Failed to retrieve access token');
        }

        oauth2Client.setCredentials(tokens);

        console.log("Oauthobject", oauth2Client)

        // Extract tokens
        const { access_token, refresh_token, id_token } = tokens;

        if (!id_token) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'Failed to retrieve id token');
        }

        // Verify the idToken
        const ticket = await oauth2Client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID, // Ensure this is your correct client ID
        });

        const payload = ticket.getPayload();
        console.log("payload: ", payload);

        if (!payload || !payload.email) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'Invalid Google token');
        }

        const email = payload.email;

        // Fetch user, agency, and member data concurrently
        const [user, agency, member] = await Promise.all([
            getUserByEmail(email),
            getUserByEmail(email).then(user => user ? getAgencyByUserId(user._id as string) : null),
            getUserByEmail(email).then(user => user ? getMemberByUserId(user._id as string) : null),
        ]);

        if (!user || !agency) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'User or agency not found');
        }

        // Determine user role
        const role = user.userType === 'member' ? 'member' : 'admin';

        // Create JWT payload for your own platform
        const jwtPayload = {
            userId: user._id.toString(),
            userType: user.userType,
            agencyId: agency._id.toString(),
            email: user.email,
            role,
        };

        const token = generateJwt(jwtPayload); 

        // Response with the user and generated JWT
        const foundUser = {
            email: user.email,
            name: user.userType === 'member' ? member?.[0].name : agency.fullName,
            companyName: agency.companyName,
            token,
            id: user._id,
            agencyId: agency._id,
            userType: user.userType,
            access_token,
            refresh_token
        };

        return sendResponse(res, httpStatus.OK, true, 'Login successful', foundUser);

    } catch (error) {
        req.log?.error(error, 'Error during Google login');
        next(error);
    }
};



export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refresh_token } = req.body;

        if (!refreshToken) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Refresh token is required');
        }

        // Set the OAuth2 client credentials with the provided refresh token
        oauth2Client.setCredentials({ refresh_token });

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

export const signUpWithGoogle = async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { googleToken } = req.body;

        const ticket = await oauth2Client.verifyIdToken({
            idToken: googleToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return sendResponse(res, httpStatus.UNAUTHORIZED, false, 'Invalid Google credentials.');
        }



        const email = payload.email;

        // Check if the user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return sendResponse(res, httpStatus.CONFLICT, false, "User already exists, Please login");
        }

        const user = await createUser({ email, password: googleToken, isActive: true, isVerified: true }, session);
        const userId = new mongoose.Types.ObjectId(user._id as string);

        // Create the new agency
        const agency = await createAgency({
            userId,
            companyName: payload.name,
            fullName: payload.name,
            website: payload.profile,
            country: "UAE",
            logoUrl: payload.picture,
        }, session);


        // Retrieve OAuth tokens
        const { tokens } = await oauth2Client.getToken(googleToken);

        // Set credentials for the current session
        oauth2Client.setCredentials(tokens);


        const jwtPayload = {
            userId,
            email,
            userType: "admin",
            agencyId: agency._id as string,
            role: "admin",

        };

        const token = generateJwt(jwtPayload);

        const userResponse = {
            email,
            name: agency.fullName,
            companyName: agency.companyName,
            token,
            id: user._id,
            agencyId: agency._id,
            userType: user.userType,
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token,
        };

        return sendResponse(res, httpStatus.CREATED, true, 'Signup successful', userResponse);
    } catch (error) {
        req.log?.error(error, 'Error during Google signup');
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

export const useGoogleAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        oauth2Client.setCredentials({ refresh_token: refreshToken });
    }

    ensureAccessToken()
        .then(() => next())
        .catch((error) => {
            req.log?.error('Failed to refresh access token', error);
            sendResponse(res, httpStatus.UNAUTHORIZED, false, 'Failed to authenticate');
        });
};
