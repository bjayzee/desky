import { Schema, model, Document } from "mongoose";
import * as argon2 from "argon2";

interface IAgency extends Document {
    fullName: string;
    email: string;
    companyName: string;
    website?: string;
    country: string;
    password: string;
    isVerified: boolean;
    linkedinProfile?: string
}

const agencySchema = new Schema<IAgency>({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true },
    website: { type: String },
    country: { type: String, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    linkedinProfile: { type: String },
},
    { timestamps: true }
);

agencySchema.pre('save', async function (next) {
    const agency = this as IAgency;
    if (!this.isModified('password')) return next();
    try {

        const hashedPassword = await argon2.hash(agency.password);
        this.password = hashedPassword;
        next();
    } catch (err) {
        next(err instanceof Error ? err : new Error("Password hashing failed."));
    }
});

export const AgencyModel = model<IAgency>('Agency', agencySchema);

export const getAgencies = () => AgencyModel.find().lean();
export const getAgencyByEmail = (email: string) => AgencyModel.findOne({ email }).lean();
export const getAgencyById = (id: string) => AgencyModel.findById(id).lean();
export const createAgency = (values: Partial<IAgency>) => new AgencyModel(values)
    .save().then((agency) => agency.toObject());

export const verifyPassword = async (hashedPassword: string, plainPassword: string) => {
    return argon2.verify(hashedPassword, plainPassword);
};


export const deleteAgencyById = (id: string) => AgencyModel.findOneAndDelete({ _id: id });

export const updateAgencyById = (id: string, values: Partial<IAgency>) => AgencyModel.findByIdAndUpdate({ _id: id }, values, { new: true });