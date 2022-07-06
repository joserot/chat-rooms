import * as express from "express";
import { rtdb, firestore } from "./db";
import { v4 as uuidv4 } from "uuid";
import * as cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(
	express.urlencoded({
		extended: true,
	}),
);
app.use(express.static("dist"));
app.get("*", (req, res) => {
	res.sendFile(__dirname + "/dist/index.html");
});

const dev = process.env.NODE_ENV == "development";
const port = process.env.PORT || 3500;

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

const userCollection = firestore.collection("users");
const roomCollection = firestore.collection("rooms");

app.get("/env", (req, res) => {
	res.json({
		environment: process.env.NODE_ENV,
	});
});

app.post("/signup", async (req, res) => {
	const { email, name } = req.body;

	const searchResponse = await userCollection.where("email", "==", email).get();

	if (searchResponse.empty) {
		const newUserRef = await userCollection.add({
			email,
			name,
		});

		await res.json({
			id: newUserRef.id,
			new: true,
		});
	} else {
		await res.status(400).json({
			message: "user already exist",
		});
	}
});

app.post("/auth", async (req, res) => {
	const { email } = req.body;

	const searchResponse = await userCollection.where("email", "==", email).get();

	if (searchResponse.empty) {
		await res.status(404).json({
			message: "not found",
		});
	} else {
		await res.json({
			id: searchResponse.docs[0].id,
		});
	}
});

app.post("/rooms", async (req, res) => {
	const { userId } = req.body;
	const doc = await userCollection.doc(userId.toString()).get();
	if (doc.exists) {
		const roomRef = await rtdb.ref("rooms/" + uuidv4());

		await roomRef.set({
			messages: [],
			owner: userId,
		});
		const roomLongId = await roomRef.key;
		const roomId = (await 1000) + Math.floor(Math.random() * 999);
		await roomCollection.doc(roomId.toString()).set({
			rtdbRoomId: roomLongId,
		});
		await res.json({
			id: roomId.toString(),
		});
	} else {
		await res.status(401).json({
			message: "user not exist",
		});
	}
});

app.get("/rooms/:roomId", async (req, res) => {
	const { userId } = req.query;
	const { roomId } = req.params;

	const doc = await userCollection.doc(userId.toString()).get();

	if (doc.exists) {
		const snap = await roomCollection.doc(roomId).get();
		const data = await snap.data();
		await res.json(data);
	} else {
		await res.status(401).json({
			message: "user not exist",
		});
	}
});

app.post("/message", async (req, res) => {
	const { message, author, rtdbId } = req.body;

	const roomRef = await rtdb.ref("rooms/" + rtdbId + "/messages");

	await roomRef.push({
		author,
		message,
	});

	await res.json({
		message: "message ready",
	});
});
