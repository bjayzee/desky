import { Schema, model, Document } from "mongoose";
import { IMembers } from "./members";

export enum WorkPlaceMode {
    HYBRID = "Hybrid",
    REMOTE = "Remote",
    ONSITE = "On-Site",
}

export enum JobStatus {
    OPEN = "Open",
    CLOSED = "Closed",
}

export interface Question {
    id: string;
    question: string;
    type: string;
    options: string[];
    isRequired: boolean;
}

export interface JobBoards {
    name: string;
    url: string;
    boardLink: string;
}

interface IJobs extends Document {
    title: string;
    agencyId: string;
    companyName: string;
    department: string;
    experienceLevel: string;
    employmentType: string;
    description: string;
    skills: string[];
    officeLocation: string;
    workPlaceMode: WorkPlaceMode;
    employeeLocation: string;
    hourlyRate?: number;
    baseSalaryRange: number;
    upperSalaryRange: number;
    otherBenefits: string[];
    status: JobStatus;
    questions: Question[];
    jobBoards?: JobBoards[];
    collaborators?: IMembers[];
}

const JobSchema = new Schema<IJobs>(
    {
        title: { type: String, required: true, index: true },
        agencyId: { type: String, required: true, index: true },
        companyName: { type: String, required: true, index: true },
        department: { type: String, required: true },
        experienceLevel: { type: String, required: true },
        employmentType: { type: String, required: true },
        description: { type: String, required: true },
        skills: { type: [String], required: true },
        officeLocation: { type: String, required: true },
        workPlaceMode: {
            type: String,
            enum: Object.values(WorkPlaceMode),
            required: true,
        },
        employeeLocation: { type: String, required: true },
        hourlyRate: { type: Number },
        baseSalaryRange: { type: Number, required: true },
        upperSalaryRange: { type: Number, required: true },
        otherBenefits: { type: [String], default: [] },
        status: {
            type: String,
            enum: Object.values(JobStatus),
            default: JobStatus.OPEN,
            required: true,
        },
        questions: {
            type: [
                {
                    id: { type: String, required: true },
                    question: { type: String, required: true },
                    type: { type: String, required: true },
                    options: { type: [String], required: true },
                    isRequired: { type: Boolean, required: true, default: false },
                },
            ],
            default: [],
        },
        jobBoards: {
            type: [
                {
                    name: { type: String, required: true },
                    url: { type: String, required: true },
                    boardLink: { type: String, required: true },
                },
            ],
            default: [],
        },
        collaborators: [
            {
                type: Schema.Types.ObjectId,
                ref: "Members",
            },
        ],
    },
    { timestamps: true }
);

JobSchema.index({ title: 1, companyId: 1, companyName: 1 });


export const JobModel = model<IJobs>("Job", JobSchema);


export const getJobs = (filters = {}, page = 1, limit = 10) => {
    return JobModel.find(filters)
        .populate("collaborators")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};


export const getJobById = (id: string) =>
    JobModel.findById(id).populate("collaborators").lean();

export const getJobsByCompanyId = (
    agencyId: string,
    page = 1,
    limit = 10
) => {
    return JobModel.find({ agencyId })
        .populate("collaborators")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};


export const getJobsByCompanyName = (
    companyName: string,
    page = 1,
    limit = 10
) => {
    return JobModel.find({ companyName: new RegExp(companyName, "i") })
        .populate("collaborators")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};


export const getJobsByCompanyNameAndStatus = (
    companyName: string,
    status: JobStatus,
    page = 1,
    limit = 10
) => {
    return JobModel.find({
        companyName: new RegExp(companyName, "i"),
        status,
    })
        .populate("collaborators")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};


export const createJob = (values: Partial<IJobs>) =>
    new JobModel(values).save().then((job) => job.toObject());


export const updateJobById = (id: string, values: Partial<IJobs>) =>
    JobModel.findByIdAndUpdate({ _id: id }, values, { new: true }).lean();


export const deleteJobById = (id: string) => JobModel.findByIdAndDelete(id);


export const countJobs = (filters = {}) => JobModel.countDocuments(filters);

export const getJobByAgencyId = (id: string) => JobModel.find({ agencyId: id}).lean();

export const getJobByAgencyName = (companyName: string) => JobModel.find({ companyName }).lean();
