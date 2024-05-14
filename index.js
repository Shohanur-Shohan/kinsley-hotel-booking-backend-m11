const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParsar = require("cookie-parser");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//config
require("dotenv").config();

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://kinsley-hotel-booking.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParsar());

//mongodb
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

    app.post("/jwt", async (req, res) => {
      const user = req?.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      // console.log(user, "from server");
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: true,
        })
        .send({ success: true });
    });

    //remove cookies by logout
    app.post("/logout", async (req, res) => {
      const user = req?.body;
      // console.log(user, "from server");
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
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

    //singlepage
    app.get("/room-details/:id", async (req, res) => {
      console.log("cookie server", req?.cookies);
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allRooms.findOne(query);
      // console.log(result);
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
