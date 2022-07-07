import { db } from "./rtdb";
import { ref, onValue } from "firebase/database";

// const API_BASE_URL = "http://localhost:3500";
const API_BASE_URL = "https://chat-room-apx.herokuapp.com";

export const state = {
	data: {
		email: "",
		name: "",
		messages: [],
		userId: "",
		roomId: "",
		rtdbRoomId: "",
	},
	listeners: [],
	getState() {
		return this.data;
	},
	setState(newState) {
		this.data = newState;
		for (const cb of this.listeners) {
			cb();
		}
		// localStorage.setItem("stateChat", JSON.stringify(newState));
	},
	async listenRoom() {
		const cs = await this.getState();

		const roomRef = await ref(db, "rooms/" + cs.rtdbRoomId);

		await onValue(roomRef, (snap) => {
			const data = snap.val();
			if (data.messages !== undefined) {
				cs.messages = JSON.parse(data.messages);
				this.setState(cs);
			}
		});
	},
	async newMessages(newMessage) {
		const cs = await this.getState();

		if (cs.rtdbRoomId) {
			let res = await fetch(API_BASE_URL + "/message", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json; odata=verbose",
				},
				body: JSON.stringify({
					message: newMessage,
					author: cs.name || cs.email,
					rtdbId: cs.rtdbRoomId,
				}),
			});
			let data = await res.json();

			await this.listenRoom();
		}
	},
	initState() {
		// const cs = this.getState();
		// const storageState: any = localStorage.getItem("stateChat");
		// let updateState = JSON.parse(JSON.stringify(storageState));
		// cs.email = updateState.email ? updateState.email : "";
		// cs.name = updateState.name ? updateState.name : "";
		// cs.userId = updateState.userId ? updateState.userId : "";
		// cs.roomId = updateState.roomId ? updateState.roomId : "";
		// cs.rtdbRoomId = updateState.rtdbRoomId ? updateState.rtdbRoomId : "";
		// cs.messages = updateState.messages ? updateState.messages : [];
		// this.setState(cs);
	},
	async setData(name, email, room) {
		const cs = await this.getState();
		cs.email = await email;
		cs.name = await name;
		cs.roomId = await room;
		await this.setState(cs);

		console.log(cs);

		let res = await fetch(API_BASE_URL + "/signup", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json; odata=verbose",
			},
			body: JSON.stringify({
				email: cs.email,
				name: cs.name,
			}),
		});
		let data = await res.json();

		if (res.status === 400) {
			await this.auth();
		} else {
			cs.userId = await data.id;
			this.setState(cs);
			await this.initRoom();
		}
	},
	async auth() {
		const cs = await this.getState();

		let res = await fetch(API_BASE_URL + "/auth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json; odata=verbose",
			},
			body: JSON.stringify({
				email: cs.email,
			}),
		});

		let data = await res.json();
		cs.userId = await data.id;
		this.setState(cs);

		if (cs.roomId !== "") {
			await this.connectRoom();
		} else {
			await this.initRoom();
		}
	},
	async initRoom() {
		const cs = await this.getState();

		if (cs.roomId) {
			await this.connectRoom();
			return false;
		}

		let res = await fetch(API_BASE_URL + "/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json; odata=verbose",
			},
			body: JSON.stringify({
				userId: cs.userId,
			}),
		});

		let data = await res.json();
		cs.roomId = await data.id;
		await this.setState(cs);

		await this.connectRoom();
	},
	async connectRoom() {
		const cs = await this.getState();

		console.log("hasta aca llego 2");

		let res = await fetch(
			API_BASE_URL + "/rooms/" + cs.roomId + "?userId=" + cs.userId,
		);

		console.log("hasta aca llego 2");

		let data = await res.json();

		console.log("hasta aca llego 3");
		cs.rtdbRoomId = await data.rtdbRoomId;
		console.log("hasta aca llego 4");
		await this.setState(cs);
		console.log("hasta aca llego 5");

		await this.listenRoom();
	},
	subscribe(callback) {
		this.listeners.push(callback);
	},
};
