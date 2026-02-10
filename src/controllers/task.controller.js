import { Task } from "../models/task.model.js";
import mongoose from "mongoose";

async function getTasks(req, res) {
  try {
    const userId = req.user.userId; // Assuming the JWT middleware adds the user info to req.user
    const tasks = await Task.find({ userId });

    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }
    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

async function createTask(req, res) {
  try {
    const { title, description, status, dueDate } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and Description are required" });
    }

    const newTask = new Task({
      title,
      description,
      status,
      dueDate,
      userId: req.user.userId,
    });
    await newTask.save();
    res
      .status(201)
      .json({ task: newTask, message: "Task created successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Task did`nt added due to server error",
      error: error.message,
    });
  }
}

async function updateTask(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Task ID" });
    }
    // console.log("id : ", id);
    const { title, description, status, dueDate } = req.body;

    const task = await Task.findOne({ _id: id, userId: req.user.userId });
    if (!task) return res.status(404).json({ message: "Task not found" });

    // UPDATE FIELDS
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.dueDate = dueDate || task.dueDate;

    await task.save();
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({
      message: "Server Error | Failed Updating task! ",
      error: error.message,
    });
  }
}

async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Task ID" });
    }

    const task = await Task.findOneAndDelete(
      {
        _id: id,
        userId: req.user.userId,
      },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    res.status(200).json({ message: "Task Deleted Successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server Error | Failed Deleting task! ",
      error: error.message,
    });
  }
}

const filterTask = async (req, res) => {
  try {
    const matchFilter = { userId: req.user.userId };
    const { status, dueDate, title, page = 1, limit = 10 } = req.query;

    if (status) matchFilter.status = status;
    if (dueDate) matchFilter.dueDate = { $lte: new Date(dueDate) };
    if (title) matchFilter.title = { $regex: title, $options: "i" };

    console.log(matchFilter);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const result = await Task.aggregate([
      { $match: matchFilter },  
      {
        $facet: {  
          totalCount: [{ $count: "value" }],
          paginatedTasks: [
            { $sort: { createdAt: -1 } },  
            { $skip: skip },
            { $limit: limitNum }
          ]
        }
      },
      {
        $project: {  
          totalCount: { $ifNull: [{ $first: "$totalCount.value" }, 0] },
          tasks: "$paginatedTasks",
          page: pageNum,
          pages: { $ceil: [{ $divide: [{ $ifNull: [{ $first: "$totalCount.value" }, 0] }, limitNum] } ] }
        }
      }
    ]);

    console.log(result);

    const data = result[0] || { totalCount: 0, tasks: [], page: 1, pages: 1 };

    if (data.tasks.length === 0)
      return res.status(404).json({ message: "No tasks found matching the criteria" });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export { getTasks, createTask, updateTask, deleteTask, filterTask };
