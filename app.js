
const express = require("express");
const bodyParser = require('body-parser')
const mongoose = require("mongoose");
const { json } = require("body-parser");
const session = require('express-session')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { type } = require("os");
const { Manager } = require("session");
const { Console } = require("console");
require('dotenv').config();
const autoinr = require("mongoose-sequence")(mongoose);

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(session({
    secret: "this is indexing project",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//DB connection code
const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/LS", {
        });
        console.log('Database is connected');
    } catch (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
};
connectDB();

//DB schema for users
let db_schema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
    leaves: {
        CL: Number,
        SL: Number,
        PL: Number,
        LWP: Number
    },
    Manager: { type: String, enum: ["Prashant", "Admin"], default: "Admin" }
});
//DB schema for Auth
let user_schema = new mongoose.Schema({
    username: { type: String },
    password: { type: String },
    role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" }
});


//DB schema for Leaves
let leave_schema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "db" },
    username: { type: String },
    Start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    leaveType: { type: String },
    reason: { type: String, required: true },
    state: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    Manager: { type: mongoose.Schema.Types.ObjectId, ref: "db" }

});

leave_schema.plugin(autoinr, { inc_field: 'leaveID' });

user_schema.plugin(passportLocalMongoose);

const Leave = new mongoose.model("Leave", leave_schema);
const User = new mongoose.model("User", user_schema);
const db = new mongoose.model("db", db_schema);


passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



//login Page GET, POST request.
app.get("/Index", function (req, res) {
    if (req.isAuthenticated()) {
        Leave.find({}).then((data) => {
            res.render('lap', { Item: data });
        });

    } else {
        res.render('Index');
    }
});

app.post("/Index", function (req, res) {
    let userid = req.body.username;
    let passwd = req.body.password;
    console.log(passwd);
    const user_login = new User({
        username: userid,
        password: passwd
    });
    console.log("post is working fine!")
    req.login(user_login, function (err) {
        if (err) {
            console.log(err);
            res.redirect('Index');
        } else {
            passport.authenticate("local")(
                req, res, function () {
                    User.find({ username: req.body.username }, req.body.password).then((data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(data);
                            console.log("Creds are correct");
                            Leave.find({}).then((data) => {
                                res.render('lap', { Item: data });
                            }).catch((err) => {
                                console.log(err);
                            });
                        }
                    });
                }
            );
        }
    });
});

//Account Creation GET, POST Request.
app.get("/AccountCreation", function (req, res) {
    res.render("AccountCreation");
});

app.post("/AccountCreation", function (req, res) {
    const userid = req.body.username;
    const emailid = req.body.email;
    const pass = req.body.password;
    const confirmpass = req.body.confirmpassword;

    if (confirmpass == pass) {
        db.find().then((test) => {
            console.log(Object.keys(test).length);

            if (Object.keys(test).length === 0) {

                try {
                    User.register(({ username: req.body.username }), req.body.password, function (err, User) {

                        if (err) {
                            console.log("registeration has error")
                            console.log(err);

                        } else {
                            passport.authenticate("local");
                            (req, res, function () {
                                console.log("Creds has been saved!");
                            });
                        }
                    }
                    );
                    const acc_creation = new db({
                        username: userid,
                        email: emailid,
                        leaves: {
                            CL: 8,
                            SL: 15,
                            PL: 18,
                            LWP: 0
                        }

                    });
                    const creds = new User({
                        username: userid,
                        password: confirmpass
                    });
                    acc_creation.save();
                    console.log("item has been saved");
                    res.render('Index');

                } catch (err) {
                    res.send("<script>alert('password is not matching with confirm password')</script>");
                    console.log(err);
                }

            } else if (Object.keys(test).length != 0) {
                db.find({ username: userid }).then((data) => {

                    if (Object.keys(data).length != 0) {
                        res.send("<script>alert('username already exist please try different username')</script>");

                    } else {
                        db.find({ email: emailid }).then((data) => {

                            if (Object.keys(data).length != 0) {
                                res.send("<script>alert('email id already exist please try different email id ')</script>");

                            } else {

                                try {
                                    const acc_creation = new db({
                                        username: userid,
                                        email: emailid,
                                        // password: confirmpass,
                                        // employee_id: empl_id,
                                        leaves: {
                                            CL: 8,
                                            SL: 15,
                                            PL: 18,
                                            LWP: 0
                                        }

                                    });
                                    const creds = new User({
                                        username: userid,
                                        password: confirmpass
                                    });

                                    User.register(({ username: req.body.username }), req.body.password, function (err, User) {

                                        if (err) {
                                            console.log("registeration has error")
                                            console.log(err);
                                            res.status(500).send("error registering user");

                                        } else {
                                            passport.authenticate("local");
                                            (req, res, function () {
                                                console.log("Creds has been saved!");
                                            });
                                        }
                                    });
                                    acc_creation.save();
                                    res.render('Index');

                                } catch (err) {
                                    res.send("<script>alert('password is not matching with confirm password')</script>");
                                    console.log(err);
                                }
                            }
                        });
                    }
                });
            }
        });
    }
});



