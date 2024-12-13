import { Schema, model, Document, Types, ClientSession } from "mongoose";
import * as argon2 from "argon2";


interface IUser extends Document {
    email: string;
    userType: "candidate" | "agency" | "member";
    password: string;
    isVerified: boolean;
    isActive: boolean; 
    agencyId?: Types.ObjectId; 
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, index: true },
        userType: {
            type: String,
            enum: ["candidate", "agency", "member"],
            default: "agency",
        },
        password: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: false},
        agencyId: { type: Schema.Types.ObjectId, ref: "Agency" },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    const user = this as IUser;
    if (!this.isModified("password")) return next();
    try {
        const hashedPassword = await argon2.hash(user.password);
        user.password = hashedPassword;
        next();
    } catch (err) {
        next(err instanceof Error ? err : new Error("Password hashing failed."));
    }
});

export const UserModel = model<IUser>("User", userSchema);

export const getUsers = () => UserModel.find().populate("agencyId").lean();

export const getUserById = (id: string) => UserModel.findById(id).populate("agencyId").lean();

export const getUserByEmail = (email: string) => UserModel.findOne({ email }).lean();


export const createUser = (values: Partial<IUser>, session: ClientSession) =>
    new UserModel(values).save({session}).then((user) => user.toObject());

export const deleteUserById = (id: string) => UserModel.findByIdAndDelete(id);

export const updateUserById = (id: string, values: Partial<IUser>) =>
    UserModel.findByIdAndUpdate(id, values, { new: true }).lean();

export const verifyPassword = async (hashedPassword: string, plainPassword: string) => {
    return argon2.verify(hashedPassword, plainPassword);
};

export const getAllUsers = (filters = {}, page = 1, limit = 10) =>
    UserModel.find(filters)
        .populate("companyId") 
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
