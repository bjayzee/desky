import { Router } from "express";
import { createEvent, listEvents } from "../controllers/Google";


export default (router: Router): void => {

    router.get("google/events", listEvents);
    router.post("google/create-event", createEvent);
};
