import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { AppError } from './AppError';

export const errorHandler = (err: AppError, req: Request, res: Response) => {
    req.log.error({ err }, 'Unhandled error occurred');

    const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = err.isOperational ? err.message : 'Something went wrong';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Include stack trace in dev
    });
};
