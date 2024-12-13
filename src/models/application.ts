import { Schema, model, Document, Types } from "mongoose";

// 1. Define the Document Interface
interface IApplication extends Document {
    candidateId: Types.ObjectId; // Reference to Candidate
    jobId: Types.ObjectId; // Reference to JobPosting
    status: "applied" | "shortlisted" | "interviewing" | "offered" | "hired" | "rejected";
    resumeUrl: string;
    coverLetter?: string;
    additionalData?: Record<string, unknown>;
    submittedAt: Date;
}

// 2. Create the Schema
const applicationSchema = new Schema<IApplication>(
    {
        candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
        jobId: { type: Schema.Types.ObjectId, ref: "JobPosting", required: true },
        status: {
            type: String,
            enum: ["applied", "shortlisted", "interviewing", "offered", "hired", "rejected"],
            default: "applied",
        },
        resumeUrl: { type: String, required: true },
        coverLetter: { type: String },
        additionalData: { type: Schema.Types.Mixed }, // For dynamic fields
        submittedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// 3. Add Indexing for Optimized Queries
applicationSchema.index({ candidateId: 1, jobId: 1 }); // Compound index

// 4. Export the Model
export const ApplicationModel = model<IApplication>("Application", applicationSchema);

// 5. Implement CRUD Operations
export const getApplications = () => ApplicationModel.find().populate("candidateId").populate("jobId").lean();
export const getApplicationById = (id: string) => ApplicationModel.findById(id).lean();
export const createApplication = (values: Partial<IApplication>) =>
    new ApplicationModel(values).save().then((application) => application.toObject());
export const updateApplicationStatus = (id: string, status: IApplication["status"]) =>
    ApplicationModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
export const deleteApplicationById = (id: string) => ApplicationModel.findByIdAndDelete(id);
