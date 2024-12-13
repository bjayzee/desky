import { Schema, model, Document, Types } from "mongoose";

interface ICandidate extends Document {
    fullName: string;
    email: string;
    phoneNumber: string;
    resumeUrl?: string;
    linkedInProfile?: string;
    applications: Types.ObjectId[]; // References to Applications
}

const candidateSchema = new Schema<ICandidate>(
    {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        phoneNumber: { type: String, required: true },
        resumeUrl: { type: String },
        linkedInProfile: { type: String },
        applications: [{ type: Schema.Types.ObjectId, ref: "Application" }], // Tracks candidate applications
    },
    { timestamps: true }
);

export const CandidateModel = model<ICandidate>("Candidate", candidateSchema);

export const getCandidates = () => CandidateModel.find().populate("applications").lean();
export const getCandidateById = (id: string) => CandidateModel.findById(id).populate("applications").lean();
export const createCandidate = (values: Partial<ICandidate>) =>
    new CandidateModel(values).save().then((candidate) => candidate.toObject());
export const deleteCandidateById = (id: string) => CandidateModel.findByIdAndDelete(id);
export const updateCandidateById = (id: string, values: Partial<ICandidate>) =>
    CandidateModel.findByIdAndUpdate(id, values, { new: true }).lean();
