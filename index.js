//jshint esversion:6
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const https = require("https");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


// conexiunea la sqlite3
const db = new sqlite3.Database('./database/projects.db', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'projects.db'");
});

// Crearea bazei de date Projects
const sql_create = 'CREATE TABLE IF NOT EXISTS Projects (PROJECT_ID INTEGER PRIMARY KEY AUTOINCREMENT, PROJECT_NAME VARCHAR(100) NOT NULL, START_DATE VARCHAR(100) NOT NULL, TARGET_END_DATE VARCHAR(100) NOT NULL, ACTUAL_END_DATE VARCHAR(100) NOT NULL, CREATED_ON VARCHAR(100) NOT NULL, CREATED_BY VARCHAR(100) NOT NULL, MODIFIED_ON VARCHAR(100), MODIFIED_BY VARCHAR(100));';
  
  db.run(sql_create, err => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of the 'Projects' table");
  });


// Am adaugat initial manual cateva date in tabel
// const sql_insert = `INSERT INTO Projects (PROJECT_ID, PROJECT_NAME, START_DATE, TARGET_END_DATE, ACTUAL_END_DATE, CREATED_ON, CREATED_BY, MODIFIED_ON, MODIFIED_BY) VALUES 
// (1, 'Project1', '07/26/2021', '07/27/2021', '07/28/2021', 'Monday', 'Sebi', 'Tuesday', 'Ionut'), 
// (2, 'Project2', '08/26/2021', '08/27/2021', '08/28/2021', 'Wednesday', 'Ionut', 'Friday', 'Sebi'), 
// (3, 'Project3', '09/26/2021', '09/27/2021', '09/28/2021', 'Saturday', 'Alex', 'Sunday', 'Cosmin');`;

// db.run(sql_insert, err => {
// if (err) {
//     return console.error(err.message);
// }
// console.log("Successful creation of 3 projects");
// });

//creare server Express
const app = express();

//configurare server
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Session",
  resave: false,
  saveUninitialized: false
}));

//Authentification and auth
/////////////////////////////////////////////////
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/////////////////////////////////////////////

app.get("/", function(req, res) {
    // res.send ("Data-driven CRUD microservice")
    res.render("home");

});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/index", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("index", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/index");
      });
    }
  });

  res.setHeader('Content-Type', 'application/json');
  console.log(req.body)

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/index");
      });
    }
  });

  console.log(req.body)

});


app.get("/projects", (req, res) => {
    const sql = "SELECT * FROM Projects ORDER BY PROJECT_NAME"
    db.all(sql, [], (err, rows) => {
      if (err) {
        return console.error(err.message);
      }
      res.render("projects", { model: rows });
    });

    console.log(req.body)

  });

app.get("/list_of_projects", (req, res) => {
const sql = "SELECT * FROM Projects ORDER BY PROJECT_NAME";
db.all(sql, [], (err, rows) => {
    if (err) {
    return console.error(err.message);
    }
    res.render("list", { model: rows });
});
});

// GET /edit/id
app.get("/edit/:id", (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM Projects WHERE PROJECT_ID = ?";
    db.get(sql, id, (err, row) => {
      // if (err) ...
      res.render("edit", { model: row });
    });
  });

  // POST /edit/id
app.post("/edit/:id", (req, res) => {

  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var d = new Date();
  var dayName = days[d.getDay()];

  const id = req.params.id;
  const book = [req.body.PROJECT_NAME, req.body.START_DATE, req.body.TARGET_END_DATE, req.body.ACTUAL_END_DATE, req.body.CREATED_ON, req.body.CREATED_BY, dayName, req.body.MODIFIED_BY, id];
  const sql = "UPDATE Projects SET PROJECT_NAME = ?, START_DATE = ?, TARGET_END_DATE = ?, ACTUAL_END_DATE = ?, CREATED_ON = ?, CREATED_BY = ?, MODIFIED_ON = ?, MODIFIED_BY = ? WHERE (PROJECT_ID = ?)";
  db.run(sql, book, err => {
    if (err) {
      return console.error(err.message);
    }    
    res.redirect("/list_of_projects");
  });

  console.log(req.body)

});

  // GET /create
app.get("/create", (req, res) => {
    res.render("create", { model: {} });
  });

// POST /create
app.post("/create", (req, res) => {

  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var d = new Date();
  var dayName = days[d.getDay()];

  const sql = "INSERT INTO Projects (PROJECT_NAME, START_DATE, TARGET_END_DATE, ACTUAL_END_DATE, CREATED_ON, CREATED_BY, MODIFIED_ON, MODIFIED_BY) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const book = [req.body.PROJECT_NAME, req.body.START_DATE, req.body.TARGET_END_DATE, req.body.ACTUAL_END_DATE, dayName, req.body.CREATED_BY, req.body.MODIFIED_ON, req.body.MODIFIED_BY];
  db.run(sql, book, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/list_of_projects");
  });

    console.log(req.body)

});

// GET /delete/id
app.get("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM Projects WHERE PROJECT_ID = ?";
  db.get(sql, id, (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("delete", { model: row });
  });
});

// POST /delete/id
app.post("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM Projects WHERE PROJECT_ID = ?";
  db.run(sql, id, err => {
    // if (err) ...
    res.redirect("/list_of_projects");
  });

  console.log(req.body)

});

app.use(function(req, res, next) {
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.json({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

app.listen(4000, ()=> {
    console.log("Server started (http://localhost:4000/) !");
})
