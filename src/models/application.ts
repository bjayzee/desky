import { Schema, model, Document, Types, ClientSession } from 'mongoose';

interface IAnswer {
  questionId: string;
  questionText: string;
  answer: string;
}
interface IApplication extends Document {
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  status: string;
  resumeUrl: string;
  s3Url: string;
  coverLetter?: string;
  additionalData?: Record<string, unknown>;
  submittedAt: Date;
  notes?: Types.ObjectId[];
  answers?: IAnswer[];
  score?: number;
}

const applicationSchema = new Schema<IApplication>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    status: {
      type: String,
      required: true,
      default: 'applied',
    },
    resumeUrl: { type: String, required: true },
    s3Url: { type: String, required: true },
    coverLetter: { type: String },
    score: { type: Number, default: 0 },
    additionalData: { type: Schema.Types.Mixed },
    submittedAt: { type: Date, default: Date.now },
    notes: [{ type: Schema.Types.ObjectId, ref: 'Note' }],
    answers: [
      {
        questionId: { type: String, required: true },
        questionText: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

applicationSchema.index({ candidateId: 1, jobId: 1 }); // Compound index

export const ApplicationModel = model<IApplication>(
  'Application',
  applicationSchema
);

export const getApplications = () =>
  ApplicationModel.find().populate('candidateId').populate('jobId').lean();

export const getApplicationById = (id: string) =>
  ApplicationModel.findById(id)
    .populate({ path: 'candidateId', select: 'fullName email' })
    .populate({ path: 'jobId', select: 'title companyName' })
    .lean();

export const getApplicationsByCandidateId = (candidateId: string) =>
  ApplicationModel.find({ candidateId })
    .populate('candidateId')
    .populate('jobId')
    .lean();

export const getApplicationsByJobId = (jobId: string) =>
  ApplicationModel.find({ jobId })
    .populate('candidateId')
    .populate('jobId')
    .lean();

export const getApplicationByAgencyId = (agencyId: string) =>
  ApplicationModel.find({ where: { jobId: { $in: agencyId } } }).lean();

export const createApplication = (
  values: Partial<IApplication>,
  session: ClientSession
) =>
  new ApplicationModel(values)
    .save({ session })
    .then((application) => application.toObject());

export const updateApplicationStatus = (
  id: string,
  status: IApplication['status']
) => ApplicationModel.findByIdAndUpdate(id, { status }, { new: true }).lean();

export const deleteApplicationById = (id: string) =>
  ApplicationModel.findByIdAndDelete(id);
