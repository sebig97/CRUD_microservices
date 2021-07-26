const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // verbose pentru debug, ofera mai multe informatii
const path = require('path');


// conexiunea la sqlite3
const db = new sqlite3.Database('./database/projects.db', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'projects.db'");
});

// Crearea bazei de date Projects
const sql_create = 'CREATE TABLE IF NOT EXISTS Projects (PROJECT_ID INTEGER PRIMARY KEY AUTOINCREMENT, PROJECT_NAME VARCHAR(100) NOT NULL, START_DATE VARCHAR(100) NOT NULL, TARGET_END_DATE VARCHAR(100) NOT NULL, ACTUAL_END_DATE VARCHAR(100) NOT NULL, CREATED_ON VARCHAR(100) NOT NULL, CREATED_BY VARCHAR(100) NOT NULL, MODIFIED_ON VARCHAR(100) NOT NULL, MODIFIED_BY VARCHAR(100) NOT NULL);';
  
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
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false })); 

app.get("/", function(req, res) {
    // res.send ("Data-driven CRUD microservice")
    res.render("index");
});

app.get("/projects", (req, res) => {
    const sql = "SELECT * FROM Projects ORDER BY PROJECT_NAME"
    db.all(sql, [], (err, rows) => {
      if (err) {
        return console.error(err.message);
      }
      res.render("projects", { model: rows });
    });
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
  const id = req.params.id;
  const book = [req.body.PROJECT_NAME, req.body.START_DATE, req.body.TARGET_END_DATE, req.body.ACTUAL_END_DATE, req.body.CREATED_ON, req.body.CREATED_BY, req.body.MODIFIED_ON, req.body.MODIFIED_BY, id];
  const sql = "UPDATE Projects SET PROJECT_NAME = ?, START_DATE = ?, TARGET_END_DATE = ?, ACTUAL_END_DATE = ?, CREATED_ON = ?, CREATED_BY = ?, MODIFIED_ON = ?, MODIFIED_BY = ? WHERE (PROJECT_ID = ?)";
  db.run(sql, book, err => {
    // if (err) ...
    res.redirect("/list_of_projects");
  });
});

  // GET /create
app.get("/create", (req, res) => {
    res.render("create", { model: {} });
  });

// POST /create
app.post("/create", (req, res) => {
  const sql = "INSERT INTO Projects (PROJECT_NAME, START_DATE, TARGET_END_DATE, ACTUAL_END_DATE, CREATED_ON, CREATED_BY, MODIFIED_ON, MODIFIED_BY) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const book = [req.body.PROJECT_NAME, req.body.START_DATE, req.body.TARGET_END_DATE, req.body.ACTUAL_END_DATE, req.body.CREATED_ON, req.body.CREATED_BY, req.body.MODIFIED_ON, req.body.MODIFIED_BY];
  db.run(sql, book, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/list_of_projects");
  });
});

// GET /delete/id
app.get("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM Projects WHERE PROJECT_ID = ?";
  db.get(sql, id, (err, row) => {
    // if (err) ...
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
});


app.listen(3000, ()=> {
    console.log("Server started (http://localhost:3000/) !");
})
