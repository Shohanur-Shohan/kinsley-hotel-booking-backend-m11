const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

//config
require("dotenv").config();

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.kszhklh.mongodb.net`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // await client.connect();

    const allRooms = client.db("kinsley").collection("all_rooms");

    app.get("/", async (req, res) => {
      res.send("success");
    });

    //sort all rooms by price ascending order
    app.get("/all-rooms/asc", async (req, res) => {
      const options = {
        sort: { price: 1 },
      };
      const result = await allRooms.find({}, options).toArray();
      res.send(result);
    });

    //sort all rooms by price descending order
    app.get("/all-rooms/des", async (req, res) => {
      const options = {
        sort: { price: -1 },
      };
      const result = await allRooms.find({}, options).toArray();
      res.send(result);
    });
  } catch (error) {
    console.log("Error connecting to MongoDB:", error);
  }
}
run();

app.listen(port, () => {
  console.log(`app is listening, ${port}`);
});
