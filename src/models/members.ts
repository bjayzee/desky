import mongoose, { Schema, ClientSession, model } from "mongoose";
import * as argon2 from "argon2";
import { IUser } from "./user";

export interface IMembers extends IUser {
    name: string;
    userId: string;
    role: string;
    permissions?: string[];
    agencyId: mongoose.Types.ObjectId;
}

export const MembersSchema = new Schema<IMembers>(
    {
        name: { type: String },
        userId: { type: String, required: true, unique: true, index: true },
        role: { type: String, required: true, default: 'HR' },
        permissions: { type: [String], default: [] },
        agencyId: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
    },
    { timestamps: true }
);



export const MembersModel = model<IMembers>("Members", MembersSchema);

export const getMembers = () => MembersModel.find().populate("agencyId").lean();

export const getMemberById = (id: string) =>
    MembersModel.findById(id).populate("agencyId").lean();

export const getMemberByAgencyId = (agencyId: string) =>
    MembersModel.find({ agencyId }).lean();

export const getMemberByUserId = (userId: string) =>
    MembersModel.find({ userId }).populate("agencyId").lean();

export const createMember = (values: Partial<IMembers>, session: ClientSession) =>
    new MembersModel(values).save({ session }).then((member) => member.toObject());



export const verifyPassword = async (hashedPassword: string, plainPassword: string) => {
    return argon2.verify(hashedPassword, plainPassword);
};

export const deleteMemberById = (id: string) => MembersModel.findOneAndDelete({ _id: id });

export const updateMemberById = async (
    id: string,
    values: Partial<Omit<IMembers, '_id' | 'createdAt' | 'updatedAt'>>
) => {
        const member = await MembersModel.findByIdAndUpdate(
            id,
            values,
            { new: true, runValidators: true }
        );
        if (!member) throw new Error('Member not found');
        return member;
};
