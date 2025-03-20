// youtuber.routes.js
import express from "express";
import { 
    getDashboard, 
    getEditor, 
    getPendingwork, 
    getCompletedwork, 
    getRecommendation, 
    getPendingreviewwork, 
    approve, 
    reject, 
    assignWork, 
    addEditor 
} from "../controllers/youtuber.controllers.js";



import { verifyToken } from "../middelware/authMiddleware.js";

const router = express.Router();

// Base path: /api/youtuber
router.get("/getEditor/:id", verifyToken, getEditor); // to get all the editor list , which is added by youtuber {Implemented}
router.get("/pending_work/:id", verifyToken, getPendingwork); // to get pending work . which is assign bu youtuber but not submited by Editor {Implemented}
router.get("/completed_work/:id", verifyToken, getCompletedwork); // to get Completed work , which is submited by editor and approved by youtuber {Implemented}  
router.get("/pending_review/:id", verifyToken, getPendingreviewwork); // to get Pending Review Work , which is the work is submited by editor and youtuber action is pending - approve or reject {Implemented}

router.get("/:id", verifyToken, getDashboard); // to get No. of pending , pending at review and completed work {pending}
router.get("/recommendations/:id", verifyToken, getRecommendation); // to get Recommendation According to trend and channel history Performance {pending}

// Project management routes
router.post("/assign_work/:id", verifyToken, assignWork); // to assign work , to an editor {Implemented}
router.post("/add-editor/:id", verifyToken, addEditor); // to add Editor {Implemented}
router.put("/review_reject/:id", verifyToken, reject); // to change the status pending_review to pending {Implememted}

router.put("/review_approve/:id", verifyToken, approve); // to change the Visibility of youtube video to public from private and status pending_review to completed {pending}




export default router;
