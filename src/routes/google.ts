import { Router } from "express";
import { createEvent, generateAuthUrl, listEvents, refreshToken } from "../controllers/Google";


export default (router: Router): void => {

    router.get("/google/events", listEvents);
    router.post("/google/create-event", createEvent);
    router.post("/google/auth/refresh-token", refreshToken);
    router.get("/google/auth-url", generateAuthUrl);
};
