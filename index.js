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
      // "http://localhost:5173",
      "https://kinsley-hotel-booking.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParsar());

// api middleware
const logger = (req, res, next) => {
  // console.log("logger: ", req.url, req.method);
  next();
};
// verify token
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log(token, "verify");
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.decodedUser = decoded;
    next();
  });
};

//mongodb
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.kszhklh.mongodb.net`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

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
      res.cookie("token", token, cookieOption).send({ success: true });
    });

    //remove cookies by logout
    app.post("/logout", async (req, res) => {
      const user = req?.body;
      // console.log(user, "from server");
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });

    //featured rooms
    app.get("/featured", async (req, res) => {
      const query = { featured: true };
      const result = await allRooms.find(query).toArray();
      res.send(result);
    });

    //sort all rooms by price descending order
    app.get("/all-rooms", async (req, res) => {
      const result = await allRooms.find().toArray();
      res.send(result);
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
      // console.log("cookie server", req?.cookies);
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allRooms.findOne(query);
      // console.log(result);
      res.send(result);
    });

    //book a room
    app.post("/roomBooking/:id", async (req, res) => {
      const bookData = req?.body;
      // console.log(bookData?.user_info?.email);
      const id = req.params.id;
      // console.log("id", id, "data", roomData);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $push: {
          booked_info: bookData,
          customers: bookData?.user_info?.email,
        },
        $set: {
          status: "unavailable",
        },
      };
      const result = await allRooms.updateOne(filter, updateDoc, options);
      // console.log(result);
      res.send(result);
      // console.log(user, "from server");
    });

    //update a room
    app.patch("/updateRoomBooking/:id", async (req, res) => {
      const { start_date, end_date } = req.body?.date_info;
      const bookingId = req.params.id;

      const room = await allRooms.findOne({
        "booked_info.booking_id": bookingId,
      });

      if (!room) {
        return res.status(404).send({ message: "Room or booking not found" });
      }

      const result = await allRooms.updateOne(
        {
          _id: room._id,
          "booked_info.booking_id": bookingId,
        },
        {
          $set: {
            "booked_info.$.date_info.start_date": start_date,
            "booked_info.$.date_info.end_date": end_date,
          },
        }
      );

      res.send(result);
    });

    //delete booked_info
    app.post("/deleteRoomBooking/:roomId", async (req, res) => {
      const roomId = req.params?.roomId;

      const filter = { _id: new ObjectId(roomId) };

      const updateDoc = {
        $set: {
          booked_info: [],
          status: "available",
        },
      };
      const result = await allRooms.updateOne(filter, updateDoc);
      res.send(result);
    });

    //user booking list
    app.get("/myRoomBooked/:email", async (req, res) => {
      const userEmail = req.params?.email;
      // const decodedEmail = await req.decodedUser?.email;
      // console.log(userEmail, decodedEmail);
      // if (userEmail !== decodedEmail) {
      //   res.status(403).send({ message: "Forbidden Access" });
      // } else {
      const query = {
        "booked_info.user_info.email": `${userEmail}`,
      };
      const result = await allRooms.find(query).toArray();
      res.send(result);
      // }
    });

    app.post("/giveReview/:roomId", async (req, res) => {
      const roomId = req.params?.roomId;
      // console.log((roomId, req?.body));
      const reviewData = req?.body;
      const filter = { _id: new ObjectId(roomId) };

      const updateDoc = {
        $push: {
          reviews: reviewData,
        },
      };
      const result = await allRooms.updateOne(filter, updateDoc);
      res.send(result);
    });
  } catch (error) {
    // console.log("Error connecting to MongoDB:", error);
  }
}
run();

app.listen(port, () => {
  // console.log(`app is listening, ${port}`);
});
