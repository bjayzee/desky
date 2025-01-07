import { Request, Response} from 'express';
import { sendResponse } from '../utils/response';
import httpStatus from 'http-status';


export const errorHandler = (err: Error, req: Request, res: Response) => {
    req.log.error({ err }, "Unhandled error occurred");
    sendResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, err.message);
};
