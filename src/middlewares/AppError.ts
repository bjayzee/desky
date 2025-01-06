export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Set the prototype explicitly to maintain instance type in ES5 environments
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

// class BadRequestError extends AppError {
//     constructor(message = 'Bad Request') {
//         super(message, 400);
//     }
// }

// class NotFoundError extends AppError {
//     constructor(message = 'Resource Not Found') {
//         super(message, 404);
//     }
// }

// class InternalServerError extends AppError {
//     constructor(message = 'Internal Server Error') {
//         super(message, 500);
//     }
// }
