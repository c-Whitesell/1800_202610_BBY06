//This is the javascript for the map in main page
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "./styles/style.css";
import "leaflet/dist/leaflet.css";
import { createIframePopup } from "./utils.js";
import "leaflet/dist/leaflet.css";

import * as L from "leaflet";

import { db } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { getDoc, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

//need to import images like this for vite build
import icon1 from "/images/restauranticon.png";
import icon2 from "/images/vegicon.png";
import icon3 from "/images/veganicon.png";
import icon4 from "/images/altdicon.png";
import icon5 from "/images/gficon.png";
import icon6 from "/images/manicon.png";

//Create different icon objects to show in leaflet
var defaultIcon = L.icon({
  iconUrl: icon1,
  iconSize: [44, 44], // size of the icon
  iconAnchor: [22, 42], // point of the icon which will correspond to marker's location
});

var vegIcon = L.icon({
  iconUrl: icon2,
  iconSize: [44, 44], // size of the icon
  iconAnchor: [22, 42], // point of the icon which will correspond to marker's location
});

var veganIcon = L.icon({
  iconUrl: icon3,
  iconSize: [44, 44], // size of the icon
  iconAnchor: [22, 42], // point of the icon which will correspond to marker's location
});

var altdIcon = L.icon({
  iconUrl: icon4,
  iconSize: [44, 44], // size of the icon
  iconAnchor: [22, 42], // point of the icon which will correspond to marker's location
});

var gfIcon = L.icon({
  iconUrl: icon5,
  iconSize: [44, 44], // size of the icon
  iconAnchor: [22, 42], // point of the icon which will correspond to marker's location
});

var locIcon = L.icon({
  iconUrl: icon6,
  iconSize: [44, 44], // size of the icon
  iconAnchor: [22, 42], // point of the icon which will correspond to marker's location
});

//Fetch the user's favorite restuarant from firestore
async function getUserFavorites(uid) {
  const userRef = doc(db, "users", uid);

  try {
    //Fetch the user document snapshot
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      //Extract the 'favorites' field (empty array if it doesn't exist)
      const favorites = userSnap.data().favorites || [];
      console.log("User Favorites:", favorites);
      return favorites;
    } else {
      console.log("No user document found for this UID.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

let uid;
let username;
let userFavorites = []; //This is for future use to enable favoriting from the map
var favoritesOnly = false;

//Get user info on authentication and load posts
onAuthStateChanged(auth, async (user) => {
  if (user) {
    uid = user.uid;
    username = user.displayName;
    userFavorites = await getUserFavorites(uid);
    loadFilteredMarkers();
  } else {
    userFavorites = [];
    loadFilteredMarkers();
  }
});

//creates filters and markers
let activeFilters = [];
let currentMarkers = [];

//creates user location objects
let userLat = null;
let userLng = null;

//Set view to Burnaby by default
const map = L.map("map").setView([49.236, -123.025], 16);

//Adds tile to map
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

//load markers
loadFilteredMarkers();

//set map zoom
map.locate({ setView: true, maxZoom: 16 });

//to do when user location is found
function onLocationFound(e) {
  var radius = e.accuracy;
  //update user lat and long
  userLat = e.latlng.lat;
  userLng = e.latlng.lng;
  //add user location marker
  L.marker(e.latlng, { icon: locIcon }).addTo(map);
  L.circle(e.latlng, radius).addTo(map);
  //go to user location on map
  map.flyTo([userLat, userLng], 16);
}

//user location is found by map
map.on("locationfound", onLocationFound);

//Creates the new post button and sets location
L.Control.MyCustomButton = L.Control.extend({
  options: {
    position: "bottomleft", // Position the control in the bottom left
  },

  onAdd: function (map) {
    // Create the button element
    let container = L.DomUtil.create("button", "modalButton");
    container.innerHTML = "new post";
    container.style.height = "50px";
    container.style.width = "100px";
    container.style.borderRadius = "50px";
    container.style.backgroundColor = "#87A878";
    container.style.color = "white";
    //create click event listener
    L.DomEvent.on(container, "click", function (e) {
      createIframePopup(container, "/postPopup.html");
      // Prevent event from propagating to the map
      L.DomEvent.stop(e);
    });

    // Prevent click events on the button from moving the map
    L.DomEvent.disableClickPropagation(container);

    //return button container
    return container;
  },

  onRemove: function (map) {
    // Clean up event listeners if the control is removed
    L.DomEvent.off(this._container, "click", function () {});
  },
});

//Adds the New Post button
let myCustomButton = new L.Control.MyCustomButton();
myCustomButton.addTo(map);

L.Control.FavouritesButton = L.Control.extend({
  options: {
    position: "bottomleft",
  },
  onAdd: function (map) {
    // Create the button element
    let container = L.DomUtil.create("button", "favouritesButton");
    container.innerHTML = "Favourites";
    container.style.height = "50px";
    container.style.width = "100px";
    container.style.borderRadius = "50px";
    container.style.backgroundColor = "#87A878";
    container.style.color = "white";
    //create Click event listener
    L.DomEvent.on(container, "click", function (e) {
      if (!favoritesOnly && uid != undefined) {
        favoritesOnly = true;
        container.innerHTML = "All Restaurants";
        loadFilteredMarkers();
      } else {
        favoritesOnly = false;
        container.innerHTML = "Favourites";
        loadFilteredMarkers();
      }
      // Prevent click from propagating to the map
      L.DomEvent.stop(e);
    });
    // Prevent click events on the button from moving the map
    L.DomEvent.disableClickPropagation(container);
    //return button container
    return container;
  },
  onRemove: function (map) {
    // Clean up event listeners if the control is removed
    L.DomEvent.off(this._container, "click", function () {});
  },
});

//Adds the Favorites button
let favouritesButton = new L.Control.FavouritesButton();
favouritesButton.addTo(map);

//clear markers from the map
function clearMarkers() {
  currentMarkers.forEach((marker) => map.removeLayer(marker));
  currentMarkers = [];
}

//import multipquery function
import { multiQuery } from "./filter.js";

//load markers by query
async function loadFilteredMarkers() {
  //clear old markers
  clearMarkers();

  //check authentication
  const auth = getAuth();

  //get query for filtered restaurants
  //limit restaurants in map for demo and because firebase limits
  const queryLimit = 123;
  if (favoritesOnly == true && uid != undefined) {
    //query the users favorite restaurants with filters
    var q = await multiQuery(
      db,
      "restaurants",
      activeFilters,
      queryLimit, //limit
      "users",
      uid,
      "favorites",
    );
  } else {
    //query all restaurants with filters
    var q = await multiQuery(db, "restaurants", activeFilters, queryLimit);
  }

  const snapshot = await getDocs(q);

  //add markers for each restaurant
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    //change icons based on tags (currently works by bottom to top priority)
    let thisIcon = defaultIcon;

    const dtags = data.dietaryTags;

    if (dtags.includes("Vegetarian")) {
      thisIcon = vegIcon;
    }

    if (dtags.includes("Vegan")) {
      thisIcon = veganIcon;
    }

    if (dtags.includes("Dairy Alternative")) {
      thisIcon = altdIcon;
    }

    if (dtags.includes("Gluten Free")) {
      thisIcon = gfIcon;
    }

    //add marker to map
    const marker = L.marker([data.lat, data.lon], { icon: thisIcon }).addTo(
      map,
    );

    //add pop-up to marker: has create route, view posts, new post buttons
    marker.bindPopup(`
      <b>${data.name || "Restaurant"}</b><br>
      <i>${data.address || ""}</i><br>     
      <button class="view-post-btn" data-id="${docSnap.id}">View Posts</button> 
      <button class="new-post-btn" data-id="${docSnap.id}">New Post</button>
      <button class="route-btn">Directions</button>
    `);

    //add functions to marker buttons
    marker.on("popupopen", (e) => {
      const popupNode = e.popup.getElement();
      popupNode.addEventListener("click", (event) => {
        //Route Button
        if (event.target.classList.contains("route-btn")) {
          if (!userLat || !userLng) return alert("Location not ready");
          const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${data.lat},${data.lon}`;
          window.open(url, "_blank");
        }

        //New Post Button
        if (event.target.classList.contains("new-post-btn")) {
          const id = event.target.getAttribute("data-id");
          window.open(`post.html?id=${id}`, "_blank");
        }

        //View Post Button
        if (event.target.classList.contains("view-post-btn")) {
          const id = event.target.getAttribute("data-id");
          window.open(`allPosts.html?id=${id}&type=restaurants`, "_blank");
        }
      });
    });

    currentMarkers.push(marker);
  });
}

//dietary tag filter dropdown
window.toggleDropdown = function () {
  const dropdown = document.getElementById("filterDropdown");
  dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
};

//dietary tag filter check/uncheck logic
window.handleFilterChange = async function (checkbox) {
  const tag = checkbox.value;

  if (checkbox.checked) {
    if (!activeFilters.includes(tag)) {
      activeFilters.push(tag);
    }
  } else {
    activeFilters = activeFilters.filter((t) => t !== tag);
  }

  await loadFilteredMarkers();
};

//dietary tag filter clear checkboxes
window.clearFilters = async function () {
  activeFilters = [];

  document
    .querySelectorAll("#filterDropdown input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));

  await loadFilteredMarkers();
};
