import { Schema, model, Document, Types, ClientSession } from "mongoose";

interface IApplication extends Document {
    candidateId: Types.ObjectId;
    jobId: Types.ObjectId;
    status: string;
    resumeUrl: string;
    coverLetter?: string;
    additionalData?: Record<string, unknown>;
    submittedAt: Date;
    notes?: Types.ObjectId[];
}

const applicationSchema = new Schema<IApplication>(
    {
        candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
        jobId: { type: Schema.Types.ObjectId, ref: "JobPosting", required: true },
        status: {
            type: String, required: true, default: "applied"
        },
        resumeUrl: { type: String, required: true },
        coverLetter: { type: String },
        additionalData: { type: Schema.Types.Mixed }, 
        submittedAt: { type: Date, default: Date.now },
        notes: [{ type: Schema.Types.ObjectId, ref: "notes"}]
    },
    { timestamps: true }
);

applicationSchema.index({ candidateId: 1, jobId: 1 }); // Compound index

export const ApplicationModel = model<IApplication>("Application", applicationSchema);

export const getApplications = () => ApplicationModel.find().populate("candidateId").populate("jobId").lean();

export const getApplicationById = (id: string) =>
    ApplicationModel.findById(id)
        .populate({ path: "candidateId", select: "fullName email" })
        .populate({ path: "jobId", select: "title companyName" })
        .lean();


export const createApplication = (values: Partial<IApplication>, session: ClientSession) =>
    new ApplicationModel(values).save({ session }).then((application) => application.toObject());

export const updateApplicationStatus = (id: string, status: IApplication["status"]) =>
    ApplicationModel.findByIdAndUpdate(id, { status }, { new: true }).lean();

export const deleteApplicationById = (id: string) => ApplicationModel.findByIdAndDelete(id);
