import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { NoteModel } from '../models/notes';
import { sendResponse } from '../utils/response';

// Add Note
export const addNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { applicationId, author, content, mentions } = req.body;

        // Input Validation
        if (!applicationId || !author || !content) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Application ID, author, and content are required');
        }

        const note = await new NoteModel({
            applicationId,
            author,
            content,
            mentions,
        }).save();

        const result = note.toObject();

        return sendResponse(res, httpStatus.CREATED, true, 'Note added successfully', result);
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};

// Add Reaction
export const addReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { noteId } = req.params;
        const { memberId, reaction } = req.body;

        if (!noteId || !memberId || !reaction) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Note ID, member ID, and reaction are required');
        }


        const updatedNote = await NoteModel.findByIdAndUpdate(
            noteId,
            { $addToSet: { [`reactions.${reaction}`]: memberId } },
            { new: true }
        ).lean();

        if (!updatedNote) {
            return sendResponse(res, httpStatus.NOT_FOUND, false, 'Note not found');
        }

        return sendResponse(res, httpStatus.OK, true, 'Reaction added successfully', updatedNote);
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};

// Add Reply
export const addReply = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { parentNoteId } = req.params;
        const { applicationId, author, content } = req.body;

        // Input Validation
        if (!parentNoteId || !applicationId || !author || !content) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Parent Note ID, application ID, author, and content are required');
        }

        // Create the reply note
        const reply = await new NoteModel({ applicationId, author, content }).save();

        // Add the reply ID to the parent note
        await NoteModel.findByIdAndUpdate(parentNoteId, { $push: { replies: reply._id } });

        const result = reply.toObject();

        return sendResponse(res, httpStatus.CREATED, true, 'Reply added successfully', result);
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};

// Get Notes by Application ID
export const getNoteByApplicationId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { applicationId } = req.params;

        // Input Validation
        if (!applicationId) {
            return sendResponse(res, httpStatus.BAD_REQUEST, false, 'Application ID is required');
        }

        // const notes = await NoteModel.find({ applicationId })
        //     .populate('author', 'name') // Populate only 'name' field, since 'email' doesn't exist in Members model
        //     .populate('mentions', 'name') // Populate only 'name' field
        //     .populate('replies') // Populate replies (full details of replies)
        //     .lean();

        const notes = await NoteModel.find({ applicationId })
            .populate({
                path: "author",
                model: "Agency",
                select: "fullName", // Specify the fields to populate
            })
            .populate({
                path: "author",
                model: "Members",
                select: "name", // Specify the fields to populate
            })
            .exec();

        if (notes.length === 0) {
            return sendResponse(res, httpStatus.NOT_FOUND, false, 'No notes found for the given application');
        }

        return sendResponse(res, httpStatus.OK, true, 'Notes fetched successfully', notes);
    } catch (error) {
        req.log?.error(error);
        next(error);
    }
};

