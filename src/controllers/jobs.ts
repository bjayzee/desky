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
import { createJobFolder, uploadFile } from '../utils/storage';
import { OpenAI } from 'openai';
import { sendEmail } from '../utils/mailSender';

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      email,
      phoneNumber,
      fullName,
      linkedInProfile,
      location,
      portfolioUrl,
      expectedPay,
      jobId,
      status,
      coverLetter,
      additionalData,
      submittedAt,
      answers: rawAnswers,
    } = req.body;

    // Parse answers if they're a string
    let answers = rawAnswers;
    if (typeof rawAnswers === 'string') {
      try {
        answers = JSON.parse(rawAnswers);
      } catch (e) {
        console.log('Failed to parse answers string:', e);
        answers = [];
      }
    }
    
    const trimmedEmail = email.trim().toLowerCase();

    // Get job details to create proper folder structure
    const job = await JobModel.findById(jobId).populate('agencyId').lean();
    if (!job) {
      return sendResponse(res, httpStatus.NOT_FOUND, false, 'Job not found');
    }

    if (!job.jobDescriptionEmbeddingId) {
      return sendResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        'Job description embedding not found'
      );
    }

    // Upload file to S3
    const timestamp = Date.now();
    const fileName = `${trimmedEmail}_${timestamp}.pdf`;

    const resumeUrl = await uploadFile(
      job.companyName,
      job.title,
      fileName,
      req.file!.buffer
    );

    // Construct the S3 URL
    const s3Url = `s3://${process.env.AWS_BUCKET_NAME}/${job.companyName}/${job.title}/${fileName}`;

    // Create or get existing candidate
    const existingCandidate = await getCandidateByEmail(trimmedEmail);
    const candidate =
      existingCandidate ||
      (await createCandidate(
        {
          email: trimmedEmail,
          fullName,
          resumeUrl, // Now using the S3 URL
          phoneNumber,
          linkedInProfile,
          location,
          portfolioUrl,
          expectedPay,
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

    const application = (await createApplication(
      {
        candidateId,
        jobId: jobObjectId,
        status,
        coverLetter,
        resumeUrl,
        s3Url,
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
    )) as any;

    await CandidateModel.findOneAndUpdate(
      { _id: candidateId },
      { $push: { applications: application._id } },
      { session }
    );

    await session.commitTransaction();

    // Make a request to the AWS embedding API to generate the embeddings
    try {
      const response = await axios.post(
        process.env.AWS_CV_SCORE_API_URL as string,
        {
          body: {
            application_id: application._id.toString() as string,
            s3_url: s3Url,
            job_id: job.jobDescriptionEmbeddingId,
          },
        }
      );
    } catch (error) {
      req.log?.error('Failed to send resume to external API:', error);
      // The application is already created, so we just log the error and continue
      // No need to call next(error) as this is not a critical failure
    }

    // Send confirmation email to the candidate
    await sendEmail(
      trimmedEmail,
      'Application Received from Desky',
      `Dear ${fullName}, Thank you for submitting your application for the ${job.title} position at ${job.companyName}. 
       We have received your application and our team will review it shortly.
       Desky`
    );

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

    if (!agencyId) {
      return sendResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        'Agency ID is required'
      );
    }

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

    const applications = await ApplicationModel.find({ jobId: { $in: jobIds } })
      .populate('candidateId')
      .populate('jobId')
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(
      res,
      httpStatus.OK,
      true,
      'Applications fetched successfully',
      applications
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

export const generateJobDescription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({
        success: false,
        message: 'Prompt is required',
      });
      return;
    }

    // For now, we'll just echo back the prompt as the description
    // In a real implementation, you might want to use an AI service here

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are are an expert in generating job descriptions. You will be given a prompt and you will generate a professional job description that uses HTML tags to format the job description. When providing the description, only use HTML heading tags, paragraph tags, list tags, anchor tags, and line break tags after each element. Do not use any other tags that are not mentioned.',
        },
        {
          role: 'user',
          content: `Generate a job description for the following prompt: ${prompt}`,
        },
      ],
      store: false,
    });

    const description = completion.choices[0].message.content?.replace(
      /```html|```/g,
      ''
    );

    res.status(200).json({
      success: true,
      description,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating job description',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
