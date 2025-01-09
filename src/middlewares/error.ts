import { Request, Response } from "express";
import { convertError } from "./AppError";
import { sendResponse } from "../utils/response";

export const errorHandler = (error: unknown, req: Request, res: Response): void => {
    const appError = convertError(error);

    // Logging
    const logContext = {
        errorType: appError.name,
        errorCode: appError.errorCode,
        severity: appError.severity,
        statusCode: appError.statusCode,
        stack: appError.stack,
        requestId: req.id || 'N/A',
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        params: req.params,
        timestamp: new Date().toISOString(),
    };

    req.log[appError.isOperational ? 'error' : 'fatal'](logContext, appError.message);

    // Send Response
    sendResponse(res, appError.statusCode, false, appError.message, appError.serialize(String(req.id)));
};