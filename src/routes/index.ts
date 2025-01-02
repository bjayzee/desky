import { Router } from "express";
import auth from "./auth";
import agency from "./agency";
import google from "./google";

const router = Router();


export default (): Router =>{
    auth(router);
    agency(router);
    google(router);

    
    return router;
}