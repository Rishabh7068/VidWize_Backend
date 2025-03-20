import { auth } from '../firebase/connectToFirebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

export const signupasyoutuber = async (req, res) => {
    try {
        const { name, email, password , channelname , channeluid } = req.body;

        const userRecord = await auth.createUser({
            name,
            email,
            password,
            channelname,
            channeluid,
            displayName: name,
        });

        await db.collection('usersYoutuber').doc(userRecord.uid).set({
            name,
            email,
            channelname,
            channeluid,
            OAuthStatus : false,
            role: 'youtuber',
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            message: "Youtuber account created successfully",
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                role: 'Youtuber'
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating account",
            error: error.message
        });
    }
};

export const signupaseditor = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userRecord = await auth.createUser({
            name,
            email,
            password,
            displayName: name,
        });

        await db.collection('usersEditor').doc(userRecord.uid).set({
            name,
            email,
            role: 'editor',
            createdAt: new Date().toISOString()
        });

        res.status(201).json({
            message: "Editor account created successfully",
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                role: 'editor'
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating account",
            error: error.message
        });
    }
};

export const loginasyoutuber = async (req, res) => {
    try {
        const { idToken } = req.body;
        
        // Verify the ID token
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('usersYoutuber').doc(decodedToken.uid).get();
        
        if (!userDoc.exists || userDoc.data().role !== 'youtuber') {
            return res.status(403).json({ message: "Access denied. Not a creator account." });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: 'youtuber'
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

export const loginaseditor = async (req, res) => {
    try {
        const { idToken } = req.body;
        
        // Verify the ID token
        const decodedToken = await auth.verifyIdToken(idToken);
        const userDoc = await db.collection('usersEditor').doc(decodedToken.uid).get();
        
        if (!userDoc.exists || userDoc.data().role !== 'editor') {
            return res.status(403).json({ message: "Access denied. Not an editor account." });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: 'editor'
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        const { uid } = req.body; // Expecting the user's UID in request body

        if (!uid) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Revoke all refresh tokens for the user
        await auth.revokeRefreshTokens(uid);
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Logout failed",
            error: error.message
        });
    }
};
export const OAuthUrl = async (req, res) => {
    const uid = req.params.id
    const sessionId = uuidv4();
    await db.collection('oauthSessions').doc(sessionId).set({
        uid,
        createdAt: new Date()
    });

    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
            state: sessionId
          });
          res.status(200).json({ authUrl });
    } catch (error) {
        res.status(500).json({
            message: "URL generation failed",
            error: error.message
        });
    }
};

export const oauth2callback = async (req , res) => {
    const { state } = req.query;  // Get session ID from state
    const code = req.query.code;


    if (!state) {
        return res.status(400).json({ message: "Session ID is missing" });
    }

    // Retrieve session data from Firestore 
    const sessionDoc = await db.collection('oauthSessions').doc(state).get();

    if (!sessionDoc.exists) {
        return res.status(400).json({ message: "Invalid or expired session ID" });
    }

    const { uid } = sessionDoc.data();
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        await db.collection('usersYoutuber').doc(uid).update({
            tokens : tokens
        });
        res.redirect(`http://localhost:5173/creator`);
        res.status(200).json({ 
            message : "access token stored"
        });
    } catch (error) {
        res.status(500).json({
            message : "Error retrieving access token",
            error : error
        });
    }
}


