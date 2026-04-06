import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import * as bootstrap from "bootstrap";
import { createSearchMap } from "./search.js";

//------------------------------------------------------------
// This function is an Event Listener for the file (image) picker
// When an image is chosen, it will display image for preview,
// read it from file system, encode, strip meta data,
// then save that image.
//-------------------------------------------------------------
function uploadImage() {
  // Attach event listener to the file input
  // Function to handle file selection and Base64 encoding
  const input = document.getElementById("inputImage");
  document.addEventListener("change", handleFileSelect);
  function handleFileSelect(event) {
    // Get pointer to the first file that was selected
    var file = event.target.files[0];

    // Convert the location of the file to a temporary URL string, and set it as the source of the
    // image element for faster preview.  The image is on your local machine, not from the database.
    document.getElementById("mypic-goes-here").src = file
      ? URL.createObjectURL(file)
      : "";

    if (!input) return; // Guard against null

    // Check if a file was selected
    if (file) {
      // Create a FileReader
      var reader = new FileReader();

      // Read file as a Data URL thats converted Base64 string with meta-data (e.g. "data:image/png;base64,....")
      reader.readAsDataURL(file);

      // When the reading is done (onload is triggered), run this callback
      // function with the result of the reading, which is the object "e"
      reader.onload = function (e) {
        // Split "file" string into two parts, and take the second part [1] which is the
        // encoded string without meta-data
        var base64String = e.target.result.split(",")[1]; // Extract Base64 data

        // Save to localStorage for now until Post is submitted
        localStorage.setItem("inputImage", base64String);
        console.log("Image saved to localStorage as Base64 string.");
      };
    }
  }
}

//------------------------------------------------------------
// This function gets the current geolocation position safely.
// It returns a Promise that resolves to the position or null if
// geolocation is not available or permission is denied.
//-------------------------------------------------------------
function getCurrentPositionSafe() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true },
    );
  });
}

async function addPost() {
  console.log("Inside add post");

  // 🧾 Collect form data
  const foodTitle = document.getElementById("title").value;
  const foodPrice = document.getElementById("price").value;
  const foodLocation = document.getElementById("location").value;
  const foodDescription = document.getElementById("description").value;
  // get image from localStorage
  const imageBase64 = localStorage.getItem("inputImage") || "";
  // geolocation
  const position = await getCurrentPositionSafe();
  const latitude = position?.coords?.latitude || null;
  const longitude = position?.coords?.longitude || null;

  // Collect selected checkboxes
  const dietaryTags = [];
  const checkboxes = document.querySelectorAll('input[name="dietary"]:checked');

  checkboxes.forEach((cb) => {
    dietaryTags.push(cb.value);
  });

  // Log collected data for verification
  console.log("Collected food data:");
  console.log({
    foodTitle,
    foodPrice,
    foodLocation,
    foodDescription,
    dietaryTags,
    imageBase64,
    latitude,
    longitude,
  });

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
      //get searchstring
      var searchstring = createSearchMap(foodTitle, 10);
      searchstring = createSearchMap(foodLocation, 5, searchstring);
      dietaryTags.forEach((dtag) => {
        searchstring = createSearchMap(dtag, 5, searchstring);
      });
      searchstring = createSearchMap(
        foodDescription.slice(0, 200),
        1,
        searchstring,
      );
      //Save to Firestore
      const docRef = await addDoc(collection(db, "posts"), {
        foodTitle: foodTitle,
        price: Number(foodPrice),
        location: foodLocation,
        description: foodDescription,
        dietaryTags: dietaryTags,
        image: imageBase64,
        geo: {
          lat: latitude,
          lng: longitude,
        },
        userID: userID,
        createdAt: serverTimestamp(),
        searchArray: searchstring,
      });

      const foodDocID = docRef.id;

      // Show thank-you modal
      const thankYouModalEl = document.getElementById("thankYouModal");
      const thankYouModal = new bootstrap.Modal(thankYouModalEl);
      thankYouModal.show();

      // Redirect AFTER user closes the modal
      thankYouModalEl.addEventListener(
        "hidden.bs.modal",
        () => {
          window.location.href = `post.html?docID=${foodDocID}`;
        },
        { once: true },
      );
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

  // initialize image upload listener
  uploadImage();

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      addPost();
    });
  } else {
    console.error("Form not found");
  }
});
