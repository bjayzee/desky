import { Router } from "express";
import auth from "./auth";
import agency from "./agency";

const router = Router();


export default (): Router =>{
    auth(router);
    agency(router);


    
    return router;
}