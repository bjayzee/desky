import { Router } from "express";
import { createEvent, listEvents, loginWithGoogle, refreshToken, signUpWithGoogle } from "../controllers/Google";


export default (router: Router): void => {

    router.get("google/events", listEvents);
    router.post("google/create-event", createEvent);
    router.post("auth/google/register", signUpWithGoogle);
    router.post("auth/google", loginWithGoogle);
    router.post("google/auth/refresh-token", refreshToken);
};
