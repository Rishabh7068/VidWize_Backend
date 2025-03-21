// editor.routes.js
import express from "express";
import { 
    getDashboard, 
    getAssignwork, 
    getPendingforapproval, 
    getReassignwork, 
    getcompletedwork, 
    submitWork,
    getYoutuber   
} from "../controllers/editor.controller.js";
import { verifyToken } from "../middelware/authMiddleware.js";


const router = express.Router();

// Base path: /api/editor
router.get("/assignwork/:id", verifyToken, getAssignwork); // get Pending Work , Data which is Assign by Youtuber to Editor {implemented}
router.get("/pending_approval/:id", verifyToken, getPendingforapproval); // get Pending Review Work , Data which is submited by Editor but Need Youtuber Approval {implemented}
router.get("/completed_work/:id", verifyToken, getcompletedwork); // get Completed Work , this is the work which is Approved by Youtuber and Completed {implemented}
router.get("/getYoutuber/:id", verifyToken, getYoutuber); // to get all the Youtuber list who added this editor in his list {Implemented}
router.post("/submit_work/:id", verifyToken, submitWork); // to submit work , which will upload video on youtube privately in youtuber Account {Implemented}

router.get("/:id", verifyToken, getDashboard); // to get No. of Pending Work , Pending for Review , Completed Work  {Pending}
router.get("/reassign_work/:id", verifyToken, getReassignwork); // get Reassign Work , this is the work which is rejected on review from youtuber and need improvement {pending Not Mandatory}



export default router;
