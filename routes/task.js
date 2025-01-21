import express from "express";
import Task from "../models/task.js";
import sendResponse from "../helpers/Response.js";
import mongoose from "mongoose";

const router = express.Router();

router.post(`/`, async (req, res) => {
  try {
    const { task } = req.body;

    let newTask = new Task({
      task: task,
      createdBy: req.user._id,
    });

    newTask = await newTask.save();

    sendResponse(res, 201, newTask, false, "Task Added Successfully");
  } catch (error) {
    sendResponse(res, 500, null, true, "Failed to add task");
  }
});

router.get(`/`, async (req, res) => {
  try {
    const tasks = await Task.find({ createdBy: req.user._id });
    sendResponse(res, 201, tasks, false, "Tasks Retrieved Successfully");
  } catch (error) {
    console.error("Error retrieving tasks:", error);
    sendResponse(res, 500, null, true, "Failed to retrieve tasks");
  }
});

router.put(`/`, async (req, res) => {
  try {
    const { task, taskId } = req.body;

    if (!task || !taskId) {
      return sendResponse(
        res,
        400,
        null,
        true,
        "Task ID and Task content are required"
      );
    }

    let updatedTask = await Task.findById(taskId);

    if (!updatedTask) {
      return sendResponse(res, 404, null, true, "Task not found");
    }

    updatedTask.task = task;

    updatedTask = await updatedTask.save();

    sendResponse(res, 200, updatedTask, false, "Task updated  Successfully");
  } catch (error) {
    sendResponse(res, 500, null, true, "Failed to update task");
  }
});

router.delete(`/:id`, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, 400, null, true, "Task ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, null, true, "Invalid Task ID");
    }

    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return sendResponse(res, 404, null, true, "Task not found");
    }

    sendResponse(res, 200, deletedTask, false, "Task deleted successfully");
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, null, true, "Failed to delete task");
  }
});

export default router;
