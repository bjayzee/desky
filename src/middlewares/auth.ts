// import { Request, Response, NextFunction } from 'express';
// import httpStatus from 'http-status';
// import jwt from 'jsonwebtoken';
// import { decodeJwt } from '../utils/jwt';
// import { sendResponse } from '../utils/response';


// export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const authHeader = req.headers.authorization;

//         if (!authHeader) {
//             return sendResponse(res, httpStatus.UNAUTHORIZED, false, "Authorization header is missing");
//         }

//         const [bearer, token] = authHeader.split(' ');

//         if (bearer !== 'Bearer' || !token) {
//             return sendResponse(res, httpStatus.UNAUTHORIZED, false, "Invalid authorization format");
//         }

//         try {
//             req.user = await decodeJwt(token);
//             next();
//         } catch (error) {
//             if (error instanceof jwt.TokenExpiredError) {
//                 return sendResponse(res, httpStatus.UNAUTHORIZED, false, "Token has expired");
//             } else if (error instanceof jwt.JsonWebTokenError) {
//                 return sendResponse(res, httpStatus.UNAUTHORIZED, false, "Invalid token");
//             }
            
//             return sendResponse(res, 
//                 httpStatus.INTERNAL_SERVER_ERROR, 
//                 false, 
//                 "Authentication error"
//             );
//         }
//     } catch (error) {
//         return sendResponse(res, 
//             httpStatus.INTERNAL_SERVER_ERROR, 
//             false, 
//             "Internal server error during authentication"
//         );
//     }
// };

// export const hasRole = (allowedRoles: string[]) => {
//     return (req: Request, res: Response, next: NextFunction) => {
//         if (!req.user) {
//             return sendResponse(res, httpStatus.UNAUTHORIZED, false, "User not authenticated");
//         }

//         if (!allowedRoles.includes(req.user.role)) {
//             return sendResponse(res, httpStatus.FORBIDDEN, false, "Insufficient permissions");
//         }

//         next();
//     };
// };