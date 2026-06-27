const express = require('express');
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = 5000;

require('dotenv').config();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});


const uri = process.env.MONGO_DB_URL;
console.log(process.env.MONGO_DB_URL);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("skillswapdbuser");
    const tasksCollection = db.collection("tasks")


    app.post("/api/tasks", async (req, res) => {
      console.log("recive data ", req.body);
      try {
        const task = req.body;
        const existingTask = await tasksCollection.findOne({
          title: task.title,
          description: task.description,
          client_email: task.client_email,
        });
        if (existingTask) {
          return res.status(409).send({
            success: false,
            message: "Task already exists",
          });
        }
        const finalTaskData = {
          ...task,
          status: "open",           // রিকোয়ারমেন্ট অনুযায়ী ডিফল্ট স্ট্যাটাস
          proposals: [],            // শুরুতে প্রপোজাল খালি থাকবে
          createdAt: new Date(),    // টাস্ক পোস্টের সময়
          budget: Number(task.budget) // বাজেট নিশ্চিতভাবে নাম্বার ফরম্যাটে রাখা
        };
        const result = await tasksCollection.insertOne(finalTaskData);
        res.status(201).send({
          success: true,
          insertedId: result.insertedId,
          message: "Task posted successfully",
        });
      } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).send({
          success: false,
          message: "Failed to create task",
        });
      }
    });

    app.get("/mytasks/:id", async (req, res) => {
      const { id } = req.params
      const result = await tasksCollection.findOne({ _id: new ObjectId(id) })
      res.json(result)
    })

    // app.get("/mytasks/:id", async (req, res) => {
    //   try {
    //     const id = req.params.id;

    //     if (!ObjectId.isValid(id)) {
    //       return res.status(400).send({ error: true, message: "Invalid Task ID format" });
    //     }
    //     const taskArray = await tasksCollection.aggregate([
    //       { $match: { _id: new ObjectId(id) } },
    //       {
    //         $project: {
    //           title: 1,
    //           description: 1,
    //           budget: 1,
    //           deadline: 1,
    //           category: 1,
    //           status: 1,
    //           clientId: 1,
    //           client_email: 1,
    //           proposals: {
    //             $filter: {
    //               input: { $ifNull: ["$proposals", []] },
    //               as: "proposal",
    //               cond: { $ne: ["$$proposal.status", "Rejected"] }
    //             }
    //           }
    //         }
    //       }
    //     ]).toArray();
    //     if (!taskArray || taskArray.length === 0) {
    //       return res.status(404).send({ error: true, message: "Task not found" });
    //     }
    //     res.send(taskArray[0]);
    //   } catch (error) {
    //     console.error("Error fetching single task:", error);
    //     res.status(500).send({ error: true, message: "Internal server error" });
    //   }
    // });

    // get delete 
    app.delete("/api/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid Task ID",
          });
        }
        const existingTask = await tasksCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!existingTask) {
          return res.status(404).send({
            success: false,
            message: "Task not found",
          });
        }
        if (existingTask.status !== "open") {
          return res.status(403).send({
            success: false,
            message: "Only open tasks can be deleted",
          });
        }
        const result = await tasksCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send({
          success: true,
          result,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to delete task",
        });
      }
    });

    // get update task
    app.put("/mytasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedTask = req.body;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid Task ID",
          });
        }
        const existingTask = await tasksCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!existingTask) {
          return res.status(404).send({
            success: false,
            message: "Task not found",
          });
        }
        if (existingTask.status !== "open") {
          return res.status(403).send({
            success: false,
            message: "Only open tasks can be edited",
          });
        }
        const result = await tasksCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              title: updatedTask.title,
              description: updatedTask.description,
              budget: updatedTask.budget,
              deadline: updatedTask.deadline,
              category: updatedTask.category,
            },
          }
        );
        res.send({
          success: true,
          result,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to update task",
        });
      }
    });

    // my proposal
    // app.get("/api/my-proposals", async (req, res) => {
    //   try {
    //     const { email } = req.query;

    //     if (!email) {
    //       return res.status(400).send({ error: true, message: "Freelancer email is required" });
    //     }
    //     const proposals = await tasksCollection.aggregate([
    //       { $match: { "proposals.freelancerEmail": email } },
    //       { $unwind: "$proposals" },
    //       { $match: { "proposals.freelancerEmail": email } },
    //       {
    //         $project: {
    //           _id: 0,
    //           taskId: "$_id",
    //           taskTitle: "$title",
    //           taskBudget: "$budget",
    //           taskDeadline: "$deadline",
    //           taskStatus: "$status",
    //           proposalId: "$proposals.proposalId",
    //           proposedBudget: "$proposals.proposedBudget",
    //           estimatedDays: "$proposals.estimatedDays",
    //           coverNote: "$proposals.coverNote",
    //           status: "$proposals.status",
    //           createdAt: "$proposals.createdAt"
    //         }
    //       },
    //       { $sort: { createdAt: -1 } }
    //     ]).toArray();

    //     res.send(proposals);
    //   } catch (error) {
    //     console.error("Error fetching freelancer proposals:", error);
    //     res.status(500).send({ error: true, message: "Internal server error" });
    //   }
    // });

    // post proposals
    // app.post("/api/proposals", async (req, res) => {
    //   try {
    //     const { taskId, proposedBudget, estimatedDays, coverNote, freelancerEmail } = req.body;
    //     const newProposal = {
    //       proposalId: new ObjectId(),
    //       freelancerEmail: freelancerEmail || "qisykapa@mailinator.com",
    //       proposedBudget: Number(proposedBudget),
    //       estimatedDays: Number(estimatedDays),
    //       coverNote,
    //       status: "Pending",
    //       createdAt: new Date()
    //     };
    //     const filter = { _id: new ObjectId(taskId) };
    //     const updateDoc = {
    //       $push: { proposals: newProposal }
    //     };
    //     const result = await tasksCollection.updateOne(filter, updateDoc);
    //     res.status(201).send({ success: true, message: "Proposal submitted successfully", data: newProposal });
    //   } catch (error) {
    //     res.status(500).send({ error: true, message: "Internal server error" });
    //   }
    // }
    // );

    // app.put("/api/proposals/:taskId/:proposalId", async (req, res) => {
    //   try {
    //     const { taskId, proposalId } = req.params;
    //     const { status } = req.body;
    //     if (!ObjectId.isValid(taskId) || !ObjectId.isValid(proposalId)) {
    //       return res.status(400).send({ error: true, message: "Invalid Task ID or Proposal ID format" });
    //     }
    //     if (!status) {
    //       return res.status(400).send({ error: true, message: "Status is required" });
    //     }
    //     const filter = {
    //       _id: new ObjectId(taskId),
    //       "proposals.proposalId": new ObjectId(proposalId)
    //     };
    //     const updateDoc = {
    //       $set: { "proposals.$.status": status }
    //     };
    //     const result = await tasksCollection.updateOne(filter, updateDoc);

    //     if (result.matchedCount === 0) {
    //       return res.status(404).send({ error: true, message: "Task or Proposal not found" });
    //     }
    //     res.status(200).send({ success: true, message: `Proposal status updated to ${status}` });
    //   } catch (error) {
    //     console.error("Error updating proposal status:", error);
    //     res.status(500).send({ error: true, message: "Internal server error" });
    //   }
    // });

    // propasal detailes
    // app.get("/api/proposals/details/:proposalId", async (req, res) => {
    //   try {
    //     const { proposalId } = req.params;
    //     if (!ObjectId.isValid(proposalId)) {
    //       return res.status(400).send({
    //         success: false,
    //         message: "Invalid Proposal ID format"
    //       });
    //     }
    //     const proposalData = await tasksCollection.aggregate([
    //       { $match: { "proposals.proposalId": new ObjectId(proposalId) } },
    //       { $unwind: "$proposals" },
    //       { $match: { "proposals.proposalId": new ObjectId(proposalId) } },
    //       {
    //         $project: {
    //           _id: 0,
    //           taskId: "$_id",
    //           taskTitle: "$title",
    //           taskBudget: "$budget",
    //           taskDeadline: "$deadline",
    //           proposalId: "$proposals.proposalId",
    //           freelancerEmail: "$proposals.freelancerEmail",
    //           proposedBudget: "$proposals.proposedBudget",
    //           estimatedDays: "$proposals.estimatedDays",
    //           coverNote: "$proposals.coverNote",
    //           status: "$proposals.status",
    //           createdAt: "$proposals.createdAt"
    //         }
    //       }
    //     ]).toArray();
    //     if (!proposalData || proposalData.length === 0) {
    //       return res.status(404).send({
    //         success: false,
    //         message: "Proposal not found"
    //       });
    //     }
    //     res.status(200).send({
    //       success: true,
    //       data: proposalData[0]
    //     });
    //   } catch (error) {
    //     console.error("Error fetching single proposal details:", error);
    //     res.status(500).send({
    //       success: false,
    //       message: "Internal server error"
    //     });
    //   }
    // });




    // get all task 
    app.get("/task", async (req, res) => {
      const result = await tasksCollection.find().toArray();
      res.send(result)
    })


    //  get  task  with  status
    app.get("/opentask", async (req, res) => {
      const taskStatus = "open"
      const query = { status: taskStatus }
      const result = await tasksCollection.find(query).toArray();
      res.send(result)
    })

    // get inprogress task

    app.get("/inprogrestask", async (req, res) => {
      const taskStatus = "In Progress"
      const query = { status: taskStatus }
      const result = await tasksCollection.find(query).toArray();
      res.send(result)
    })

    // get status with task

    app.get("/gettaskstatus", async (req, res) => {
      const { status, category } = req.query;
      let query = {};
      if (status) query.status = status;
      if (category) query.category = category;
      const result = await tasksCollection.find(query).toArray();
      res.send(result);
    });

    //  get my task 
    app.get("/mytask", async (req, res) => {
      const { email } = req.query;
      const query = { client_email: email }
      const result = await tasksCollection.find(query).toArray();
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});