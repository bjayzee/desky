import { applyJobs, fetchApplicationsByAgencyId, fetchApplicationsByJobId, getJobInfoById, getJobsByAgencyId, getJobsByAgencyName, postJob, updateJob } from "../controllers/jobs";
import { fetchAgencyById, fetchAgencyByName, inviteMember, updateApplicationStages } from "../controllers/agency";
import { Router } from "express";

export default (router: Router): void => {
    /**
     * @swagger
     * /agency/invite-member:
     *   post:
     *     summary: Invite a member
     *     tags: [Agency]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *              $ref: "#/components/schemas/Member"
     *     responses:
     *       200:
     *         description: Invitation sent successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: "#/components/schemas/Member"
     *       400:
     *         description: Input validation error
     *       409:
     *         description: member already exists
     */
    router.post("/agency/invite-member", inviteMember);

    router.post("/agency/post-job", postJob);

    router.get(`/agency/jobs/:agencyId`, getJobsByAgencyId);

    router.get(`/agency/jobs/companyName/:companyName`, getJobsByAgencyName);

    router.post("/agency/invite-member", inviteMember);

    router.get("/agency/:companyName", fetchAgencyByName);

    router.get("/agency/id/:agencyId", fetchAgencyById);

    router.patch("/jobs/update/:id", updateJob);

    router.post("/jobs/application", applyJobs);

    router.get('/jobs/:id', getJobInfoById);

    router.get('/applications/:jobId', fetchApplicationsByJobId);

    router.patch('/applications/status', updateApplicationStages);

    router.get('/applications/agency/:agencyId', fetchApplicationsByAgencyId);
};
