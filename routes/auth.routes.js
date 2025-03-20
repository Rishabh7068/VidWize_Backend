import express from "express";
import { signupasyoutuber, OAuthUrl, signupaseditor , loginasyoutuber , loginaseditor , logout , oauth2callback } from "../controllers/auth.controllers.js";

const router = express.Router();

//Editor Routes Signup and Login
router.post("/signupaseditor", signupaseditor); // {Implemented}
router.post("/loginaseditor", loginaseditor); // {Implemented}

//Youtuber Routes Signup and Login
router.post("/loginasyoutuber", loginasyoutuber); // {Implemented}
router.post("/signupasyoutuber", signupasyoutuber); // {Implemented}

router.get("/getOauthUrl/:id", OAuthUrl); 
router.get("/oauth2callback", oauth2callback); 

router.post("/logout", logout); // {pending}

export default router;