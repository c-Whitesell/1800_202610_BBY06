import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
  query, // <--- Add this
  where, // <--- Add this
  limit, // <--- Add this
  getDocs, // <--- You'll need this to actually run the query
} from "firebase/firestore";
import * as bootstrap from "bootstrap";
import { createSearchMap, searchTextFirebaseCollection } from "./search.js";
import { GeocoderAutocomplete } from "@geoapify/geocoder-autocomplete";

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
  const restaurantTitle = document.getElementById("restaurant").value;
  const foodTitle = document.getElementById("title").value;
  const foodPrice = document.getElementById("price").value;
  const foodLocation = window.selectedAddress;
  const foodDescription = document.getElementById("description").value;
  // get image from localStorage
  const imageBase64 = localStorage.getItem("inputImage") || "";
  // geolocation
  const position = await getCurrentPositionSafe();
  const latitude = window.selectedLat || null;
  const longitude = window.selectedLon || null;

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
      searchstring = createSearchMap(restaurantTitle, 8, searchstring);
      dietaryTags.forEach((dtag) => {
        searchstring = createSearchMap(dtag, 5, searchstring);
      });
      searchstring = createSearchMap(
        foodDescription.slice(0, 200),
        1,
        searchstring,
      );
      //Save Post to Firestore

      const docRef = await addDoc(collection(db, "posts"), {
        foodTitle: foodTitle,
        restuarant: restaurantTitle,
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

      const doesRestaurantExist = query(
        collection(db, "restaurants"),
        where("name", "==", restaurantTitle),
        limit(1),
      );

      try {
        // 3. Execute the query
        const querySnapshot = await getDocs(doesRestaurantExist);

        // 4. Return true if the snapshot is not empty
        if (!querySnapshot.empty) {
          console.log(`Match found! Doc ID: ${querySnapshot.docs[0].id}`);
          const docRef2 = doc(db, "restaurants", querySnapshot.docs[0].id);
          await updateDoc(docRef2, {
            name: restaurantTitle,
            dietaryTags: arrayUnion(...dietaryTags), // add dietary tags ...spreadsArray
            posts: arrayUnion(foodDocID), // add post ID
            lastUpdated: serverTimestamp(),
          });
          const docSnap2 = await getDoc(docRef);
          var searchstring2 = createSearchMap(restaurantTitle, 10);
          searchstring2 = createSearchMap(
            docSnap2.get("address"),
            3,
            searchstring2,
          );
          docSnap2.get("dietaryTags").forEach((dtag) => {
            searchstring2 = createSearchMap(dtag, 2, searchstring2);
          });
          await updateDoc(docRef2, {
            searchArray: searchstring2,
            lastUpdated: serverTimestamp(),
          });
        } else {
          var searchstring2 = createSearchMap(restaurantTitle, 10);
          searchstring2 = createSearchMap(foodLocation, 3, searchstring2);
          dietaryTags.forEach((dtag) => {
            searchstring2 = createSearchMap(dtag, 2, searchstring2);
          });

          //
          const docRef2 = await addDoc(collection(db, "restaurants"), {
            address: foodLocation,
            cuisine: "unknown",
            lat: latitude,
            lon: longitude,
            name: restaurantTitle,
            website: "",
            dietaryTags: dietaryTags, // Initializing as empty array
            posts: [foodDocID], // Initializing as empty array
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            searchArray: searchstring2,
          });
        }
      } catch (error) {
        console.error("Error querying Firestore:", error);
      }

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

// GEOAPIFY auto complete

const apiKey = import.meta.env.VITE_GEOAPIFY_KEY;
const autocomplete = new GeocoderAutocomplete(
  document.getElementById("autocomplete"),
  apiKey,
  {},
);
const initGeoapify = () => {
  // Check all 3 common places the library hides
  const Geocoder =
    (window.geoapify && window.geoapify.GeocoderAutocomplete) ||
    (window.autocomplete && window.autocomplete.GeocoderAutocomplete) ||
    window.GeocoderAutocomplete;

  if (!Geocoder) {
    console.warn(
      "Retrying... checking window.geoapify and window.autocomplete",
    );
    setTimeout(initGeoapify, 100);
    return;
  }

  console.log("✅ Library found! Initializing...");
  const apiKey = import.meta.env.VITE_GEOAPIFY_KEY;

  const autocomplete = new Geocoder(
    document.getElementById("autocomplete"),
    apiKey,
    {
      skipIcons: true,
      proximity: {
        lng: -123.025,
        lat: 49.236,
      },
    },
  );

  // ... selection logic ...
};

autocomplete.on("select", (location) => {
  // 1. Check if the user cleared the input (location will be null)
  if (!location) {
    console.log("Selection cleared");
    window.selectedLat = null;
    window.selectedLon = null;
    return;
  }

  // 2. Extract properties and coordinates
  const address = location.properties.formatted;
  const lon = location.geometry.coordinates[0]; // Longitude is first
  const lat = location.geometry.coordinates[1]; // Latitude is second

  // 3. Safety Check: Ensure the API actually returned numbers
  if (lat != null && lon != null) {
    console.log("✅ Valid Location Data Received:");
    console.log("Address:", address);
    console.log(`GPS: ${lat}, ${lon}`);

    // 4. Save to global variables for your 'addPost' function
    window.selectedAddress = address;
    window.selectedLat = lat;
    window.selectedLon = lon;
  } else {
    console.error("The selected location is missing GPS coordinates.");
  }
});

//reatuarant autocomplete
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("restaurant");
  const searchWrapper = searchInput ? searchInput.parentElement : null;

  if (searchWrapper && searchInput) {
    searchWrapper.style.position = "relative";

    const resultsDropdown = document.createElement("ul");
    resultsDropdown.className = "dropdown-menu shadow border-0 mt-1 w-100";
    resultsDropdown.style.display = "none";
    resultsDropdown.style.position = "absolute";
    resultsDropdown.style.zIndex = "1000";
    searchWrapper.appendChild(resultsDropdown);

    let debounceTimer;

    // Toggle logic: If the menu is open, clicking the input again closes it
    searchInput.addEventListener("click", () => {
      if (resultsDropdown.style.display === "block") {
        resultsDropdown.style.display = "none";
      } else if (searchInput.value.trim().length >= 2) {
        // If there is already text, show the results again
        resultsDropdown.style.display = "block";
      }
    });

    searchInput.addEventListener("input", (e) => {
      const queryText = e.target.value.trim();
      clearTimeout(debounceTimer);

      if (queryText.length < 2) {
        resultsDropdown.style.display = "none";
        // Reset ID if user clears search
        window.selectedRestaurantId = null;
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const results = await searchTextFirebaseCollection(
            queryText,
            "restaurants",
          );
          renderResults(results, resultsDropdown);
        } catch (error) {
          console.error("Search failed:", error);
        }
      }, 300);
    });

    function renderResults(data, container) {
      container.innerHTML = "";

      // 1. Always show the current input as a "New Restaurant" option at the top
      const currentInput = searchInput.value.trim();
      const newLi = document.createElement("li");
      newLi.innerHTML = `
                <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#">
                    <span class="fw-bold">${currentInput}</span>
                    <small class="text-secondary">New Restaurant</small>
                </a>
            `;
      newLi.addEventListener("click", (e) => {
        e.preventDefault();
        searchInput.value = currentInput;
        window.selectedRestaurantId = null; // Signal this is new
        container.style.display = "none";
      });
      container.appendChild(newLi);

      // 2. Add divider if there are existing results
      if (data.length > 0) {
        const divider = document.createElement("li");
        divider.innerHTML = `<hr class="dropdown-divider">`;
        container.appendChild(divider);

        data.forEach((item) => {
          const li = document.createElement("li");
          li.innerHTML = `
                        <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#" data-id="${item.id}">
                            <div style="pointer-events: none;">
                                <div class="fw-bold">${item.name}</div>
                                <small class="text-muted">${item.address || "No address"}</small>
                            </div>
                            <small class="text-muted">Existing</small>
                        </a>
                    `;

          li.addEventListener("click", (e) => {
            e.preventDefault();
            searchInput.value = item.name;
            window.selectedRestaurantId = item.id;
            container.style.display = "none";
          });

          container.appendChild(li);
        });
      }

      container.style.display = "block";
    }

    document.addEventListener("click", (e) => {
      if (!searchWrapper.contains(e.target)) {
        resultsDropdown.style.display = "none";
      }
    });
  }
});
