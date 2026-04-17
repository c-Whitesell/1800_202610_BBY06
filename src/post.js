/**
 * FILE: post.js
 * DESCRIPTION: Handles the creation of new food posts.
 * Manages image uploads,geolocation, address autocomplete via Geoapify,
 * and Firestore collection updates.
 * AUTHOR: BBY-06 Team
 * DATE: 2026-04-17
 */
import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  doc,
  documentId,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
  query,
  where,
  limit,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import * as bootstrap from "bootstrap";
import { createSearchMap, searchTextFirebaseCollection } from "./search.js";
import { GeocoderAutocomplete } from "@geoapify/geocoder-autocomplete";

/**
 * DESCRIPTION: Initializes listeners for image upload and handles Base64 encoding for local storage.
 * @returns {void}
 */
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
        localStorage.removeItem("inputImage"); // Force clear old data
        localStorage.setItem("inputImage", base64String);
        console.log("Image saved to localStorage as Base64 string.");
      };
    }
  }
}

/**
 * DESCRIPTION: Requests the user's current GPS coordinates using the Browser API.
 * @returns {Promise<Position|null>} - Resolves to the position object or null if unavailable.
 */
function getCurrentPositionSafe() {
  return new Promise((resolve) => {
    // Returns null if geolocation is not available or permission is denied.
    if (!navigator.geolocation) return resolve(null);
    // Returns a Promise that resolves to the position
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true },
    );
  });
}

/**
 * DESCRIPTION: Queries the DOM for all checked dietary restriction checkboxes.
 * @returns {Array<string>} - An array of strings representing selected dietary tags.
 */
function getSelectedDietary() {
  //Get the checbox elements
  const checkboxNodes = document.querySelectorAll(
    //html check boxes should have name="dietary"
    'input[name="dietary"]:checked',
  );

  //Convert to an array of Strings
  const selectedValues = Array.from(checkboxNodes).map((cb) => cb.value);

  console.log("Found these values:", selectedValues);
  return selectedValues;
}
window.getSelectedDietary = getSelectedDietary;

/**
 * DESCRIPTION: Collects form data, generates search indexes, and writes new documents to Firestore.
 * DATABASE ACCESS: WRITE (Posts collection), READ/WRITE (Restaurants collection)
 * @returns {Promise<void>}
 */
