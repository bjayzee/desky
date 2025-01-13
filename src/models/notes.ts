import { Schema, model, Document, Types } from "mongoose";

interface INote extends Document {
    applicationId: Types.ObjectId;
    author: Types.ObjectId; 
    content: string;
    mentions?: Types.ObjectId[];
    reactions?: { [key: string]: Types.ObjectId[] }; 
    replies?: Types.ObjectId[]; 
}

const noteSchema = new Schema<INote>(
    {
        applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
        author: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
        reactions: {
            type: Map,
            of: [{ type: Schema.Types.ObjectId, ref: "User" }], 
        },
        replies: [{ type: Schema.Types.ObjectId, ref: "Note" }],
    },
    { timestamps: true }
);

export const NoteModel = model<INote>("Note", noteSchema);
