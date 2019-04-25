import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

import Issue from "./models/issue";
import Account from "./models/user";
import Session from "./models/session";

const app = express();
const bcrypt = require("bcrypt");
const connection = mongoose.connection;

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:4200"]
  })
);

app.use(bodyParser.json());
app.use(
  session({
    secret: "Angular Secret",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: connection,
      ttl: 0.2 * 60,
      autoRemove: "native"
    }),
    cookie: { secure: false }
  })
);

mongoose.connect("mongodb://localhost:27017/mydb", {
  useNewUrlParser: true,
  useCreateIndex: true
});

connection.once("open", () => {
  console.log("MongoDB database connection established successfully.");
});

app.route("/api/issues").get(verifyToken, (req, res) => {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(req.query.size);
  var response = {};
  var query = {};
  if (pageNo < 0 || pageNo === 0) {
    response = {
      error: true,
      message: "invalid page number, should start with 1"
    };
    return res.json(response);
  }
  query.skip = size * (pageNo - 1);
  query.limit = size;
  // Find some documents
  Issue.countDocuments({}, function(err, totalCount) {
    if (err) {
      response = { error: true, data: "Error fetching data" };
    }
    Issue.find({}, {}, query, function(err, data) {
      // Mongo command to fetch all data from collection.
      if (err) {
        response = { error: true, data: "Error fetching data" };
      } else {
        var totalPages = Math.ceil(totalCount / size);
        response = { error: false, data: data, pages: totalPages };
      }
      res.json(response);
    });
  });
});

app.route("/issues/:id").get((req, res) => {
  Issue.findById(req.params.id, (err, issue) => {
    if (!err) {
      res.json(issue);
    } else {
      console.log(err);
    }
  });
});

app.route("/issues/add").post(verifyToken, (req, res) => {
  let issue = new Issue(req.body);

  issue
    .save()
    .then(issue => {
      res.status(200).json({ issue: "Added successfully" });
    })
    .catch(err => {
      res.status(400).send("Faled to create new record");
    });
});

app.route("/issues/update/:id").post((req, res) => {
  Issue.findById(req.params.id, (err, issue) => {
    if (!issue) return next(new Error("Could not load document"));
    else {
      issue.title = req.body.title;
      issue.responsible = req.body.responsible;
      issue.description = req.body.description;
      issue.severity = req.body.severity;
      issue.status = req.body.status;
    }

    issue
      .save()
      .then(issue => {
        res.json("Update done.");
      })
      .catch(err => {
        res.status(400).send("Update failed");
      });
  });
});

app.route("/issues/delete/:id").get((req, res) => {
  Issue.findByIdAndRemove({ _id: req.params.id }, (err, issue) => {
    if (err) res.json(err);
    else res.json("Remove successfully");
  });
});

app.route("/api/login").post((req, res) => {
  Account.findOne({ username: req.body.username }, (err, user) => {
    if (!err) {
      bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
        if (err)
          res
            .status(400)
            .json({ success: false, message: "Password not match!" });
        else {
          req.session.userId = user._id;
          req.session.save(err => {
            if (!err) {
              res.status(200).json({
                success: isMatch,
                message: "Authenticated",
                session: req.session
              });
            }
          });
        }
      });
    } else {
      console.log(err);
    }
  });
});

app.route("/api/register").post((req, res) => {
  if (req.body.username && req.body.password) {
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(req.body.password, salt, function(err, hash) {
        var userData = {
          username: req.body.username,
          password: hash
        };

        //use schema.create to insert data into the db
        Account.create(userData, function(err, user) {
          if (err) {
            console.log(err);
          } else {
            return res.json(user);
          }
        });
      });
    });
  }
});

app.route("/api/checkIsLogin").get((req, res) => {
  req.session.userId
    ? res.status(200).json({ isLoggedIn: true, token: req.session.userId })
    : res.status(200).json({ isLoggedIn: false, token: null });
});

app.route("/api/logout").post((req, res) => {
  Session.deleteOne({ "session.userId": req.session.userId }, function(
    error,
    response
  ) {
    if (!error) {
      req.session.destroy(err => {
        if (err) res.status(500).json({ error: "Could not log out." });
        else {
          res.status(200).json({ success: "Logged out successfully" });
        }
      });
    }
  });
});

app.route("/").get(function(req, res) {
  if (req.session.page_views) {
    req.session.page_views++;
    res.send("You visited this page " + req.session.page_views + " times");
  } else {
    req.session.page_views = 1;
    res.send("Welcome to this page for the first time!");
  }
});

function verifyToken(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send("Unauthorized Request");
  }
  next();
}

app.listen(4000, () => console.log("Express Server Running On Port 4000"));