//Leave applying portal GET,POST request.
app.get('/lap', function (req, res) {
    if (req.isAuthenticated()) {
        Leave.find({}).then((data) => {
            console.log(data);
            res.render("lap", { Item: data });
        });
    } else {
        res.redirect('Index');
    }
});

app.post('/lap', function (req, res) {
    if (req.isAuthenticated()) {
        const leave_type = req.body.leavetype;
        const userid = req.body.username;
        const stdate = req.body.stdate;
        const enddate = req.body.enddate;
        const reason = req.body.reason;
        db.find({ username: userid }).then((data) => {

            if (Object.keys(data).length === 0) {
                res.send("<script>alert('Please enter your correct username')</script>");
            } else {
                db.findOne({ username: userid }).then((data) => {
                    console.log(data.leaves.CL);
                    Leave.find({ username: userid }).then((data) => {

                    });
                });
                try {
                    console.log("lap try is working fine");

                    Leave.find({username: userid}).then((data) =>{
                        
                        
                        
                    })

                    
                    const leave_request = new Leave({
                        username: userid,
                        Start_date: stdate,
                        end_date: enddate,
                        reason: reason,
                        leaveType: leave_type
                    });
                    leave_request.save();
                    Leave.find({}).then((data) => {
                        res.render('lap', { Item: data });
                    }).catch((err) => {
                        console.log(err);
                    });

                } catch (err) {
                    console.log(err);
                }

            }
        }).catch((err) => {
            console.log(err);
        });
    } else {
        res.render('Index');
    }
});



//admin portal GET, POST request.
app.get("/admin", checkRole("admin"), function (req, res) {
    Leave.find({ state: "Pending" }).then((data) => {
        res.render('admin', { Item: data });
    });
});

// app.get("/admin", function(req, res){
//     Leave.find({state:"Pending"}).then((data) => {
//         res.render('admin', {Item:data});
//     });
// });

