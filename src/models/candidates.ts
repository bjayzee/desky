import { Schema, model, Document, Types, ClientSession } from "mongoose";

interface ICandidate extends Document {
    fullName: string;
    email: string;
    phoneNumber: string;
    resumeUrl?: string;
    linkedInProfile?: string;
    applications: Types.ObjectId[]; 
}

const candidateSchema = new Schema<ICandidate>(
    {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        phoneNumber: { type: String, required: true },
        resumeUrl: { type: String },
        linkedInProfile: { type: String },
        applications: [{ type: Schema.Types.ObjectId, ref: "Application" }],
    },
    { timestamps: true }
);

export const CandidateModel = model<ICandidate>("Candidate", candidateSchema);

export const getCandidates = () => CandidateModel.find().populate("applications").lean();

export const getCandidateById = (id: string) => CandidateModel.findById(id).populate("applications").lean();

export const getCandidateByEmailWithApplications = (email: string) => CandidateModel.findOne({ email }).populate("applications").lean();

export const getCandidateByEmail = (email: string) => CandidateModel.findOne({ email });

export const createCandidate = (values: Partial<ICandidate>, session: ClientSession) =>
    new CandidateModel(values).save({session}).then((candidate) => candidate.toObject());

export const deleteCandidateById = (id: string) => CandidateModel.findByIdAndDelete(id);

export const updateCandidateById = (id: string, values: Partial<ICandidate>) =>
    CandidateModel.findByIdAndUpdate(id, values, { new: true }).lean();
