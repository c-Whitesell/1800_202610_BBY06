import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as bootstrap from "bootstrap";

//-----------------------------------------------------------
// Get restaurant ID from Local Storage
// Go to firestore to get the name of the restaurant (using this ID) 
// and display in title of the page
//-----------------------------------------------------------
var postDocID = localStorage.getItem('postDocID');
displayPostName(postDocID);
async function displayPostName(id) {
    try {
        const ref = doc(db, "posts", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const foodName = snap.data().title;
            document.getElementById("postTitle").textContent = foodName;
        } else {
            console.log("No such post found!");
        }
    } catch (error) {
        console.error("Error getting post document:", error);
    }
}

//Add event listener to stars after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    manageStars();

    // 👇👇👇 Add these two lines
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.addEventListener('click', writeReview);
});

let postRating = 0;
function manageStars() {
    // ⭐ Make star icons clickable and calculate rating
    const stars = document.querySelectorAll('.star');

    // Step 1️⃣ – Add click behavior for each star
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            // Fill all stars up to the one clicked
            stars.forEach((s, i) => {
                s.textContent = i <= index ? 'star' : 'star_outline';
            });
            // Save rating value
            postRating = index + 1;
            console.log("Current rating:", postRating);
        });
    });
}

//---------------------------------------------------------------------
// Function to write review data into Firestore
// Triggered when the authenticated user clicks the "Submit" button
// Collects form data and adds a new document to the selected hike's
// "reviews" subcollection: hikes/{hikeDocID}/reviews/{reviewDocID}
// Redirects to eachHike page upon success
//---------------------------------------------------------------------

async function writeReview() {
    console.log("Inside write review");

    // 🧾 Collect form data
    const reviewTitle = document.getElementById("title").value;
    const reviewDescription = document.getElementById("description").value;
    const foodSize = document.getElementById("portionSize").value;
    const tryTime = document.getElementById("time").value;
    const OrderAgain = document.querySelector('input[name="again"]:checked')?.value

    // Log collected data for verification
    console.log("inside write review, rating =", postRating);
    console.log("postDocID =", postDocID);
    console.log("Collected review data:");
    console.log(reviewTitle, reviewDescription, OrderAgain, foodSize, tryTime);

    // simple validation
    if (!reviewTitle || !reviewDescription) {
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
            await addDoc(collection(db, "posts", postDocID, "reviews"), {
                userID: userID,
                title: reviewTitle,
                description: reviewDescription,
                portionSize: foodSize,
                again: OrderAgain,   
                rating: postRating,
                timestamp: serverTimestamp()
            });

            console.log("Review successfully written!");


            // Show thank-you modal
            const thankYouModalEl = document.getElementById("thankYouModal");
            const thankYouModal = new bootstrap.Modal(thankYouModalEl);
            thankYouModal.show();

            // Redirect AFTER user closes the modal
            thankYouModalEl.addEventListener("hidden.bs.modal", () => {
                window.location.href = `eachPost.html?docID=${postDocID}`;
            }, { once: true });

        } catch (error) {
            console.error("Error adding review:", error);
        }
    } else {
        console.log("No user is signed in");
        //window.location.href = "review.html";
    }
}