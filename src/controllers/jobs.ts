import { sendResponse } from "../utils/response";
import { jobSchema } from "../config/validations";
import { NextFunction, Request, Response } from "express";
import { createJob, getJobByAgencyId, getJobByAgencyName, JobStatus, WorkPlaceMode } from "../models/jobs";
import httpStatus from "http-status";

function mapToWorkPlaceMode(value: string): WorkPlaceMode | undefined {
    switch (value) {
        case "Remote":
            return WorkPlaceMode.REMOTE;
        case "Hybrid":
            return WorkPlaceMode.HYBRID;
        case "On-Site":
            return WorkPlaceMode.ONSITE;
        default:
            return undefined; // Handle invalid values
    }
}

function mapToJobStatus(value: string): JobStatus | undefined {
    switch (value) {
        case "Open":
            return JobStatus.OPEN;
        case "Closed":
            return JobStatus.CLOSED;
        default:
            return undefined; // Handle invalid values
    }
}


export const postJob = async(req: Request, res: Response, next: NextFunction) =>{
    try {

        const result = await jobSchema.safeParseAsync(req.body);

        if (!result.success) {
            req.log?.error(result.error);
            return sendResponse(res, httpStatus.BAD_REQUEST, false, "Input validation failed", result.error.errors);
        }


        const job = await createJob({
            title: result.data.title,
            agencyId: result.data.agencyId,
            companyName: result.data.companyName,
            department: result.data.department,
            experienceLevel: result.data.experienceLevel,
            employmentType: result.data.employmentType,
            description: result.data.description,
            skills: result.data.skills,
            officeLocation: result.data.officeLocation,
            workPlaceMode: mapToWorkPlaceMode(result.data.workPlaceMode),
            employeeLocation: result.data.employeeLocation,
            hourlyRate: result.data.hourlyRate,
            baseSalaryRange: result.data.baseSalaryRange,
            upperSalaryRange: result.data.upperSalaryRange,
            otherBenefits: result.data.otherBenefits,
            status: mapToJobStatus(result.data.status),
            questions: (result.data.questions || []).map((q) => ({
                id: q.id, 
                question: q.question,
                type: q.type,
                isRequired: q.isRequired,
                options: q.options || [],
            })),
            jobBoards: result.data.jobBoards,
        })


        return sendResponse(
            res,
            httpStatus.OK,
            true,
            "Job created successfully",
            job
        );
    } catch (error) {
        req.log?.error(error); 
        next(error);
    }
}

export const getJobsByAgencyName = async(req: Request, res: Response, next: NextFunction) =>{
    try {

        const { companyName } = req.params;
        console.log(companyName);

        const jobs = await getJobByAgencyName(companyName);
        console.log(jobs);

        return sendResponse(res, httpStatus.OK, true, "Jobs fetched successfully", jobs);
        
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
}

export const getJobsByAgencyId = async(req: Request, res: Response, next: NextFunction) =>{
    try {

        const { agencyId } = req.params;

        const jobs = await getJobByAgencyId(agencyId);

        return sendResponse(res, httpStatus.OK, true, "Jobs fetched successfully", jobs);
        
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
}

