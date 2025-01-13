import { Schema, Types, ClientSession, Query, model } from "mongoose";
import { JobModel } from "./jobs";
import { IUser } from "./user";

interface IAgency extends IUser {
    fullName: string;
    companyName: string;
    website?: string;
    country: string;
    linkedinProfile?: string;
    logoUrl?: string;
    userId: Types.ObjectId;
    companySize?: string;
    industry?: string;
    description?: string;
    jobs?: Types.ObjectId[],
}

export const agencySchema = new Schema<IAgency>({
    fullName: { type: String, required: true },
    companyName: { type: String, required: true, unique: true },
    website: { type: String },
    country: { type: String, required: true },
    logoUrl: { type: String },
    description: { type: String },
    linkedinProfile: { type: String },
    jobs: [{type: Schema.Types.ObjectId, ref: "Job" }],
    userId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    industry: {type: String}
},
    { timestamps: true }
);


agencySchema.pre("findOneAndDelete", async function (next) {
    const query = this as Query<unknown, IAgency>;

    
    const agency = await query.model.findOne(query.getFilter());

    if (agency) {
        
        await JobModel.deleteMany({ agencyId: agency._id });
    }

    next();
});


agencySchema.pre("save", async function (next) {
    const agency = this as IAgency;
    agency.companyName = agency.companyName.trim();
    next();
});

// export const AgencyModel = UserModel.discriminator('Agency', agencySchema);

export const AgencyModel = model<IAgency>('Agency', agencySchema);

export const getAgencies = () => AgencyModel.find().lean();

export const getAgencyByName = (companyName: string) => AgencyModel.findOne({ companyName }).populate({ path: 'jobs', model: 'Job' }).lean();

export const getAgencyById = (id: string) => AgencyModel.findById(id).lean();

export const getAgencyByUserId = (userId: string) => AgencyModel.findOne({ userId }).lean();

export const createAgency = (values: Partial<IAgency>, session: ClientSession) => new AgencyModel(values)
    .save({session}).then((agency) => agency.toObject());

export const deleteAgencyById = (id: string) => AgencyModel.findOneAndDelete({ _id: id });

export const updateAgencyById = (id: string, values: Partial<IAgency>) => AgencyModel.findByIdAndUpdate({ _id: id }, values, { new: true });