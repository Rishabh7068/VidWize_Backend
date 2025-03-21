import { auth } from "../firebase/connectToFirebase.js";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import multer from "multer";
import { config } from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const db = getFirestore();
config();

// YouTube authentication
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Configure multer to use memory storage
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 1000 * 1024 * 1024, // 1000MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Not a video file! Please upload only videos."), false);
    }
  },
});

// get Pending Work , Data which is Assign by Youtuber to Editor {implemented}
export const getAssignwork = async (req, res) => {
  try {
    const editorId = req.params.id;

    const assignedSnapshot = await db
      .collection("projects")
      .where("editorId", "==", editorId)
      .where("status", "==", "pending")
      .get();

    const assignedWork = [];
    assignedSnapshot.forEach((doc) => {
      assignedWork.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({ assignedWork });
  } catch (error) {
    res.status(500).json({ error: "Error fetching assigned work" });
  }
};

// get Pending Review Work , Data which is submited by Editor but Need Youtuber Approval {implemented}
export const getPendingforapproval = async (req, res) => {
  try {
    const editorId = req.params.id;
    const pendingSnapshot = await db
      .collection("projects")
      .where("editorId", "==", editorId)
      .where("status", "==", "pending_review")
      .get();

    const pendingApprovals = [];
    pendingSnapshot.forEach((doc) => {
      pendingApprovals.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json({ pendingApprovals });
  } catch (error) {
    res.status(500).json({ error: "Error fetching pending approvals" });
  }
};

// get Completed Work , this is the work which is Approved by Youtuber and Completed {implemented}
export const getcompletedwork = async (req, res) => {
  try {
    const editorId = req.params.id;

    const completedSnapshot = await db
      .collection("projects")
      .where("editorId", "==", editorId)
      .where("status", "==", "completed")
      .get();

    const completedWork = [];
    completedSnapshot.forEach((doc) => {
      completedWork.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    res.status(200).json({
      completedWork,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching completed work" });
  }
};

// to get all the Youtuber list who added this editor in his list {Implemented}
export const getYoutuber = async (req, res) => {
  try {
    const { id } = req.params;
    const youtuberData = await db.collection("usersEditor").doc(id).get();

    const editorData = youtuberData.data().clients;

    res.status(200).json({
      editorData: editorData,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching editor details" });
  }
};

// to get No. of Pending Work , Pending for Review , Completed Work  {Pending}
export const getDashboard = async (req, res) => {
  try {
    const editorId = req.params.id;

    // Get editor's basic info
    const editorDoc = await db.collection("users").doc(editorId).get();
    if (!editorDoc.exists) {
      return res.status(404).json({ error: "Editor not found" });
    }

    // Get counts of different work categories
    const [assignedWork, pendingApproval, completedWork] = await Promise.all([
      db
        .collection("projects")
        .where("editorId", "==", editorId)
        .where("status", "==", "assigned")
        .count()
        .get(),
      db
        .collection("projects")
        .where("editorId", "==", editorId)
        .where("status", "==", "pending_review")
        .count()
        .get(),
      db
        .collection("projects")
        .where("editorId", "==", editorId)
        .where("status", "==", "completed")
        .count()
        .get(),
    ]);

    // Get recent activities
    const recentActivities = await db
      .collection("projects")
      .where("editorId", "==", editorId)
      .orderBy("updatedAt", "desc")
      .limit(5)
      .get();

    const activities = [];
    recentActivities.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({
      editor: editorDoc.data(),
      stats: {
        assignedWorkCount: assignedWork.data().count,
        pendingApprovalCount: pendingApproval.data().count,
        completedWorkCount: completedWork.data().count,
      },
      recentActivities: activities,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
};

// get Reassign Work , this is the work which is rejected on review from youtuber and need improvement {pending}
export const getReassignwork = async (req, res) => {
  try {
    const editorId = req.params.id;

    const reassignedSnapshot = await db
      .collection("projects")
      .where("editorId", "==", editorId)
      .where("status", "==", "revision_needed")
      .get();

    const reassignedWork = [];
    reassignedSnapshot.forEach((doc) => {
      reassignedWork.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    res.status(200).json({ reassignedWork });
  } catch (error) {
    res.status(500).json({ error: "Error fetching reassigned work" });
  }
};

// to submit work , which will upload video on youtube privately in youtuber Account {Implemented}
export const submitWork = [
  upload.single("file"), // Apply multer middleware
  async (req, res) => {
    const editorId = req.params.id;
    let tempFilePath;

    try {
      // Access form fields from req.body
      const { title, description, tags, ProjectId } = req.body;

      // Access file from req.file (processed by multer)
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      // Get YouTuber ID from project
      const projectSnapshot = await db
        .collection("projects")
        .doc(ProjectId) // Using ProjectId from request
        .get();

      if (!projectSnapshot.exists) {
        return res.status(404).json({ message: "Project not found" });
      }

      const projectData = projectSnapshot.data();
      const youtuberId = projectData.youtuberId;

      if (!youtuberId) {
        return res
          .status(400)
          .json({ message: "YouTuber ID not found for this project" });
      }

      // Get refresh token for the YouTuber
      const youtuberDoc = await db
        .collection("usersYoutuber")
        .doc(youtuberId)
        .get();

      if (!youtuberDoc.exists) {
        return res.status(404).json({ message: "YouTuber not found" });
      }

      const youtuberData = youtuberDoc.data();
      const refresh_token = youtuberData.tokens?.refresh_token;

      if (!refresh_token) {
        return res.status(400).json({ message: "Refresh token not found" });
      }

      // Get new access token
      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refresh_token,
          grant_type: "refresh_token",
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const access_token = tokenResponse.data.access_token;
      oauth2Client.setCredentials({ access_token: access_token });

      // Create YouTube service
      const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
      });

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Create temporary file
      tempFilePath = path.join(
        __dirname,
        "temp_" + Date.now() + path.extname(req.file.originalname || ".mp4")
      );
      fs.writeFileSync(tempFilePath, req.file.buffer);

      // Upload to YouTube
      const videoDetails = {
        snippet: {
          title: title || "Uploaded video",
          description: description || "Video uploaded from my app",
          tags: tags ? tags.split(",") : ["api", "upload"],
          categoryId: "22", // People & Blogs category
        },
        status: {
          privacyStatus: "private", // 'private', 'public', or 'unlisted'
        },
      };

      const videoInsertResponse = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: videoDetails,
        media: {
          body: fs.createReadStream(tempFilePath),
        },
      });

      // Store reference in Firestore
      await db
        .collection("projects")
        .doc(ProjectId)
        .update({
            title, 
          videoId: videoInsertResponse.data.id,
          videoUrl: `https://www.youtube.com/watch?v=${videoInsertResponse.data.id}`,
          status: "pending_review",
          submitedAt: new Date(),
        });

      // Delete the temp file after upload
      fs.unlinkSync(tempFilePath);

      res.status(200).json({
        message: "Video uploaded to YouTube successfully",
        videoId: videoInsertResponse.data.id,
        videoUrl: `https://www.youtube.com/watch?v=${videoInsertResponse.data.id}`,
      });
    } catch (error) {
      console.error("Error uploading to YouTube:", error);

      // Clean up any temp file if it exists
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      res.status(500).json({
        message: "Failed to upload video to YouTube",
        error: error.message,
      });
    }
  },
];
