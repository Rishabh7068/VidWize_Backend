import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { google } from "googleapis";
import { config } from "dotenv";
import axios from "axios";

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

// to get all the editor list , which is added by youtuber {Implemented}
export const getEditor = async (req, res) => {
  try {
    const { id } = req.params;
    const youtuberData = await db.collection("usersYoutuber").doc(id).get();

    const editorData = youtuberData.data().preferredEditors;

    res.status(200).json({
      editorData: editorData,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching editor details" });
  }
};

// to get pending work . which is assign bu youtuber but not submited by Editor {Implemented}
export const getPendingwork = async (req, res) => {
  try {
    const { id } = req.params;
    const pendingSnapshot = await db
      .collection("projects")
      .where("youtuberId", "==", id)
      .where("status", "==", "pending")
      .get();
    const pendingWork = [];

    pendingSnapshot.forEach((doc) => {
      pendingWork.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json({
      pendingWork: pendingWork,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching pending work" });
  }
};

// to get Completed work , which is submited by editor and approved by youtuber {Implemented}
export const getCompletedwork = async (req, res) => {
  try {
    const { id } = req.params;

    const completedSnapshot = await db
      .collection("projects")
      .where("youtuberId", "==", id)
      .where("status", "==", "completed")
      .get();

    const completedWork = [];
    completedSnapshot.forEach((doc) => {
      completedWork.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({ completedWork });
  } catch (error) {
    res.status(500).json({ error: "Error fetching completed work" });
  }
};

// to get Pending Review Work , which is the work is submited by editor and youtuber action is pending - approve or reject {Implemented}
export const getPendingreviewwork = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewSnapshot = await db
      .collection("projects")
      .where("youtuberId", "==", id)
      .where("status", "==", "pending_review")
      .get();

    const pendingReviews = [];
    reviewSnapshot.forEach((doc) => {
      pendingReviews.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({ pendingReviews });
  } catch (error) {
    res.status(500).json({ error: "Error fetching pending review work" });
  }
};

// to assign work , to an editor {Implemented}
export const assignWork = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      editorId,
      editorName,
      projectName,
      driveLink,
      instructions,
      currentDate,
      dueDate,
    } = req.body;
    const newProject = {
      youtuberId: id,
      editorId,
      editorName,
      projectName,
      driveLink,
      instructions,
      currentDate,
      dueDate,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const projectRef = await db.collection("projects").add(newProject);

    // Update editor's assignment count
    await db
      .collection("usersEditor")
      .doc(editorId)
      .update({
        activeProjects: admin.firestore.FieldValue.increment(1),
      });

    res.status(201).json({
      message: "Work assigned successfully",
      projectId: projectRef.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Error assigning work" });
  }
};

// to add Editor {Implemented}
export const addEditor = async (req, res) => {
  try {
    const { id } = req.params; // YouTuber's ID
    const { editorEmail } = req.body;

    // Fetch editor's document using the email
    const editorSnapshot = await db
      .collection("usersEditor")
      .where("email", "==", editorEmail)
      .limit(1) // Limit to 1 document
      .get();

    if (editorSnapshot.empty) {
      return res.status(404).json({ error: "Editor not found" });
    }

    // Extract editor details
    const editorDoc = editorSnapshot.docs[0];
    const editorId = editorDoc.id;
    const editorData = editorDoc.data();

    const youtuberDoc = await db.collection("usersYoutuber").doc(id).get();

    if (!youtuberDoc.exists) {
      return res.status(404).json({ error: "YouTuber not found" });
    }

    const youtuberData = youtuberDoc.data();

    // Add editor to the YouTuber's preferred editors list with details
    await db
      .collection("usersYoutuber")
      .doc(id)
      .update({
        preferredEditors: admin.firestore.FieldValue.arrayUnion({
          id: editorId,
          name: editorData.name,
          email: editorData.email,
        }),
      });

    // Add YouTuber to the editor's clients list
    await db
      .collection("usersEditor")
      .doc(editorId)
      .update({
        clients: admin.firestore.FieldValue.arrayUnion({
          id: id,
          name: youtuberData.name,
          email: youtuberData.email,
          channelname: youtuberData.channelname,
        }),
      });

    res.status(201).json({ message: "Editor added successfully" });
  } catch (error) {
    console.error("Error adding editor:", error);
    res.status(500).json({ error: "Error adding editor" });
  }
};

// to change the status pending_review to pending {Implememted}
export const reject = async (req, res) => {
  try {
    // const { id } = req.params;
    const { instructions, projectId } = req.body;

    await db.collection("projects").doc(projectId).update({
      status: "pending",
      instructions,
    });

    res.status(200).json({ message: "Work rejected successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error rejecting work" });
  }
};

// to get No. of pending , pending at review and completed work {pending}
export const getDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Get youtuber's basic info
    const youtuberDoc = await db.collection("users").doc(id).get();
    if (!youtuberDoc.exists) {
      return res.status(404).json({ error: "Youtuber not found" });
    }

    // Get counts of different work categories
    const [pendingWork, completedWork, pendingReview] = await Promise.all([
      db
        .collection("projects")
        .where("youtuberId", "==", id)
        .where("status", "==", "pending")
        .count()
        .get(),
      db
        .collection("projects")
        .where("youtuberId", "==", id)
        .where("status", "==", "completed")
        .count()
        .get(),
      db
        .collection("projects")
        .where("youtuberId", "==", id)
        .where("status", "==", "pending_review")
        .count()
        .get(),
    ]);

    res.status(200).json({
      youtuber: youtuberDoc.data(),
      stats: {
        pendingWorkCount: pendingWork.data().count,
        completedWorkCount: completedWork.data().count,
        pendingReviewCount: pendingReview.data().count,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
};

// to get Recommendation According to trend and channel history Performance {pending}
export const getRecommendation = async (req, res) => {
  try {
    const { id } = req.params;

    // Get editors with high ratings and availability
    const editorsSnapshot = await db
      .collection("users")
      .where("role", "==", "editor")
      .where("rating", ">=", 4)
      .where("isAvailable", "==", true)
      .limit(5)
      .get();

    const recommendations = [];
    editorsSnapshot.forEach((doc) => {
      const editorData = doc.data();
      delete editorData.password;
      recommendations.push({ id: doc.id, ...editorData });
    });

    res.status(200).json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: "Error fetching recommendations" });
  }
};

// to change the Visibility of youtube video to public from private and status pending_review to completed {pending}
export const approve = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, projectId } = req.body;

    // Update editor's rating
    const pd = await db.collection("projects").doc(projectId).get();

    console.log(pd.data());
    const videoId = pd.data().videoId;
    // Get refresh token for the YouTuber
    const youtuberDoc = await db.collection("usersYoutuber").doc(id).get();

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

    // Update the video's privacy status to public
    const response = await youtube.videos.update({
      part: "status",
      requestBody: {
        id: videoId,
        status: {
          privacyStatus: "public",
        },
      },
    });

    await db.collection("projects").doc(projectId).update({
      status: "completed",
      feedback,
      completedAt: new Date().toISOString(),
      approvedBy: id,
    });

    res.status(200).json({
      message: "Video privacy status updated to public",
      videoId: videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  } catch (error) {
    console.error("Error updating video privacy:", error);
    res.status(500).json({
      message: "Failed to update video privacy status",
      error: error.message,
    });
  }
};
