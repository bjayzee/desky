import { sendResponse } from '../utils/response';
import { jobSchema } from '../config/validations';
import { NextFunction, Request, Response } from 'express';
import {
  createJob,
  getJobByAgencyId,
  getJobByAgencyName,
  getJobById,
  JobModel,
  JobStatus,
  updateJobById,
  WorkPlaceMode,
  updateJobByStatus,
} from '../models/jobs';
import httpStatus from 'http-status';
import { AgencyModel } from '../models/agency';
import mongoose from 'mongoose';
import {
  CandidateModel,
  createCandidate,
  getCandidateByEmail,
} from '../models/candidates';
import {
  ApplicationModel,
  createApplication,
  getApplicationsByJobId,
} from '../models/application';
import axios from 'axios';
import { createJobFolder } from '../utils/storage';

function mapToWorkPlaceMode(value: string): WorkPlaceMode | undefined {
  switch (value) {
    case 'Remote':
      return WorkPlaceMode.REMOTE;
    case 'Hybrid':
      return WorkPlaceMode.HYBRID;
    case 'On-Site':
      return WorkPlaceMode.ONSITE;
    default:
      return undefined;
  }
}

function mapToJobStatus(value: string): JobStatus | undefined {
  switch (value) {
    case 'Open':
      return JobStatus.OPEN;
    case 'Closed':
      return JobStatus.CLOSED;
    default:
      return undefined;
  }
}

export const postJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await jobSchema.safeParseAsync(req.body);

    if (!result.success) {
      req.log?.error(result.error);
      await session.abortTransaction();
      session.endSession();
      return sendResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        'Input validation failed',
        result.error.errors
      );
    }

    const agencyId = new mongoose.Types.ObjectId(result.data.agencyId);
    const agency = await AgencyModel.findById(agencyId).session(session);

    if (!agency) {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, httpStatus.NOT_FOUND, false, 'Agency not found');
    }

    // Create the job
    const job = await createJob(
      {
        title: result.data.title,
        agencyId,
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
        deadlineDate: new Date(result.data.deadlineDate),
        status: mapToJobStatus(result.data.status),
        questions: (result.data.questions || []).map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          isRequired: q.isRequired,
          options: q.options || [],
        })),
        jobBoards: result.data.jobBoards,
      },
      session
    );

    await AgencyModel.findByIdAndUpdate(
      agencyId,
      { $push: { jobs: job._id } },
      { session, new: true }
    );

    // Create job folder before committing the transaction
    await createJobFolder(agency.companyName, job.title);

    await session.commitTransaction();
    session.endSession();

    // Make a request to the AWS embedding API to generate the embeddings
    try {
      const response = await axios.post(
        process.env.AWS_EMBEDDING_API_URL as string,
        {
          job_description: result.data.description,
        }
      );

      const { job_id: jobDescriptionEmbeddingId } = JSON.parse(
        response.data.body
      );

      await JobModel.findByIdAndUpdate(job._id, {
        jobDescriptionEmbeddingId,
      });

      // Here you could update the job with the embedding data if needed
    } catch (error) {
      req.log?.error('Failed to send job description to external API:', error);
      // The job is already created, so we just log the error and continue
      // No need to call next(error) as this is not a critical failure
    }

    return sendResponse(
      res,
      httpStatus.CREATED,
      true,
      'Job created successfully',
      job
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    req.log?.error(error);
    next(error);
  }
};

export const getJobsByAgencyName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyName } = req.params;

    const jobs = await getJobByAgencyName(companyName);

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Jobs fetched successfully',
      jobs
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};

export const getJobsByAgencyId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agencyId } = req.params;

    const jobs = await getJobByAgencyId(agencyId);

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Jobs fetched successfully',
      jobs
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};

export const updateJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const updatedJob = await updateJobById(id, req.body);

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Job updated successfully',
      updatedJob
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};

export const applyJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // todo: implement input validation

  const {
    email,
    phoneNumber,
    fullName,
    resumeUrl,
    linkedInProfile,
    jobId,
    status,
    coverLetter,
    additionalData,
    submittedAt,
    answers,
  } = req.body;

  const trimmedEmail = email.trim().toLowerCase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create Candidate

    const existingCandidate = await getCandidateByEmail(trimmedEmail);
    const candidate =
      existingCandidate ||
      (await createCandidate(
        {
          email: trimmedEmail,
          fullName,
          resumeUrl,
          phoneNumber,
          linkedInProfile,
        },
        session
      ));

    const candidateId = new mongoose.Types.ObjectId(candidate._id as string);
    const jobObjectId = new mongoose.Types.ObjectId(jobId as string);

    const existingApplication = await ApplicationModel.findOne({
      candidateId,
      jobId: jobObjectId,
    }).session(session);

    if (existingApplication) {
      return sendResponse(
        res,
        httpStatus.CONFLICT,
        false,
        'Candidate has already applied for this job',
        null
      );
    }

    const application = await createApplication(
      {
        candidateId,
        jobId: jobObjectId,
        status,
        coverLetter,
        resumeUrl,
        additionalData,
        submittedAt,
        answers: Array.isArray(answers)
          ? answers.map((ans: Record<string, string>) => ({
              questionId: ans.questionId,
              questionText: ans.questionText,
              answer: ans.answer,
            }))
          : [],
      },
      session
    );

    await CandidateModel.findOneAndUpdate(
      { _id: candidateId },
      { $push: { applications: application._id } },
      { session }
    );

    await session.commitTransaction();

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Invitation sent successfully',
      application
    );
  } catch (error) {
    await session.abortTransaction();
    req.log?.error(error);
    next(error);
  } finally {
    session.endSession();
  }
};

export const getJobInfoById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Job fetched successfully',
      await getJobById(id)
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};

export const fetchApplicationsByJobId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;

    const applications = await getApplicationsByJobId(jobId);

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Applications fetched successfully',
      applications
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};

export const fetchApplicationsByAgencyId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agencyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!agencyId) {
      return sendResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        'Agency ID is required'
      );
    }

    const skip = (Number(page) - 1) * Number(limit);

    const jobs = await JobModel.find({ agencyId }).select('_id').lean();

    if (!jobs.length) {
      return sendResponse(
        res,
        httpStatus.NOT_FOUND,
        false,
        'No jobs found for this agency'
      );
    }

    const jobIds = jobs.map((job) => job._id);

    const [applications, total] = await Promise.all([
      ApplicationModel.find({ jobId: { $in: jobIds } })
        .populate('candidateId')
        .populate('jobId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ApplicationModel.countDocuments({ jobId: { $in: jobIds } }),
    ]);

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Applications fetched successfully',
      {
        applications,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      }
    );
  } catch (error) {
    res.log?.error(error);
    next(error);
  }
};

export const updateJobStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, status } = req.body;

    const updatedJob = await updateJobByStatus(id, status);

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Job updated successfully',
      updatedJob
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};

export const deleteJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;

    const job = await JobModel.findByIdAndDelete(jobId);

    if (!job) {
      return sendResponse(res, httpStatus.NOT_FOUND, false, 'Job not found');
    }

    await ApplicationModel.deleteMany({ jobId });

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Job deleted successfully',
      job
    );
  } catch (error) {
    req.log?.error(error);
    next(error);
  }
};
