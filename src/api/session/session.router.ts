import { Router } from "express";
import { createSession } from "./session.controller.js";

const router = Router();

// POST session/create
router.post("/create", createSession);

export default router;
