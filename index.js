require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

let userSchema = new mongoose.Schema({
	username: { type: String, required: true },
});
let User = mongoose.model("User", userSchema);

let exerciseSchema = new mongoose.Schema({
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: { type: Date, default: new Date() },
	user_id: { type: String, required: true },
});
let Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/index.html");
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/users/", async function (req, res) {
	const users = await User.find({}).exec();
	res.json(users);
});

app.post("/api/users/", function (req, res) {
	const username = req.body.username;
	const user = new User({ username });
	user.save((err, data) => {
		if (err) return console.log(err);
		res.json({ username: data.username, _id: data._id });
	});
});

//66c21104e368ef9ac542d04c

const options = {
	weekday: "short",
	year: "numeric",
	month: "short",
	day: "2-digit",
};

app.post("/api/users/:_id/exercises", async function (req, res) {
	const params = req.params;
	const body = req.body;
	const user = await User.findById(params._id).exec();
	if (!user) return res.status(404).send("User not found");
	const date = body.date ? new Date(body.date) : new Date();
	const exercise = new Exercise({
		description: body.description,
		date: date.toDateString(),
		duration: Number(body.duration),
		user_id: params._id,
	});
	exercise.save((err, data) => {
		if (err) return console.log(err);
		data = {
			...data.toObject(),
			date: data.date.toDateString(),
			...user.toObject(),
		};
		delete data["__v"];
		delete data["user_id"];
		res.json(data);
	});
});

// http://localhost:3000/api/users/66c21104e368ef9ac542d04c/logs

app.get("/api/users/:_id/logs", async function (req, res) {
	const params = req.params;
	const query = req.query;
	const username = (await User.findById(params._id).exec())?.username;
	if (!username) return res.status(404).send("User not found");
	var filter = {
		user_id: params._id,
	};
	if (query.from || query.to) {
		filter.date = {};
		if (query.from) filter.date["$gte"] = query.from;
		if (query.to) filter.date["$lte"] = query.to;
	}
	const limit = query.limit ? Number(query.limit) : 500;

	var exercises = await Exercise.find(filter)
		.limit(limit)
		.select("_id duration date description")
		.exec();
	exercises = exercises.map((exercise) => {
		const exerciseObj = exercise.toObject();
		exerciseObj.date = exerciseObj.date.toDateString();
		return exerciseObj;
	});
	res.json({
		username: username,
		count: exercises.length,
		_id: params._id,
		log: exercises,
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is listening on port " + listener.address().port);
});
