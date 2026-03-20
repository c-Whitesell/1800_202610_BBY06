import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as bootstrap from "bootstrap";

async function addPost() {
    console.log("Inside add post");

    // 🧾 Collect form data
    const foodTitle = document.getElementById("title").value;
    const hikeLevel = document.getElementById("level").value;
    const hikeSeason = document.getElementById("season").value;
    const hikeDescription = document.getElementById("description").value;
    const hikeFlooded = document.querySelector('input[name="flooded"]:checked')?.value;
    const hikeScrambled = document.querySelector('input[name="scrambled"]:checked')?.value;

    // Log collected data for verification
    console.log("inside write review, rating =", hikeRating);
    console.log("hikeDocID =", hikeDocID);
    console.log("Collected review data:");
    console.log(hikeTitle, hikeLevel, hikeSeason, hikeDescription, hikeFlooded, hikeScrambled);

    // simple validation
    if (!hikeTitle || !hikeDescription) {
        alert("Please complete all required fields.");
        return;
    }

    // get a pointer to the user who is logged in
    const user = auth.currentUser;

    if (user) {
        try {
            const userID = user.uid;

            // ✅ Store review as subcollection under this hike
            // Path: hikes/{hikeDocID}/reviews/{autoReviewID}
            await addDoc(collection(db, "hikes", hikeDocID, "reviews"), {
                userID: userID,
                title: hikeTitle,
                level: hikeLevel,
                season: hikeSeason,
                description: hikeDescription,
                flooded: hikeFlooded,
                scrambled: hikeScrambled,
                rating: hikeRating,
                timestamp: serverTimestamp()
            });

            console.log("Review successfully written!");


            // Show thank-you modal
            const thankYouModalEl = document.getElementById("thankYouModal");
            const thankYouModal = new bootstrap.Modal(thankYouModalEl);
            thankYouModal.show();

            // Redirect AFTER user closes the modal
            thankYouModalEl.addEventListener("hidden.bs.modal", () => {
                window.location.href = `eachHike.html?docID=${hikeDocID}`;
            }, { once: true });

        } catch (error) {
            console.error("Error adding review:", error);
        }
    } else {
        console.log("No user is signed in");
        //window.location.href = "review.html";
    }
}