// leave approval request 
app.post('/leave-request', async (req, res) => {
    const { leave_id, action, user_id, leave_type, stdate, enddate } = req.body;

    try {
        const updateState = action === 'approve' ? 'Approved' : 'Rejected';
        console.log("post is working fine");
        db.findOne({ username: user_id })
            .then((data) => {
                if (Object.keys(data).length === 0) {
                    res.send("<script>alert('username is incorrect please enter the correct username')")
                } else if (leave_type == "CL" && updateState == "Approved") {
                    let st = new Date(stdate);
                    let end = new Date(enddate);
                    let diffday = end.getDate() - st.getDate() + 1;
                    let newvalue = parseInt(data.leaves.CL) - parseInt(diffday);
                    db.updateOne({ username: user_id }, { $set: { 'leaves.CL': newvalue } }).then((data)).catch((err) => { console.log(err) });
                    Leave.updateOne({ leaveID: leave_id }, { $set: { state: updateState } })
                        .then((data) => {
                            res.json({ message: "Leave request ${action}d sucessfully" });

                        }).catch((err) => {
                            console.log(err);
                            res.json({ message: "No record found for ${username}" })
                        });
                } else if (leave_type == "SL" && updateState == "Approved") {
                    let st = new Date(stdate);
                    let end = new Date(enddate);
                    let diffday = st.getDate() - end.getDate() + 1;
                    let newvalue = parseInt(data.leaves.SL) - parseInt(diffday);
                    db.updateOne({ username: user_id }, { $set: { 'leaves.SL': newvalue } }).then((data)).catch((err) => { console.log(err) });
                    Leave.updateOne({ leaveID: leave_id }, { $set: { state: updateState } })
                        .then((data) => {
                            res.json({ message: "Leave request ${action}d sucessfully" });

                        }).catch((err) => {
                            console.log(err);
                            res.json({ message: "No record found for ${username}" })
                        });
                } else if (leave_type == "PL" && updateState == "Approved") {
                    let st = new Date(stdate);
                    let end = new Date(enddate);
                    let diffday = st.getDate() - end.getDate() + 1;
                    let newvalue = parseInt(data.leaves.PL) - parseInt(diffday);
                    db.updateOne({ username: user_id }, { $set: { 'leaves.PL': newvalue } }).then((data)).catch((err) => { console.log(err) });
                    Leave.updateOne({ leaveID: leave_id }, { $set: { state: updateState } })
                        .then((data) => {
                            res.json({ message: "Leave request ${action}d sucessfully" });

                        }).catch((err) => {
                            console.log(err);
                            res.json({ message: "No record found for ${username}" })
                        });
                } else if (leave_type == "LWP" && updateState == "Approved") {
                    let st = new Date(stdate);
                    let end = new Date(enddate);
                    let diffday = st.getDate() - end.getDate() + 1;
                    let newvalue = parseInt(data.leaves.LWP) + parseInt(diffday);
                    db.updateOne({ username: user_id }, { $set: { 'leaves.LWP': newvalue } }).then((data)).catch((err) => { console.log(err) });
                    Leave.updateOne({ leaveID: leave_id }, { $set: { state: updateState } })
                        .then((data) => {
                            res.json({ message: "Leave request ${action}d sucessfully" });

                        }).catch((err) => {
                            console.log(err);
                            res.json({ message: "No record found for ${username}" })
                        });
                }
            });

        // Leave.updateOne({ leaveID: leave_id }, { $set: { state: updateState } })
        //     .then((data) => {
        //         res.json({ message: "Leave request ${action}d sucessfully" });

        //     }).catch((err) => {
        //         console.log(err);
        //         res.json({ message: "No record found for ${username}" })
        //     })



    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});



//About us page GET request.
app.get("/aboutus", function (req, res) {
    res.render("aboutus");
});


//Contact us page GET  Request.
app.get("/contactus", function (req, res) {
    res.render("contactus");
});


//Balance Check GET request.
app.get("/balance", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("/balance");
    } else {
        res.render("Index");
    }
});


//redirection to home page
app.get("/", function (req, res) {
    if (req.isAuthenticated()) {
        Leave.find({}).then((data) => {
            console.log(data);
            res.render("lap", { Item: data });
        });
    } else {
        res.redirect("/index");
    }
});

// Server starting request.
app.listen(3000, function () {
    console.log("it's  working fine");
});



function checkRole(requiredRole) {
    return (req, res, next) => {
        if (req.isAuthenticated() && req.user.role === requiredRole) {
            return next();
            //console.log(req.user.role);
        }
        console.log(req.isAuthenticated(), ' kkkkk ', req.user.role, '////', requiredRole);

        res.status(403).send("access Denied");
    }
}