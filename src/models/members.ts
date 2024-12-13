import mongoose, { Schema, model, Document, ClientSession } from "mongoose";
import * as argon2 from "argon2";

export interface IMembers extends Document {
    name: string; 
    userId: string;
    role: string; 
    permissions?: string[];
    agencyId: mongoose.Types.ObjectId;
}

const MembersSchema = new Schema<IMembers>(
    {
        name: { type: String },
        userId: { type: String, required: true, unique: true, index: true },
        role: { type: String, required: true, default: 'HR'},
        permissions: { type: [String], default: [] },
        agencyId: { type: Schema.Types.ObjectId, ref: "Agency", required: true }, 
    },
    { timestamps: true }
);


// CRUD Utility Methods
export const MembersModel = model<IMembers>("Members", MembersSchema);

export const getMembers = () => MembersModel.find().populate("organization").lean();
export const getMemberByEmail = (email: string) =>
    MembersModel.findOne({ email }).populate("organization").lean();
export const getMemberById = (id: string) =>
    MembersModel.findById(id).populate("organization").lean();
export const createMember = (values: Partial<IMembers>, session: ClientSession) =>
    new MembersModel(values).save({session}).then((member) => member.toObject());

export const verifyPassword = async (hashedPassword: string, plainPassword: string) => {
    return argon2.verify(hashedPassword, plainPassword);
};

export const deleteMemberById = (id: string) => MembersModel.findOneAndDelete({ _id: id });

export const updateMemberById = (id: string, values: Partial<IMembers>) =>
    MembersModel.findByIdAndUpdate({ _id: id }, values, { new: true });
