import { Schema, model, Document, Types, ClientSession } from "mongoose";

interface IAgency extends Document {
    fullName: string;
    companyName: string;
    website?: string;
    country: string;
    linkedinProfile?: string;
    logoUrl?: string;
    userId: Types.ObjectId;
    description?: string;
}

const agencySchema = new Schema<IAgency>({
    fullName: { type: String, required: true },
    companyName: { type: String, required: true, unique: true },
    website: { type: String },
    country: { type: String, required: true },
    logoUrl: { type: String },
    description: { type: String },
    linkedinProfile: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
},
    { timestamps: true }
);


agencySchema.pre("save", async function (next) {
    const agency = this as IAgency;
    agency.companyName = agency.companyName.trim();
    next();
});



export const AgencyModel = model<IAgency>('Agency', agencySchema);

export const getAgencies = () => AgencyModel.find().lean();

export const getAgencyByName = (companyName: string) => AgencyModel.findOne({ companyName }).lean();

export const getAgencyById = (id: string) => AgencyModel.findById(id).lean();

export const getAgencyByUserId = (userId: string) => AgencyModel.findOne({ userId }).lean();

export const createAgency = (values: Partial<IAgency>, session: ClientSession) => new AgencyModel(values)
    .save({session}).then((agency) => agency.toObject());

export const deleteAgencyById = (id: string) => AgencyModel.findOneAndDelete({ _id: id });

export const updateAgencyById = (id: string, values: Partial<IAgency>) => AgencyModel.findByIdAndUpdate({ _id: id }, values, { new: true });