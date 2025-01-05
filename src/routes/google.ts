import { Router } from "express";
import { createEvent, listEvents, loginWithGoogle, refreshToken, signUpWithGoogle } from "../controllers/Google";


export default (router: Router): void => {

    router.get("google/events", listEvents);
    router.post("google/create-event", createEvent);
    router.post("google/auth/register", signUpWithGoogle);
    router.post("google/auth", loginWithGoogle);
    router.post("google/auth/refresh-token", refreshToken);
};
