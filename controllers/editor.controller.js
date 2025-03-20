import { auth } from '../firebase/connectToFirebase.js';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// get Pending Work , Data which is Assign by Youtuber to Editor {implemented}
export const getAssignwork = async (req, res) => {
    try {
        const editorId = req.params.id;
        
        const assignedSnapshot = await db.collection('projects')
            .where('editorId', '==', editorId)
            .where('status', '==', 'pending')
            .get();

        const assignedWork = [];
        assignedSnapshot.forEach(doc => {
            assignedWork.push({
                id: doc.id,
                ...doc.data()
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
        const pendingSnapshot = await db.collection('projects')
            .where('editorId', '==', editorId)
            .where('status', '==', 'pending_review')
            .get();
    
        const pendingApprovals = [];
        pendingSnapshot.forEach(doc => {
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
        
        const completedSnapshot = await db.collection('projects')
            .where('editorId', '==', editorId)
            .where('status', '==', 'completed')
            .get();

        const completedWork = [];
        completedSnapshot.forEach(doc => {
            completedWork.push({
                id: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json({ 
            completedWork
        });
    } catch (error) {
        res.status(500).json({ error: "Error fetching completed work" });
    }
};

// to get all the Youtuber list who added this editor in his list {pending}
export const getYoutuber = async (req, res) => {
    try {
        const { id } = req.params;
        const youtuberData = await db.collection('usersEditor')
            .doc(id)
            .get();
        
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
        const editorDoc = await db.collection('users').doc(editorId).get();
        if (!editorDoc.exists) {
            return res.status(404).json({ error: "Editor not found" });
        }

        // Get counts of different work categories
        const [assignedWork, pendingApproval, completedWork] = await Promise.all([
            db.collection('projects')
                .where('editorId', '==', editorId)
                .where('status', '==', 'assigned')
                .count()
                .get(),
            db.collection('projects')
                .where('editorId', '==', editorId)
                .where('status', '==', 'pending_review')
                .count()
                .get(),
            db.collection('projects')
                .where('editorId', '==', editorId)
                .where('status', '==', 'completed')
                .count()
                .get()
        ]);

        // Get recent activities
        const recentActivities = await db.collection('projects')
            .where('editorId', '==', editorId)
            .orderBy('updatedAt', 'desc')
            .limit(5)
            .get();

        const activities = [];
        recentActivities.forEach(doc => {
            activities.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json({
            editor: editorDoc.data(),
            stats: {
                assignedWorkCount: assignedWork.data().count,
                pendingApprovalCount: pendingApproval.data().count,
                completedWorkCount: completedWork.data().count
            },
            recentActivities: activities
        });
    } catch (error) {
        res.status(500).json({ error: "Error fetching dashboard data" });
    }
};




// get Reassign Work , this is the work which is rejected on review from youtuber and need improvement {pending}
export const getReassignwork = async (req, res) => {
    try {
        const editorId = req.params.id;
        
        const reassignedSnapshot = await db.collection('projects')
            .where('editorId', '==', editorId)
            .where('status', '==', 'revision_needed')
            .get();

        const reassignedWork = [];
        reassignedSnapshot.forEach(doc => {
            reassignedWork.push({
                id: doc.id,
                ...doc.data()
            });
        });
        res.status(200).json({ reassignedWork });
    } catch (error) {
        res.status(500).json({ error: "Error fetching reassigned work" });
    }
};


// to submit work , which will upload video on youtube privately in youtuber Account {pending}
export const submitWork = async (req, res) => {
    try {
        const editorId = req.params.id;
        const { projectId, videoUrl, comments, timeSpent, tags } = req.body;

        // Validate project exists and belongs to editor
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists || projectDoc.data().editorId !== editorId) {
            return res.status(404).json({ error: "Project not found or unauthorized" });
        }

        // Create submission
        const submission = {
            videoUrl,
            comments,
            timeSpent,
            tags,
            submittedAt: new Date().toISOString(),
            status: 'pending_review'
        };

        // Update project
        await db.collection('projects').doc(projectId).update({
            ...submission,
            previousVersions: firebase.firestore.FieldValue.arrayUnion({
                ...projectDoc.data(),
                updatedAt: new Date().toISOString()
            })
        });

        // Update editor's metrics
        await db.collection('users').doc(editorId).update({
            totalSubmissions: firebase.firestore.FieldValue.increment(1),
            activeProjects: firebase.firestore.FieldValue.increment(-1)
        });

        // Create notification for youtuber
        await db.collection('notifications').add({
            userId: projectDoc.data().youtuberId,
            type: 'work_submitted',
            projectId,
            editorId,
            createdAt: new Date().toISOString(),
            read: false
        });

        res.status(200).json({ 
            message: "Work submitted successfully",
            submission
        });
    } catch (error) {
        res.status(500).json({ error: "Error submitting work" });
    }
};

