import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as bootstrap from "bootstrap";

async function addPost() {
    console.log("Inside add post");

    // 🧾 Collect form data
    const foodTitle = document.getElementById("title").value;
    const foodPrice = document.getElementById("price").value;
    const foodLocation = document.getElementById("location").value;
    const foodDescription = document.getElementById("description").value;

    // Collect selected checkboxes
    const dietaryTags = [];
    const checkboxes = document.querySelectorAll('input[name="dietary"]:checked');

    checkboxes.forEach(cb => {
        dietaryTags.push(cb.value);
    });

    // Log collected data for verification
    console.log("Collected food data:");
    console.log({
        foodTitle,
        foodPrice,
        foodLocation,
        foodDescription,
        dietaryTags
    })

    // simple validation
    if (!foodTitle || !foodDescription) {
        alert("Please complete all required fields.");
        return;
    }

    // get a pointer to the user who is logged in
    const user = auth.currentUser;

    if (user) {
        try {
            const userID = user.uid;

            //Save to Firestore
            const docRef = await addDoc(collection(db, "posts"), {
                foodTitle: foodTitle,
                price: Number(foodPrice),
                location: foodLocation,
                description: foodDescription,
                dietaryTags: dietaryTags,
                userID: userID,
                createdAt: serverTimestamp()
            });

            const foodDocID = docRef.id;

            // Show thank-you modal
            const thankYouModalEl = document.getElementById("thankYouModal");
            const thankYouModal = new bootstrap.Modal(thankYouModalEl);
            thankYouModal.show();

            // Redirect AFTER user closes the modal
            thankYouModalEl.addEventListener("hidden.bs.modal", () => {
                window.location.href = `post.html?docID=${foodDocID}`;
            }, { once: true });

        } catch (error) {
            console.error("Error adding review:", error);
        }
    } else {
        console.log("No user is signed in");
        //window.location.href = "review.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("postForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            addPost();
        });
    } else {
        console.error("Form not found");
    }
});