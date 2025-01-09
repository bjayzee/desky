import httpStatus from 'http-status';
import { MongooseError } from 'mongoose';

// Error Types and Interfaces
type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'AUTH_ERROR'
    | 'NOT_FOUND'
    | 'BAD_REQUEST'
    | 'INTERNAL_ERROR'
    | 'DATABASE_ERROR'
    | 'FORBIDDEN'
    | 'CONFLICT';

interface ErrorDetails {
    code: ErrorCode;
    severity: ErrorSeverity;
    field?: string;
    validation?: Record<string, string>;
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
}

interface ErrorResponse {
    success: false;
    message: string;
    statusCode: number;
    errorCode: ErrorCode;
    details?: Omit<ErrorDetails, 'severity'>;
    stack?: string;
}

// Base AppError Class
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errorCode: ErrorCode;
    public readonly severity: ErrorSeverity;
    public readonly details?: Omit<ErrorDetails, 'code' | 'severity' | 'timestamp'>;

    constructor(
        message: string,
        statusCode: number,
        errorCode: ErrorCode,
        options: {
            isOperational?: boolean;
            severity?: ErrorSeverity;
            details?: Omit<ErrorDetails, 'code' | 'severity' | 'timestamp'>;
        } = {}
    ) {
        super(message);
        const { isOperational = true, severity = 'MEDIUM', details } = options;

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode;
        this.severity = severity;
        this.details = details;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace?.(this, this.constructor);
    }

    serialize(requestId?: string): ErrorResponse {
        return {
            success: false,
            message: this.message,
            statusCode: this.statusCode,
            errorCode: this.errorCode,
            details: this.details && {
                ...this.details,
                timestamp: new Date().toISOString(),
                requestId,
            },
            stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
        };
    }
}

// Predefined Error Classes
class PredefinedError extends AppError {
    constructor(
        message: string,
        statusCode: number,
        errorCode: ErrorCode,
        severity: ErrorSeverity,
        details?: Omit<ErrorDetails, 'code' | 'severity' | 'timestamp'>
    ) {
        super(message, statusCode, errorCode, { severity, details });
    }
}

export class BadRequestError extends PredefinedError {
    constructor(message = 'Bad Request', details?: ErrorDetails) {
        super(message, httpStatus.BAD_REQUEST, 'BAD_REQUEST', 'LOW', details);
    }
}

export class ValidationError extends BadRequestError {
    constructor(message = 'Validation Error', validationErrors: Record<string, string>) {
        super(message, {
            code: 'VALIDATION_ERROR',
            severity: 'LOW',
            validation: validationErrors,
            field: Object.keys(validationErrors)[0],
            timestamp: new Date().toISOString(),
        });
    }
}

export class NotFoundError extends PredefinedError {
    constructor(resource = 'Resource', details?: ErrorDetails) {
        super(`${resource} not found`, httpStatus.NOT_FOUND, 'NOT_FOUND', 'LOW', details);
    }
}

export class AuthError extends PredefinedError {
    constructor(message = 'Authentication Failed', details?: ErrorDetails) {
        super(message, httpStatus.UNAUTHORIZED, 'AUTH_ERROR', 'MEDIUM', details);
    }
}

export class DatabaseError extends PredefinedError {
    constructor(message = 'Database Error', details?: ErrorDetails) {
        super(message, httpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', 'HIGH', details);
    }
}

// Type Guards
const isAppError = (error: unknown): error is AppError => error instanceof AppError;
const isMongooseError = (error: unknown): error is MongooseError => error instanceof MongooseError;

// Error Conversion
export const convertError = (error: unknown): AppError => {
    if (isAppError(error)) return error;

    if (isMongooseError(error)) {
        if ((error as MongooseError & { code?: number }).code === 11000) {
            const mongooseError = error as MongooseError & { keyValue?: Record<string, unknown> };
            return new BadRequestError('Duplicate key error', {
                code: 'VALIDATION_ERROR',
                severity: 'LOW',
                timestamp: new Date().toISOString(),
                field: Object.keys(mongooseError.keyValue || {})[0],
            });
        }
        return new DatabaseError(error.message);
    }

    return error instanceof Error
        ? new AppError(error.message, httpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', {
            isOperational: false,
            severity: 'HIGH',
        })
        : new AppError('An unexpected error occurred', httpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', {
            isOperational: false,
            severity: 'HIGH',
        });
};