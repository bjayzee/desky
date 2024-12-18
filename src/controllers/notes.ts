import { NoteModel } from "../models/notes";

export const addNote = async (applicationId: string, author: string, content: string, mentions: string[] = []) => {
    const note = await new NoteModel({ applicationId, author, content, mentions }).save();
    return note.toObject();
};


export const addReaction = async (noteId: string, userId: string, reaction: string) => {
    return NoteModel.findByIdAndUpdate(
        noteId,
        { $addToSet: { [`reactions.${reaction}`]: userId } },
        { new: true }
    ).lean();
};


export const addReply = async (parentNoteId: string, applicationId: string, author: string, content: string) => {
    const reply = await new NoteModel({ applicationId, author, content }).save();
    await NoteModel.findByIdAndUpdate(parentNoteId, { $push: { replies: reply._id } });
    return reply.toObject();
};