async function addPost() {
  //  Collect form data
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
  //const dietaryTags = [];
  const checkboxes = document.querySelectorAll('input[name="dietary"]:checked');
  const selectedValues = Array.from(checkboxes).map((cb) => cb.value);
  const dietaryTags = selectedValues;
  //console.log("Found these values:", dietaryTags);

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
      //gets restaurant docsnap if restaurant exists
      const docRef2 = doc(
        db,
        "restaurants",
        !(window.selectedRestaurantId == null)
          ? window.selectedRestaurantId
          : "qwerty",
      );
      const doesRestaurant = await getDoc(docRef);

      try {
        //Return true if the snapshot is not empty
        if (doesRestaurant.exists) {
          //update existing restaurant with dietary tags and new info
          await updateDoc(docRef2, {
            name: restaurantTitle,
            dietaryTags: arrayUnion(...dietaryTags), // add dietary tags ... spreads array
            posts: arrayUnion(foodDocID), // add post ID to retaurant
            lastUpdated: serverTimestamp(),
          });
          const docSnap2 = await getDoc(docRef);
          //updates search string for restaurant
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
          //if restaurant doesn't exist, create new one
          //creates search string
          var searchstring2 = createSearchMap(restaurantTitle, 10);
          searchstring2 = createSearchMap(foodLocation, 3, searchstring2);
          dietaryTags.forEach((dtag) => {
            searchstring2 = createSearchMap(dtag, 2, searchstring2);
          });

          //add restaurant to firestore collection
          docRef2 = await addDoc(collection(db, "restaurants"), {
            address: foodLocation,
            cuisine: "unknown",
            lat: latitude,
            lon: longitude,
            name: restaurantTitle,
            website: "",
            dietaryTags: dietaryTags, //add current tags
            posts: [foodDocID], //add post to restaurant
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

      // Redirect after user closes the modal
      thankYouModalEl.addEventListener(
        "hidden.bs.modal",
        () => {
          window.location.href = `post.html?docID=${foodDocID}`;
        },
        { once: true },
      );
    } catch (error) {
      //error logging
      console.error("Error adding review:", error);
    }
  } else {
    //if there is no user
    console.log("No user is signed in");
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

// GEOAPIFY location auto complete initialization
const apiKey = import.meta.env.VITE_GEOAPIFY_KEY;
const autocomplete = new GeocoderAutocomplete(
  document.getElementById("autocomplete"),
  apiKey,
  {},
);
const initGeoapify = () => {
  // I had a lot of trouble initializing GEOAPIFY so these are some checks/retries
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

  // adds automcomplete to location entry bar
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

// when user selects location search bar
autocomplete.on("select", (location) => {
  // Check if the user cleared the input
  if (!location) {
    console.log("Selection cleared");
    // make lat and long null if no location
    window.selectedLat = null;
    window.selectedLon = null;
    return;
  }

  //Extract properties and coordinates
  const address = location.properties.formatted;
  const lon = location.geometry.coordinates[0]; // Longitude is first
  const lat = location.geometry.coordinates[1]; // Latitude is second

  //Check that API returned lat and lon
  if (lat != null && lon != null) {
    console.log("✅ Valid Location Data Received:");
    console.log("Address:", address);
    console.log(`GPS: ${lat}, ${lon}`);

    //Save to global variables for addPost
    window.selectedAddress = address;
    window.selectedLat = lat;
    window.selectedLon = lon;
  } else {
    //error log
    console.error("The selected location is missing GPS coordinates.");
  }
});

//restuarant autocomplete
document.addEventListener("DOMContentLoaded", () => {
  //add restuarant autocomplete to restaurant entry form
  const searchInput = document.getElementById("restaurant");
  const searchWrapper = searchInput ? searchInput.parentElement : null;
  //If the search bar/wrapper has loaded, add autocomplete
  if (searchWrapper && searchInput) {
    searchWrapper.style.position = "relative";
    //creates dropdown list
    const resultsDropdown = document.createElement("ul");
    resultsDropdown.className = "dropdown-menu shadow border-0 mt-1 w-100";
    resultsDropdown.style.display = "none";
    resultsDropdown.style.position = "absolute";
    resultsDropdown.style.zIndex = "1000";
    searchWrapper.appendChild(resultsDropdown);

    let debounceTimer;

    // If the menu is open, clicking the input again closes it
    searchInput.addEventListener("click", () => {
      if (resultsDropdown.style.display === "block") {
        resultsDropdown.style.display = "none";
      } else if (searchInput.value.trim().length >= 2) {
        // If there is already text, show the results again
        resultsDropdown.style.display = "block";
      }
    });

    // event listener for text input
    searchInput.addEventListener("input", (e) => {
      const queryText = e.target.value.trim();
      clearTimeout(debounceTimer);

      if (queryText.length < 2) {
        resultsDropdown.style.display = "none";
        // Reset restaurant ID if user clears search
        window.selectedRestaurantId = null;
        return;
      }

      // wait to refresh autocomplete, after detecting input text changing
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

    /**
     * DESCRIPTION: Builds and displays the autocomplete dropdown menu.
     * @param {Array} data - The array of restaurant objects from Firestore.
     * @param {HTMLElement} container - The UL element used for the dropdown.
     * @returns {void}
     */
    function renderResults(data, container) {
      container.innerHTML = "";

      //Show the current input as New Restaurant option at the top
      const currentInput = searchInput.value.trim();
      const newLi = document.createElement("li");
      newLi.innerHTML = `
                <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="#">
                    <span class="fw-bold">${currentInput}</span>
                    <small class="text-secondary">New Restaurant</small>
                </a>
            `;
      //checks if new restaurant option is clicked
      newLi.addEventListener("click", (e) => {
        e.preventDefault();
        searchInput.value = currentInput;
        window.selectedRestaurantId = null; // removes restaurant id from window because it doesn't exist
        container.style.display = "none";
      });
      container.appendChild(newLi);

      //Adds divider if there are existing results
      if (data.length > 0) {
        const divider = document.createElement("li");
        divider.innerHTML = `<hr class="dropdown-divider">`;
        container.appendChild(divider);
        //Adds autocomplete results, restaurant name and address
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
          //Checks if this restaurant autocomplete option is clicked
          li.addEventListener("click", (e) => {
            e.preventDefault();
            searchInput.value = item.name;
            window.selectedRestaurantId = item.id;
            window.selectedAddress = item.address;
            autocomplete.setValue(window.selectedAddress);
            container.style.display = "none";
          });

          container.appendChild(li);
        });
      }

      container.style.display = "block";
    }

    //Clicking outside autocomplete dropdown removes it
    document.addEventListener("click", (e) => {
      if (!searchWrapper.contains(e.target)) {
        resultsDropdown.style.display = "none";
      }
    });
  }
});

/**
 * DESCRIPTION: Checks URL parameters for a restaurant ID to pre-fill the form.
 * DATABASE ACCESS: READ (Restaurants collection)
 * @returns {Promise<void>}
 */
async function checkURLParams() {
  //get url parameters
  const tempUrlParams = new URLSearchParams(window.location.search);
  //check url for restaurant id
  if (tempUrlParams.has("id")) {
    const restaurantId = tempUrlParams.get("id");
    window.selectedRestaurantId = restaurantId;

    try {
      //Fetch the restaurant document from Firestore
      const docRef = doc(db, "restaurants", restaurantId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        //Auto-fill the Restaurant Name field
        const restaurantInput = document.getElementById("restaurant");
        if (restaurantInput) {
          restaurantInput.value = data.name || "";
        }

        //Auto-fill the Address field (Geoapify)
        if (data.address) {
          window.selectedAddress = data.address;
          // Geoapify method to set adress in bar
          if (autocomplete) {
            autocomplete.setValue(data.address);
          }
        }

        //Update Lat/Lon for the post creation info
        window.selectedLat = data.lat || null;
        window.selectedLon = data.lon || null;

        console.log("Form auto-filled from URL ID:", data.name);
      } else {
        //log no restaurant found
        console.warn("No restaurant found with that ID.");
      }
    } catch (error) {
      //log error
      console.error("Error fetching restaurant for auto-fill:", error);
    }
  }
}

// Call this function when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  checkURLParams(); // Check URL parameters
  localStorage.removeItem("inputImage"); // Force clear image data on refresh
});
